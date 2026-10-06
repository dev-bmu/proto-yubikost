// Wadah chart: judul, legenda, chart, dan tabel data (<details>) — tooltip tidak pernah jadi satu-satunya akses data.
import type { ReactNode } from "react";
import { BarChart3, ChevronDown } from "lucide-react";
import { card } from "@/components/ui";
import { cn } from "@/lib/format";

/** value = total seri (PRD C-29: swatch + label + total). */
export type LegendItem = { name: string; color: string; value?: string };
export type DataTable = { head: string[]; rows: (string | number)[][] };

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Legenda">
      {items.map((s) => (
        <li key={s.name} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <span className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: s.color }} aria-hidden="true" />
          {s.name}
          {s.value && <span className="font-bold tabular-nums text-slate-900">{s.value}</span>}
        </li>
      ))}
    </ul>
  );
}

export function ChartCard({
  title, subtitle, legend, aside, table, children, className,
}: {
  title: string;
  subtitle?: string;
  legend?: LegendItem[];
  aside?: ReactNode;
  table?: DataTable;
  children: ReactNode;
  className?: string;
}) {
  const id = "chart-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <section aria-labelledby={id} className={card(false, cn("p-5 sm:p-6 min-w-0 flex flex-col", className))}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id={id} className="text-base font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {aside}
      </div>
      {legend && legend.length > 1 && <div className="mt-3"><Legend items={legend} /></div>}
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
      {table && table.rows.length > 0 && (
        <details className="group mt-4 border-t border-slate-100 pt-2">
          <summary className="inline-flex items-center gap-1 min-h-11 text-sm font-semibold text-primary cursor-pointer select-none rounded-lg hover:text-primary-dark [&::-webkit-details-marker]:hidden list-none">
            Lihat tabel
            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <caption className="sr-only">Data {title}</caption>
              <thead className="bg-slate-50">
                <tr>
                  {table.head.map((h, i) => (
                    <th key={h} scope="col" className={cn("px-3 py-2 text-xs font-bold text-slate-500 whitespace-nowrap", i ? "text-right" : "text-left")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.rows.map((r, ri) => (
                  <tr key={ri}>
                    {r.map((c, i) =>
                      i ? (
                        <td key={i} className="px-3 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap">{c}</td>
                      ) : (
                        <th key={i} scope="row" className="px-3 py-2 text-left font-medium text-slate-900 whitespace-nowrap">{c}</th>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}

export function ChartEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 min-h-48 flex flex-col items-center justify-center text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 p-6">
      <BarChart3 className="w-8 h-8 text-slate-400 mb-2" aria-hidden="true" />
      <p className="text-sm text-slate-500 max-w-xs">{children}</p>
    </div>
  );
}
