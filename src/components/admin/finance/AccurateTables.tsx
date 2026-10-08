"use client";
// Ekspor Accurate harian: 3 langkah (tab) sesuai urutan impor — 1 Data Pelanggan → 2 Faktur Penjualan → 3 Penerimaan Penjualan.
// Tiap langkah: data table dengan pilihan baris (default: yang belum diekspor) → unduh Excel template Accurate.
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { exportAccurate } from "@/actions/finance";
import { button, Notice, Spinner } from "@/components/ui";
import type { ACCURATE_EXPORTS, AccurateKind } from "@/lib/accurate";
import { INVOICE_STATUS } from "@/lib/constants";
import type { CustomerRow, InvoiceRow, ReceiptRow } from "@/lib/finance-views";
import { cn, rupiah } from "@/lib/format";
import { DataTable, type Column, type Filter } from "./DataTable";
import { day, docKey, Exported, KindPill, Place, StatusPill } from "./parts";

const KINDS: AccurateKind[] = ["pelanggan", "faktur", "penerimaan"];
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DESC: Record<AccurateKind, string> = {
  pelanggan: "Pelanggan baru (faktur pertamanya terbit di periode ini). Impor pertama agar ID Pelanggan dikenali Accurate.",
  faktur: "Faktur penjualan harian, sudah dibayar maupun belum. Impor setelah Data Pelanggan.",
  penerimaan: "Pembayaran yang disetujui (No. RCP) per tanggal verifikasi. Impor terakhir, setelah fakturnya masuk.",
};

type Result = { ok: boolean; text: string; warnings: string[]; href?: string; filename?: string };

const exportFilter: Filter<{ exportedAt: string }> = {
  key: "ekspor",
  label: "Status ekspor",
  value: (r) => (r.exportedAt ? "sudah" : "belum"),
  options: [
    { value: "belum", label: "Belum diekspor" },
    { value: "sudah", label: "Sudah diekspor" },
  ],
};
const exportedColumn: Column<{ exportedAt: string }> = { key: "exported", header: "Ekspor", sort: (r) => r.exportedAt, cell: (r) => <Exported at={r.exportedAt} /> };
const person = (name: string, no: string, warn?: ReactNode) => (
  <>
    <p className="font-semibold text-slate-900">{name}</p>
    <p className="text-xs text-slate-500 font-mono">{no || "-"}</p>
    {warn}
  </>
);
/** Nomor dokumen + tanggalnya dalam satu kolom (urut: tanggal, lalu nomor). */
const doc = (no: string, date: string) => (
  <>
    <p className="text-xs tabular-nums text-slate-800 whitespace-nowrap">{no}</p>
    <p className="text-xs text-slate-500 whitespace-nowrap">{day(date)}</p>
  </>
);
/** Peringatan per baris (urutan impor / akun Kas/Bank); teks boleh membungkus agar kolom tetap ramping. */
const Flag = ({ danger, children }: { danger?: boolean; children: ReactNode }) => (
  <p className={cn("mt-1 flex items-start gap-1 text-xs font-semibold", danger ? "text-red-700" : "text-amber-800")}>
    <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
    {children}
  </p>
);

export function AccurateTables({
  customers,
  invoices,
  receipts,
  period,
  periodLabel,
  meta,
}: {
  customers: CustomerRow[];
  invoices: InvoiceRow[];
  receipts: ReceiptRow[];
  /** Untuk nama file: "2026-10-08" atau "2026-10-01_sd_2026-10-08" */
  period: string;
  periodLabel: string;
  meta: typeof ACCURATE_EXPORTS;
}) {
  const id = useId();
  const router = useRouter();
  const rows = { pelanggan: customers, faktur: invoices, penerimaan: receipts };
  const pending = {
    pelanggan: customers.filter((r) => !r.exportedAt).map((r) => r.id),
    faktur: invoices.filter((r) => !r.exportedAt && r.status !== "BATAL").map((r) => r.id),
    penerimaan: receipts.filter((r) => !r.exportedAt).map((r) => r.id),
  };
  const [tab, setTab] = useState<AccurateKind>(() => KINDS.find((k) => pending[k].length) ?? "pelanggan");
  const [selected, setSelected] = useState<Record<AccurateKind, string[]>>(pending);
  const [busy, setBusy] = useState<AccurateKind | null>(null);
  const [results, setResults] = useState<Partial<Record<AccurateKind, Result>>>({});

  async function run(kind: AccurateKind) {
    setBusy(kind);
    setResults((r) => ({ ...r, [kind]: undefined }));
    let result: Result;
    try {
      const r = await exportAccurate({ kind, ids: selected[kind], period });
      if (r.ok) {
        const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
        const href = URL.createObjectURL(new Blob([bytes], { type: XLSX_TYPE }));
        const a = Object.assign(document.createElement("a"), { href, download: r.filename });
        document.body.append(a);
        a.click();
        a.remove();
        result = { ok: true, text: `${r.count} data ${meta[kind].title} diekspor.`, warnings: r.warnings, href, filename: r.filename };
        setSelected((s) => ({ ...s, [kind]: [] }));
        router.refresh();
      } else {
        result = { ok: false, text: r.error, warnings: [] };
      }
    } catch {
      result = { ok: false, text: "Gagal menghubungi server. Periksa koneksi lalu coba lagi.", warnings: [] };
    }
    setResults((r) => ({ ...r, [kind]: result }));
    setBusy(null);
  }

  function onTabKey(e: KeyboardEvent) {
    const i = KINDS.indexOf(tab);
    const next = ({ ArrowRight: i + 1, ArrowLeft: i + KINDS.length - 1, Home: 0, End: KINDS.length - 1 } as Record<string, number>)[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const k = KINDS[next % KINDS.length];
    setTab(k);
    document.getElementById(`${id}-tab-${k}`)?.focus();
  }

  // Peringatan sebelum ekspor, dari baris terpilih (urutan impor & akun Kas/Bank)
  const picked = (kind: AccurateKind) => new Set(selected[kind]);
  const fakturNoCustomer = invoices.filter((r) => picked("faktur").has(r.id) && !r.customerExported).length;
  const rcpNoInvoice = receipts.filter((r) => picked("penerimaan").has(r.id) && !r.invoiceExported).length;
  const rcpNoAccount = receipts.filter((r) => picked("penerimaan").has(r.id) && !r.accountNo).length;
  const before: Record<AccurateKind, string[]> = {
    pelanggan: [],
    faktur: fakturNoCustomer ? [`${fakturNoCustomer} faktur terpilih: pelanggannya belum diekspor. Impor Data Pelanggan (langkah 1) ke Accurate lebih dulu.`] : [],
    penerimaan: [
      ...(rcpNoInvoice ? [`${rcpNoInvoice} penerimaan terpilih: fakturnya belum diekspor. Impor Faktur Penjualan (langkah 2) lebih dulu.`] : []),
      ...(rcpNoAccount ? [`${rcpNoAccount} penerimaan terpilih: kode akun Kas/Bank kanalnya belum diisi di menu Rekening & QRIS.`] : []),
    ],
  };

  const customerColumns: Column<CustomerRow>[] = [
    { key: "no", header: "ID Pelanggan", sort: (r) => r.customerNo, className: "whitespace-nowrap font-mono text-xs text-slate-800", cell: (r) => r.customerNo },
    { key: "name", header: "Nama", sort: (r) => r.name, className: "font-semibold text-slate-900", cell: (r) => r.name },
    {
      key: "contact",
      header: "Handphone · Email",
      cell: (r) => (
        <>
          <p className="tabular-nums whitespace-nowrap">{r.phone}</p>
          <p className="text-xs text-slate-500">{r.email || "Email belum diisi"}</p>
        </>
      ),
    },
    { key: "first", header: "Faktur pertama", sort: (r) => r.firstInvoiceDate, className: "whitespace-nowrap", cell: (r) => day(r.firstInvoiceDate) },
    { key: "count", header: "Jumlah faktur", sort: (r) => r.invoiceCount, className: "text-right tabular-nums", cell: (r) => r.invoiceCount },
    exportedColumn,
  ];

  const invoiceColumns: Column<InvoiceRow>[] = [
    { key: "no", header: "No. Faktur", sort: (r) => `${r.date} ${docKey(r.number)}`, cell: (r) => doc(r.number, r.date) },
    {
      key: "customer",
      header: "Customer",
      sort: (r) => r.memberName,
      cell: (r) =>
        person(r.memberName, r.customerNo, !r.customerExported && <Flag>Pelanggan belum diekspor</Flag>),
    },
    { key: "place", header: "Kamar & Kost", sort: (r) => `${r.kostName} ${r.roomNumber}`, cell: (r) => <Place room={r.roomNumber} kost={r.kostName} /> },
    {
      key: "detail",
      header: "Rincian",
      cell: (r) => (
        <>
          <p>
            {r.kind === "PERPANJANGAN" ? "Perpanjangan" : "Sewa"} {r.months} bln × <span className="whitespace-nowrap">{rupiah(r.monthlyPrice)}</span>
          </p>
          {r.deposit > 0 && <p className="text-xs text-slate-500">+ deposit <span className="whitespace-nowrap">{rupiah(r.deposit)}</span></p>}
          <p className="text-xs text-slate-500 whitespace-nowrap">{r.checkIn ? `Check-in ${day(r.checkIn)}` : `Jatuh tempo ${day(r.dueDate)}`}</p>
        </>
      ),
    },
    {
      key: "total",
      header: "Total",
      sort: (r) => r.total,
      className: "text-right whitespace-nowrap tabular-nums",
      cell: (r) => (
        <>
          <p className="font-semibold text-slate-900">{rupiah(r.total)}</p>
          <p className="text-xs text-slate-500">dibayar {rupiah(r.paid)}</p>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      sort: (r) => r.status,
      cell: (r) => (
        <>
          <StatusPill map={INVOICE_STATUS} value={r.status} />
          {r.note && <p className="text-xs text-slate-500 mt-1 max-w-48">{r.note}</p>}
        </>
      ),
    },
    exportedColumn,
  ];

  const receiptColumns: Column<ReceiptRow>[] = [
    { key: "no", header: "No. Penerimaan", sort: (r) => `${r.date} ${docKey(r.receiptNo)}`, cell: (r) => doc(r.receiptNo, r.date) },
    { key: "customer", header: "Customer", sort: (r) => r.memberName, cell: (r) => person(r.memberName, r.customerNo) },
    {
      key: "invoice",
      header: "No. Faktur",
      sort: (r) => docKey(r.invoiceNumber),
      cell: (r) => (
        <>
          <p className="text-xs tabular-nums text-slate-800 whitespace-nowrap">{r.invoiceNumber || "-"}</p>
          {!r.invoiceExported && <Flag>Faktur belum diekspor</Flag>}
        </>
      ),
    },
    { key: "label", header: "Jenis", sort: (r) => r.label, cell: (r) => <KindPill label={r.label} /> },
    { key: "amount", header: "Nominal", sort: (r) => r.amount, className: "text-right whitespace-nowrap tabular-nums font-semibold text-slate-900", cell: (r) => rupiah(r.amount) },
    {
      key: "channel",
      header: "Kanal · Akun",
      sort: (r) => r.channelLabel,
      cell: (r) => (
        <>
          <p>{r.channelLabel}</p>
          {r.payingBank !== r.channelLabel && <p className="text-xs text-slate-500">{r.payingBank}</p>}
          {r.accountNo ? (
            <p className="text-xs text-slate-500 font-mono whitespace-nowrap">Akun {r.accountNo}</p>
          ) : (
            <Flag danger>Akun Kas/Bank kosong</Flag>
          )}
        </>
      ),
    },
    exportedColumn,
  ];

  const table = (kind: AccurateKind) => {
    const selection = {
      selected: selected[kind],
      onChange: (ids: string[]) => setSelected((s) => ({ ...s, [kind]: ids })),
      actions: (
        <button
          type="button"
          className={button("primary", "md", "w-full sm:w-auto")}
          disabled={!selected[kind].length || busy !== null}
          aria-busy={busy === kind}
          onClick={() => run(kind)}
        >
          {busy === kind ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" aria-hidden="true" />}
          Ekspor Excel Accurate ({selected[kind].length})
        </button>
      ),
    };
    const caption = `${meta[kind].title} ${periodLabel}`;
    if (kind === "pelanggan")
      return (
        <DataTable
          rows={customers}
          columns={customerColumns}
          rowKey={(r) => r.id}
          caption={caption}
          searchPlaceholder="ID pelanggan, nama, HP, email…"
          filters={[exportFilter]}
          initialSort={{ key: "no", dir: "asc" }}
          selection={{ ...selection, label: (r) => `${r.customerNo} ${r.name}` }}
          emptyText="Tidak ada pelanggan baru di periode ini."
        />
      );
    if (kind === "faktur")
      return (
        <DataTable
          rows={invoices}
          columns={invoiceColumns}
          rowKey={(r) => r.id}
          caption={caption}
          searchPlaceholder="No. faktur, nama, ID pelanggan, kamar…"
          filters={[
            { key: "status", label: "Status faktur", value: (r) => r.status, options: Object.entries(INVOICE_STATUS).map(([value, s]) => ({ value, label: s.label })) },
            exportFilter,
          ]}
          initialSort={{ key: "no", dir: "asc" }}
          selection={{ ...selection, label: (r) => `faktur ${r.number}`, disabled: (r) => r.status === "BATAL" }}
          emptyText="Tidak ada faktur di periode ini."
        />
      );
    return (
      <DataTable
        rows={receipts}
        columns={receiptColumns}
        rowKey={(r) => r.id}
        caption={caption}
        searchPlaceholder="No. penerimaan / faktur, nama, kanal…"
        filters={[{ key: "kanal", label: "Kanal", value: (r) => r.channelLabel }, exportFilter]}
        initialSort={{ key: "no", dir: "asc" }}
        selection={{ ...selection, label: (r) => `penerimaan ${r.receiptNo}` }}
        emptyText="Tidak ada penerimaan (pembayaran disetujui) di periode ini."
      />
    );
  };

  return (
    <>
      <div role="tablist" aria-label="Langkah ekspor Accurate" onKeyDown={onTabKey} className="grid gap-3 md:grid-cols-3 mb-6">
        {KINDS.map((k) => {
          const on = tab === k;
          const left = pending[k].length;
          return (
            <button
              key={k}
              id={`${id}-tab-${k}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`${id}-panel-${k}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setTab(k)}
              className={cn(
                "text-left bg-white rounded-2xl border p-4 sm:p-5 shadow-card transition-colors",
                on ? "border-primary ring-2 ring-primary/25" : "border-slate-200/80 hover:border-primary/40",
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn("w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-extrabold", on ? "bg-primary text-white" : "bg-primary/10 text-primary")}
                  aria-hidden="true"
                >
                  {meta[k].step}
                </span>
                <span className="font-bold text-slate-900">
                  <span className="sr-only">Langkah {meta[k].step}: </span>
                  {meta[k].title}
                </span>
              </span>
              <span className="block text-sm text-slate-500 mt-2">{DESC[k]}</span>
              <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="text-slate-700">
                  <strong className="text-slate-900 tabular-nums">{rows[k].length}</strong> data
                </span>
                {left ? (
                  <span className="font-semibold text-amber-800">
                    <strong className="tabular-nums">{left}</strong> belum diekspor
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {rows[k].length ? "Semua sudah diekspor" : "Tidak ada data"}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {KINDS.map((k) => {
        const result = results[k];
        return (
          <section key={k} role="tabpanel" id={`${id}-panel-${k}`} aria-labelledby={`${id}-tab-${k}`} hidden={tab !== k} className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Langkah {meta[k].step} · {meta[k].title}
              </h2>
              <p className="text-sm text-slate-500">
                {periodLabel} · template impor <span className="font-mono text-xs">{meta[k].template}</span>
              </p>
            </div>

            {before[k].length > 0 && (
              <Notice tone="warning">
                <ul className="list-disc pl-5 space-y-1">
                  {before[k].map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </Notice>
            )}

            {result && (
              <Notice tone={result.ok ? "success" : "danger"}>
                <div role={result.ok ? "status" : "alert"}>
                  <p>
                    <strong>{result.ok ? "Berhasil." : "Ekspor gagal."}</strong> {result.text}
                    {result.filename && (
                      <>
                        {" "}File <span className="font-mono text-xs">{result.filename}</span> terunduh.{" "}
                        <a href={result.href} download={result.filename} className="font-bold underline">Unduh ulang</a>
                      </>
                    )}
                  </p>
                  {result.warnings.length > 0 && (
                    <>
                      <p className="mt-2 font-semibold text-amber-900">Perlu diperhatikan:</p>
                      <ul className="list-disc pl-5 space-y-0.5 text-amber-900">
                        {result.warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </Notice>
            )}

            {table(k)}
          </section>
        );
      })}
    </>
  );
}
