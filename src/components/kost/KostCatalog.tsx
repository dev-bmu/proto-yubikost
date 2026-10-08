"use client";
// Katalog kost (PRD §6.2 C–F, C-11, C-12, C-13): cari, urut, filter tipe & area, grid 12/halaman, pagination. Tampilan v1.3 (paper/ink).
// Filter awal dari pencarian hero (?q=&tipe=); induk me-remount lewat `key` saat query berubah.
// ponytail: filter & urut di klien atas semua gedung; pindah ke server bila gedung > 100 (PRD §6.2).
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/format";
import { inkBtn } from "@/components/landing/theme";
import { KostCard, type KostCardData } from "./KostCard";

const PER_PAGE = 12;
const TYPES = ["Semua", "Putra", "Putri", "Campur"] as const;
const SORTS = { termurah: "Harga Terendah", termahal: "Harga Tertinggi", terbaru: "Terbaru" } as const;
type Sort = keyof typeof SORTS;
type KostType = (typeof TYPES)[number];
const ALL_AREAS = "Semua Area";
const areaOf = (k: KostCardData) => k.area.split(",")[0].trim();

const field =
  "w-full min-h-11 py-2.5 rounded-xl border border-line-strong bg-paper text-base sm:text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:bg-white focus:border-ink focus:ring-2 focus:ring-ink transition-colors";
const label = "block text-xs font-semibold text-ink-muted mb-1.5";

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
    cn("min-h-11 px-4 py-2 rounded-full text-sm font-semibold transition-colors", active ? "bg-ink text-paper" : "bg-sand text-ink-soft hover:text-ink");

  function go(p: number) {
    setPage(p);
    document.getElementById("katalog")?.scrollIntoView({ block: "start" });
  }

  const pageBtn = "w-11 h-11 sm:w-10 sm:h-10 rounded-full text-sm font-bold flex items-center justify-center transition-colors";
  const idleBtn = "bg-white border border-line-strong text-ink hover:border-ink disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div>
      <div className="rounded-2xl border border-line bg-white p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1">
            <label htmlFor="cari-kost" className={label}>Cari kost</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" aria-hidden="true" />
              <input
                id="cari-kost"
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Nama kost, alamat, atau area"
                className={cn(field, "pl-12 pr-11 [&::-webkit-search-cancel-button]:hidden")}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setPage(1);
                  }}
                  aria-label="Hapus pencarian"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1 lg:flex-none lg:w-56">
              <label htmlFor="urut-kost" className={label}>Urutkan</label>
              <select
                id="urut-kost"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as Sort);
                  setPage(1);
                }}
                className={cn(field, "px-3 cursor-pointer")}
              >
                {Object.entries(SORTS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              aria-expanded={filterOpen}
              aria-controls="panel-filter"
              className={cn(
                "inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-full border text-sm font-semibold transition-colors",
                filterOpen || filterCount > 0 ? "bg-ink text-paper border-ink" : "bg-white text-ink border-line-strong hover:border-ink",
              )}
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              Filter
              {filterCount > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-paper text-ink text-xs font-bold flex items-center justify-center">
                  {filterCount}
                  <span className="sr-only"> filter aktif</span>
                </span>
              )}
            </button>
          </div>
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
              <div className="pt-4 mt-4 border-t border-line grid md:grid-cols-[auto_1fr] gap-x-10 gap-y-5">
                <div>
                  <p id="label-tipe" className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Tipe Kost</p>
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
                  <p id="label-area" className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Area</p>
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

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 px-1">
        <p className="text-sm text-ink-soft" aria-live="polite">
          Menampilkan <span className="font-semibold text-ink">{results.length} kost</span>
          {type !== "Semua" && <> · Tipe {type}</>}
          {area !== ALL_AREAS && <> · Area {area}</>}
          {q.trim() && <> · Kata kunci &ldquo;{q.trim()}&rdquo;</>}
          <> · {SORTS[sort]}</>
        </p>
        {hasFilter && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 min-h-11 self-start sm:self-auto text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" /> Reset semua filter
          </button>
        )}
      </div>

      <div className="mt-8">
        {shown.length === 0 ? (
          <div className="text-center py-16 sm:py-24 px-4 rounded-2xl border border-dashed border-line-strong">
            <SearchX className="w-8 h-8 mx-auto text-ink-muted" aria-hidden="true" />
            <h3 className="mt-4 font-display font-extrabold text-3xl tracking-tight text-ink">Kost tidak ditemukan</h3>
            <p className="mt-2 max-w-md mx-auto text-sm text-ink-soft">
              Tidak ada kost yang cocok dengan pencarian atau filter Anda. Coba kata kunci lain, atau tampilkan semua tipe dan area.
            </p>
            <button type="button" onClick={reset} className={cn(inkBtn, "mt-6 px-5 min-h-11 text-sm")}>
              <RotateCcw className="w-4 h-4" aria-hidden="true" /> Reset semua filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 lg:gap-x-8 gap-y-12">
            {shown.map((k) => (
              <KostCard key={k.id} kost={k} />
            ))}
          </div>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Halaman katalog" className="mt-12 flex items-center justify-center gap-2">
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
              className={cn(pageBtn, p === current ? "bg-ink text-paper" : idleBtn)}
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
