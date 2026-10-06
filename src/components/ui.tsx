// Primitif UI design system (PRD §4.10 C-01..C-04). Kelas kanonik di satu tempat.
import type { ReactNode } from "react";
import { cn, type Tone } from "@/lib/format";

type Variant = "accent" | "primary" | "glass" | "neutral" | "whatsapp" | "danger" | "ghost";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANT: Record<Variant, string> = {
  accent:
    "gradient-accent text-slate-950 font-bold shadow-lg shadow-accent/30 hover:opacity-90 hover:shadow-accent/50 focus-visible:outline-accent",
  primary:
    "bg-primary hover:bg-primary-dark text-white font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/35 active:scale-[0.98]",
  glass:
    "bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold backdrop-blur-sm focus-visible:outline-accent",
  neutral: "bg-white border border-slate-200 text-slate-700 font-semibold hover:border-primary hover:text-primary",
  whatsapp: "bg-whatsapp hover:bg-whatsapp-dark text-slate-950 font-bold shadow-lg shadow-green-500/25",
  danger: "bg-red-600 hover:bg-red-700 text-white font-semibold",
  ghost: "text-primary font-bold hover:text-primary-dark hover:bg-primary/5",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs min-h-9",
  md: "px-4 py-2.5 text-sm min-h-11",
  lg: "px-6 py-3.5 text-base min-h-12",
  xl: "px-8 py-4 text-base min-h-14",
};

/** Kelas tombol; dipakai untuk <button>, <a>, dan <Link>. */
export function button(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 cursor-pointer",
    "disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:border-transparent",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block w-5 h-5 rounded-full border-2 border-current/30 border-t-current animate-spin", className)}
    />
  );
}

/** Kartu dasar (C-04). interactive = efek hover bayangan + border. */
export const card = (interactive = false, extra?: string) =>
  cn(
    "bg-white rounded-2xl border border-slate-200/80 shadow-card transition-all duration-300",
    interactive && "hover:shadow-card-hover hover:border-primary/40",
    extra,
  );

const PILL: Record<Tone, string> = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
  info: "bg-primary/10 text-primary",
  neutral: "bg-slate-100 text-slate-700",
};

const SOLID: Record<Tone, string> = {
  success: "bg-emerald-700 text-white",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-600 text-white",
  info: "bg-primary text-white",
  neutral: "bg-slate-800 text-white",
};

/** Status pill (latar terang) atau badge solid (di atas foto) — PRD §4.2.5, C-02. */
export function Pill({ tone = "neutral", solid = false, children, className }: { tone?: Tone; solid?: boolean; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        solid ? "rounded-lg shadow-lg shadow-black/25" : "rounded-full",
        solid ? SOLID[tone] : PILL[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Warna badge tipe kost — Putri pink-600 (kontras 4,6:1), bukan pink-500. */
export function kostTypeClass(type: string) {
  if (type === "Putri") return "bg-pink-600 text-white";
  if (type === "Putra") return "bg-primary text-white";
  return "bg-slate-800 text-white";
}

/** Eyebrow pill di atas judul section (C-02, C-10). */
export function Eyebrow({ children, onPurple = false }: { children: ReactNode; onPurple?: boolean }) {
  return onPurple ? (
    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
      </span>
      {children}
    </span>
  ) : (
    <span className="inline-block px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wide">{children}</span>
  );
}

/** Header section (C-10). */
export function SectionHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="text-center mb-14">
      {eyebrow && <div className="mb-3"><Eyebrow>{eyebrow}</Eyebrow></div>}
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">{title}</h2>
      {children && <p className="text-slate-600 max-w-2xl mx-auto text-base leading-relaxed">{children}</p>}
    </div>
  );
}

/** Container standar (§4.4). */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

/** Banner info/peringatan inline. */
export function Notice({ tone = "info", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const tones: Record<Tone, string> = {
    info: "bg-primary-ultralight border-primary/20 text-slate-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    danger: "bg-red-50 border-red-200 text-red-800",
    neutral: "bg-slate-50 border-slate-200 text-slate-700",
  };
  return <div className={cn("rounded-xl border p-4 text-sm leading-relaxed", tones[tone], className)}>{children}</div>;
}

/** Empty / error state (C-13). */
export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="text-center py-16 sm:py-24 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      {children && <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">{children}</p>}
      {action}
    </div>
  );
}
