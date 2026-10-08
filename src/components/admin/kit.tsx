// Komponen admin bersama (PRD C-22, C-23). Dipakai semua halaman /admin.
import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/format";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Kartu statistik admin (C-22) — tanpa persentase. Nilai teks (mis. rupiah) mengecil mengikuti lebar kartu. */
export function StatCard({ label, value, icon, tone = "primary", sub }: {
  label: string; value: number | string; icon: ReactNode; tone?: "primary" | "success" | "warning"; sub?: ReactNode;
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-800",
  };
  return (
    <div className="@container bg-white rounded-2xl border border-slate-200/80 shadow-card p-5">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", tones[tone])} aria-hidden="true">{icon}</div>
      <p className={cn("font-extrabold text-slate-900 tabular-nums whitespace-nowrap", typeof value === "number" ? "text-3xl" : "text-[length:clamp(1rem,12cqi,1.875rem)] leading-9")}>
        {value}
      </p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

/** Kelas tabel admin. Bungkus <table> dengan <TableWrap>. */
export const th = "px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50 whitespace-nowrap";
export const td = "px-4 py-3 text-sm text-slate-700 align-middle";

export function TableWrap({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-x-auto">
      <table className="w-full min-w-[720px] divide-y divide-slate-100">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Forbidden({ what }: { what: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-3" aria-hidden="true">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">Akses ditolak</h2>
      <p className="text-sm text-slate-500 mt-1">Peran Anda tidak memiliki izin untuk {what} (PRD §3.3).</p>
    </div>
  );
}
