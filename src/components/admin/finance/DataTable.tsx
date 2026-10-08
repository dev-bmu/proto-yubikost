"use client";
// Data table admin (menu Finance): cari, filter, rentang tanggal, urut kolom, paginasi, pilih baris + aksi massal.
// Generik & tanpa dependensi; kolom (fungsi render) didefinisikan di komponen klien pemakainya.
import { useId, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react";
import { Input, Select } from "@/components/Field";
import { td, th } from "@/components/admin/kit";
import { button } from "@/components/ui";
import { cn } from "@/lib/format";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Nilai pengurutan; tanpa ini kolom tidak bisa diurutkan. */
  sort?: (row: T) => string | number;
  /** Kelas tambahan untuk th & td, mis. "text-right whitespace-nowrap". */
  className?: string;
  /** Menempel di kanan saat tabel digulir ke samping, mulai layar sm (kolom Aksi tetap terlihat). */
  pin?: boolean;
};

export type Filter<T> = {
  key: string;
  label: string;
  value: (row: T) => string;
  /** Default: nilai unik dari data. */
  options?: { value: string; label: string }[];
};

type Sort = { key: string; dir: "asc" | "desc" };

const SIZES = [10, 25, 50];
const collator = new Intl.Collator("id", { numeric: true, sensitivity: "base" });
const control =
  "min-h-11 sm:min-h-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:text-slate-400 disabled:bg-slate-50";
/** Sel ringkas (px-2.5, tepi kartu px-4); header lengket dengan garis bawah yang ikut lengket. */
const TH = cn(th, "px-2.5 first:pl-4 last:pr-4 sticky top-0 z-10 shadow-[inset_0_-1px_0_var(--color-slate-200)]");
const TD = cn(td, "px-2.5 first:pl-4 last:pr-4");

/** Teks cari = semua nilai teks/angka baris, plus versi angka saja ("0812-3456" ↔ "08123456", "1.200.000" ↔ 1200000). */
function haystack(row: object) {
  const text = Object.values(row).filter((v) => typeof v === "string" || typeof v === "number").join(" ").toLowerCase();
  return `${text} ${text.replace(/[^\d\s]/g, "")}`;
}

export function DataTable<T extends object>({
  rows,
  columns,
  rowKey,
  caption,
  searchPlaceholder = "Cari…",
  filters = [],
  initialFilters = {},
  dateFilter,
  initialSort,
  selection,
  summary,
  emptyText = "Belum ada data.",
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Judul tabel untuk pembaca layar. */
  caption: string;
  searchPlaceholder?: string;
  filters?: Filter<T>[];
  initialFilters?: Record<string, string>;
  /** Filter rentang tanggal (YYYY-MM-DD, inklusif). */
  dateFilter?: { label: string; value: (row: T) => string };
  initialSort?: Sort;
  selection?: {
    selected: string[];
    onChange: (ids: string[]) => void;
    /** Nama baris untuk label checkbox, mis. nomor faktur. */
    label: (row: T) => string;
    /** Baris yang tidak bisa dipilih (mis. faktur batal). */
    disabled?: (row: T) => boolean;
    /** Slot aksi massal (mis. tombol ekspor). */
    actions?: ReactNode;
  };
  /** Ringkasan hasil filter, tampil di samping jumlah data. */
  summary?: (rows: T[]) => ReactNode;
  emptyText?: string;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [values, setValues] = useState<Record<string, string>>(initialFilters);
  const [range, setRange] = useState({ from: "", to: "" });
  const [sort, setSort] = useState<Sort | undefined>(initialSort);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(SIZES[0]);

  // ponytail: filter + urut dihitung ulang tiap render; cukup untuk ratusan baris. useMemo/virtualisasi bila ribuan.
  const text = q.trim().toLowerCase();
  const needle = /^[\d.,\s-]+$/.test(text) ? text.replace(/\D/g, "") : text;
  const filtered = rows.filter((r) => {
    const date = dateFilter?.value(r) ?? "";
    return (
      (!needle || haystack(r).includes(needle)) &&
      filters.every((f) => !values[f.key] || f.value(r) === values[f.key]) &&
      (!range.from || date >= range.from) &&
      (!range.to || date <= range.to)
    );
  });
  const sortBy = columns.find((c) => c.key === sort?.key)?.sort;
  const sorted = sortBy
    ? [...filtered].sort((a, b) => {
        const x = sortBy(a);
        const y = sortBy(b);
        const diff = typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y));
        return sort?.dir === "desc" ? -diff : diff;
      })
    : filtered;
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const shown = sorted.slice(start, start + size);
  const filtering = !!(q || range.from || range.to || Object.values(values).some(Boolean));

  const reset = () => {
    setQ("");
    setValues({});
    setRange({ from: "", to: "" });
    setPage(1);
  };
  const toggleSort = (key: string) => {
    setSort((s) => ({ key, dir: s?.key === key && s.dir === "asc" ? "desc" : "asc" }));
    setPage(1);
  };

  // Pilihan baris
  const picked = new Set(selection?.selected);
  const can = (r: T) => !selection?.disabled?.(r);
  const pageIds = shown.filter(can).map(rowKey);
  const allIds = sorted.filter(can).map(rowKey);
  const pageAll = pageIds.length > 0 && pageIds.every((k) => picked.has(k));
  const pageSome = pageIds.some((k) => picked.has(k));
  const pick = (ids: string[]) => selection?.onChange([...new Set(ids)]);
  const colSpan = columns.length + (selection ? 1 : 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
      <div className="p-4 border-b border-slate-100 grid grid-cols-2 gap-3 lg:flex lg:flex-wrap lg:items-end">
        <div className="col-span-2 lg:flex-1 lg:min-w-56">
          <label htmlFor={`${id}-q`} className="block text-xs font-semibold text-slate-600 mb-1.5">Cari</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
            <input
              id={`${id}-q`}
              type="search"
              value={q}
              onChange={(e) => (setQ(e.target.value), setPage(1))}
              placeholder={searchPlaceholder}
              className="w-full min-h-11 pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
        {filters.map((f) => {
          const options = f.options ?? [...new Set(rows.map(f.value))].filter(Boolean).sort(collator.compare).map((v) => ({ value: v, label: v }));
          return (
            <Select
              key={f.key}
              label={f.label}
              value={values[f.key] ?? ""}
              onChange={(e) => (setValues((v) => ({ ...v, [f.key]: e.target.value })), setPage(1))}
              className="min-w-0 lg:w-40"
            >
              <option value="">Semua</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          );
        })}
        {dateFilter && (
          // Dua tanggal satu kelompok agar selalu berpindah baris bersama
          <div role="group" aria-label={`Rentang ${dateFilter.label.toLowerCase()}`} className="col-span-2 grid grid-cols-2 gap-3 lg:flex">
            <Input
              label={`${dateFilter.label} dari`}
              type="date"
              value={range.from}
              max={range.to || undefined}
              onChange={(e) => (setRange((r) => ({ ...r, from: e.target.value })), setPage(1))}
              className="min-w-0 lg:w-36"
            />
            <Input
              label={`${dateFilter.label} sampai`}
              type="date"
              value={range.to}
              min={range.from || undefined}
              onChange={(e) => (setRange((r) => ({ ...r, to: e.target.value })), setPage(1))}
              className="min-w-0 lg:w-36"
            />
          </div>
        )}
        {filtering && (
          <button type="button" onClick={reset} className={button("ghost", "md", "col-span-2 lg:col-span-1")}>
            <RotateCcw className="w-4 h-4" aria-hidden="true" /> Reset filter
          </button>
        )}
      </div>

      {selection && (
        <div className="px-4 py-3 border-b border-slate-100 bg-primary-ultralight/60 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-sm text-slate-700" aria-live="polite">
            <strong className="text-slate-900 tabular-nums">{picked.size}</strong> baris dipilih
          </p>
          {allIds.some((k) => !picked.has(k)) && (
            <button type="button" className={button("ghost", "sm", "min-h-11 sm:min-h-9")} onClick={() => pick([...picked, ...allIds])}>
              Pilih semua {allIds.length} hasil{filtering ? " filter" : ""}
            </button>
          )}
          {picked.size > 0 && (
            <button type="button" className={button("ghost", "sm", "min-h-11 sm:min-h-9 text-slate-600")} onClick={() => pick([])}>
              Hapus pilihan
            </button>
          )}
          {selection.actions && <div className="w-full sm:w-auto sm:ml-auto">{selection.actions}</div>}
        </div>
      )}

      {/* Wilayah gulir bisa difokus (keyboard) — header lengket saat tabel digulir */}
      <div role="region" aria-label={caption} tabIndex={0} className="max-h-[70vh] overflow-auto focus-visible:[outline-offset:-2px]">
        <table className="w-full">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {selection && (
                <th scope="col" className={cn(TH, "w-12")}>
                  <label className="flex items-center justify-center min-h-9 min-w-9 -m-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-primary cursor-pointer"
                      checked={pageAll}
                      ref={(el) => {
                        if (el) el.indeterminate = pageSome && !pageAll;
                      }}
                      disabled={!pageIds.length}
                      onChange={() => pick(pageAll ? [...picked].filter((k) => !pageIds.includes(k)) : [...picked, ...pageIds])}
                      aria-label="Pilih semua baris di halaman ini"
                    />
                  </label>
                </th>
              )}
              {columns.map((c) => {
                const dir = sort?.key === c.key ? sort.dir : undefined;
                const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={c.sort ? (dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none") : undefined}
                    className={cn(TH, c.pin && "sm:right-0 z-20 sm:shadow-[inset_0_-1px_0_var(--color-slate-200),inset_1px_0_0_var(--color-slate-200)]", c.className)}
                  >
                    {c.sort ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn("inline-flex items-center gap-1 -mx-1 px-1 py-1 rounded uppercase tracking-wider font-bold hover:text-primary", dir && "text-primary")}
                      >
                        {c.header}
                        <Icon className={cn("w-3.5 h-3.5 shrink-0", !dir && "opacity-50")} aria-hidden="true" />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((r) => {
              const key = rowKey(r);
              const on = picked.has(key);
              return (
                <tr key={key} className={cn("hover:bg-slate-50/60", on && "bg-primary-ultralight/50 hover:bg-primary-ultralight/70")}>
                  {selection && (
                    <td className={cn(TD, "w-12")}>
                      <label className={cn("flex items-center justify-center min-h-11 min-w-11 -m-3", can(r) && "cursor-pointer")}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
                          checked={on}
                          disabled={!can(r)}
                          onChange={() => pick(on ? [...picked].filter((k) => k !== key) : [...picked, key])}
                          aria-label={`Pilih ${selection.label(r)}`}
                        />
                      </label>
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={cn(TD, c.pin && "sm:sticky sm:right-0 sm:bg-white sm:shadow-[inset_1px_0_0_var(--color-slate-200)]", c.className)}>{c.cell(r)}</td>
                  ))}
                </tr>
              );
            })}
            {!shown.length && (
              <tr>
                <td colSpan={colSpan} className={cn(TD, "py-12 text-center text-slate-500")}>
                  {rows.length ? (
                    <>
                      Tidak ada data yang cocok dengan pencarian atau filter.{" "}
                      <button type="button" onClick={reset} className="font-bold text-primary underline hover:text-primary-dark">Reset filter</button>
                    </>
                  ) : (
                    emptyText
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-slate-600">
        <p aria-live="polite">
          {sorted.length ? (
            <>
              Menampilkan <strong className="text-slate-900 tabular-nums">{start + 1}–{start + shown.length}</strong> dari{" "}
              <strong className="text-slate-900 tabular-nums">{sorted.length}</strong>
              {sorted.length !== rows.length && <> (difilter dari {rows.length})</>}
            </>
          ) : (
            "Tidak ada data"
          )}
          {summary && sorted.length > 0 && <span className="block sm:inline sm:ml-2">{summary(sorted)}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`${id}-size`} className="text-xs font-semibold text-slate-600">Baris</label>
          <select
            id={`${id}-size`}
            value={size}
            onChange={(e) => (setSize(Number(e.target.value)), setPage(1))}
            className={cn(control, "px-2")}
          >
            {SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <nav aria-label={`Halaman ${caption}`} className="flex items-center gap-1">
            <button type="button" className={cn(control, "w-11 sm:w-9 flex items-center justify-center")} onClick={() => setPage(current - 1)} disabled={current <= 1} aria-label="Halaman sebelumnya">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="px-2 tabular-nums whitespace-nowrap">
              Hal. {current} / {pages}
            </span>
            <button type="button" className={cn(control, "w-11 sm:w-9 flex items-center justify-center")} onClick={() => setPage(current + 1)} disabled={current >= pages} aria-label="Halaman berikutnya">
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
