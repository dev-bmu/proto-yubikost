"use server";
// Aksi Admin Dashboard (PRD §9). Setiap aksi memeriksa izin peran di server (§3.3).
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { all, audit, byId, insert, newId, nowIso, remove, update, type Admin } from "@/lib/db";
import { addMonths, normalizePhone } from "@/lib/format";
import { hashPassword, tempPassword, verifyPassword } from "@/lib/password";
import { can, type Permission } from "@/lib/perm";
import { activeBookingOfMember, activeLeaseOfMember, activeLeaseOfRoom } from "@/lib/queries";
import { clearAdminSession, currentAdmin, setAdminSession } from "@/lib/session";
import { waCredential } from "@/lib/wa";
import { HOLD_HOURS, INQUIRY_STATUSES, PACKAGES } from "@/lib/constants";
import type { Fail } from "./member";

const fail = (error: string, field?: string, code?: string): Fail => ({ ok: false, error, field, code });
const done = () => revalidatePath("/", "layout");

async function guard(perm?: Permission): Promise<Admin | Fail> {
  const admin = await currentAdmin();
  if (!admin) return fail("Sesi admin berakhir. Silakan masuk lagi.", undefined, "AUTH");
  if (perm && !can(admin.role, perm)) return fail("Akses ditolak untuk peran Anda.", undefined, "FORBIDDEN");
  return admin;
}
const isFail = (x: Admin | Fail): x is Fail => "ok" in x;
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

async function siteUrl() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3100"}`;
}

// ── Sesi ────────────────────────────────────────────────────

export async function loginAdmin(input: { email: string; password: string }): Promise<{ ok: true } | Fail> {
  const admin = all("admins").find((a) => a.email.toLowerCase() === input.email.trim().toLowerCase());
  if (!admin || !verifyPassword(input.password, admin.password)) return fail("Email atau kata sandi salah.");
  await setAdminSession(admin.id);
  done();
  return { ok: true };
}

export async function logoutAdmin() {
  await clearAdminSession();
  done();
}

// ── Leads & Assign (§9.4) ───────────────────────────────────

export async function updateInquiryStatus(id: string, status: string): Promise<{ ok: true } | Fail> {
  const admin = await guard("leads.manage");
  if (isFail(admin)) return admin;
  if (!(INQUIRY_STATUSES as readonly string[]).includes(status)) return fail("Status tidak valid.");
  if (!update("inquiries", id, { status, updatedAt: nowIso() })) return fail("Lead tidak ditemukan.");
  audit(admin, "lead.status", id, status);
  done();
  return { ok: true };
}

export async function assignRoom(input: {
  memberId: string;
  roomId: string;
  startDate: string;
  months: number;
  dueDate: string;
}): Promise<{ ok: true } | Fail> {
  const admin = await guard("leads.assign");
  if (isFail(admin)) return admin;
  const member = byId("members", input.memberId);
  if (!member || member.role !== "PROSPECT") return fail("Prospect tidak ditemukan.");
  if (activeLeaseOfMember(member.id)) return fail("Prospect ini sudah punya sewa aktif.");
  if (activeBookingOfMember(member.id)) return fail("Prospect ini punya pesanan aktif di Dashboard. Verifikasi atau batalkan di menu Pembayaran.");
  if (!isDate(input.startDate)) return fail("Tanggal mulai sewa tidak valid.", "startDate");
  if (!(PACKAGES as readonly number[]).includes(input.months)) return fail("Paket awal tidak valid.", "months");
  if (!isDate(input.dueDate) || input.dueDate <= input.startDate) return fail("Jatuh tempo harus setelah tanggal mulai.", "dueDate");

  // Cek & ubah status kamar tanpa jeda async → atomik di proses Node tunggal (PRD §9.4)
  const room = byId("rooms", input.roomId);
  if (!room || room.status !== "AVAILABLE" || activeLeaseOfRoom(room.id)) return fail("Kamar sudah tidak tersedia.", "roomId", "TAKEN");
  update("rooms", room.id, { status: "OCCUPIED" });
  const lease = insert("leases", {
    id: newId("lease"),
    memberId: member.id,
    roomId: room.id,
    startDate: input.startDate,
    dueDate: input.dueDate,
    status: "ACTIVE",
    createdBy: admin.id,
    endedAt: "",
    createdAt: nowIso(),
  });
  update("members", member.id, { role: "RESIDENT" });
  for (const inq of all("inquiries").filter((i) => i.memberId === member.id && (i.status === "NEW" || i.status === "CONTACTED"))) {
    update("inquiries", inq.id, { status: "CLOSED_WON", updatedAt: nowIso() });
  }
  audit(admin, "lease.assign", lease.id, `${member.name} → kamar ${room.number}`);
  done();
  return { ok: true };
}

// ── Penghuni (§9.5–9.6) ─────────────────────────────────────

export async function directAdd(input: {
  name: string;
  whatsapp: string;
  roomId: string;
  startDate: string;
  dueDate: string;
}): Promise<{ ok: true; tempPassword: string; waUrl: string } | (Fail & { memberId?: string })> {
  const admin = await guard("residents.add");
  if (isFail(admin)) return admin;
  const name = input.name.trim();
  const phone = normalizePhone(input.whatsapp);
  if (name.length < 3) return fail("Nama minimal 3 karakter.", "name");
  if (!phone) return fail("Nomor WhatsApp tidak valid.", "whatsapp");
  if (!isDate(input.startDate)) return fail("Tanggal mulai sewa tidak valid.", "startDate");
  if (!isDate(input.dueDate) || input.dueDate <= input.startDate) return fail("Jatuh tempo harus setelah tanggal mulai.", "dueDate");

  const existing = all("members").find((m) => m.whatsapp === phone);
  if (existing?.role === "PROSPECT")
    return { ...fail("Nomor ini sudah terdaftar sebagai Prospect. Gunakan Assign dari menu Leads.", "whatsapp", "EXISTS_PROSPECT"), memberId: existing.id };
  if (existing) return fail("Nomor ini sudah terdaftar sebagai penghuni.", "whatsapp");

  const room = byId("rooms", input.roomId);
  if (!room || room.status === "RESERVED" || activeLeaseOfRoom(room.id)) return fail("Kamar tidak tersedia.", "roomId");

  const password = tempPassword();
  const member = insert("members", {
    id: newId("mbr"),
    name,
    whatsapp: phone,
    email: "",
    password: hashPassword(password),
    role: "RESIDENT",
    mustChangePassword: true,
    source: "direct_add",
    consentAt: "",
    createdAt: nowIso(),
  });
  update("rooms", room.id, { status: "OCCUPIED" });
  const lease = insert("leases", {
    id: newId("lease"),
    memberId: member.id,
    roomId: room.id,
    startDate: input.startDate,
    dueDate: input.dueDate,
    status: "ACTIVE",
    createdBy: admin.id,
    endedAt: "",
    createdAt: nowIso(),
  });
  audit(admin, "resident.direct_add", lease.id, `${name} → kamar ${room.number}`);
  done();
  return { ok: true, tempPassword: password, waUrl: waCredential({ name, phone, password, siteUrl: await siteUrl() }) };
}

export async function updateDueDate(input: { leaseId: string; dueDate: string; reason: string }): Promise<{ ok: true } | Fail> {
  const admin = await guard("renewals.verify");
  if (isFail(admin)) return admin;
  const lease = byId("leases", input.leaseId);
  if (!lease || lease.status !== "ACTIVE") return fail("Sewa aktif tidak ditemukan.");
  if (!isDate(input.dueDate) || input.dueDate <= lease.startDate) return fail("Jatuh tempo harus setelah tanggal mulai sewa.", "dueDate");
  if (input.reason.trim().length < 5) return fail("Alasan minimal 5 karakter.", "reason");
  update("leases", lease.id, { dueDate: input.dueDate });
  audit(admin, "lease.due_date", lease.id, `${lease.dueDate} → ${input.dueDate}: ${input.reason.trim()}`);
  done();
  return { ok: true };
}

export async function endLease(leaseId: string): Promise<{ ok: true } | Fail> {
  const admin = await guard("lease.end");
  if (isFail(admin)) return admin;
  const lease = byId("leases", leaseId);
  if (!lease || lease.status !== "ACTIVE") return fail("Sewa aktif tidak ditemukan.");
  update("leases", lease.id, { status: "ENDED", endedAt: nowIso() });
  update("rooms", lease.roomId, { status: "AVAILABLE" });
  update("members", lease.memberId, { role: "PROSPECT" }); // K-06
  for (const p of all("payments").filter((p) => p.leaseId === lease.id && p.status === "MENUNGGU_VERIFIKASI")) {
    update("payments", p.id, { status: "DITOLAK", note: "Sewa diakhiri", verifiedBy: admin.id, verifiedAt: nowIso() });
  }
  audit(admin, "lease.end", lease.id);
  done();
  return { ok: true };
}

export async function resetMemberPassword(memberId: string): Promise<{ ok: true; tempPassword: string; waUrl: string } | Fail> {
  const admin = await guard("members.reset");
  if (isFail(admin)) return admin;
  const member = byId("members", memberId);
  if (!member) return fail("Member tidak ditemukan.");
  const password = tempPassword();
  update("members", member.id, { password: hashPassword(password), mustChangePassword: true });
  audit(admin, "member.reset_password", member.id);
  done();
  return {
    ok: true,
    tempPassword: password,
    waUrl: waCredential({ name: member.name, phone: member.whatsapp, password, siteUrl: await siteUrl() }),
  };
}

/** Tampilkan NIK lengkap — tercatat di audit log (SEC-04, SEC-05). */
export async function revealNik(memberId: string): Promise<{ ok: true; nik: string } | Fail> {
  const admin = await guard("residents.ktp");
  if (isFail(admin)) return admin;
  const profile = all("profiles").find((p) => p.memberId === memberId);
  if (!profile) return fail("Biodata belum diisi.");
  audit(admin, "nik.view", memberId);
  return { ok: true, nik: profile.nik };
}

// ── Verifikasi Pembayaran (§9.7) ────────────────────────────

/**
 * Setujui bukti. SEWA_BARU → lease ACTIVE, member RESIDENT, kamar OCCUPIED, lead CLOSED_WON.
 * PERPANJANGAN → jatuh tempo + paket (dihitung dari jatuh tempo lama).
 */
export async function approvePayment(id: string): Promise<{ ok: true; dueDate: string } | Fail> {
  const admin = await guard("payments.verify");
  if (isFail(admin)) return admin;
  const payment = byId("payments", id);
  if (!payment || payment.status !== "MENUNGGU_VERIFIKASI") return fail("Pembayaran tidak ditemukan atau sudah diproses.");
  const verified = { status: "DISETUJUI", verifiedBy: admin.id, verifiedAt: nowIso() };

  if (payment.kind === "PERPANJANGAN") {
    const lease = byId("leases", payment.leaseId);
    if (!lease || lease.status !== "ACTIVE") return fail("Sewa aktif tidak ditemukan.");
    const dueDate = addMonths(lease.dueDate, payment.months);
    update("leases", lease.id, { dueDate });
    update("payments", id, verified);
    audit(admin, "payment.approve", id, `Perpanjangan ${lease.dueDate} → ${dueDate}`);
    done();
    return { ok: true, dueDate };
  }

  const booking = byId("bookings", payment.bookingId);
  const member = byId("members", payment.memberId);
  const room = booking && byId("rooms", booking.roomId);
  if (!booking || booking.status !== "MENUNGGU_VERIFIKASI" || !member || !room) return fail("Pesanan tidak ditemukan.");
  if (activeLeaseOfMember(member.id)) return fail("Customer ini sudah punya sewa aktif.");
  if (room.status === "OCCUPIED" || activeLeaseOfRoom(room.id)) return fail("Kamar sudah terisi. Tolak bukti dan hubungi customer.");
  const dueDate = addMonths(booking.startDate, booking.months);
  const lease = insert("leases", {
    id: newId("lease"),
    memberId: member.id,
    roomId: room.id,
    startDate: booking.startDate,
    dueDate,
    status: "ACTIVE",
    createdBy: admin.id,
    endedAt: "",
    createdAt: nowIso(),
  });
  update("rooms", room.id, { status: "OCCUPIED" });
  update("members", member.id, { role: "RESIDENT" });
  update("bookings", booking.id, { status: "DISETUJUI", leaseId: lease.id, updatedAt: nowIso() });
  update("payments", id, { ...verified, leaseId: lease.id });
  for (const inq of all("inquiries").filter((i) => i.memberId === member.id && (i.status === "NEW" || i.status === "CONTACTED"))) {
    update("inquiries", inq.id, { status: "CLOSED_WON", updatedAt: nowIso() });
  }
  audit(admin, "payment.approve", id, `Sewa baru ${member.name} → kamar ${room.number}, ${booking.startDate} s/d ${dueDate}`);
  done();
  return { ok: true, dueDate };
}

/** Tolak bukti. Sewa baru: pesanan kembali MENUNGGU_PEMBAYARAN dengan batas 24 jam baru (customer upload ulang). */
export async function rejectPayment(id: string, reason: string): Promise<{ ok: true } | Fail> {
  const admin = await guard("payments.verify");
  if (isFail(admin)) return admin;
  const note = reason.trim();
  if (note.length < 5) return fail("Alasan penolakan minimal 5 karakter.", "reason");
  const payment = byId("payments", id);
  if (!payment || payment.status !== "MENUNGGU_VERIFIKASI") return fail("Pembayaran tidak ditemukan atau sudah diproses.");
  update("payments", id, { status: "DITOLAK", note, verifiedBy: admin.id, verifiedAt: nowIso() });
  if (payment.bookingId) {
    update("bookings", payment.bookingId, {
      status: "MENUNGGU_PEMBAYARAN",
      note,
      expiresAt: new Date(Date.now() + HOLD_HOURS * 3_600_000).toISOString(),
      updatedAt: nowIso(),
    });
  }
  audit(admin, "payment.reject", id, note);
  done();
  return { ok: true };
}

/** Batalkan pesanan yang belum dibayar; kamar dilepas. */
export async function cancelBookingAdmin(id: string): Promise<{ ok: true } | Fail> {
  const admin = await guard();
  if (isFail(admin)) return admin;
  if (!can(admin.role, "payments.verify") && !can(admin.role, "leads.assign")) return fail("Akses ditolak untuk peran Anda.", undefined, "FORBIDDEN");
  const booking = byId("bookings", id);
  if (!booking || booking.status !== "MENUNGGU_PEMBAYARAN") return fail("Hanya pesanan yang belum dibayar yang bisa dibatalkan.");
  update("bookings", id, { status: "DIBATALKAN", note: "Dibatalkan admin", updatedAt: nowIso() });
  if (byId("rooms", booking.roomId)?.status === "RESERVED") update("rooms", booking.roomId, { status: "AVAILABLE" });
  audit(admin, "booking.cancel", id);
  done();
  return { ok: true };
}

// ── Rekening & QRIS (§9.8) ──────────────────────────────────

export async function saveChannel(input: {
  id?: string;
  label: string;
  accountNumber: string;
  accountHolder: string;
  qrisImage: string;
  isActive: boolean;
  sortOrder: number;
}): Promise<{ ok: true } | Fail> {
  const admin = await guard("channels.manage");
  if (isFail(admin)) return admin;
  const label = input.label.trim();
  if (!label) return fail("Label wajib diisi.", "label");
  if (!input.accountNumber.trim() && !input.qrisImage.trim()) return fail("Isi nomor rekening atau gambar QRIS.", "accountNumber");
  const data = {
    label,
    accountNumber: input.accountNumber.trim(),
    accountHolder: input.accountHolder.trim(),
    qrisImage: input.qrisImage.trim(),
    isActive: input.isActive,
    sortOrder: Number(input.sortOrder) || 0,
  };
  if (input.id) {
    if (!update("channels", input.id, data)) return fail("Kanal tidak ditemukan.");
  } else {
    insert("channels", { id: newId("ch"), ...data });
  }
  audit(admin, input.id ? "channel.update" : "channel.create", input.id ?? label);
  done();
  return { ok: true };
}

export async function deleteChannel(id: string): Promise<{ ok: true } | Fail> {
  const admin = await guard("channels.manage");
  if (isFail(admin)) return admin;
  if (!remove("channels", id)) return fail("Kanal tidak ditemukan.");
  audit(admin, "channel.delete", id);
  done();
  return { ok: true };
}
