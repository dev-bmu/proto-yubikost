// Komponen tampilan Manajemen Kost tanpa state — aman dipakai Server maupun Client Component.
import type { ReactNode } from "react";
import { cn, type Tone } from "@/lib/format";

/** Palet data chart (§4.2 mengizinkan warna data lewat konstanta). Terisi = primary, Kosong = track slate-200. */
export const CHART = { occupied: "#6d51a1", reserved: "#eb6834" };

export const ROOM_STATUS: Record<string, { label: string; tone: Tone; tile: string }> = {
  AVAILABLE: { label: "Tersedia", tone: "success", tile: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:border-emerald-500" },
  RESERVED: { label: "Dipesan", tone: "warning", tile: "bg-amber-100 text-amber-800 border-amber-200 hover:border-amber-500" },
  OCCUPIED: { label: "Terisi", tone: "info", tile: "bg-primary/10 text-primary border-primary/20 hover:border-primary" },
};

/** Bar okupansi bertumpuk Terisi / Dipesan / Kosong, dengan legenda angka (tanpa persentase). */
export function OccupancyBar({ occupied, reserved, available, className }: { occupied: number; reserved: number; available: number; className?: string }) {
  const total = occupied + reserved + available;
  const parts = [
    { key: "Terisi", n: occupied, style: { background: CHART.occupied } },
    { key: "Dipesan", n: reserved, style: { background: CHART.reserved } },
    { key: "Kosong", n: available, className: "bg-slate-200" },
  ];
  return (
    <div className={className}>
      <div
        className={cn("flex h-2.5 gap-[2px] rounded-full overflow-hidden", !total && "bg-slate-200")}
        role="img"
        aria-label={total ? `${occupied} terisi, ${reserved} dipesan, ${available} kosong dari ${total} kamar` : "Belum ada kamar"}
      >
        {parts.filter((p) => p.n > 0).map((p) => (
          <span key={p.key} className={cn("h-full", p.className)} style={{ ...p.style, flexGrow: p.n, flexBasis: 0 }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-hidden="true">
        {parts.map((p) => (
          <li key={p.key} className="inline-flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-full", p.className && "bg-slate-200 ring-1 ring-inset ring-slate-300")} style={p.style} />
            {p.key} <span className="font-bold text-slate-900 tabular-nums">{p.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Strip KPI subpage gedung: baris 1 = 4 statistik kamar, baris 2 = sisanya (lebih lebar untuk nominal rupiah). */
export function KpiStrip({ items }: { items: { label: string; value: ReactNode; icon: ReactNode; hint?: string; tone?: "primary" | "success" | "warning" | "slate" }[] }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-800",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
      {/* -mr/-mb 1px: garis kanan/bawah sel terluar terpotong kartu */}
      <dl className="grid grid-cols-2 sm:grid-cols-12 -mr-px -mb-px">
        {items.map((it, i) => (
          <div
            key={it.label}
            className={cn(
              "p-4 border-slate-100 border-b border-r min-w-0",
              i < 4 ? "sm:col-span-3" : "sm:col-span-4",
              i === items.length - 1 && items.length % 2 === 1 && "col-span-2",
            )}
          >
            <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", tones[it.tone ?? "primary"])} aria-hidden="true">
                {it.icon}
              </span>
              {it.label}
            </dt>
            <dd className="mt-2 text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums leading-tight whitespace-nowrap">
              {it.value}
              {it.hint && <span className="block text-xs font-medium text-slate-500 mt-1 whitespace-normal">{it.hint}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Kartu section form dengan tile ikon, judul, dan deskripsi. */
export function FormSection({ icon, title, description, children, id }: { icon: ReactNode; title: string; description?: ReactNode; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="p-5 sm:p-6 border-b border-slate-100 last:border-b-0">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0" aria-hidden="true">{icon}</span>
        <div>
          <h2 id={id} className="text-base font-bold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
