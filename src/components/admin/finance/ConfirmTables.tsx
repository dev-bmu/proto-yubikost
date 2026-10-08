"use client";
// Tabel Konfirmasi Pembayaran: bukti menunggu verifikasi & pesanan menunggu pembayaran (uang muka / pelunasan).
import { CancelBookingAdminButton, PaymentActions } from "@/components/admin/people/PaymentActions";
import { Pill } from "@/components/ui";
import type { DueRow, TxRow } from "@/lib/finance-views";
import { cn, rupiah } from "@/lib/format";
import { DataTable, type Column, type Filter } from "./DataTable";
import { day, docKey, KIND_OPTIONS, kindGroup, KindPill, Place, ProofLink, relative, Stamp } from "./parts";

/** Baris antrean verifikasi + efek persetujuan yang dihitung server. */
export type VerifyRow = TxRow & { effect: string[] };

const kostFilter: Filter<{ kostName: string }> = { key: "kost", label: "Kost", value: (r) => r.kostName };
const customer = (name: string, sub: string) => (
  <>
    <p className="font-semibold text-slate-900">{name}</p>
    <p className="text-xs text-slate-500 font-mono">{sub}</p>
  </>
);

export function VerifyTable({ rows, canVerify }: { rows: VerifyRow[]; canVerify: boolean }) {
  const columns: Column<VerifyRow>[] = [
    { key: "createdAt", header: "Dikirim", sort: (r) => r.createdAt, cell: (r) => <Stamp iso={r.createdAt} /> },
    { key: "customer", header: "Customer", sort: (r) => r.memberName, cell: (r) => customer(r.memberName, `Ref ${r.ref}`) },
    {
      key: "jenis",
      header: "Jenis",
      sort: (r) => r.label,
      cell: (r) => (
        <>
          <KindPill label={r.label} />
          <p className="text-xs text-slate-500 mt-1">{r.months} bulan</p>
        </>
      ),
    },
    { key: "place", header: "Kamar & Kost", sort: (r) => `${r.kostName} ${r.roomNumber}`, cell: (r) => <Place room={r.roomNumber} kost={r.kostName} /> },
    {
      key: "checkIn",
      header: "Check-in",
      sort: (r) => r.checkIn,
      className: "whitespace-nowrap",
      cell: (r) => (
        <>
          {day(r.checkIn)}
          {r.kind === "PERPANJANGAN" && <p className="text-xs text-slate-500">jatuh tempo</p>}
        </>
      ),
    },
    {
      // Nominal & kanal berdampingan: keduanya yang dicocokkan dengan mutasi rekening
      key: "amount",
      header: "Nominal",
      sort: (r) => r.amount,
      className: "text-right whitespace-nowrap tabular-nums",
      cell: (r) => (
        <>
          <p className="font-semibold text-slate-900">{rupiah(r.amount)}</p>
          {r.invoiceTotal > r.amount && <p className="text-xs text-slate-500">dari {rupiah(r.invoiceTotal)}</p>}
          <p className="text-xs text-slate-700">via {r.channelLabel}</p>
        </>
      ),
    },
    { key: "invoice", header: "No. Faktur", sort: (r) => docKey(r.invoiceNumber), className: "whitespace-nowrap text-xs tabular-nums", cell: (r) => r.invoiceNumber || "-" },
    {
      key: "action",
      pin: true,
      header: "Bukti & Aksi",
      cell: (r) =>
        canVerify ? (
          <div className="space-y-2">
            <ProofLink id={r.id} name={r.memberName} />
            <PaymentActions
              id={r.id}
              name={r.memberName}
              kind={r.kind === "PERPANJANGAN" ? "perpanjangan" : r.stage === "DP" ? "dp" : "pelunasan"}
              kindLabel={r.label}
              amount={r.amount}
              effect={r.effect}
            />
          </div>
        ) : (
          <span className="text-xs text-slate-500 whitespace-nowrap">Menunggu Finance</span>
        ),
    },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      caption="Bukti pembayaran menunggu verifikasi"
      searchPlaceholder="Nama, ref, no. faktur, kamar…"
      filters={[
        { key: "jenis", label: "Jenis", value: kindGroup, options: KIND_OPTIONS },
        { key: "kanal", label: "Kanal", value: (r) => r.channelLabel },
        kostFilter,
      ]}
      initialSort={{ key: "createdAt", dir: "asc" }}
      emptyText="Tidak ada bukti yang menunggu verifikasi."
    />
  );
}

export function DueTable({ rows, canCancel }: { rows: DueRow[]; canCancel: boolean }) {
  const stage = (r: DueRow) => (r.stage === "PELUNASAN" ? "Pelunasan" : `Uang Muka ${r.dpPct}%`);
  const columns: Column<DueRow>[] = [
    { key: "customer", header: "Customer", sort: (r) => r.memberName, cell: (r) => customer(r.memberName, r.phone) },
    { key: "place", header: "Kamar & Kost", sort: (r) => `${r.kostName} ${r.roomNumber}`, cell: (r) => <Place room={r.roomNumber} kost={r.kostName} /> },
    {
      key: "checkIn",
      header: "Check-in",
      sort: (r) => r.checkIn,
      className: "whitespace-nowrap",
      cell: (r) => (
        <>
          {day(r.checkIn)}
          <p className="text-xs text-slate-500">{r.months} bulan</p>
        </>
      ),
    },
    {
      // Tahap + catatannya (bukti ditolak / menunggu check-in)
      key: "stage",
      header: "Tahap · Catatan",
      sort: stage,
      cell: (r) => (
        <>
          <Pill tone={r.stage === "PELUNASAN" ? "info" : "warning"}>{stage(r)}</Pill>
          <p className={cn("text-xs mt-1 max-w-48", r.note ? "text-red-700" : "text-slate-500")}>
            {r.note || (r.stage === "PELUNASAN" ? "Uang muka diterima; dilunasi saat check-in" : "Belum kirim bukti")}
          </p>
        </>
      ),
    },
    {
      key: "amount",
      header: "Tagihan",
      sort: (r) => r.amountDue,
      className: "text-right whitespace-nowrap tabular-nums",
      cell: (r) => (
        <>
          <p className="font-semibold text-slate-900">{rupiah(r.amountDue)}</p>
          <p className="text-xs text-slate-500">{r.stage === "PELUNASAN" ? "sisa sewa + deposit" : "uang muka"}</p>
        </>
      ),
    },
    {
      key: "deadline",
      header: "Batas bayar",
      sort: (r) => r.deadline,
      cell: (r) => (
        <Stamp iso={r.deadline}>
          {/* Waktu relatif dihitung saat render; selisih menit server ↔ peramban diabaikan */}
          <p className="text-xs font-semibold text-amber-800 whitespace-nowrap" suppressHydrationWarning>
            {relative(r.deadline)}
          </p>
        </Stamp>
      ),
    },
    { key: "invoice", header: "No. Faktur", sort: (r) => docKey(r.invoiceNumber), className: "whitespace-nowrap text-xs tabular-nums", cell: (r) => r.invoiceNumber || "-" },
    {
      key: "action",
      pin: true,
      header: "Aksi",
      cell: (r) => (canCancel ? <CancelBookingAdminButton id={r.bookingId} name={r.memberName} stage={r.stage} /> : "-"),
    },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.bookingId}
      caption="Pesanan menunggu pembayaran uang muka atau pelunasan"
      searchPlaceholder="Nama, nomor HP, no. faktur, kamar…"
      filters={[
        {
          key: "tahap",
          label: "Tahap",
          value: (r) => r.stage,
          options: [
            { value: "DP", label: "Uang Muka" },
            { value: "PELUNASAN", label: "Pelunasan" },
          ],
        },
        kostFilter,
      ]}
      initialSort={{ key: "deadline", dir: "asc" }}
      emptyText="Tidak ada pesanan yang menunggu pembayaran."
    />
  );
}
