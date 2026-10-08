// Finance → Ekspor Accurate (PRD §9.10): ekspor harian impor-massal Accurate Online
// dengan urutan 1 Data Pelanggan → 2 Faktur Penjualan → 3 Penerimaan Penjualan.
import Link from "next/link";
import Form from "next/form";
import { Info } from "lucide-react";
import { AccurateTables } from "@/components/admin/finance/AccurateTables";
import { day } from "@/components/admin/finance/parts";
import { Forbidden, PageHeader } from "@/components/admin/kit";
import { Input } from "@/components/Field";
import { button, Notice } from "@/components/ui";
import { requirePermission } from "@/lib/admin-guard";
import { ACCURATE, ACCURATE_EXPORTS } from "@/lib/accurate";
import { wibDate } from "@/lib/finance";
import { activityDates, customerRows, invoiceRows, receiptRows } from "@/lib/finance-views";
import { cn } from "@/lib/format";

export const metadata = { title: "Ekspor Accurate" };

const BASE = "/admin/finance/accurate";
const isDate = (s?: string): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
/** "2026-10-08" ± N hari */
const shift = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const chip = (on: boolean) =>
  cn(
    "inline-flex items-center shrink-0 whitespace-nowrap min-h-11 sm:min-h-9 px-3 rounded-xl border text-sm font-semibold transition-colors",
    on ? "bg-primary text-white border-primary" : "bg-white text-slate-700 border-slate-200 hover:border-primary hover:text-primary",
  );

export default async function AccuratePage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { allowed } = await requirePermission("finance.export");
  if (!allowed) return <Forbidden what="mengekspor data ke Accurate" />;

  const sp = await searchParams;
  const today = wibDate(new Date().toISOString());
  let from = isDate(sp.from) ? sp.from : today;
  let to = isDate(sp.to) ? sp.to : from;
  if (from > to) [from, to] = [to, from];
  const period = from === to ? from : `${from}_sd_${to}`;
  const periodLabel = from === to ? day(from) : `${day(from)} – ${day(to)}`;
  const href = (f: string, t: string) => `${BASE}?from=${f}&to=${t}`;
  const quick = [
    { label: "Hari ini", from: today, to: today },
    { label: "Kemarin", from: shift(today, -1), to: shift(today, -1) },
    { label: "7 hari terakhir", from: shift(today, -6), to: today },
  ];

  return (
    <>
      <PageHeader
        title="Ekspor Accurate"
        description="Ekspor harian ke Excel impor Accurate Online. Impor berurutan: Data Pelanggan, lalu Faktur Penjualan, lalu Penerimaan Penjualan."
      />

      <section aria-labelledby="periode" className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-4 sm:p-5 mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
          <div>
            <h2 id="periode" className="text-sm font-bold text-slate-900">Periode</h2>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">{periodLabel}</p>
            <p className="text-xs text-slate-500">Tanggal faktur (faktur & pelanggan baru) dan tanggal disetujui (penerimaan), WIB.</p>
          </div>
          <Form action={BASE} className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-2">
            <Input label="Dari" type="date" name="from" defaultValue={from} max={today} className="min-w-0 sm:w-40" />
            <Input label="Sampai" type="date" name="to" defaultValue={to} max={today} className="min-w-0 sm:w-40" />
            <button type="submit" className={button("neutral", "md", "col-span-2")}>Tampilkan</button>
          </Form>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {quick.map((q) => (
            <Link key={q.label} href={href(q.from, q.to)} className={chip(from === q.from && to === q.to)} aria-current={from === q.from && to === q.to ? "true" : undefined}>
              {q.label}
            </Link>
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Tanggal dengan faktur / penerimaan</p>
          {/* Ponsel: satu baris geser; layar lebar: membungkus */}
          <ul className="flex gap-2 overflow-x-auto pb-1 -mb-1 sm:flex-wrap sm:overflow-visible">
            {activityDates(10).map((d) => (
              <li key={d}>
                <Link href={href(d, d)} className={chip(from === d && to === d)} aria-current={from === d && to === d ? "true" : undefined}>
                  {day(d)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* key: ganti periode = pilihan baris default dihitung ulang */}
      <AccurateTables
        key={period}
        customers={customerRows(from, to)}
        invoices={invoiceRows(from, to)}
        receipts={receiptRows(from, to)}
        period={period}
        periodLabel={periodLabel}
        meta={ACCURATE_EXPORTS}
      />

      <Notice tone="neutral" className="mt-6 flex gap-3">
        <Info className="w-5 h-5 shrink-0 text-slate-500" aria-hidden="true" />
        <div>
          <p>
            <strong>Master data Accurate sementara:</strong> item sewa <code className="font-mono">{ACCURATE.itemRent}</code> (satuan{" "}
            <code className="font-mono">{ACCURATE.unitRent}</code>), item deposit <code className="font-mono">{ACCURATE.itemDeposit}</code>, kategori
            pelanggan <code className="font-mono">{ACCURATE.customerCategory}</code>, gudang {ACCURATE.warehouse || "(kosong)"}, cabang{" "}
            {ACCURATE.branch || "(kosong)"}.
          </p>
          <p className="mt-1">
            Kode item/gudang masih sementara — sesuaikan dengan master data Accurate tim Finance. Kode akun Kas/Bank diatur per kanal di{" "}
            <Link href="/admin/rekening" className="font-semibold text-primary underline">Rekening & QRIS</Link>.
          </p>
        </div>
      </Notice>
    </>
  );
}
