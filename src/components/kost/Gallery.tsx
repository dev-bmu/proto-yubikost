"use client";
// Galeri bento 4 tile + lightbox (PRD C-14): role=dialog, Esc, ←/→, fokus terkunci & dikembalikan.
// TypePhotos: sampul tipe kamar yang membuka lightbox semua foto tipe (PRD §6.3).
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronLeft, ChevronRight, Images, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/format";
import { Photo } from "@/components/media";

type Index = number | null;

export function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const [index, setIndex] = useState<Index>(null);
  const n = photos.length;

  if (n === 0) {
    return (
      <div className="relative aspect-[3/4] sm:aspect-[3/1] rounded-xl overflow-hidden">
        <Photo alt={`Foto ${name}`} />
      </div>
    );
  }

  const extra = n - 4;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {photos.slice(0, 4).map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={i === 3 && extra > 0 ? `Lihat semua ${n} foto ${name}` : `Buka foto ${i + 1} dari ${n} — ${name}`}
            className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-200"
          >
            <Photo src={src} alt="" sizes="(min-width: 640px) 25vw, 50vw" priority={i === 0} className="transition-transform duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center" aria-hidden="true">
              <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            {i === 0 && (
              <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-bold shadow-lg shadow-black/25">Foto Utama</span>
            )}
            {i === 3 && extra > 0 && (
              <span className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white" aria-hidden="true">
                <span className="text-2xl font-extrabold">+{extra}</span>
                <span className="text-sm font-bold">Lihat Semua</span>
              </span>
            )}
          </button>
        ))}
      </div>
      <Lightbox photos={photos} name={name} index={index} setIndex={setIndex} />
    </>
  );
}

/** Foto sampul tipe kamar; klik membuka semua foto tipe. Induk wajib `relative` + berukuran. */
export function TypePhotos({ photos, name }: { photos: string[]; name: string }) {
  const [index, setIndex] = useState<Index>(null);
  if (photos.length === 0) return <Photo alt={`Foto kamar tipe ${name}`} />;
  return (
    <>
      <button
        type="button"
        onClick={() => setIndex(0)}
        aria-label={`Lihat ${photos.length} foto kamar tipe ${name}`}
        className="group absolute inset-0 focus-visible:outline-offset-[-3px]"
      >
        <Photo src={photos[0]} alt="" sizes="(min-width: 640px) 260px, 100vw" className="transition-transform duration-700 group-hover:scale-105" />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/75 text-white text-xs font-bold" aria-hidden="true">
          <Images className="w-3.5 h-3.5" /> {photos.length} foto
        </span>
      </button>
      <Lightbox photos={photos} name={`kamar tipe ${name}`} index={index} setIndex={setIndex} />
    </>
  );
}

function Lightbox({ photos, name, index, setIndex }: { photos: string[]; name: string; index: Index; setIndex: Dispatch<SetStateAction<Index>> }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const n = photos.length;
  const open = index !== null;
  const step = (d: number) => setIndex((i) => (i === null ? i : (i + d + n) % n));

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndex(null);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") {
        const f = dialogRef.current?.querySelectorAll<HTMLElement>("button");
        if (!f?.length) return;
        const [first, last] = [f[0], f[f.length - 1]];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [open, n]); // step & setIndex stabil (setter state)

  if (!open) return null;
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Galeri foto ${name}`}
      className="fixed inset-x-0 top-0 h-dvh z-[100] bg-black/95 flex flex-col"
      onClick={(e) => e.target === e.currentTarget && setIndex(null)}
    >
      <div className="flex items-center justify-between p-4 text-white">
        <p className="text-sm font-semibold" aria-live="polite">
          Foto {index + 1} dari {n}
        </p>
        <button ref={closeRef} type="button" onClick={() => setIndex(null)} aria-label="Tutup galeri" className={navBtn}>
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      <div className="relative flex-1 mx-4 sm:mx-20">
        <Photo src={photos[index]} alt={`Foto ${index + 1} ${name}`} sizes="100vw" className="object-contain" />
      </div>
      {n > 1 && (
        <>
          <button type="button" onClick={() => step(-1)} aria-label="Foto sebelumnya" className={cn(navBtn, "absolute left-3 top-1/2 -translate-y-1/2")}>
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Foto berikutnya" className={cn(navBtn, "absolute right-3 top-1/2 -translate-y-1/2")}>
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </>
      )}
      <div className="flex justify-center gap-2 p-5" aria-hidden="true">
        {photos.map((src, i) => (
          <span key={src + i} className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-accent" : "w-2 bg-white/40")} />
        ))}
      </div>
    </div>
  );
}

const navBtn = "w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors";
