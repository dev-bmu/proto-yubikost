"use server";
// Aksi Dashboard Customer (PRD §8): ajukan sewa (tahan kamar), batalkan, upload bukti uang muka / pelunasan / perpanjangan.
import { revalidatePath } from "next/cache";
import { byId, insert, newId, nowIso, PROOF_DIR, update } from "@/lib/db";
import { DEPOSIT_AMOUNT, dpOptions, HOLD_HOURS, MAX_CHECKIN_DAYS, PACKAGES, paymentRef } from "@/lib/constants";
import { bookingDue, cancelInvoice, createInvoice } from "@/lib/finance";
import { daysUntil, todayIso } from "@/lib/format";
import { activeBookingOfMember, activeLeaseOfMember, expireBookings, residentContext } from "@/lib/queries";
import { currentMember } from "@/lib/session";
import { savePrivateFile } from "@/lib/upload";
import type { Fail } from "./member";

const fail = (error: string, field?: string, code?: string): Fail => ({ ok: false, error, field, code });
const done = () => revalidatePath("/", "layout");
const isPackage = (m: number) => (PACKAGES as readonly number[]).includes(m);

/**
 * "Ajukan Sewa": pesanan tahap DP (MENUNGGU_PEMBAYARAN), kamar RESERVED selama HOLD_HOURS, faktur penjualan dibuat.
 * startDate = tanggal check-in; harus masih dalam masa berlaku uang muka yang dipilih (Ketentuan Kos Brave).
 */
export async function createBooking(input: { roomId: string; startDate: string; months: number; dpPct: number }): Promise<{ ok: true; id: string } | Fail> {
  const member = await currentMember();
  if (!member) return fail("Silakan masuk terlebih dahulu.", undefined, "AUTH");
  expireBookings();
  if (member.role === "RESIDENT" || activeLeaseOfMember(member.id)) return fail("Anda sudah menempati kamar. Perpanjangan ada di menu Pembayaran.");
  if (activeBookingOfMember(member.id)) return fail("Anda masih punya pesanan aktif. Selesaikan atau batalkan dulu di menu Pembayaran.", undefined, "HAS_BOOKING");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || input.startDate < todayIso()) return fail("Tanggal check-in minimal hari ini.", "startDate");
  const days = daysUntil(input.startDate);
  if (days > MAX_CHECKIN_DAYS) return fail(`Tanggal check-in maksimal ${MAX_CHECKIN_DAYS} hari dari hari ini.`, "startDate");
  if (!isPackage(input.months)) return fail("Pilih paket 1, 3, 6, atau 12 bulan.", "months");
  if (!dpOptions(days).some((t) => t.pct === input.dpPct))
    return fail("Uang muka ini tidak berlaku sampai tanggal check-in. Pilih uang muka lebih besar atau check-in lebih awal.", "dpPct");

  // Cek & tahan kamar tanpa jeda async → atomik di proses Node tunggal
  const room = byId("rooms", input.roomId);
  if (!room || room.status !== "AVAILABLE") return fail("Kamar ini baru saja dipesan orang lain. Pilih kamar lain.", "roomId", "TAKEN");
  update("rooms", room.id, { status: "RESERVED" });
  const now = nowIso();
  const id = newId("bk");
  const invoice = createInvoice({
    memberId: member.id,
    kind: "SEWA_BARU",
    bookingId: id,
    roomId: room.id,
    months: input.months,
    monthlyPrice: room.monthlyPrice,
    deposit: DEPOSIT_AMOUNT,
    dueDate: input.startDate,
  });
  insert("bookings", {
    id,
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
    stage: "DP",
    dpPct: input.dpPct,
    monthlyPrice: room.monthlyPrice,
    invoiceId: invoice.id,
  });
  done();
  return { ok: true, id };
}

/** Customer membatalkan pesanan yang uang mukanya belum dibayar; kamar dilepas, faktur batal. */
export async function cancelBooking(id: string): Promise<{ ok: true } | Fail> {
  const member = await currentMember();
  const booking = byId("bookings", id);
  if (!member || !booking || booking.memberId !== member.id) return fail("Pesanan tidak ditemukan.");
  if (booking.status !== "MENUNGGU_PEMBAYARAN" || booking.stage === "PELUNASAN")
    return fail("Pesanan yang uang mukanya sudah dibayar tidak bisa dibatalkan di sini. Hubungi Customer Care untuk pembatalan & refund sesuai ketentuan.");
  update("bookings", id, { status: "DIBATALKAN", updatedAt: nowIso() });
  cancelInvoice(booking.invoiceId, "Dibatalkan customer");
  if (byId("rooms", booking.roomId)?.status === "RESERVED") update("rooms", booking.roomId, { status: "AVAILABLE" });
  done();
  return { ok: true };
}

/**
 * Upload bukti transfer (PRD §8.4). FormData: kind (SEWA_BARU | PERPANJANGAN), bookingId (sewa baru),
 * months (perpanjangan), channelId, proof (File JPG/PNG/WEBP/PDF ≤ 3 MB). Nominal dihitung server:
 * sewa baru tahap DP = uang muka, tahap PELUNASAN = sisa faktur (sisa sewa + deposit); perpanjangan = sewa × paket (faktur baru).
 */
export async function submitPayment(form: FormData): Promise<{ ok: true; ref: string; amount: number } | Fail> {
  const member = await currentMember();
  if (!member) return fail("Silakan masuk terlebih dahulu.", undefined, "AUTH");
  expireBookings();
  const kind = String(form.get("kind") ?? "");
  const channelId = String(form.get("channelId") ?? "");
  const channel = byId("channels", channelId);
  if (!channel?.isActive) return fail("Pilih rekening/QRIS yang Anda pakai untuk transfer.", "channelId");

  let target: { bookingId: string; leaseId: string; months: number; amount: number; stage: string; invoiceId: string };
  let renewal: NonNullable<ReturnType<typeof residentContext>> | undefined;
  if (kind === "SEWA_BARU") {
    const booking = byId("bookings", String(form.get("bookingId") ?? ""));
    if (!booking || booking.memberId !== member.id) return fail("Pesanan tidak ditemukan.");
    if (booking.status === "KEDALUWARSA")
      return fail(
        booking.stage === "PELUNASAN"
          ? "Masa berlaku uang muka sudah habis dan kamar dilepas. Hubungi Customer Care."
          : "Batas waktu pembayaran sudah lewat dan kamar dilepas. Silakan pesan ulang.",
      );
    if (booking.status !== "MENUNGGU_PEMBAYARAN") return fail("Bukti untuk tagihan ini sudah dikirim.");
    const { due } = bookingDue(booking);
    if (due <= 0) return fail("Tagihan ini sudah lunas.");
    target = { bookingId: booking.id, leaseId: "", months: booking.months, amount: due, stage: booking.stage, invoiceId: booking.invoiceId };
  } else if (kind === "PERPANJANGAN") {
    renewal = residentContext(member.id) ?? undefined;
    if (!renewal) return fail("Perpanjangan hanya untuk penghuni aktif.");
    if (!renewal.profile) return fail("Lengkapi biodata terlebih dahulu.");
    if (renewal.pendingPayment) return fail("Masih ada bukti perpanjangan yang menunggu verifikasi admin.");
    const months = Number(form.get("months"));
    if (!isPackage(months)) return fail("Pilih paket 1, 3, 6, atau 12 bulan.", "months");
    target = { bookingId: "", leaseId: renewal.lease.id, months, amount: renewal.room.monthlyPrice * months, stage: "", invoiceId: "" };
  } else {
    return fail("Jenis pembayaran tidak valid.");
  }

  // Bukti disimpan privat di storage/bukti; admin membukanya lewat /admin/bukti/[id]
  const saved = await savePrivateFile(form.get("proof"), PROOF_DIR, true);
  if ("error" in saved) return fail(saved.error, "proof");

  if (renewal) {
    target.invoiceId = createInvoice({
      memberId: member.id,
      kind: "PERPANJANGAN",
      leaseId: renewal.lease.id,
      roomId: renewal.room.id,
      months: target.months,
      monthlyPrice: renewal.room.monthlyPrice,
      deposit: 0,
      dueDate: renewal.lease.dueDate,
    }).id;
  }

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
    receiptNo: "",
    exportedAt: "",
  });
  if (target.bookingId) update("bookings", target.bookingId, { status: "MENUNGGU_VERIFIKASI", note: "", updatedAt: nowIso() });
  done();
  return { ok: true, ref: paymentRef(payment.id), amount: payment.amount };
}
