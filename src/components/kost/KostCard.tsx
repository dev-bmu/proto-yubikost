// Kartu Kost (PRD C-05): foto luar gedung 3:4, status tanpa angka, satu-satunya CTA = GateButton.
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { KostCard as FullKostCard } from "@/lib/queries";
import { rupiah } from "@/lib/format";
import { card, kostTypeClass, Pill } from "@/components/ui";
import { FacilityChips, Photo } from "@/components/media";
import { GateButton } from "@/components/gate/GateButton";

/** Data kartu yang aman dikirim ke klien (KostCard sudah tanpa kontak pemilik gedung). */
export type KostCardData = FullKostCard;

export function KostCard({ kost: k }: { kost: KostCardData }) {
  return (
    <article className={card(true, "flex flex-col overflow-hidden group")}>
      <div className="relative aspect-[3/4] overflow-hidden">
        <Photo src={k.photos[0]} alt={`Foto luar gedung ${k.name}`} className="transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/75" aria-hidden="true" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Pill solid tone={k.isAvailable ? "success" : "danger"}>
            <span className="w-1.5 h-1.5 rounded-full bg-white" aria-hidden="true" />
            {k.isAvailable ? "Tersedia" : "Penuh"}
          </Pill>
          {k.isNew && <Pill solid tone="info">Baru</Pill>}
        </div>
        <Pill solid className={`absolute top-3 right-3 ${kostTypeClass(k.type)}`}>Kost {k.type}</Pill>
        <p className="absolute bottom-3 inset-x-3 flex items-center gap-1.5 text-sm font-semibold text-white">
          <MapPin className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
          <span className="truncate">{k.area}</span>
        </p>
      </div>
      <div className="p-5 flex flex-col gap-3 flex-1">
        <h3 className="font-extrabold text-lg text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
          <Link href={`/kost/${k.slug}`}>{k.name}</Link>
        </h3>
        <FacilityChips items={k.facilities} />
        <p className="mt-auto pt-1">
          <span className="text-xs text-slate-500">Mulai </span>
          <span className="text-xl font-extrabold text-primary tracking-tight tabular-nums">{rupiah(k.startPrice)}</span>
          <span className="text-xs text-slate-500"> /bulan</span>
        </p>
        <GateButton slug={k.slug} name={k.name} subtitle={`Kost ${k.type} · ${k.area}`} className="w-full" />
      </div>
    </article>
  );
}
