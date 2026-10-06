"use client";
// Pilihan fasilitas berupa chip — checkbox asli (sr-only) agar bisa dipakai keyboard & pembaca layar.
import { useId } from "react";
import { Check } from "lucide-react";
import { facilityMeta } from "@/components/media";
import { cn } from "@/lib/format";

export function FacilityPicker({
  legend,
  options,
  value,
  onChange,
  error,
}: {
  legend: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const id = useId();
  const toggle = (f: string) => onChange(options.filter((o) => (o === f ? !value.includes(f) : value.includes(o))));
  return (
    <div role="group" aria-labelledby={id} aria-describedby={error ? `${id}-err` : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p id={id} className="text-xs font-semibold text-slate-600">
          {legend} <span className="font-normal text-slate-500">· {value.length} dari {options.length} dipilih</span>
        </p>
        <div className="flex gap-1">
          <button type="button" className="px-3 min-h-11 sm:min-h-9 rounded-lg text-xs font-bold text-primary hover:bg-primary/5" onClick={() => onChange([...options])}>
            Pilih semua
          </button>
          <button type="button" className="px-3 min-h-11 sm:min-h-9 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100" onClick={() => onChange([])}>
            Kosongkan
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {options.map((f) => {
          const Icon = facilityMeta(f).icon;
          const on = value.includes(f);
          return (
            <label
              key={f}
              className={cn(
                "group flex items-center gap-2 sm:gap-2.5 min-h-12 px-2.5 sm:px-3 py-2 rounded-xl border-2 cursor-pointer select-none transition-colors",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50 has-[:focus-visible]:ring-offset-1",
                on ? "border-primary bg-primary-ultralight" : "border-slate-200 bg-white hover:border-primary/40",
              )}
            >
              <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(f)} />
              <span
                className={cn("hidden min-[420px]:flex w-8 h-8 rounded-lg items-center justify-center shrink-0 transition-colors", on ? "bg-primary text-white" : "bg-slate-100 text-slate-600")}
                aria-hidden="true"
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className={cn("flex-1 min-w-0 text-sm leading-tight", on ? "font-semibold text-slate-900" : "text-slate-700")}>{f}</span>
              <span
                className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0", on ? "bg-primary border-primary text-white" : "border-slate-300")}
                aria-hidden="true"
              >
                {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </span>
            </label>
          );
        })}
      </div>
      {error && <p id={`${id}-err`} className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
