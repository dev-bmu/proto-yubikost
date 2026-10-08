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
import { DP_TIERS, HOLD_HOURS, INQUIRY_STATUSES, PACKAGES } from "@/lib/constants";
import { cancelInvoice, endOfDayWib, nextReceiptNumber, syncInvoice, wibDate } from "@/lib/finance";
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
  if (activeBookingOfMember(member.id)) return fail("Prospect ini punya pesanan aktif di Dashboard. Verifikasi atau batalkan di menu Finance › Konfirmasi Pembayaran.");
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
    customerNo: "",
    accurateExportedAt: "",
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
    cancelInvoice(p.invoiceId, "Sewa diakhiri");
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

// ── Verifikasi Pembayaran (§9.7, §9.10) ─────────────────────

/**
 * Setujui bukti; setiap bukti yang disetujui mendapat nomor penerimaan (RCP) dan faktur dihitung ulang.
 * Sewa baru tahap DP → pesanan masuk tahap PELUNASAN, kamar tetap ditahan sampai masa berlaku uang muka habis.
 * Sewa baru tahap PELUNASAN → lease ACTIVE (mulai tanggal check-in), member RESIDENT, kamar OCCUPIED, lead CLOSED_WON.
 * PERPANJANGAN → jatuh tempo + paket (dihitung dari jatuh tempo lama).
 */
export async function approvePayment(id: string): Promise<{ ok: true; dueDate: string } | Fail> {
  const admin = await guard("payments.verify");
  if (isFail(admin)) return admin;
  const payment = byId("payments", id);
  if (!payment || payment.status !== "MENUNGGU_VERIFIKASI") return fail("Pembayaran tidak ditemukan atau sudah diproses.");
  const now = nowIso();
  const verified = { status: "DISETUJUI", verifiedBy: admin.id, verifiedAt: now, receiptNo: nextReceiptNumber(wibDate(now)) };

  if (payment.kind === "PERPANJANGAN") {
    const lease = byId("leases", payment.leaseId);
    if (!lease || lease.status !== "ACTIVE") return fail("Sewa aktif tidak ditemukan.");
    const dueDate = addMonths(lease.dueDate, payment.months);
    update("leases", lease.id, { dueDate });
    update("payments", id, verified);
    syncInvoice(payment.invoiceId);
    audit(admin, "payment.approve", id, `Perpanjangan ${lease.dueDate} → ${dueDate} · ${verified.receiptNo}`);
    done();
    return { ok: true, dueDate };
  }

  const booking = byId("bookings", payment.bookingId);
  const member = byId("members", payment.memberId);
  const room = booking && byId("rooms", booking.roomId);
  if (!booking || booking.status !== "MENUNGGU_VERIFIKASI" || !member || !room) return fail("Pesanan tidak ditemukan.");

  if (booking.stage === "DP") {
    // Uang muka berlaku N hari sejak dibayar (tanggal bukti dikirim); pelunasan + deposit paling lambat akhir masa itu.
    const tier = DP_TIERS.find((t) => t.pct === booking.dpPct) ?? DP_TIERS[0];
    const settleBy = endOfDayWib(wibDate(payment.createdAt), tier.days);
    update("payments", id, verified);
    syncInvoice(payment.invoiceId);
    update("bookings", booking.id, { stage: "PELUNASAN", status: "MENUNGGU_PEMBAYARAN", expiresAt: settleBy, note: "", updatedAt: now });
    audit(admin, "payment.approve", id, `Uang muka ${booking.dpPct}% ${member.name} · kamar ${room.number} ditahan s/d ${wibDate(settleBy)} · ${verified.receiptNo}`);
    done();
    return { ok: true, dueDate: wibDate(settleBy) };
  }

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
    createdAt: now,
  });
  update("rooms", room.id, { status: "OCCUPIED" });
  update("members", member.id, { role: "RESIDENT" });
  update("bookings", booking.id, { status: "DISETUJUI", leaseId: lease.id, updatedAt: now });
  update("payments", id, { ...verified, leaseId: lease.id });
  update("invoices", booking.invoiceId, { leaseId: lease.id });
  syncInvoice(payment.invoiceId);
  for (const inq of all("inquiries").filter((i) => i.memberId === member.id && (i.status === "NEW" || i.status === "CONTACTED"))) {
    update("inquiries", inq.id, { status: "CLOSED_WON", updatedAt: now });
  }
  audit(admin, "payment.approve", id, `Pelunasan ${member.name} → kamar ${room.number}, ${booking.startDate} s/d ${dueDate} · ${verified.receiptNo}`);
  done();
  return { ok: true, dueDate };
}

/**
 * Tolak bukti; customer upload ulang. Tahap DP: batas bayar 24 jam baru. Tahap PELUNASAN: batas tetap akhir masa
 * uang muka, minimal 24 jam dari sekarang. Perpanjangan: fakturnya dibatalkan (pengajuan berikutnya membuat faktur baru).
 */
export async function rejectPayment(id: string, reason: string): Promise<{ ok: true } | Fail> {
  const admin = await guard("payments.verify");
  if (isFail(admin)) return admin;
  const note = reason.trim();
  if (note.length < 5) return fail("Alasan penolakan minimal 5 karakter.", "reason");
  const payment = byId("payments", id);
  if (!payment || payment.status !== "MENUNGGU_VERIFIKASI") return fail("Pembayaran tidak ditemukan atau sudah diproses.");
  update("payments", id, { status: "DITOLAK", note, verifiedBy: admin.id, verifiedAt: nowIso() });
  const booking = payment.bookingId ? byId("bookings", payment.bookingId) : undefined;
  if (booking) {
    const hold = new Date(Date.now() + HOLD_HOURS * 3_600_000).toISOString();
    update("bookings", booking.id, {
      status: "MENUNGGU_PEMBAYARAN",
      note,
      expiresAt: booking.stage === "PELUNASAN" && booking.expiresAt > hold ? booking.expiresAt : hold,
      updatedAt: nowIso(),
    });
  } else {
    cancelInvoice(payment.invoiceId, `Bukti ditolak: ${note}`);
  }
  audit(admin, "payment.reject", id, note);
  done();
  return { ok: true };
}

/** Batalkan pesanan yang sedang menunggu pembayaran (uang muka atau pelunasan); kamar dilepas, faktur batal. */
export async function cancelBookingAdmin(id: string): Promise<{ ok: true } | Fail> {
  const admin = await guard();
  if (isFail(admin)) return admin;
  if (!can(admin.role, "payments.verify") && !can(admin.role, "leads.assign")) return fail("Akses ditolak untuk peran Anda.", undefined, "FORBIDDEN");
  const booking = byId("bookings", id);
  if (!booking || booking.status !== "MENUNGGU_PEMBAYARAN") return fail("Hanya pesanan yang menunggu pembayaran yang bisa dibatalkan.");
  const note = booking.stage === "PELUNASAN" ? "Dibatalkan admin setelah uang muka dibayar (refund sesuai ketentuan)" : "Dibatalkan admin";
  update("bookings", id, { status: "DIBATALKAN", note, updatedAt: nowIso() });
  cancelInvoice(booking.invoiceId, note);
  if (byId("rooms", booking.roomId)?.status === "RESERVED") update("rooms", booking.roomId, { status: "AVAILABLE" });
  audit(admin, "booking.cancel", id, note);
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
  accurateAccount?: string;
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
    accurateAccount: (input.accurateAccount ?? "").trim(),
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
