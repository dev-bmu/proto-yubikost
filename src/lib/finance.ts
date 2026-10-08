// Faktur, penerimaan, dan tagihan pesanan (PRD §9.10, Ketentuan Kos Brave 17 Juli 2026). Server only.
import { all, byId, insert, newId, nowIso, update, type Booking, type Invoice } from "./db";
import { bookingBill, customerNo, docNumber, docPrefix, DP_TIERS } from "./constants";

/** Tanggal (YYYY-MM-DD) dari ISO timestamp menurut WIB — dasar tanggal faktur, penerimaan, dan filter harian. */
export const wibDate = (iso: string) => (iso ? new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 10) : "");

/** Akhir hari (23:59:59 WIB) dari tanggal YYYY-MM-DD + N hari, sebagai ISO. */
export function endOfDayWib(isoDate: string, plusDays = 0) {
  const d = new Date(`${isoDate}T23:59:59+07:00`);
  d.setUTCDate(d.getUTCDate() + plusDays);
  return d.toISOString();
}

const nextCounter = (numbers: string[], prefix: string) =>
  numbers.reduce((max, n) => (n.startsWith(prefix) ? Math.max(max, Number(n.slice(prefix.length)) || 0) : max), 0) + 1;

/** INV-BRAVE-{bulan romawi}-{tahun}-{0001}; counter direset tiap bulan. */
export const nextInvoiceNumber = (date: string) =>
  docNumber("INV", date, nextCounter(all("invoices").map((i) => i.number), docPrefix("INV", date)));

/** RCP-BRAVE-{bulan romawi}-{tahun}-{0001}; counter direset tiap bulan. */
export const nextReceiptNumber = (date: string) =>
  docNumber("RCP", date, nextCounter(all("payments").map((p) => p.receiptNo), docPrefix("RCP", date)));

/** ID Pelanggan Accurate, diberikan sekali saat member pertama kali punya faktur. */
export function ensureCustomerNo(memberId: string) {
  const member = byId("members", memberId);
  if (!member) return "";
  if (member.customerNo) return member.customerNo;
  const no = customerNo(nextCounter(all("members").map((m) => m.customerNo), "C.YK"));
  update("members", memberId, { customerNo: no });
  return no;
}

export function createInvoice(input: {
  memberId: string;
  kind: "SEWA_BARU" | "PERPANJANGAN";
  bookingId?: string;
  leaseId?: string;
  roomId: string;
  months: number;
  monthlyPrice: number;
  deposit: number;
  dueDate: string;
}): Invoice {
  ensureCustomerNo(input.memberId);
  const date = wibDate(nowIso());
  const rent = input.monthlyPrice * input.months;
  return insert("invoices", {
    id: newId("inv"),
    number: nextInvoiceNumber(date),
    memberId: input.memberId,
    kind: input.kind,
    bookingId: input.bookingId ?? "",
    leaseId: input.leaseId ?? "",
    roomId: input.roomId,
    date,
    dueDate: input.dueDate,
    months: input.months,
    monthlyPrice: input.monthlyPrice,
    rent,
    deposit: input.deposit,
    total: rent + input.deposit,
    status: "BELUM_LUNAS",
    note: "",
    exportedAt: "",
    createdAt: nowIso(),
  });
}

/** Jumlah pembayaran DISETUJUI untuk sebuah faktur. */
export const invoicePaid = (invoiceId: string) =>
  all("payments").reduce((sum, p) => (p.invoiceId === invoiceId && p.status === "DISETUJUI" ? sum + p.amount : sum), 0);

/** Hitung ulang status faktur dari pembayaran yang disetujui (faktur BATAL tidak diubah). */
export function syncInvoice(invoiceId: string) {
  const inv = byId("invoices", invoiceId);
  if (!inv || inv.status === "BATAL") return;
  const paid = invoicePaid(invoiceId);
  update("invoices", invoiceId, { status: paid >= inv.total ? "LUNAS" : paid > 0 ? "SEBAGIAN" : "BELUM_LUNAS" });
}

export function cancelInvoice(invoiceId: string, note: string) {
  const inv = byId("invoices", invoiceId);
  if (inv && inv.status !== "LUNAS" && inv.status !== "BATAL") update("invoices", invoiceId, { status: "BATAL", note });
}

/** Tagihan pesanan saat ini: tahap DP = uang muka; tahap PELUNASAN = sisa faktur (sisa sewa + deposit). */
export function bookingDue(booking: Booking) {
  const bill = bookingBill(booking.monthlyPrice, booking.months, booking.dpPct);
  const invoice = byId("invoices", booking.invoiceId);
  const paid = invoice ? invoicePaid(invoice.id) : 0;
  const due = booking.stage === "PELUNASAN" ? Math.max(0, (invoice?.total ?? bill.total) - paid) : bill.dp;
  const tier = DP_TIERS.find((t) => t.pct === booking.dpPct);
  return { bill, invoice, paid, due, tier };
}
