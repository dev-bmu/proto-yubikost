// Halaman Gedung Kost (PRD §6.3, v1.2): info gedung, tipe kamar, fasilitas, lokasi, tata tertib, panel → Gatekeeper.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, BedDouble, CheckCircle2, MapPin, Ruler, ShieldCheck, XCircle } from "lucide-react";
import { kostBySlug, roomTypesWithAvailability } from "@/lib/queries";
import { all } from "@/lib/db";
import { DEPOSIT, MIN_CONTRACT } from "@/lib/constants";
import { cn, rupiah } from "@/lib/format";
import { card, Container, kostTypeClass, Notice, Pill } from "@/components/ui";
import { FacilityChips, FacilityTile } from "@/components/media";
import { GateButton } from "@/components/gate/GateButton";
import { Breadcrumb } from "@/components/kost/Breadcrumb";
import { Gallery, TypePhotos } from "@/components/kost/Gallery";
import { RulesTabs } from "@/components/kost/RulesTabs";

type Props = { params: Promise<{ slug: string }> };

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
    ["Tipe", `Kost ${k.type}`],
    ...(types.length ? [["Pilihan Kamar", `${types.length} tipe`]] : []),
    ...(k.totalFloors > 0 ? [["Jumlah Lantai", `${k.totalFloors} lantai`]] : []),
    ["Kontrak Min.", MIN_CONTRACT],
    ["Deposit", DEPOSIT],
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {/* Ruang di bawah footer agar bar sticky mobile tidak menutupi konten terakhir */}
      <style>{"@media (max-width: 1023.98px) { body { padding-bottom: calc(5.5rem + env(safe-area-inset-bottom)); } }"}</style>

      <Container className="py-8 space-y-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Katalog Kost", href: "/#katalog" }, { label: k.name }]} />
        <Gallery photos={k.photos} name={k.name} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          <div className="min-w-0 space-y-10">
            <header className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Pill tone={k.isAvailable ? "success" : "danger"}>
                  {k.isAvailable ? <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> : <XCircle className="w-3 h-3" aria-hidden="true" />}
                  {k.isAvailable ? "Tersedia" : "Penuh"}
                </Pill>
                <Pill className={kostTypeClass(k.type)}>Kost {k.type}</Pill>
                <Pill tone="success">
                  <BadgeCheck className="w-3 h-3" aria-hidden="true" /> Terverifikasi
                </Pill>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{k.name}</h1>
              <p className="flex items-start gap-2 text-slate-600">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" /> {k.address}
              </p>
              {k.description && <p className="text-slate-600 leading-relaxed whitespace-pre-line">{k.description}</p>}
            </header>

            <section id="tipe-kamar" aria-labelledby="judul-tipe-kamar" className="space-y-4 scroll-mt-24">
              <div>
                <h2 id="judul-tipe-kamar" className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <BedDouble className="w-5 h-5 text-primary" aria-hidden="true" /> Pilihan Tipe Kamar
                </h2>
                <p className="mt-1 text-sm text-slate-500">Kamar bertipe sama memiliki ukuran, fasilitas, dan harga yang sama. Nomor kamar dipilih di Dashboard.</p>
              </div>
              {types.length === 0 ? (
                <Notice>Detail tipe kamar sedang disiapkan tim Brave. Tanyakan pilihan kamar lewat tombol Ajukan Sewa.</Notice>
              ) : (
                <ul className="space-y-4">
                  {types.map(({ type: t, rooms }) => {
                    const open = rooms.length > 0;
                    return (
                      <li key={t.id} className={card(false, "overflow-hidden grid sm:grid-cols-[260px_1fr]")}>
                        <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-52 overflow-hidden bg-slate-100">
                          <TypePhotos photos={t.photos} name={t.name} />
                        </div>
                        <div className="p-5 flex flex-col gap-3 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold text-slate-900">{t.name}</h3>
                              {t.size && (
                                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                                  <Ruler className="w-4 h-4 text-primary" aria-hidden="true" /> Ukuran {t.size}
                                </p>
                              )}
                            </div>
                            <Pill tone={open ? "success" : "danger"}>
                              {open ? <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> : <XCircle className="w-3 h-3" aria-hidden="true" />}
                              {open ? "Tersedia" : "Penuh"}
                            </Pill>
                          </div>
                          {t.description && <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{t.description}</p>}
                          <FacilityChips items={t.facilities} max={6} />
                          <p className="mt-auto pt-3 border-t border-slate-100">
                            <span className="text-xl font-extrabold text-primary tracking-tight tabular-nums">{rupiah(t.monthlyPrice)}</span>
                            <span className="text-xs text-slate-500"> /bulan</span>
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {k.facilities.length > 0 && (
              <section aria-labelledby="fasilitas" className="space-y-4">
                <h2 id="fasilitas" className="text-lg font-bold text-slate-900">Fasilitas Gedung</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {k.facilities.map((f) => (
                    <FacilityTile key={f} name={f} />
                  ))}
                </div>
              </section>
            )}

            <section aria-labelledby="peta" className="space-y-4">
              <h2 id="peta" className="text-lg font-bold text-slate-900">Lokasi</h2>
              {k.mapsEmbed ? (
                <iframe
                  src={k.mapsEmbed}
                  title={`Peta lokasi ${k.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-80 sm:h-96 rounded-2xl border border-slate-200 bg-slate-200"
                />
              ) : (
                <p className="text-sm text-slate-500">Peta lokasi segera hadir.</p>
              )}
            </section>

            <section aria-labelledby="tata-tertib" className="space-y-4">
              <h2 id="tata-tertib" className="text-lg font-bold text-slate-900">Tata Tertib</h2>
              <RulesTabs />
            </section>
          </div>

          <aside aria-label="Ketersediaan kamar" className={card(false, "overflow-hidden lg:sticky lg:top-24")}>
            <p className={cn("px-5 py-2.5 text-sm font-bold flex items-center gap-2 text-white", k.isAvailable ? "bg-emerald-700" : "bg-red-600")}>
              {k.isAvailable ? <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> : <XCircle className="w-4 h-4" aria-hidden="true" />}
              {k.isAvailable ? "Kamar Tersedia" : "Kamar Penuh"}
            </p>
            <div className="p-5 space-y-5">
              <p>
                <span className="block text-sm text-slate-500">Mulai</span>
                <span className="text-3xl font-extrabold text-primary tracking-tight tabular-nums">{rupiah(k.startPrice)}</span>
                <span className="text-sm text-slate-500"> /bulan</span>
              </p>
              <dl className="space-y-2.5 text-sm border-y border-slate-100 py-4">
                {info.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="font-semibold text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
              <GateButton slug={k.slug} name={k.name} subtitle={subtitle} size="lg" className="w-full" />
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" /> Kost terverifikasi Brave
              </p>
            </div>
          </aside>
        </div>
      </Container>

      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <p className="min-w-0">
            <span className="block text-xs text-slate-500">Mulai per bulan</span>
            <span className="text-lg font-extrabold text-primary tabular-nums">{rupiah(k.startPrice)}</span>
          </p>
          <GateButton slug={k.slug} name={k.name} subtitle={subtitle} className="shrink-0 whitespace-nowrap" />
        </div>
      </div>
    </>
  );
}
