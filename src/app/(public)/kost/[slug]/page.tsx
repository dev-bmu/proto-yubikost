// Halaman Gedung Kost (PRD §6.3, v1.2; tampilan v1.3 paper/ink): info gedung, tipe kamar, fasilitas, lokasi, tata tertib,
// panel harga + uang muka & deposit beserta ketentuannya → Gatekeeper. Status tanpa angka kamar kosong.
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, BedDouble, ChevronDown, MapPin, Ruler, ShieldCheck } from "lucide-react";
import { kostBySlug, roomTypesWithAvailability } from "@/lib/queries";
import { all } from "@/lib/db";
import { DEPOSIT_AMOUNT, DEPOSIT_TERMS, DP_TERMS, DP_TIERS, MIN_CONTRACT } from "@/lib/constants";
import { cn, rupiah } from "@/lib/format";
import { Container, Notice } from "@/components/ui";
import { facilityMeta } from "@/components/media";
import { GateButton } from "@/components/gate/GateButton";
import { inkBtn, display } from "@/components/landing/theme";
import { Breadcrumb } from "@/components/kost/Breadcrumb";
import { Gallery, TypePhotos } from "@/components/kost/Gallery";
import { RulesTabs } from "@/components/kost/RulesTabs";

type Props = { params: Promise<{ slug: string }> };

export const viewport: Viewport = { themeColor: "#ffffff" };

const DP_MIN = DP_TIERS[0].pct;
const DEPOSIT_RP = rupiah(DEPOSIT_AMOUNT);
const chip = "inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink";
const h2 = "flex items-center gap-2 text-lg font-bold text-ink";

/** Status gedung/tipe: titik warna + teks, tanpa jumlah kamar. */
function Status({ open }: { open: boolean }) {
  return (
    <span className={chip}>
      <span className={cn("w-1.5 h-1.5 rounded-full", open ? "bg-emerald-600" : "bg-red-600")} aria-hidden="true" />
      {open ? "Tersedia" : "Penuh"}
    </span>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const k = kostBySlug((await params).slug);
  if (!k) return { title: "Kost tidak ditemukan" };
  return {
    title: `${k.name} — Kost ${k.type} di ${k.area}`,
    description: k.description,
    openGraph: { title: k.name, description: k.description, images: k.photos.slice(0, 1) },
  };
}

export default async function KostDetailPage({ params }: Props) {
  const k = kostBySlug((await params).slug);
  if (!k) notFound();
  // Tipe tanpa kamar sama sekali tidak ditampilkan; foto tipe kamar publik (PRD §4.8, §6.3).
  const typeIds = new Set(all("rooms").filter((r) => r.kostId === k.id).map((r) => r.typeId));
  const types = roomTypesWithAvailability(k.id).filter(({ type }) => typeIds.has(type.id));
  const prices = types.map(({ type }) => type.monthlyPrice);

  const subtitle = `Kost ${k.type} · ${k.area}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: k.name,
    description: k.description,
    image: k.photos,
    category: `Kost ${k.type}`,
    brand: { "@type": "Brand", name: "Brave Brawijaya" },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: prices.length ? Math.min(...prices) : k.startPrice,
      highPrice: prices.length ? Math.max(...prices) : k.startPrice,
      priceCurrency: "IDR",
      availability: k.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  const info = [
    ["Uang muka", `mulai ${DP_MIN}%`],
    ["Deposit", DEPOSIT_RP],
    ["Tipe", `Kost ${k.type}`],
    ...(types.length ? [["Pilihan kamar", `${types.length} tipe`]] : []),
    ...(k.totalFloors > 0 ? [["Jumlah lantai", `${k.totalFloors} lantai`]] : []),
    ["Kontrak min.", MIN_CONTRACT],
  ];

  return (
    <div className={cn(display.variable, "on-paper bg-paper text-ink")}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {/* Ruang di bawah footer agar bar sticky mobile tidak menutupi konten terakhir (footer ikut berlatar tinta) */}
      <style>{"@media (max-width: 1023.98px) { footer { padding-bottom: calc(5.5rem + env(safe-area-inset-bottom)); } }"}</style>

      <Container className="pt-8 pb-16 sm:pb-24 space-y-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Katalog Kost", href: "/#katalog" }, { label: k.name }]} />
        <Gallery photos={k.photos} name={k.name} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12 items-start">
          <div className="min-w-0 space-y-12">
            <header className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Status open={k.isAvailable} />
                <span className={chip}>Kost {k.type}</span>
                <span className={chip}>
                  <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> Terverifikasi
                </span>
              </div>
              <h1 className="font-display font-extrabold text-4xl sm:text-5xl leading-[1.05] tracking-tight text-ink">{k.name}</h1>
              <p className="flex items-start gap-2 text-ink-soft">
                <MapPin className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" /> {k.address}
              </p>
              {k.description && <p className="max-w-2xl leading-relaxed text-ink-soft whitespace-pre-line">{k.description}</p>}
            </header>

            <section id="tipe-kamar" aria-labelledby="judul-tipe-kamar" className="space-y-4 scroll-mt-24">
              <div>
                <h2 id="judul-tipe-kamar" className={h2}>
                  <BedDouble className="w-5 h-5" aria-hidden="true" /> Pilihan Tipe Kamar
                </h2>
                <p className="mt-1 text-sm text-ink-muted">Kamar bertipe sama memiliki ukuran, fasilitas, dan harga yang sama. Nomor kamar dipilih di Dashboard.</p>
              </div>
              {types.length === 0 ? (
                <Notice tone="neutral">Detail tipe kamar sedang disiapkan tim Brave. Tanyakan pilihan kamar lewat tombol Ajukan Sewa.</Notice>
              ) : (
                <ul className="space-y-4">
                  {types.map(({ type: t, rooms }) => (
                    <li key={t.id} className="overflow-hidden grid sm:grid-cols-[260px_1fr] rounded-2xl border border-line bg-white">
                      <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-52 overflow-hidden bg-sand">
                        <TypePhotos photos={t.photos} name={t.name} />
                      </div>
                      <div className="p-5 flex flex-col gap-3 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-lg font-bold text-ink">{t.name}</h3>
                            {t.size && (
                              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
                                <Ruler className="w-4 h-4" aria-hidden="true" /> Ukuran {t.size}
                              </p>
                            )}
                          </div>
                          <Status open={rooms.length > 0} />
                        </div>
                        {t.description && <p className="text-sm leading-relaxed text-ink-soft line-clamp-2">{t.description}</p>}
                        <ul className="flex flex-wrap gap-1.5" aria-label="Fasilitas">
                          {t.facilities.slice(0, 6).map((f) => {
                            const Icon = facilityMeta(f).icon;
                            return (
                              <li key={f} className="inline-flex items-center gap-1 rounded-lg bg-sand px-2.5 py-1 text-xs font-medium text-ink-soft">
                                <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {f}
                              </li>
                            );
                          })}
                          {t.facilities.length > 6 && (
                            <li className="inline-flex items-center rounded-lg bg-sand px-2.5 py-1 text-xs font-semibold text-ink-soft">
                              +{t.facilities.length - 6}<span className="sr-only"> fasilitas lain</span>
                            </li>
                          )}
                        </ul>
                        <p className="mt-auto pt-3 border-t border-line">
                          <span className="text-xl font-bold tracking-tight text-ink tabular-nums">{rupiah(t.monthlyPrice)}</span>
                          <span className="text-sm text-ink-muted"> /bulan</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {k.facilities.length > 0 && (
              <section aria-labelledby="fasilitas" className="space-y-4">
                <h2 id="fasilitas" className={h2}>Fasilitas Gedung</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {k.facilities.map((f) => {
                    const { icon: Icon, desc } = facilityMeta(f);
                    return (
                      <li key={f} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
                        <span className="w-10 h-10 shrink-0 rounded-lg bg-sand text-ink flex items-center justify-center" aria-hidden="true">
                          <Icon className="w-5 h-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">{f}</span>
                          <span className="block text-xs text-ink-muted">{desc}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section aria-labelledby="peta" className="space-y-4">
              <h2 id="peta" className={h2}>Lokasi</h2>
              {k.mapsEmbed ? (
                <iframe
                  src={k.mapsEmbed}
                  title={`Peta lokasi ${k.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-80 sm:h-96 rounded-2xl border border-line bg-sand"
                />
              ) : (
                <p className="text-sm text-ink-muted">Peta lokasi segera hadir.</p>
              )}
            </section>

            <section aria-labelledby="tata-tertib" className="space-y-4">
              <h2 id="tata-tertib" className={h2}>Tata Tertib</h2>
              <RulesTabs />
            </section>
          </div>

          {/* Panel harga: sticky di lg, bisa digulir sendiri saat ketentuan dibuka */}
          <aside aria-label="Harga & pemesanan" className="rounded-2xl border border-line bg-white lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
            <div className="p-5 sm:p-6 space-y-5">
              <Status open={k.isAvailable} />
              <p>
                <span className="block text-sm text-ink-muted">Mulai</span>
                <span className="text-3xl font-bold tracking-tight text-ink tabular-nums">{rupiah(k.startPrice)}</span>
                <span className="text-sm text-ink-muted"> /bulan</span>
              </p>
              <dl className="space-y-2.5 text-sm border-y border-line py-4">
                {info.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-ink-muted">{label}</dt>
                    <dd className="font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <GateButton slug={k.slug} name={k.name} subtitle={subtitle} size="lg" className={cn(inkBtn, "w-full")} />

              <details className="group rounded-xl bg-sand">
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none rounded-xl p-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  Ketentuan uang muka & deposit
                  <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="px-4 pb-4 space-y-5 text-sm leading-relaxed text-ink-soft">
                  <div>
                    <p className="font-semibold text-ink">Uang muka (DP)</p>
                    <ul className="mt-2 grid grid-cols-3 gap-2 text-center" aria-label="Pilihan uang muka">
                      {DP_TIERS.map((t) => (
                        <li key={t.pct} className="rounded-lg border border-line bg-white py-2">
                          <span className="block font-bold text-ink">{t.pct}%</span>
                          <span className="block text-xs text-ink-muted">berlaku {t.days} hari</span>
                        </li>
                      ))}
                    </ul>
                    <ul className="mt-3 list-disc pl-4 space-y-1.5">
                      {DP_TERMS.map((term) => (
                        <li key={term}>{term}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">Deposit {DEPOSIT_RP}</p>
                    <ul className="mt-2 list-disc pl-4 space-y-1.5">
                      {DEPOSIT_TERMS.map((term) => (
                        <li key={term}>{term}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </details>

              <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
                <ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" /> Kost terverifikasi Brave
              </p>
            </div>
          </aside>
        </div>
      </Container>

      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-paper/95 backdrop-blur-md border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <p className="min-w-0">
            <span className="block text-lg font-bold leading-tight text-ink tabular-nums">
              {rupiah(k.startPrice)}
              <span className="text-xs font-normal text-ink-muted"> /bulan</span>
            </span>
            {/* Pecah di pemisah, jangan dipotong: nominal deposit harus terbaca utuh */}
            <span className="block text-xs leading-snug text-ink-muted">
              <span className="whitespace-nowrap">DP mulai {DP_MIN}%</span> · <span className="whitespace-nowrap">Deposit {DEPOSIT_RP}</span>
            </span>
          </p>
          <GateButton slug={k.slug} name={k.name} subtitle={subtitle} className={cn(inkBtn, "shrink-0 whitespace-nowrap")} />
        </div>
      </div>
    </div>
  );
}
