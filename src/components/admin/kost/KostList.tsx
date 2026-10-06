"use client";
// Grid kartu gedung + filter klien (cari, tipe, publikasi) untuk /admin/kost.
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BedDouble, Building2, EyeOff, Globe, Layers, MapPin, Search, Users, Wallet, X } from "lucide-react";
import { Select } from "@/components/Field";
import { Photo } from "@/components/media";
import { button, card, EmptyState, kostTypeClass } from "@/components/ui";
import { KOST_TYPES } from "@/lib/constants";
import { cn, rupiah } from "@/lib/format";
import type { KostListItem } from "@/lib/kost-admin";
import { OccupancyBar } from "./parts";

export function KostList({ items }: { items: KostListItem[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [pub, setPub] = useState("");

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter(
      (k) =>
        (!s || k.name.toLowerCase().includes(s) || k.area.toLowerCase().includes(s)) &&
        (!type || k.type === type) &&
        (!pub || (pub === "tampil") === k.isPublished),
    );
  }, [items, q, type, pub]);
  const reset = () => (setQ(""), setType(""), setPub(""));

  return (
    <>
      <div className={card(false, "p-4 mb-6 flex flex-col lg:flex-row lg:items-end gap-3")}>
        <div className="flex-1 min-w-0">
          <label htmlFor="cari-kost" className="block text-xs font-semibold text-slate-600 mb-1.5">Cari gedung</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
            <input
              id="cari-kost"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nama gedung atau area, mis. Suhat"
              className="w-full min-h-11 pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-primary" aria-label="Hapus pencarian">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <Select label="Tipe penghuni" value={type} onChange={(e) => setType(e.target.value)} className="lg:w-44">
          <option value="">Semua tipe</option>
          {KOST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select label="Status publikasi" value={pub} onChange={(e) => setPub(e.target.value)} className="lg:w-52">
          <option value="">Semua status</option>
          <option value="tampil">Tampil di katalog</option>
          <option value="sembunyi">Disembunyikan</option>
        </Select>
      </div>

      <p className="text-sm text-slate-500 mb-4" aria-live="polite">
        Menampilkan <strong className="text-slate-900">{shown.length}</strong> dari {items.length} gedung
      </p>

      {shown.length ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {shown.map((k) => <KostCard key={k.id} k={k} />)}
        </ul>
      ) : (
        <EmptyState
          icon={<Building2 className="w-8 h-8" />}
          title={items.length ? "Tidak ada gedung yang cocok" : "Belum ada gedung"}
          action={items.length ? <button type="button" className={button("primary")} onClick={reset}>Reset Semua Filter</button> : undefined}
        >
          {items.length ? "Ubah kata kunci atau filter untuk melihat gedung lain." : "Tambahkan gedung pertama untuk mulai mengelola tipe kamar dan kamar."}
        </EmptyState>
      )}
    </>
  );
}

function KostCard({ k }: { k: KostListItem }) {
  const info = [
    { icon: Layers, label: "Tipe kamar", value: `${k.typeCount} tipe` },
    { icon: BedDouble, label: "Kamar", value: `${k.total} kamar` },
    { icon: Users, label: "Penghuni aktif", value: `${k.residents} orang` },
    { icon: Wallet, label: "Harga mulai", value: k.startPrice ? rupiah(k.startPrice) : "-" },
  ];
  return (
    <li className={card(true, "group relative flex flex-col overflow-hidden focus-within:ring-2 focus-within:ring-primary/50")}>
      <div className="relative aspect-[16/9] overflow-hidden">
        <Photo src={k.cover} alt={`Foto sampul ${k.name}`} sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" className="transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5">
          <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg shadow-black/25", kostTypeClass(k.type))}>{k.type}</span>
          {k.isPublished ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg shadow-black/25 bg-emerald-700 text-white">
              <Globe className="w-3.5 h-3.5" aria-hidden="true" /> Tampil di katalog
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg shadow-black/25 bg-slate-800 text-white">
              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> Disembunyikan
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h2 className="text-lg font-extrabold text-slate-900 leading-snug">
          {/* Stretched link: seluruh kartu dapat diklik */}
          <Link href={`/admin/kost/${k.id}`} className="focus:outline-none after:absolute after:inset-0 after:content-['']">
            {k.name}
          </Link>
        </h2>
        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
          <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" /> {k.area || "-"}
        </p>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
          {info.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2 min-w-0">
              <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="text-sm font-bold text-slate-900 tabular-nums truncate">{value}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-600 mb-2">Okupansi kamar</p>
          <OccupancyBar occupied={k.occupied} reserved={k.reserved} available={k.available} />
        </div>

        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary" aria-hidden="true">
          Kelola <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </li>
  );
}
