"use client";
// Tab status berbasis ?status= (C-15): tautan ?status= dengan roving tabindex, panah/Home/End pindah fokus, Enter/Spasi membuka.
import { useRef, type KeyboardEvent } from "react";
import Link from "next/link";
import { cn } from "@/lib/format";

export function StatusTabs({
  tabs,
  active,
  basePath,
  panelId,
  label,
}: {
  tabs: { key: string; label: string; count: number }[];
  active: string;
  basePath: string;
  panelId: string;
  label: string;
}) {
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
    <div role="tablist" aria-label={label} onKeyDown={onKey} className="flex flex-wrap gap-2 mb-4">
      {tabs.map((t, i) => {
        const selected = t.key === active;
        return (
          <Link
            key={t.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`tab-${t.key}`}
            href={`${basePath}?status=${t.key}`}
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            className={cn(
              "inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors",
              selected ? "bg-primary text-white border-primary" : "bg-white text-slate-700 border-slate-200 hover:border-primary hover:text-primary",
            )}
          >
            {t.label}
            <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-bold tabular-nums", selected ? "bg-white text-primary" : "bg-slate-100 text-slate-700")}>
              <span className="sr-only">: </span>
              {t.count}
              <span className="sr-only"> data</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
