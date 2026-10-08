// Home = Katalog Kost (PRD v1.2; tampilan v1.3: putih bersih + navy & gradien logo, judul Red Hat Display): hero + pencarian → katalog → cara sewa → keunggulan → mitra → testimoni → FAQ.
// Latar section netral (tanpa warna logo); CTA penutup ada di Footer. Mobile: hero hanya judul + pencarian.
import type { Metadata, Viewport } from "next";
import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { ArrowUp, FileCheck2, MessageCircle, Plus, Search, ShieldCheck, Sparkles, Star, Wrench, type LucideIcon } from "lucide-react";
import { CountUp } from "@/components/landing/CountUp";
import { inkBtn, lineBtn, display } from "@/components/landing/theme";
import { KostCatalog } from "@/components/kost/KostCatalog";
import { Photo } from "@/components/media";
import { Container } from "@/components/ui";
import { DEPOSIT_AMOUNT, DEPOSIT_TERMS, DP_TIERS, HOLD_HOURS, KOST_TYPES, MIN_CONTRACT, PACKAGES } from "@/lib/constants";
import { all } from "@/lib/db";
import { cn, initials, rupiah } from "@/lib/format";
import { kostCards, landingStats } from "@/lib/queries";
import { waKost } from "@/lib/wa";

export const metadata: Metadata = {
  title: { absolute: "Katalog Kost Premium di Malang — yubikost by BRAVE" },
  description: "Kost premium di Malang yang dikelola penuh dan terverifikasi Brave Brawijaya: bersih, aman 24 jam, kontrak resmi, sewa langsung dari dashboard.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

const DP_MIN = DP_TIERS[0].pct;
const DEPOSIT_RP = rupiah(DEPOSIT_AMOUNT);

const STEPS = [
  { title: "Pilih kost", desc: "Cari gedung sesuai area, tipe, dan budget, lalu tekan Ajukan Sewa." },
  { title: "Pilih kamar", desc: "Masuk ke Dashboard, pilih tipe, nomor kamar, dan paket sewa." },
  { title: "Bayar uang muka", desc: `Mulai ${DP_MIN}% lewat transfer atau QRIS, lalu unggah bukti. Kamar ditahan ${HOLD_HOURS} jam.` },
  { title: "Check-in", desc: `Tim Finance memverifikasi bukti. Sisa sewa dan deposit ${DEPOSIT_RP} dilunasi saat check-in.` },
];

const USP: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: ShieldCheck, title: "Aman 24 jam", desc: "CCTV area bersama, akses kartu, dan tim lapangan yang siaga." },
  { icon: Wrench, title: "Maintenance cepat", desc: "Keluhan AC, air, atau listrik ditangani tim teknisi Brave." },
  { icon: Sparkles, title: "Kebersihan terjaga", desc: "Area bersama dibersihkan rutin sesuai standar Brave." },
  { icon: FileCheck2, title: "Kontrak & tagihan resmi", desc: "Tagihan, bukti bayar, dan masa sewa tercatat rapi di Dashboard." },
];

const FAQ = [
  {
    q: "Bagaimana cara menyewa kamar?",
    a: "Pilih kost di katalog, tekan Ajukan Sewa, lalu masuk atau daftar. Di Dashboard Anda memilih tipe dan nomor kamar serta tanggal check-in, membayar uang muka, lalu mengunggah bukti transfer. Sisa sewa dan deposit dilunasi saat check-in.",
  },
  {
    q: "Berapa yang dibayar di awal?",
    a: `Bayar uang muka minimal ${DP_MIN}% dari sewa paket (${PACKAGES.join(", ")} bulan) untuk menahan kamar. Sisa sewa dan deposit ${DEPOSIT_RP} dilunasi saat check-in. Deposit kembali saat masa sewa berakhir sesuai ketentuan. Kontrak minimal ${MIN_CONTRACT}.`,
  },
  { q: "Kapan deposit dikembalikan?", a: DEPOSIT_TERMS.join(" ") },
  {
    q: "Berapa lama kamar ditahan setelah dipesan?",
    a: `Kamar ditahan ${HOLD_HOURS} jam sejak pesanan dibuat untuk pembayaran uang muka. Setelah uang muka diverifikasi, kamar ditahan sampai masa berlaku uang muka (13–28 hari). Bila batas waktu lewat, pesanan kedaluwarsa dan kamar dilepas.`,
  },
  {
    q: "Bagaimana cara membayar dan memantau verifikasinya?",
    a: "Transfer ke rekening atau scan QRIS resmi yang tampil di Dashboard, lalu unggah bukti pembayaran. Tim Finance memeriksa bukti Anda; status dan alasan bila ditolak langsung tampil di Dashboard, dan Anda bisa mengunggah ulang.",
  },
  {
    q: "Apakah bisa survey lokasi dulu?",
    a: "Bisa. Setelah memilih kamar di Dashboard, tekan Ajukan Survey Lokasi untuk mengatur jadwal dengan admin Kost melalui WhatsApp. Survey gratis dan tidak mengikat.",
  },
  {
    q: "Bagaimana cara memperpanjang sewa?",
    a: "Penghuni mengajukan perpanjangan dari menu Pembayaran di Dashboard, mengunggah bukti, lalu masa sewa diperbarui setelah diverifikasi tim Finance.",
  },
];

const LOGOS = Array.from({ length: 14 }, (_, i) => i + 1);
// Track bergerak dapat difokus agar keyboard/sentuh juga bisa menghentikan gerak (WCAG 2.2.2). Outline inset karena mask-image.
const TRACK_WRAP =
  "pause-on-hover overflow-hidden focus-visible:outline-offset-[-3px] [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]";
const NEW_TAB = <span className="sr-only"> (membuka tab baru)</span>;
const H2 = "font-display font-extrabold text-4xl sm:text-5xl leading-[1.05] tracking-tight text-ink text-balance";
const firstArea = (area: string) => area.split(",")[0].trim();

type Props = { searchParams: Promise<{ q?: string | string[]; tipe?: string | string[] }> };

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const tipe = KOST_TYPES.find((t) => t === sp.tipe) ?? "";

  const kosts = kostCards();
  const s = landingStats();
  const testimonials = all("testimonials");
  const showcase = kosts.find((k) => k.photos.length > 1) ?? kosts[0];
  // Etalase hero: dua gedung tersedia (harga termurah dulu)
  const [featured, second] = kosts.filter((k) => k.isAvailable).sort((a, b) => a.startPrice - b.startPrice).slice(0, 2);
  const areas = [...new Set(kosts.map((k) => firstArea(k.area)))].slice(0, 5);
  const trust = [
    { value: s.kost, label: "Gedung kost" },
    { value: s.residents, label: "Penghuni aktif" },
    { value: 500, suffix: "+", label: "Klien puas" },
  ];

  return (
    <div className={cn(display.variable, "on-paper bg-paper text-ink")}>
      {/* 1. Hero: judul + pencarian (C-09). Foto etalase hanya lg+; mobile cukup judul + pencarian agar katalog cepat terlihat */}
      <section aria-labelledby="judul-hero" className="pt-8 pb-10 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        <Container className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div className="lg:col-span-6">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
              <ShieldCheck className="w-4 h-4 text-brand" aria-hidden="true" /> Terverifikasi Brave Brawijaya
            </p>
            <h1 id="judul-hero" className="mt-4 sm:mt-6 font-display font-extrabold text-[2.6rem] sm:text-6xl xl:text-[4.25rem] leading-[1.02] tracking-[-0.025em] text-balance">
              Kost premium di Malang, <span className="text-logo-gradient">dikelola penuh.</span>
            </h1>
            <p className="hidden sm:block mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              Bersih, aman 24 jam, kontrak resmi. Pesan dan bayar langsung dari Dashboard.
            </p>

            <Form
              key={`${q}|${tipe}`}
              action="/#katalog"
              role="search"
              aria-label="Cari kost"
              className="mt-7 sm:mt-9 max-w-xl grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_11rem_auto] rounded-2xl border border-line-strong bg-white"
            >
              <div className="col-span-2 sm:col-span-1 flex items-center gap-3 px-4 py-2.5 border-b sm:border-b-0 sm:border-r border-line rounded-t-2xl sm:rounded-tr-none sm:rounded-l-2xl focus-within:ring-2 focus-within:ring-inset focus-within:ring-ink">
                <Search className="w-5 h-5 text-ink-soft shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <label htmlFor="hero-q" className="block text-xs font-semibold text-ink-muted">Nama kost atau area</label>
                  <input
                    id="hero-q"
                    name="q"
                    type="search"
                    defaultValue={q}
                    placeholder="mis. Suhat, Dinoyo"
                    className="w-full bg-transparent text-base sm:text-sm font-semibold text-ink placeholder:font-normal placeholder:text-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                  />
                </div>
              </div>
              <div className="px-4 py-2.5 rounded-bl-2xl sm:rounded-none focus-within:ring-2 focus-within:ring-inset focus-within:ring-ink">
                <label htmlFor="hero-tipe" className="block text-xs font-semibold text-ink-muted">Tipe kost</label>
                <select id="hero-tipe" name="tipe" defaultValue={tipe} className="w-full bg-transparent text-base sm:text-sm font-semibold text-ink focus:outline-none cursor-pointer">
                  <option value="">Semua tipe</option>
                  {KOST_TYPES.map((t) => (
                    <option key={t} value={t}>Kost {t}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className={cn(inkBtn, "m-1.5 px-6 min-h-12 text-sm")}>
                <Search className="w-4 h-4" aria-hidden="true" /> Cari
              </button>
            </Form>

            {areas.length > 0 && (
              <div className="hidden sm:flex mt-5 flex-wrap items-center gap-x-4 text-sm">
                <span className="text-ink-muted">Populer:</span>
                {areas.map((a) => (
                  <Link key={a} href={`/?q=${encodeURIComponent(a)}#katalog`} className="min-h-9 inline-flex items-center font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                    {a}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {featured && (
            <div className="hidden lg:grid lg:col-span-6 grid-cols-5 gap-5 items-end">
              {second && (
                <Link href={`/kost/${second.slug}`} className="group col-span-2 mb-16 block">
                  <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-sand">
                    <Photo src={second.photos[0]} alt="" sizes="240px" priority className="transition-transform duration-700 group-hover:scale-105" />
                  </span>
                  <span className="mt-3 block text-sm font-semibold text-ink group-hover:underline underline-offset-4">{second.name}</span>
                  <span className="block text-sm text-ink-muted">{firstArea(second.area)}</span>
                </Link>
              )}
              <Link href={`/kost/${featured.slug}`} className="group col-span-3 col-start-3 block">
                <span className="relative block aspect-[3/4] overflow-hidden mask-house bg-sand">
                  <Photo src={featured.photos[0]} alt="" sizes="(min-width: 1280px) 360px, 30vw" priority className="transition-transform duration-700 group-hover:scale-105" />
                </span>
                <span className="mt-3 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold text-ink group-hover:underline underline-offset-4">{featured.name}</span>
                  <span className="text-ink-muted tabular-nums whitespace-nowrap">mulai {rupiah(featured.startPrice)}</span>
                </span>
              </Link>
            </div>
          )}
        </Container>
      </section>

      {/* 2. Katalog (PRD §6.2 C–F). Tiap kartu memuat harga + DP & deposit beserta penjelasannya */}
      <section id="katalog" aria-labelledby="judul-katalog" className="scroll-mt-16 pt-10 pb-16 sm:pt-20 sm:pb-24 border-t border-line">
        <Container>
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-3">
            <h2 id="judul-katalog" className={H2}>Katalog kost</h2>
            <p className="hidden sm:block max-w-sm text-sm leading-relaxed text-ink-soft md:text-right">
              Harga per bulan. DP mulai {DP_MIN}% untuk menahan kamar; deposit {DEPOSIT_RP} dibayar saat check-in.
            </p>
          </div>
          <KostCatalog key={`${q}|${tipe}`} kosts={kosts} initialQuery={q} initialType={tipe} />
        </Container>
      </section>

      {/* 3. Cara sewa */}
      <section id="cara-sewa" aria-labelledby="judul-cara-sewa" className="scroll-mt-16 py-16 sm:py-24 bg-white border-y border-line">
        <Container>
          <div className="grid lg:grid-cols-12 gap-4 lg:gap-8 items-end mb-10 sm:mb-14">
            <h2 id="judul-cara-sewa" className={cn(H2, "lg:col-span-6")}>Sewa kamar dalam 4 langkah</h2>
            <p className="hidden sm:block lg:col-span-5 lg:col-start-8 leading-relaxed text-ink-soft">
              Semua proses berjalan online dari Dashboard. Survey lokasi tetap bisa dijadwalkan bila Anda ingin melihat langsung.
            </p>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8 sm:gap-y-12">
            {STEPS.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[3rem_1fr] sm:block gap-x-3 pt-5 border-t border-ink">
                <span className="font-display font-extrabold text-4xl sm:text-5xl leading-none text-brand" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="sm:mt-6">
                  <h3 className="font-semibold text-ink">
                    <span className="sr-only">Langkah {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <a href="#katalog" className={cn(lineBtn, "mt-10 sm:mt-14 px-6 min-h-12 text-sm")}>
            Mulai dari katalog <ArrowUp className="w-4 h-4" aria-hidden="true" />
          </a>
        </Container>
      </section>

      {/* 4. Keunggulan dikelola Brave + angka kepercayaan (dipindah dari hero) */}
      <section aria-labelledby="judul-usp" className="py-16 sm:py-24">
        <Container className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="hidden lg:block lg:col-span-5 relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand">
            <Photo
              src={showcase?.photos[1] ?? showcase?.photos[0]}
              alt={showcase ? `Suasana ${showcase.name}` : "Kost Brave"}
              sizes="(min-width: 1280px) 460px, 40vw"
            />
          </div>
          <div className="lg:col-span-7">
            <h2 id="judul-usp" className={H2}>Dikelola profesional, bukan sekadar disewakan.</h2>
            <p className="hidden sm:block mt-5 max-w-xl leading-relaxed text-ink-soft">
              Setiap gedung dikelola langsung tim Brave, dari kebersihan sampai administrasi. Anda cukup fokus kuliah atau bekerja.
            </p>
            <ul className="mt-10 grid sm:grid-cols-2 gap-x-10 gap-y-7 sm:gap-y-9">
              {USP.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex gap-4 sm:block">
                  <Icon className="w-6 h-6 shrink-0 text-ink" strokeWidth={1.5} aria-hidden="true" />
                  <div className="sm:mt-4">
                    <h3 className="font-semibold text-ink">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-12 pt-8 border-t border-line grid grid-cols-3 gap-4">
              {trust.map((t) => (
                <div key={t.label} className="flex flex-col-reverse">
                  <dt className="mt-1 text-xs sm:text-sm text-ink-muted">{t.label}</dt>
                  <dd className="font-display font-extrabold text-4xl sm:text-5xl leading-none tracking-tight text-ink">
                    <CountUp value={t.value} suffix={t.suffix} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      {/* 5. Marquee mitra (C-17) */}
      <section aria-labelledby="judul-mitra" className="py-12 bg-white border-y border-line">
        <Container>
          <h2 id="judul-mitra" className="text-center text-sm font-medium text-ink-soft mb-8">
            Dipercaya institusi, kampus, dan brand di Malang Raya
          </h2>
        </Container>
        <div tabIndex={0} role="region" aria-label="Logo mitra Brave, fokus untuk menghentikan gerak" className={TRACK_WRAP}>
          <div className="animate-chain-left items-center">
            {[...LOGOS, ...LOGOS].map((n, i) => {
              const dup = i >= LOGOS.length;
              return (
                <div key={i} aria-hidden={dup || undefined} className="shrink-0 px-5 sm:px-8">
                  <Image
                    src={`/logo-mitra/${n}.png`}
                    alt={dup ? "" : `Logo mitra Brave ${n}`}
                    width={144}
                    height={64}
                    className="w-24 sm:w-32 h-10 sm:h-14 object-contain grayscale opacity-60 transition duration-300 hover:grayscale-0 hover:opacity-100"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Testimoni — statis (tanpa ticker), 3 di mobile. Disembunyikan bila data kosong */}
      {testimonials.length > 0 && (
        <section id="testimoni" aria-labelledby="judul-testimoni" className="scroll-mt-16 py-16 sm:py-24">
          <Container>
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-3">
              <h2 id="judul-testimoni" className={H2}>Kata penghuni & pemilik kost</h2>
              <p className="hidden sm:block text-sm text-ink-muted">Nama disamarkan demi privasi.</p>
            </div>
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
              {testimonials.slice(0, 6).map((t, i) => (
                <figure key={t.id} className={cn("break-inside-avoid mb-6 rounded-2xl border border-line bg-white p-6 sm:p-7", i >= 3 && "hidden md:block")}>
                  <div className="flex gap-0.5" role="img" aria-label={`Rating ${t.rating} dari 5`}>
                    {Array.from({ length: 5 }, (_, k) => (
                      <Star key={k} className={cn("w-4 h-4", k < t.rating ? "fill-brand text-brand" : "text-line-strong")} aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="mt-4 font-display font-medium text-xl leading-snug text-ink">“{t.content}”</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 text-sm">
                    <span aria-hidden="true" className="w-9 h-9 shrink-0 rounded-full bg-sand text-ink text-xs font-bold flex items-center justify-center">
                      {initials(t.name.replace(/^(Ibu|Bapak)\s+/, ""))}
                    </span>
                    <span>
                      <span className="block font-semibold text-ink">{t.name}</span>
                      <span className="block text-ink-muted">Layanan {t.tag} Brave</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* 7. FAQ */}
      <section id="faq" aria-labelledby="judul-faq" className="scroll-mt-16 py-16 sm:py-24 border-t border-line">
        <Container className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-4">
            <h2 id="judul-faq" className={H2}>Pertanyaan yang sering diajukan</h2>
            <p className="hidden sm:block mt-4 leading-relaxed text-ink-soft">Belum menemukan jawabannya? Tim Kost kami siap membantu setiap hari.</p>
            <a
              href={waKost("Halo Brave, saya punya pertanyaan tentang sewa Kost.")}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(lineBtn, "mt-6 px-5 min-h-11 text-sm")}
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" /> Tanya via WhatsApp{NEW_TAB}
            </a>
          </div>
          <div className="lg:col-span-8 border-t border-ink">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b border-line">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none py-5 font-semibold text-ink sm:text-lg [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <Plus className="w-5 h-5 shrink-0 text-ink-soft transition-transform group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className="pb-6 pr-8 -mt-1 leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
