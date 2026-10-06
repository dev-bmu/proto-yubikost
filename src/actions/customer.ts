"use server";
// Aksi Dashboard Customer (PRD §8): ajukan sewa (tahan kamar), batalkan, upload bukti pembayaran.
import { revalidatePath } from "next/cache";
import { byId, insert, newId, nowIso, PROOF_DIR, update } from "@/lib/db";
import { bookingBill, HOLD_HOURS, PACKAGES, paymentRef } from "@/lib/constants";
import { todayIso } from "@/lib/format";
import { activeBookingOfMember, activeLeaseOfMember, expireBookings, residentContext } from "@/lib/queries";
import { currentMember } from "@/lib/session";
import { savePrivateFile } from "@/lib/upload";
import type { Fail } from "./member";

const fail = (error: string, field?: string, code?: string): Fail => ({ ok: false, error, field, code });
const done = () => revalidatePath("/", "layout");
const isPackage = (m: number) => (PACKAGES as readonly number[]).includes(m);

/** "Sewa Kamar Ini": buat pesanan MENUNGGU_PEMBAYARAN, kamar RESERVED selama HOLD_HOURS. */
export async function createBooking(input: { roomId: string; startDate: string; months: number }): Promise<{ ok: true; id: string } | Fail> {
  const member = await currentMember();
  if (!member) return fail("Silakan masuk terlebih dahulu.", undefined, "AUTH");
  expireBookings();
  if (member.role === "RESIDENT" || activeLeaseOfMember(member.id)) return fail("Anda sudah menempati kamar. Perpanjangan ada di menu Pembayaran.");
  if (activeBookingOfMember(member.id)) return fail("Anda masih punya pesanan aktif. Selesaikan atau batalkan dulu di menu Pembayaran.", undefined, "HAS_BOOKING");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || input.startDate < todayIso()) return fail("Tanggal mulai sewa minimal hari ini.", "startDate");
  if (!isPackage(input.months)) return fail("Pilih paket 1, 3, 6, atau 12 bulan.", "months");

  // Cek & tahan kamar tanpa jeda async → atomik di proses Node tunggal
  const room = byId("rooms", input.roomId);
  if (!room || room.status !== "AVAILABLE") return fail("Kamar ini baru saja dipesan orang lain. Pilih kamar lain.", "roomId", "TAKEN");
  update("rooms", room.id, { status: "RESERVED" });
  const now = nowIso();
  const booking = insert("bookings", {
    id: newId("bk"),
    memberId: member.id,
    kostId: room.kostId,
    roomId: room.id,
    startDate: input.startDate,
    months: input.months,
    status: "MENUNGGU_PEMBAYARAN",
    expiresAt: new Date(Date.now() + HOLD_HOURS * 3_600_000).toISOString(),
    leaseId: "",
    note: "",
    createdAt: now,
    updatedAt: now,
  });
  done();
  return { ok: true, id: booking.id };
}

/** Customer membatalkan pesanan yang belum dibayar; kamar dilepas. */
export async function cancelBooking(id: string): Promise<{ ok: true } | Fail> {
  const member = await currentMember();
  const booking = byId("bookings", id);
  if (!member || !booking || booking.memberId !== member.id) return fail("Pesanan tidak ditemukan.");
  if (booking.status !== "MENUNGGU_PEMBAYARAN") return fail("Pesanan yang sudah dikirim buktinya tidak bisa dibatalkan. Hubungi Customer Care.");
  update("bookings", id, { status: "DIBATALKAN", updatedAt: nowIso() });
  if (byId("rooms", booking.roomId)?.status === "RESERVED") update("rooms", booking.roomId, { status: "AVAILABLE" });
  done();
  return { ok: true };
}

/**
 * Upload bukti transfer (PRD §8.4). FormData: kind (SEWA_BARU | PERPANJANGAN), bookingId (sewa baru),
 * months (perpanjangan), channelId, proof (File JPG/PNG/WEBP/PDF ≤ 3 MB). Nominal dihitung server.
 */
export async function submitPayment(form: FormData): Promise<{ ok: true; ref: string; amount: number } | Fail> {
  const member = await currentMember();
  if (!member) return fail("Silakan masuk terlebih dahulu.", undefined, "AUTH");
  expireBookings();
  const kind = String(form.get("kind") ?? "");
  const channelId = String(form.get("channelId") ?? "");
  const channel = byId("channels", channelId);
  if (!channel?.isActive) return fail("Pilih rekening/QRIS yang Anda pakai untuk transfer.", "channelId");

  let target: { bookingId: string; leaseId: string; months: number; amount: number };
  if (kind === "SEWA_BARU") {
    const booking = byId("bookings", String(form.get("bookingId") ?? ""));
    if (!booking || booking.memberId !== member.id) return fail("Pesanan tidak ditemukan.");
    if (booking.status === "KEDALUWARSA") return fail("Batas waktu pembayaran sudah lewat dan kamar dilepas. Silakan pesan ulang.");
    if (booking.status !== "MENUNGGU_PEMBAYARAN") return fail("Bukti untuk pesanan ini sudah dikirim.");
    const room = byId("rooms", booking.roomId);
    if (!room) return fail("Kamar tidak ditemukan.");
    target = { bookingId: booking.id, leaseId: "", months: booking.months, amount: bookingBill(room.monthlyPrice, booking.months).total };
  } else if (kind === "PERPANJANGAN") {
    const ctx = residentContext(member.id);
    if (!ctx) return fail("Perpanjangan hanya untuk penghuni aktif.");
    if (!ctx.profile) return fail("Lengkapi biodata terlebih dahulu.");
    if (ctx.pendingPayment) return fail("Masih ada bukti perpanjangan yang menunggu verifikasi admin.");
    const months = Number(form.get("months"));
    if (!isPackage(months)) return fail("Pilih paket 1, 3, 6, atau 12 bulan.", "months");
    target = { bookingId: "", leaseId: ctx.lease.id, months, amount: ctx.room.monthlyPrice * months };
  } else {
    return fail("Jenis pembayaran tidak valid.");
  }

  // Bukti disimpan privat di storage/bukti; admin membukanya lewat /admin/bukti/[id]
  const saved = await savePrivateFile(form.get("proof"), PROOF_DIR, true);
  if ("error" in saved) return fail(saved.error, "proof");

  const payment = insert("payments", {
    id: newId("pay"),
    kind,
    memberId: member.id,
    ...target,
    channelId,
    proofKey: saved.key,
    status: "MENUNGGU_VERIFIKASI",
    note: "",
    verifiedBy: "",
    verifiedAt: "",
    createdAt: nowIso(),
  });
  if (target.bookingId) update("bookings", target.bookingId, { status: "MENUNGGU_VERIFIKASI", note: "", updatedAt: nowIso() });
  done();
  return { ok: true, ref: paymentRef(payment.id), amount: payment.amount };
}
