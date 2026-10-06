"use client";
// Katalog kost (PRD §6.2 C–F, C-11, C-12, C-13): cari, urut, filter tipe & area, trust bar, grid 12/halaman, pagination.
// Filter awal dari pencarian hero (?q=&tipe=); induk me-remount lewat `key` saat query berubah.
// ponytail: filter & urut di klien atas semua gedung; pindah ke server bila gedung > 100 (PRD §6.2).
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/format";
import { button, EmptyState } from "@/components/ui";
import { Select } from "@/components/Field";
import { KostCard, type KostCardData } from "./KostCard";

const PER_PAGE = 12;
const TYPES = ["Semua", "Putra", "Putri", "Campur"] as const;
const SORTS = { termurah: "Harga Terendah", termahal: "Harga Tertinggi", terbaru: "Terbaru" } as const;
type Sort = keyof typeof SORTS;
type KostType = (typeof TYPES)[number];
const ALL_AREAS = "Semua Area";
const areaOf = (k: KostCardData) => k.area.split(",")[0].trim();

export function KostCatalog({ kosts, initialQuery = "", initialType = "" }: { kosts: KostCardData[]; initialQuery?: string; initialType?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [sort, setSort] = useState<Sort>("termurah");
  const [type, setType] = useState<KostType>(TYPES.find((t) => t === initialType) ?? "Semua");
  const [area, setArea] = useState(ALL_AREAS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const reduce = useReducedMotion();
  const router = useRouter();
  const areas = useMemo(() => [ALL_AREAS, ...new Set(kosts.map(areaOf).sort((a, b) => a.localeCompare(b, "id")))], [kosts]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return kosts
      .filter((k) => type === "Semua" || k.type === type)
      .filter((k) => area === ALL_AREAS || areaOf(k) === area)
      .filter((k) => !needle || [k.name, k.address, k.area].some((s) => s.toLowerCase().includes(needle)))
      .sort((a, b) =>
        sort === "termurah" ? a.startPrice - b.startPrice : sort === "termahal" ? b.startPrice - a.startPrice : b.createdAt.localeCompare(a.createdAt),
      );
  }, [kosts, q, sort, type, area]);

  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = results.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const filterCount = (type !== "Semua" ? 1 : 0) + (area !== ALL_AREAS ? 1 : 0);
  const hasFilter = q.trim() !== "" || filterCount > 0;

  function reset() {
    setQ("");
    setType("Semua");
    setArea(ALL_AREAS);
    setSort("termurah");
    setPage(1);
    // Bersihkan ?q=&tipe= agar URL & kotak pencarian hero ikut kosong
    if (initialQuery || initialType) router.replace("/#katalog", { scroll: false });
  }

  const chip = (active: boolean) =>
    cn(
      "min-h-11 px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
      active ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary",
    );

  function go(p: number) {
    setPage(p);
    document.getElementById("katalog")?.scrollIntoView({ block: "start" });
  }

  const pageBtn = "w-11 h-11 sm:w-10 sm:h-10 rounded-xl text-sm font-bold flex items-center justify-center transition-colors";
  const idleBtn = "bg-white border border-slate-200 text-slate-700 hover:border-primary hover:text-primary disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div>
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xl shadow-primary/5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1">
            <label htmlFor="cari-kost" className="block text-xs font-semibold text-slate-600 mb-1.5">Cari Kost</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
              <input
                id="cari-kost"
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Nama kost, alamat, atau area"
                className="w-full min-h-11 pl-12 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all [&::-webkit-search-cancel-button]:hidden"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setPage(1);
                  }}
                  aria-label="Hapus pencarian"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-primary"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <Select
            label="Urutkan"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as Sort);
              setPage(1);
            }}
            className="lg:w-56"
          >
            {Object.entries(SORTS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
            aria-controls="panel-filter"
            className={cn(
              button("neutral", "md", "relative"),
              (filterOpen || filterCount > 0) && "bg-primary text-white border-primary shadow-md shadow-primary/20 hover:text-white",
            )}
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            Filter
            {filterCount > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-accent text-slate-950 text-xs font-bold flex items-center justify-center">
                {filterCount}
                <span className="sr-only"> filter aktif</span>
              </span>
            )}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {filterOpen && (
            <motion.div
              id="panel-filter"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-slate-100 grid md:grid-cols-[auto_1fr] gap-x-10 gap-y-5">
                <div>
                  <p id="label-tipe" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipe Kost</p>
                  <div role="group" aria-labelledby="label-tipe" className="flex flex-wrap gap-2">
                    {TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={type === t}
                        onClick={() => {
                          setType(t);
                          setPage(1);
                        }}
                        className={chip(type === t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p id="label-area" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Area</p>
                  <div role="group" aria-labelledby="label-area" className="flex flex-wrap gap-2">
                    {areas.map((a) => (
                      <button
                        key={a}
                        type="button"
                        aria-pressed={area === a}
                        onClick={() => {
                          setArea(a);
                          setPage(1);
                        }}
                        className={chip(area === a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-xl bg-slate-100/80 border border-slate-200/80">
        <p className="text-sm text-slate-600" aria-live="polite">
          Menampilkan <span className="font-bold text-primary">{results.length} Kost</span>
          {type !== "Semua" && <> · Tipe {type}</>}
          {area !== ALL_AREAS && <> · Area {area}</>}
          {q.trim() && <> · Kata kunci &ldquo;{q.trim()}&rdquo;</>}
          <> · {SORTS[sort]}</>
        </p>
        {hasFilter && (
          <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary-dark self-start sm:self-auto min-h-11">
            <RotateCcw className="w-4 h-4" aria-hidden="true" /> Reset Semua Filter
          </button>
        )}
      </div>

      <div className="mt-8">
        {shown.length === 0 ? (
          <EmptyState
            icon={<SearchX className="w-8 h-8" />}
            title="Kost tidak ditemukan"
            action={
              <button type="button" onClick={reset} className={button("primary", "md")}>
                <RotateCcw className="w-4 h-4" aria-hidden="true" /> Reset Semua Filter
              </button>
            }
          >
            Tidak ada kost yang cocok dengan pencarian atau filter Anda. Coba kata kunci lain, atau tampilkan semua tipe dan area.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {shown.map((k) => (
              <KostCard key={k.id} kost={k} />
            ))}
          </div>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Halaman katalog" className="mt-10 flex items-center justify-center gap-2">
          <button type="button" onClick={() => go(current - 1)} disabled={current === 1} aria-label="Halaman sebelumnya" className={cn(pageBtn, idleBtn)}>
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              aria-current={p === current ? "page" : undefined}
              aria-label={`Halaman ${p}`}
              className={cn(pageBtn, p === current ? "bg-primary text-white" : idleBtn)}
            >
              {p}
            </button>
          ))}
          <button type="button" onClick={() => go(current + 1)} disabled={current === pages} aria-label="Halaman berikutnya" className={cn(pageBtn, idleBtn)}>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
