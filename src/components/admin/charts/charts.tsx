"use client";
// Chart generik admin (HTML/SVG buatan sendiri, tanpa pustaka). Satu sumbu, mark tipis, celah 2px,
// tooltip hover + fokus keyboard per mark (Esc menutup). Data lengkap selalu ada di tabel ChartCard.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { cn } from "@/lib/format";
import { TRACK } from "./palette";
import { fmtFull, fmtShort, niceTicks, type Unit } from "./scale";

export type Series = { name: string; color: string };
type TipRow = { name: string; value: string; color: string };

const total = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const lastNonZero = (xs: number[]) => xs.reduce((k, x, j) => (x > 0 ? j : k), -1);
const alignAt = (i: number, n: number) => (n < 3 ? "center" : i < n / 3 ? "start" : i >= (2 * n) / 3 ? "end" : "center");

function Tip({ title, rows, align = "center", style, className }: {
  title: string; rows: TipRow[]; align?: "start" | "center" | "end"; style?: CSSProperties; className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn(
        "pointer-events-none absolute z-20 w-max max-w-60 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg",
        align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2",
        className,
      )}
    >
      <p className="mb-1 text-xs font-semibold text-slate-500">{title}</p>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-2 whitespace-nowrap text-xs">
            <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className="font-bold tabular-nums text-slate-900">{r.value}</span>
            <span className="text-slate-500">{r.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Hover + fokus keyboard untuk mark ke-i. */
function useActive() {
  const [active, setActive] = useState<number | null>(null);
  const off = (i: number) => setActive((a) => (a === i ? null : a));
  const bind = (i: number) => ({
    tabIndex: 0,
    onMouseEnter: () => setActive(i),
    onMouseLeave: () => off(i),
    onFocus: () => setActive(i),
    onBlur: () => off(i),
    onKeyDown: (e: { key: string }) => e.key === "Escape" && setActive(null),
  });
  return [active, bind] as const;
}

/** Lebar elemen (px) via ResizeObserver; 0 sebelum terukur. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    setW(ref.current.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

type ColumnsProps = {
  /** Label sumbu X (ringkas) */
  categories: string[];
  /** Judul tooltip (lengkap); default = categories */
  titles?: string[];
  series: Series[];
  /** values[kategori][seri] */
  values: number[][];
  unit: Unit;
  height?: number;
};

function Columns({ categories, titles = categories, series, values, unit, height = 208, mode }: ColumnsProps & { mode: "stack" | "group" }) {
  const [active, bind] = useActive();
  const [plot, w] = useWidth();
  const n = categories.length;
  const last = n - 1;
  const sums = values.map(total);
  const ticks = niceTicks(Math.max(0, ...(mode === "stack" ? sums : values.flat())), unit === "count");
  const top = ticks[ticks.length - 1];
  const pct = (v: number) => (v / top) * 100;
  // Apakah `px` muat dalam `cats` kategori? Sebelum lebar terukur (SSR) pakai tebakan aman.
  const fits = (cats: number, px: number) => (w ? (cats * w) / n >= px : cats > 1);
  // Label langsung selektif: kategori terakhir yang berisi + puncak (bila tidak bertabrakan).
  const end = lastNonZero(sums);
  const peak = sums.indexOf(Math.max(...sums));
  const labelled = new Set([end]);
  if (peak !== end && fits(Math.abs(end - peak), unit === "rupiah" ? 56 : 24)) labelled.add(peak);
  // Label sumbu X dijarangkan menurut lebar plot (±52px per label); kategori terakhir selalu tampil.
  const step = w ? Math.max(1, Math.ceil((n * 52) / w)) : n > 8 ? 4 : n > 5 ? 2 : 1;

  return (
    <div className="flex flex-1 flex-col pt-6">
      <div className="flex flex-1 gap-2" style={{ minHeight: height }}>
        <div className="relative w-11 shrink-0" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 translate-y-1/2 text-xs leading-none tabular-nums text-slate-500" style={{ bottom: `${pct(t)}%` }}>
              {fmtShort(unit, t)}
            </span>
          ))}
        </div>
        <div ref={plot} className="relative min-w-0 flex-1">
          {ticks.map((t) => (
            <div key={t} aria-hidden="true" className={cn("absolute inset-x-0 border-t", t ? "border-slate-200" : "border-slate-300")} style={{ bottom: `${pct(t)}%` }} />
          ))}
          <div className="absolute inset-0 flex">
            {categories.map((c, i) => {
              const v = values[i];
              const rows: TipRow[] = series.map((s, j) => ({ name: s.name, color: s.color, value: fmtFull(unit, v[j]) }));
              if (mode === "stack" && series.length > 1) rows.push({ name: "Total", color: "transparent", value: fmtFull(unit, sums[i]) });
              const head = pct(mode === "stack" ? sums[i] : Math.max(0, ...v));
              const nz = lastNonZero(v);
              return (
                <div
                  key={c}
                  {...bind(i)}
                  role="img"
                  aria-label={`${titles[i]}: ${rows.map((r) => `${r.name} ${r.value}`).join(", ")}`}
                  className={cn("relative flex h-full flex-1 items-end justify-center gap-[2px] rounded-lg px-1 transition-colors", active === i && "bg-slate-100")}
                >
                  {mode === "stack" ? (
                    <div
                      className="flex w-full max-w-6 flex-col-reverse gap-[2px]"
                      style={{ height: `${pct(sums[i])}%` }}
                    >
                      {v.map((x, j) =>
                        x > 0 ? <div key={j} className={cn("min-h-0.5", j === nz && "rounded-t")} style={{ flex: `${x} 1 0%`, background: series[j].color }} /> : null,
                      )}
                    </div>
                  ) : (
                    v.map((x, j) => (
                      <div key={j} className="relative flex h-full w-full max-w-5 items-end">
                        {x > 0 && (
                          <div className="w-full rounded-t" style={{ height: `${pct(x)}%`, background: series[j].color }} />
                        )}
                        {labelled.has(i) && x > 0 && (
                          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tabular-nums text-slate-700" style={{ bottom: `calc(${pct(x)}% + 4px)` }}>
                            {fmtShort(unit, x)}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                  {mode === "stack" && labelled.has(i) && sums[i] > 0 && (
                    <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tabular-nums text-slate-700" style={{ bottom: `calc(${pct(sums[i])}% + 4px)` }}>
                      {fmtShort(unit, sums[i])}
                    </span>
                  )}
                  {active === i && <Tip title={titles[i]} rows={rows} align={alignAt(i, n)} style={{ bottom: `calc(${head}% + 24px)` }} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-2" aria-hidden="true">
        <div className="w-11 shrink-0" />
        <div className="flex min-w-0 flex-1">
          {categories.map((c, i) => (
            <div key={c} className="relative h-4 flex-1">
              <span className={cn("absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs leading-4 text-slate-500", (last - i) % step !== 0 && "invisible")}>
                {c}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Kolom bertumpuk: bagian dari total per kategori. Label total di kategori terakhir & tertinggi. */
export const StackedColumns = (p: ColumnsProps) => <Columns {...p} mode="stack" />;
/** Kolom berkelompok: bandingkan seri per kategori. Label nilai di kategori terakhir & puncak. */
export const GroupedColumns = (p: ColumnsProps) => <Columns {...p} mode="group" />;

/** Bar horizontal bertumpuk; panjang = total (skala bersama). Label "seri-1/total" di ujung. */
export function HBarStack({ rows, series }: { rows: { id: string; name: string; href?: string; values: number[] }[]; series: Series[] }) {
  const [active, bind] = useActive();
  const max = Math.max(1, ...rows.map((r) => total(r.values)));
  return (
    <ul className="space-y-3.5">
      {rows.map((r, i) => {
        const sum = total(r.values);
        const nz = lastNonZero(r.values);
        const tip: TipRow[] = [
          ...series.map((s, j) => ({ name: s.name, color: s.color, value: r.values[j].toLocaleString("id-ID") })),
          { name: "Total kamar", color: "transparent", value: sum.toLocaleString("id-ID") },
        ];
        return (
          <li key={r.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <div className="min-w-0 shrink-0 text-sm sm:w-56">
              {r.href ? (
                <Link href={r.href} title={r.name} className="block truncate rounded font-semibold text-slate-800 hover:text-primary hover:underline">{r.name}</Link>
              ) : (
                <span title={r.name} className="block truncate font-semibold text-slate-800">{r.name}</span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div
                {...bind(i)}
                role="img"
                aria-label={`${r.name}: ${tip.map((t) => `${t.name} ${t.value}`).join(", ")}`}
                className={cn("relative flex h-5 gap-[2px] rounded-r transition-shadow", active === i && "ring-2 ring-slate-300 ring-offset-2")}
                style={{ width: `calc((100% - 3.5rem) * ${sum / max})` }}
              >
                {r.values.map((x, j) =>
                  x > 0 ? <div key={j} className={cn("h-full", j === nz && "rounded-r")} style={{ flex: `${x} 1 0%`, background: series[j].color }} /> : null,
                )}
                {active === i && <Tip title={r.name} rows={tip} align="start" className="bottom-full mb-2" />}
              </div>
              <span className="w-12 shrink-0 whitespace-nowrap text-xs font-semibold tabular-nums text-slate-700">
                {r.values[0]}/{sum}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Cincin bagian-dari-keseluruhan (≤ 4 kategori). Total di tengah; legenda + angka dirender pemanggil. */
export function Donut({ items, caption }: { items: { name: string; value: number; color: string }[]; caption: string }) {
  const [active, bind] = useActive();
  const R = 48;
  const C = 2 * Math.PI * R;
  const sum = total(items.map((i) => i.value));
  const multi = items.filter((i) => i.value > 0).length > 1;
  const starts = items.map((_, i) => total(items.slice(0, i).map((x) => x.value)));
  const cur = active === null ? null : items[active];
  return (
    <div className="relative mx-auto h-44 w-44 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        {sum === 0 && <circle cx="60" cy="60" r={R} fill="none" stroke={TRACK} strokeWidth={14} />}
        {items.map((it, i) => {
          if (!it.value) return null;
          const len = (it.value / sum) * C;
          const dash = multi ? Math.max(len - 1.5, 0.5) : len; // celah ±2px warna permukaan
          return (
            <circle
              key={it.name}
              {...bind(i)}
              role="img"
              aria-label={`${it.name}: ${it.value.toLocaleString("id-ID")} ${caption}`}
              cx="60" cy="60" r={R} fill="none"
              stroke={it.color}
              strokeWidth={active === i ? 18 : 14}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-(starts[i] / sum) * C}
              className="transition-[stroke-width] motion-reduce:transition-none"
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900">{sum.toLocaleString("id-ID")}</span>
        <span className="text-xs text-slate-500">{caption}</span>
      </div>
      {cur && <Tip title={caption} rows={[{ name: cur.name, color: cur.color, value: cur.value.toLocaleString("id-ID") }]} className="bottom-full mb-1" />}
    </div>
  );
}

/** Garis tren kecil tanpa sumbu (dekoratif; angka ada di chart/tabel lain). */
export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${((i / Math.max(1, values.length - 1)) * 100).toFixed(2)},${(30 - (v / max) * 27).toFixed(2)}`);
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
      <path d={`M0,32 L${pts.join(" L")} L100,32 Z`} fill={color} fillOpacity={0.1} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
