"use client";
// Tata Tertib (PRD C-15): tablist dengan roving tabindex & navigasi panah, daftar bernomor.
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { KOST_RULES } from "@/lib/constants";
import { cn } from "@/lib/format";

export function RulesTabs() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const rule = KOST_RULES[active];

  function onKey(e: KeyboardEvent) {
    const n = KOST_RULES.length;
    const next = ({ ArrowRight: active + 1, ArrowLeft: active - 1 + n, Home: 0, End: n - 1 } as Record<string, number>)[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(next % n);
    tabs.current[next % n]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="Kategori tata tertib" onKeyDown={onKey} className="flex flex-wrap gap-2 mb-4">
        {KOST_RULES.map((r, i) => (
          <button
            key={r.category}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${i}`}
            aria-selected={i === active}
            aria-controls={`${id}-panel`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={cn(
              "inline-flex items-center gap-2 min-h-11 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors",
              i === active ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:text-primary",
            )}
          >
            {r.category}
            <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-bold", i === active ? "bg-white/20 text-white" : "bg-primary/10 text-primary")}>
              <span className="sr-only">: </span>
              {r.items.length}
              <span className="sr-only"> butir</span>
            </span>
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${active}`}
        tabIndex={0}
        className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm"
      >
        <ol className="space-y-3">
          {rule.items.map((item, i) => (
            <li key={item} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0" aria-hidden="true">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
