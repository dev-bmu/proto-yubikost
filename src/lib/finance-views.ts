// Data menu Finance (PRD §9.10): baris tabel siap kirim ke komponen klien (objek polos, tanpa fungsi). Server only.
import { all } from "./db";
import { bookingBill, paymentLabel, paymentRef } from "./constants";
import { formatPhone } from "./format";
import { wibDate } from "./finance";
import { expireBookings } from "./queries";

/** Peta bantu: dibaca sekali per request agar join antar tabel tidak O(n²) membaca file. */
function lookups() {
  const rooms = new Map(all("rooms").map((r) => [r.id, r]));
  const kosts = new Map(all("kosts").map((k) => [k.id, k]));
  const place = (roomId: string) => {
    const room = rooms.get(roomId);
    return { roomNumber: room?.number ?? "-", kostName: (room && kosts.get(room.kostId)?.name) ?? "-" };
  };
  const paid = new Map<string, number>();
  for (const p of all("payments")) if (p.status === "DISETUJUI" && p.invoiceId) paid.set(p.invoiceId, (paid.get(p.invoiceId) ?? 0) + p.amount);
  return {
    paid: (invoiceId: string) => paid.get(invoiceId) ?? 0,
    members: new Map(all("members").map((m) => [m.id, m])),
    bookings: new Map(all("bookings").map((b) => [b.id, b])),
    leases: new Map(all("leases").map((l) => [l.id, l])),
    invoices: new Map(all("invoices").map((i) => [i.id, i])),
    channels: new Map(all("channels").map((c) => [c.id, c])),
    admins: new Map(all("admins").map((a) => [a.id, a.name])),
    place,
  };
}

export type TxRow = {
  id: string;
  ref: string;
  kind: string;
  stage: string;
  label: string;
  status: string;
  amount: number;
  /** Tanggal bukti dikirim (WIB, YYYY-MM-DD) */
  date: string;
  createdAt: string;
  verifiedAt: string;
  verifier: string;
  note: string;
  memberId: string;
  memberName: string;
  phone: string;
  customerNo: string;
  kostName: string;
  roomNumber: string;
  /** Tanggal check-in (sewa baru) atau jatuh tempo saat bukti dikirim (perpanjangan) */
  checkIn: string;
  months: number;
  invoiceNumber: string;
  invoiceTotal: number;
  invoicePaid: number;
  invoiceStatus: string;
  receiptNo: string;
  channelLabel: string;
  exportedAt: string;
};

/** Semua bukti pembayaran (antrean + riwayat), terbaru di atas. */
export function transactionRows(): TxRow[] {
  const L = lookups();
  return all("payments")
    .flatMap((p) => {
      const member = L.members.get(p.memberId);
      if (!member) return [];
      const booking = L.bookings.get(p.bookingId);
      const lease = L.leases.get(p.leaseId);
      const invoice = L.invoices.get(p.invoiceId);
      const roomId = booking?.roomId ?? lease?.roomId ?? invoice?.roomId ?? "";
      return [{
        id: p.id,
        ref: paymentRef(p.id),
        kind: p.kind,
        stage: p.stage,
        label: paymentLabel({ kind: p.kind, stage: p.stage, dpPct: booking?.dpPct }),
        status: p.status,
        amount: p.amount,
        date: wibDate(p.createdAt),
        createdAt: p.createdAt,
        verifiedAt: p.verifiedAt,
        verifier: L.admins.get(p.verifiedBy) ?? p.verifiedBy,
        note: p.note,
        memberId: member.id,
        memberName: member.name,
        phone: formatPhone(member.whatsapp),
        customerNo: member.customerNo,
        ...L.place(roomId),
        checkIn: booking?.startDate ?? invoice?.dueDate ?? lease?.startDate ?? "",
        months: p.months,
        invoiceNumber: invoice?.number ?? "",
        invoiceTotal: invoice?.total ?? 0,
        invoicePaid: invoice ? L.paid(invoice.id) : 0,
        invoiceStatus: invoice?.status ?? "",
        receiptNo: p.receiptNo,
        channelLabel: L.channels.get(p.channelId)?.label ?? "-",
        exportedAt: p.exportedAt,
      }];
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type DueRow = {
  bookingId: string;
  memberName: string;
  phone: string;
  kostName: string;
  roomNumber: string;
  checkIn: string;
  months: number;
  stage: string;
  dpPct: number;
  amountDue: number;
  /** Batas bayar (ISO): tahap DP = 24 jam; tahap PELUNASAN = akhir masa berlaku uang muka */
  deadline: string;
  invoiceNumber: string;
  note: string;
  createdAt: string;
};

/** Pesanan yang menunggu pembayaran: uang muka belum dibayar, atau DP diterima dan menunggu pelunasan. */
export function dueRows(): DueRow[] {
  expireBookings();
  const L = lookups();
  return all("bookings")
    .filter((b) => b.status === "MENUNGGU_PEMBAYARAN")
    .flatMap((b) => {
      const member = L.members.get(b.memberId);
      if (!member) return [];
      const invoice = L.invoices.get(b.invoiceId);
      const bill = bookingBill(b.monthlyPrice, b.months, b.dpPct);
      return [{
        bookingId: b.id,
        memberName: member.name,
        phone: formatPhone(member.whatsapp),
        ...L.place(b.roomId),
        checkIn: b.startDate,
        months: b.months,
        stage: b.stage,
        dpPct: b.dpPct,
        amountDue: b.stage === "PELUNASAN" ? Math.max(0, (invoice?.total ?? bill.total) - (invoice ? L.paid(invoice.id) : 0)) : bill.dp,
        deadline: b.expiresAt,
        invoiceNumber: invoice?.number ?? "",
        note: b.note,
        createdAt: b.createdAt,
      }];
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
}

const inRange = (date: string, from: string, to: string) => !!date && date >= from && date <= to;

export type InvoiceRow = {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  kind: string;
  customerNo: string;
  memberName: string;
  kostName: string;
  roomNumber: string;
  checkIn: string;
  months: number;
  monthlyPrice: number;
  rent: number;
  deposit: number;
  total: number;
  paid: number;
  status: string;
  note: string;
  exportedAt: string;
  /** Pelanggan belum pernah diekspor ke Accurate → ekspor Data Pelanggan dulu */
  customerExported: boolean;
};

/** Faktur penjualan per tanggal faktur (harian), sudah dibayar maupun belum. */
export function invoiceRows(from: string, to: string): InvoiceRow[] {
  const L = lookups();
  return all("invoices")
    .filter((i) => inRange(i.date, from, to))
    .map((i) => {
      const member = L.members.get(i.memberId);
      const booking = L.bookings.get(i.bookingId);
      return {
        id: i.id,
        number: i.number,
        date: i.date,
        dueDate: i.dueDate,
        kind: i.kind,
        customerNo: member?.customerNo ?? "",
        memberName: member?.name ?? "-",
        ...L.place(i.roomId),
        checkIn: booking?.startDate ?? "",
        months: i.months,
        monthlyPrice: i.monthlyPrice,
        rent: i.rent,
        deposit: i.deposit,
        total: i.total,
        paid: L.paid(i.id),
        status: i.status,
        note: i.note,
        exportedAt: i.exportedAt,
        customerExported: !!member?.accurateExportedAt,
      };
    })
    .sort((a, b) => a.number.localeCompare(b.number));
}

export type ReceiptRow = {
  id: string;
  receiptNo: string;
  date: string;
  customerNo: string;
  memberName: string;
  invoiceNumber: string;
  invoiceExported: boolean;
  label: string;
  amount: number;
  channelLabel: string;
  /** Kode akun Kas/Bank Accurate dari kanal; kosong = belum diatur di Rekening & QRIS */
  accountNo: string;
  payingBank: string;
  kostName: string;
  roomNumber: string;
  exportedAt: string;
};

/** Penerimaan penjualan = pembayaran yang disetujui, per tanggal disetujui (harian). */
export function receiptRows(from: string, to: string): ReceiptRow[] {
  const L = lookups();
  return all("payments")
    .filter((p) => p.status === "DISETUJUI" && p.receiptNo && inRange(wibDate(p.verifiedAt), from, to))
    .map((p) => {
      const member = L.members.get(p.memberId);
      const invoice = L.invoices.get(p.invoiceId);
      const channel = L.channels.get(p.channelId);
      const booking = L.bookings.get(p.bookingId);
      return {
        id: p.id,
        receiptNo: p.receiptNo,
        date: wibDate(p.verifiedAt),
        customerNo: member?.customerNo ?? "",
        memberName: member?.name ?? "-",
        invoiceNumber: invoice?.number ?? "",
        invoiceExported: !!invoice?.exportedAt,
        label: paymentLabel({ kind: p.kind, stage: p.stage, dpPct: booking?.dpPct }),
        amount: p.amount,
        channelLabel: channel?.label ?? "-",
        accountNo: channel?.accurateAccount ?? "",
        payingBank: channel?.qrisImage ? "QRIS" : "Transfer Bank",
        ...L.place(invoice?.roomId ?? booking?.roomId ?? ""),
        exportedAt: p.exportedAt,
      };
    })
    .sort((a, b) => a.receiptNo.localeCompare(b.receiptNo));
}

export type CustomerRow = {
  id: string;
  customerNo: string;
  name: string;
  phone: string;
  email: string;
  firstInvoiceDate: string;
  invoiceCount: number;
  exportedAt: string;
};

/** Pelanggan baru = faktur pertamanya terbit di rentang tanggal (diekspor sekali, sebelum fakturnya). */
export function customerRows(from: string, to: string): CustomerRow[] {
  const first = new Map<string, { date: string; count: number }>();
  for (const i of all("invoices")) {
    const f = first.get(i.memberId);
    first.set(i.memberId, { date: f && f.date < i.date ? f.date : i.date, count: (f?.count ?? 0) + 1 });
  }
  return all("members")
    .flatMap((m) => {
      const f = first.get(m.id);
      if (!m.customerNo || !f || !inRange(f.date, from, to)) return [];
      return [{
        id: m.id,
        customerNo: m.customerNo,
        name: m.name,
        phone: formatPhone(m.whatsapp),
        email: m.email,
        firstInvoiceDate: f.date,
        invoiceCount: f.count,
        exportedAt: m.accurateExportedAt,
      }];
    })
    .sort((a, b) => a.customerNo.localeCompare(b.customerNo));
}

/** Tanggal (WIB) yang punya faktur atau penerimaan, terbaru dulu — pintasan di halaman harian. */
export function activityDates(limit = 10) {
  const dates = new Set<string>();
  for (const i of all("invoices")) dates.add(i.date);
  for (const p of all("payments")) if (p.status === "DISETUJUI" && p.receiptNo) dates.add(wibDate(p.verifiedAt));
  return [...dates].filter(Boolean).sort().reverse().slice(0, limit);
}

/** Angka ringkas Finance: antrean verifikasi, tagihan berjalan, penerimaan hari ini/bulan ini, piutang. */
export function financeSummary(today: string) {
  const payments = all("payments");
  const approved = payments.filter((p) => p.status === "DISETUJUI");
  const month = today.slice(0, 7);
  const L = lookups();
  const open = all("invoices").filter((i) => i.status === "BELUM_LUNAS" || i.status === "SEBAGIAN");
  return {
    pending: payments.filter((p) => p.status === "MENUNGGU_VERIFIKASI").length,
    due: all("bookings").filter((b) => b.status === "MENUNGGU_PEMBAYARAN").length,
    receivedToday: approved.filter((p) => wibDate(p.verifiedAt) === today).reduce((s, p) => s + p.amount, 0),
    receivedMonth: approved.filter((p) => wibDate(p.verifiedAt).startsWith(month)).reduce((s, p) => s + p.amount, 0),
    receivable: open.reduce((s, i) => s + i.total - L.paid(i.id), 0),
    openInvoices: open.length,
  };
}
