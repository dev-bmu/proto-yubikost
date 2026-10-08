"use client";
// Data Transaksi: seluruh bukti pembayaran (semua status) dalam satu data table.
import { INVOICE_STATUS, PAYMENT_STATUS } from "@/lib/constants";
import type { TxRow } from "@/lib/finance-views";
import { rupiah } from "@/lib/format";
import { DataTable, type Column } from "./DataTable";
import { day, dayMonth, docKey, Exported, KIND_OPTIONS, kindGroup, KindPill, Place, Stamp, StatusPill } from "./parts";

export function TransactionTable({ rows, canVerify, initialStatus }: { rows: TxRow[]; canVerify: boolean; initialStatus: string }) {
  const columns: Column<TxRow>[] = [
    { key: "date", header: "Tanggal", sort: (r) => r.createdAt, cell: (r) => <Stamp iso={r.createdAt} /> },
    {
      key: "ref",
      header: "Ref",
      sort: (r) => r.ref,
      className: "whitespace-nowrap",
      cell: (r) => (
        <>
          <span className="font-mono text-xs text-slate-800">{r.ref}</span>
          {canVerify && (
            <a href={`/admin/bukti/${r.id}`} target="_blank" rel="noopener noreferrer" className="block text-xs font-semibold text-primary hover:underline">
              Lihat bukti<span className="sr-only"> {r.memberName} (tab baru)</span>
            </a>
          )}
        </>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      sort: (r) => r.memberName,
      cell: (r) => (
        <>
          <p className="font-semibold text-slate-900 whitespace-nowrap">{r.memberName}</p>
          <p className="text-xs text-slate-500 font-mono">{r.customerNo || "Belum ada ID"}</p>
        </>
      ),
    },
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
      key: "amount",
      header: "Nominal",
      sort: (r) => r.amount,
      className: "text-right whitespace-nowrap tabular-nums font-semibold text-slate-900",
      cell: (r) => rupiah(r.amount),
    },
    {
      key: "invoice",
      header: "No. Faktur",
      sort: (r) => docKey(r.invoiceNumber),
      className: "whitespace-nowrap",
      cell: (r) =>
        r.invoiceNumber ? (
          <>
            <p className="text-xs tabular-nums text-slate-800">{r.invoiceNumber}</p>
            <div className="mt-1">
              <StatusPill map={INVOICE_STATUS} value={r.invoiceStatus} />
            </div>
          </>
        ) : (
          "-"
        ),
    },
    { key: "receipt", header: "No. Penerimaan", sort: (r) => docKey(r.receiptNo), className: "whitespace-nowrap text-xs tabular-nums", cell: (r) => r.receiptNo || "-" },
    { key: "channel", header: "Kanal", sort: (r) => r.channelLabel, cell: (r) => r.channelLabel },
    {
      key: "status",
      header: "Status",
      sort: (r) => r.status,
      cell: (r) => (
        <>
          <StatusPill map={PAYMENT_STATUS} value={r.status} />
          {r.verifiedAt && (
            <p className="text-xs text-slate-500 mt-1 whitespace-nowrap">
              {r.verifier || "-"} · {dayMonth(r.verifiedAt)}
            </p>
          )}
          {r.note && <p className="text-xs text-red-700 mt-0.5 max-w-48">{r.note}</p>}
        </>
      ),
    },
    {
      key: "exported",
      header: "Diekspor",
      sort: (r) => r.exportedAt,
      cell: (r) => (r.status === "DISETUJUI" ? <Exported at={r.exportedAt} /> : <span className="text-slate-500">-</span>),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      caption="Seluruh transaksi pembayaran"
      searchPlaceholder="Nama, ref, ID pelanggan, no. faktur / penerimaan…"
      filters={[
        {
          key: "status",
          label: "Status",
          value: (r) => r.status,
          options: Object.entries(PAYMENT_STATUS).map(([value, s]) => ({ value, label: s.label })),
        },
        { key: "jenis", label: "Jenis", value: kindGroup, options: KIND_OPTIONS },
        { key: "kost", label: "Kost", value: (r) => r.kostName },
      ]}
      initialFilters={initialStatus ? { status: initialStatus } : {}}
      dateFilter={{ label: "Tanggal", value: (r) => r.date }}
      initialSort={{ key: "date", dir: "desc" }}
      summary={(list) => {
        const approved = list.filter((r) => r.status === "DISETUJUI");
        return (
          <>
            · Disetujui <strong className="text-slate-900 tabular-nums">{rupiah(approved.reduce((s, r) => s + r.amount, 0))}</strong> ({approved.length} bukti)
          </>
        );
      }}
      emptyText="Belum ada transaksi."
    />
  );
}
