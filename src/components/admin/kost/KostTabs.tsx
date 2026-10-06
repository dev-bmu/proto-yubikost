"use client";
// Tab subpage gedung berbasis ?tab= (C-15): roving tabindex, panah/Home/End pindah fokus, Enter/Spasi membuka.
import { useRef, type KeyboardEvent } from "react";
import Link from "next/link";
import { cn } from "@/lib/format";

export function KostTabs({ kostId, active, tabs }: { kostId: string; active: string; tabs: { key: string; label: string; count?: number }[] }) {
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);

  function onKey(e: KeyboardEvent) {
    const n = tabs.length;
    const i = refs.current.findIndex((el) => el === document.activeElement);
    if (i < 0) return;
    if (e.key === " ") {
      e.preventDefault();
      refs.current[i]?.click();
      return;
    }
    const next = ({ ArrowRight: i + 1, ArrowLeft: i - 1 + n, Home: 0, End: n - 1 } as Record<string, number>)[e.key];
    if (next === undefined) return;
    e.preventDefault();
    refs.current[next % n]?.focus();
  }

  return (
    <div className="border-b border-slate-200 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto [scrollbar-width:none]">
      <div role="tablist" aria-label="Bagian gedung" onKeyDown={onKey} className="flex gap-1 min-w-max">
        {tabs.map((t, i) => {
          const selected = t.key === active;
          return (
            <Link
              key={t.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={`tab-${t.key}`}
              href={`/admin/kost/${kostId}?tab=${t.key}`}
              scroll={false}
              role="tab"
              aria-selected={selected}
              aria-controls="panel-gedung"
              tabIndex={selected ? 0 : -1}
              className={cn(
                "relative inline-flex items-center gap-2 min-h-12 px-4 text-sm font-semibold transition-colors rounded-t-xl",
                selected ? "text-primary" : "text-slate-600 hover:text-primary hover:bg-white",
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-bold tabular-nums", selected ? "bg-primary text-white" : "bg-slate-200 text-slate-700")}>
                  <span className="sr-only">: </span>
                  {t.count}
                </span>
              )}
              {selected && <span className="absolute inset-x-3 -bottom-px h-[3px] rounded-full bg-primary" aria-hidden="true" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
