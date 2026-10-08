// Kartu Kost (PRD C-05; tampilan v1.3): foto luar gedung 3:4, status tanpa angka, harga + DP & deposit (dengan penjelasan),
// satu-satunya CTA = GateButton. Dipakai di dalam pembungkus landing (font-display & token paper/ink/brand).
import Link from "next/link";
import { ChevronDown, MapPin } from "lucide-react";
import type { KostCard as FullKostCard } from "@/lib/queries";
import { DEPOSIT_AMOUNT, DP_TIERS } from "@/lib/constants";
import { cn, rupiah } from "@/lib/format";
import { Photo } from "@/components/media";
import { GateButton } from "@/components/gate/GateButton";
import { lineBtn } from "@/components/landing/theme";

/** Data kartu yang aman dikirim ke klien (KostCard sudah tanpa kontak pemilik gedung). */
export type KostCardData = FullKostCard;

const DP = DP_TIERS[0];
const DEPOSIT_RP = rupiah(DEPOSIT_AMOUNT);
const MAX_FACILITIES = 3;
const chip = "inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink shadow-sm";

export function KostCard({ kost: k }: { kost: KostCardData }) {
  const more = k.facilities.length - MAX_FACILITIES;
  return (
    <article className="group flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-sand">
        <Photo src={k.photos[0]} alt={`Foto luar gedung ${k.name}`} className="transition-transform duration-700 group-hover:scale-[1.03]" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={chip}>
            <span className={cn("w-1.5 h-1.5 rounded-full", k.isAvailable ? "bg-emerald-600" : "bg-red-600")} aria-hidden="true" />
            {k.isAvailable ? "Tersedia" : "Penuh"}
          </span>
          {k.isNew && <span className={cn(chip, "bg-ink text-paper")}>Baru</span>}
        </div>
        <span className={cn(chip, "absolute top-3 right-3")}>Kost {k.type}</span>
      </div>

      <div className="pt-4 flex flex-col flex-1">
        <h3 className="font-display font-bold text-2xl leading-tight tracking-tight text-ink line-clamp-1">
          <Link href={`/kost/${k.slug}`} className="hover:underline decoration-1 underline-offset-4">{k.name}</Link>
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
          <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{k.area}</span>
        </p>
        {k.facilities.length > 0 && (
          <p className="mt-1 text-sm text-ink-muted line-clamp-1">
            <span className="sr-only">Fasilitas: </span>
            {k.facilities.slice(0, MAX_FACILITIES).join(" · ")}
            {more > 0 && (
              <>
                {" "}· +{more}
                <span className="sr-only"> lainnya</span>
              </>
            )}
          </p>
        )}

        {/* Tanpa mt-auto: baris di atas selalu 1 baris (clamp), dan kartu tetangga tidak bergeser saat penjelasan DP dibuka */}
        <div className="pt-4">
          <p className="pt-4 border-t border-line">
            <span className="text-sm text-ink-muted">Mulai </span>
            <span className="text-xl font-bold tracking-tight text-ink tabular-nums">{rupiah(k.startPrice)}</span>
            <span className="text-sm text-ink-muted"> /bulan</span>
          </p>
          {/* Permintaan klien: harga + deposit Rp200.000 + penjelasannya di setiap kartu katalog */}
          <details className="group/dp mt-1">
            <summary className="inline-flex items-center gap-1 min-h-8 cursor-pointer list-none rounded text-sm text-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden">
              DP mulai {DP.pct}% · Deposit {DEPOSIT_RP}
              <ChevronDown className="w-4 h-4 transition-transform group-open/dp:rotate-180" aria-hidden="true" />
              <span className="sr-only"> (penjelasan)</span>
            </summary>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Bayar uang muka (DP) mulai {DP.pct}% dari total sewa untuk menahan kamar, berlaku {DP.days} hari. Sisa sewa dan deposit {DEPOSIT_RP} dibayar
              saat check-in. Deposit kembali setelah masa sewa berakhir sesuai ketentuan.
            </p>
          </details>
          <GateButton slug={k.slug} name={k.name} subtitle={`Kost ${k.type} · ${k.area}`} className={cn(lineBtn, "mt-4 w-full")} />
        </div>
      </div>
    </article>
  );
}
