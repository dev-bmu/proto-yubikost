// Ekspor impor-massal Accurate Online (PRD §9.10): urutan 1 Data Pelanggan → 2 Faktur Penjualan → 3 Penerimaan Penjualan.
// Template asli dari tim Finance ada di data/accurate/*.xlsx; hanya baris data yang diisi (lib/xlsx.ts). Server only.
import path from "node:path";
import { all } from "./db";
import { paymentLabel } from "./constants";
import { fillTemplate, type SheetRow } from "./xlsx";
import { wibDate } from "./finance";

/**
 * Master data Accurate yang dipakai saat ekspor.
 * ponytail: kode item, satuan, gudang, dan cabang masih placeholder — sesuaikan dengan master data Accurate tim Finance
 * (atau pindahkan ke halaman pengaturan bila sering berubah). Akun Kas/Bank diatur per kanal di menu Rekening & QRIS.
 */
export const ACCURATE = {
  branch: "",
  warehouse: "",
  itemRent: "SEWA-KOS",
  unitRent: "BULAN",
  itemDeposit: "DEPOSIT-KOS",
  unitDeposit: "",
  customerCategory: "Umum",
} as const;

export const ACCURATE_EXPORTS = {
  pelanggan: { step: 1, title: "Data Pelanggan", template: "1-pelanggan.xlsx" },
  faktur: { step: 2, title: "Faktur Penjualan", template: "2-faktur-penjualan.xlsx" },
  penerimaan: { step: 3, title: "Penerimaan Penjualan", template: "3-penerimaan-penjualan.xlsx" },
} as const;
export type AccurateKind = keyof typeof ACCURATE_EXPORTS;

const TEMPLATE_DIR = path.join(process.cwd(), "data", "accurate");
/** "2026-10-08" → "08/10/2026" (format tanggal impor Accurate) */
const dmy = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
/** "6281234560011" → "081234560011" */
const localPhone = (p: string) => (p.startsWith("62") ? "0" + p.slice(2) : p);


/** Bangun baris sheet + daftar peringatan untuk id yang dipilih. Baris yang tidak memenuhi syarat dilewati. */
export function buildAccurateRows(kind: AccurateKind, ids: string[]): { rows: SheetRow[]; included: string[]; warnings: string[] } {
  const want = new Set(ids);
  const warnings: string[] = [];
  const included: string[] = [];
  const rows: SheetRow[] = [];
  const rooms = new Map(all("rooms").map((r) => [r.id, r]));
  const kosts = new Map(all("kosts").map((k) => [k.id, k]));
  const place = (roomId: string) => {
    const room = rooms.get(roomId);
    return { room: room?.number ?? "-", kost: (room && kosts.get(room.kostId)?.name) ?? "-" };
  };

  if (kind === "pelanggan") {
    const firstInvoice = new Map<string, string>();
    for (const i of all("invoices")) if (!firstInvoice.has(i.memberId) || i.date < firstInvoice.get(i.memberId)!) firstInvoice.set(i.memberId, i.date);
    for (const m of all("members").filter((m) => want.has(m.id))) {
      if (!m.customerNo) {
        warnings.push(`${m.name} belum punya ID Pelanggan (belum ada faktur) — dilewati.`);
        continue;
      }
      included.push(m.id);
      rows.push({
        Kategori: ACCURATE.customerCategory,
        "ID Pelanggan": m.customerNo,
        Nama: m.name,
        Handphone: localPhone(m.whatsapp),
        Email: m.email,
        "Mata uang Utama": "IDR",
        "Saldo awal per tanggal": dmy(`${(firstInvoice.get(m.id) ?? wibDate(m.createdAt)).slice(0, 4)}-01-01`),
        "Saldo awal": 0,
        "Mata Uang Saldo": "IDR",
        "Kategori Harga": ACCURATE.customerCategory,
        "Kategori Diskon": ACCURATE.customerCategory,
        "Non Aktif": "TIDAK",
      });
    }
  }

  if (kind === "faktur") {
    const members = new Map(all("members").map((m) => [m.id, m]));
    const bookings = new Map(all("bookings").map((b) => [b.id, b]));
    for (const inv of all("invoices").filter((i) => want.has(i.id)).sort((a, b) => a.number.localeCompare(b.number))) {
      const member = members.get(inv.memberId);
      if (inv.status === "BATAL") {
        warnings.push(`${inv.number} berstatus Batal — dilewati.`);
        continue;
      }
      if (!member?.customerNo) {
        warnings.push(`${inv.number}: pelanggan belum punya ID — dilewati.`);
        continue;
      }
      if (!member.accurateExportedAt) warnings.push(`${inv.number}: pelanggan ${member.customerNo} belum diekspor; impor Data Pelanggan lebih dulu.`);
      const { room, kost } = place(inv.roomId);
      const checkIn = bookings.get(inv.bookingId)?.startDate ?? "";
      const what = inv.kind === "PERPANJANGAN" ? "Perpanjangan sewa" : "Sewa";
      included.push(inv.id);
      rows.push({
        "CUSTOMER NO": member.customerNo,
        NUMBER: inv.number,
        BRANCH: ACCURATE.branch,
        DATE: dmy(inv.date),
        DESCRIPTION: `${what} ${kost} Kamar ${room}, ${inv.months} bulan${checkIn ? `, check-in ${dmy(checkIn)}` : ""} · ${member.name}`,
        "DUE DATE": dmy(inv.dueDate),
        "ITEM:ITEM NO": ACCURATE.itemRent,
        "ITEM:QUANTITY": inv.months,
        "ITEM:UNITPRICE": inv.monthlyPrice,
        "ITEM:UNIT": ACCURATE.unitRent,
        "ITEM:WAREHOUSE NAME": ACCURATE.warehouse,
        "ITEM:NAME": `${what} ${kost} Kamar ${room} (${inv.months} bulan)`,
        "ITEM:ITEM NOTES": checkIn ? `Check-in ${dmy(checkIn)}` : `Jatuh tempo lama ${dmy(inv.dueDate)}`,
      });
      // Baris lanjutan faktur yang sama: kolom header dikosongkan, hanya kolom item (aturan template Accurate)
      if (inv.deposit > 0)
        rows.push({
          "ITEM:ITEM NO": ACCURATE.itemDeposit,
          "ITEM:QUANTITY": 1,
          "ITEM:UNITPRICE": inv.deposit,
          "ITEM:UNIT": ACCURATE.unitDeposit,
          "ITEM:WAREHOUSE NAME": ACCURATE.warehouse,
          "ITEM:NAME": `Deposit kamar ${room} ${kost}`,
          "ITEM:ITEM NOTES": "Dikembalikan setelah masa sewa berakhir sesuai ketentuan",
        });
    }
  }

  if (kind === "penerimaan") {
    const members = new Map(all("members").map((m) => [m.id, m]));
    const invoices = new Map(all("invoices").map((i) => [i.id, i]));
    const channels = new Map(all("channels").map((c) => [c.id, c]));
    const bookings = new Map(all("bookings").map((b) => [b.id, b]));
    for (const p of all("payments").filter((p) => want.has(p.id)).sort((a, b) => a.receiptNo.localeCompare(b.receiptNo))) {
      const member = members.get(p.memberId);
      const invoice = invoices.get(p.invoiceId);
      const channel = channels.get(p.channelId);
      if (p.status !== "DISETUJUI" || !p.receiptNo || !invoice || !member?.customerNo) {
        warnings.push(`Pembayaran ${p.receiptNo || p.id} belum disetujui atau tanpa faktur — dilewati.`);
        continue;
      }
      if (!invoice.exportedAt) warnings.push(`${p.receiptNo}: faktur ${invoice.number} belum diekspor; impor Faktur Penjualan lebih dulu.`);
      if (!channel?.accurateAccount) warnings.push(`${p.receiptNo}: kode akun Kas/Bank kanal ${channel?.label ?? "-"} belum diisi (menu Rekening & QRIS).`);
      const { room, kost } = place(invoice.roomId);
      included.push(p.id);
      rows.push({
        "CUSTOMER NO": member.customerNo,
        NUMBER: p.receiptNo,
        BRANCH: ACCURATE.branch,
        DATE: dmy(wibDate(p.verifiedAt)),
        "EXPENSE ACCOUNT NO": channel?.accurateAccount ?? "",
        DESCRIPTION: `${paymentLabel({ kind: p.kind, stage: p.stage, dpPct: bookings.get(p.bookingId)?.dpPct })} ${kost} Kamar ${room} · ${member.name}`,
        "PAYMENT TOTAL": p.amount,
        "PAYMENT NUMBER": invoice.number,
        "PAYMENT VALUE": p.amount,
        "PAYING BANK": channel?.qrisImage ? "QRIS" : "Transfer Bank",
      });
    }
  }

  return { rows, included, warnings };
}

export const buildAccurateFile = (kind: AccurateKind, rows: SheetRow[]) =>
  fillTemplate(path.join(TEMPLATE_DIR, ACCURATE_EXPORTS[kind].template), rows);
