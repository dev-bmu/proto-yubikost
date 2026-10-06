// Home = Katalog Kost (PRD v1.2): hero + pencarian → katalog → cara sewa → keunggulan → mitra → testimoni → FAQ → banner CTA.
import type { Metadata } from "next";
import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUp, BadgeCheck, Building2, ChevronDown, FileCheck2, Headset, KeyRound, LayoutDashboard, MessageCircle, Search,
  ShieldCheck, Sparkles, Star, Upload, Users, Wrench, type LucideIcon,
} from "lucide-react";
import { CountUp } from "@/components/landing/CountUp";
import { KostCatalog } from "@/components/kost/KostCatalog";
import { Photo } from "@/components/media";
import { button, card, Container, Eyebrow, SectionHeader } from "@/components/ui";
import { DEPOSIT_MONTHS, HOLD_HOURS, KOST_TYPES, MIN_CONTRACT, PACKAGES } from "@/lib/constants";
import { all } from "@/lib/db";
import { cn, initials } from "@/lib/format";
import { kostCards, landingStats } from "@/lib/queries";
import { waKost } from "@/lib/wa";

export const metadata: Metadata = {
  title: { absolute: "Katalog Kost Premium di Malang — yubikost by BRAVE" },
  description: "Kost premium di Malang yang dikelola penuh dan terverifikasi Brave Brawijaya: bersih, aman 24 jam, kontrak resmi, sewa langsung dari dashboard.",
};

const STEPS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Search, title: "Pilih Kost", desc: "Cari gedung sesuai area, tipe, dan budget, lalu tekan Ajukan Sewa." },
  { icon: LayoutDashboard, title: "Daftar & Pilih Kamar", desc: "Masuk ke Dashboard, pilih tipe dan nomor kamar beserta paket sewanya." },
  { icon: Upload, title: "Bayar & Upload Bukti", desc: `Transfer atau QRIS, lalu unggah bukti. Kamar ditahan ${HOLD_HOURS} jam untuk Anda.` },
  { icon: KeyRound, title: "Verifikasi & Check-in", desc: "Tim Finance memverifikasi pembayaran, lalu kamar siap Anda tempati." },
];

const USP: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: ShieldCheck, title: "Aman 24 Jam", desc: "CCTV area bersama, akses kartu, dan tim lapangan yang siaga." },
  { icon: Wrench, title: "Maintenance Cepat", desc: "Keluhan AC, air, atau listrik ditangani tim teknisi Brave." },
  { icon: Sparkles, title: "Kebersihan Terjaga", desc: "Area bersama dibersihkan rutin sesuai standar Brave." },
  { icon: FileCheck2, title: "Kontrak & Tagihan Resmi", desc: "Tagihan, bukti bayar, dan masa sewa tercatat rapi di Dashboard." },
];

const FAQ = [
  {
    q: "Bagaimana cara menyewa kamar?",
    a: "Pilih kost di katalog, tekan Ajukan Sewa, lalu masuk atau daftar. Di Dashboard Anda memilih tipe dan nomor kamar, membayar tagihan pertama, dan mengunggah bukti pembayaran.",
  },
  {
    q: "Berapa yang dibayar di awal?",
    a: `Sewa sesuai paket (${PACKAGES.join(", ")} bulan) ditambah deposit ${DEPOSIT_MONTHS} bulan sewa. Deposit dikembalikan saat masa sewa berakhir sesuai ketentuan. Kontrak minimal ${MIN_CONTRACT}.`,
  },
  {
    q: "Berapa lama kamar ditahan setelah dipesan?",
    a: `Kamar ditahan ${HOLD_HOURS} jam sejak pesanan dibuat. Bila bukti pembayaran belum diunggah sampai batas waktu, pesanan kedaluwarsa dan kamar dilepas.`,
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
    { value: s.kost, label: "Gedung Kost" },
    { value: s.residents, label: "Penghuni Aktif" },
    { value: 500, suffix: "+", label: "Klien Puas" },
  ];

  return (
    <>
      {/* 1. Hero ringkas + pencarian (C-09). Kolom kanan (lg+) = etalase kost unggulan; mobile tetap satu kolom agar katalog cepat terlihat */}
      <section className="on-purple relative overflow-hidden bg-gradient-to-br from-primary via-hero-mid to-hero-deep pt-12 sm:pt-16 pb-24 sm:pb-28">
        <div aria-hidden="true" className="hidden md:block absolute inset-0 z-0 pointer-events-none">
          <div className="absolute -top-40 -left-32 w-[550px] h-[550px] rounded-full bg-primary-light/40 blur-[130px] animate-float-orb" />
          <div className="absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full bg-accent/20 blur-[130px] animate-float-orb" style={{ animationDelay: "-2s", animationDuration: "6s" }} />
        </div>

        <Container className="relative z-10 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 max-w-3xl">
            <Eyebrow onPurple>100% Managed & Verified by Brave Brawijaya</Eyebrow>
            <h1 className="mt-5 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight text-balance text-white">
              Kost Premium di Malang, <span className="text-gold">Dikelola Penuh</span> oleh Brave
            </h1>
            <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-white">
              Kost bersih, aman 24 jam, dan berfasilitas lengkap untuk mahasiswa & pekerja. Pilih kamar, pesan, dan bayar langsung dari Dashboard.
            </p>

            <Form key={`${q}|${tipe}`} action="/#katalog" role="search" aria-label="Cari kost" className="mt-7 p-2 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-2xl shadow-hero-deep/40 flex flex-col sm:flex-row gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-3 rounded-xl bg-white px-4 py-2 focus-within:ring-2 focus-within:ring-accent">
                <Search className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <label htmlFor="hero-q" className="block text-xs font-semibold text-slate-500">Nama kost atau area</label>
                  <input
                    id="hero-q"
                    name="q"
                    type="search"
                    defaultValue={q}
                    placeholder="mis. Suhat, Dinoyo"
                    className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                  />
                </div>
              </div>
              <div className="sm:w-48 rounded-xl bg-white px-4 py-2 focus-within:ring-2 focus-within:ring-accent">
                <label htmlFor="hero-tipe" className="block text-xs font-semibold text-slate-500">Tipe kost</label>
                <select id="hero-tipe" name="tipe" defaultValue={tipe} className="w-full bg-transparent text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer">
                  <option value="">Semua tipe</option>
                  {KOST_TYPES.map((t) => (
                    <option key={t} value={t}>Kost {t}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className={button("accent", "lg", "sm:px-7")}>
                <Search className="w-4 h-4" aria-hidden="true" /> Cari
              </button>
            </Form>

            {areas.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white">Area populer:</span>
                {areas.map((a) => (
                  <Link key={a} href={`/?q=${encodeURIComponent(a)}#katalog`} className="min-h-11 sm:min-h-9 inline-flex items-center px-3 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white hover:bg-white/20 transition-colors">
                    {a}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-7 pt-5 border-t border-white/15 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-10">
              <ul className="flex gap-8">
                {trust.map((t) => (
                  <li key={t.label}>
                    <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                      <CountUp value={t.value} suffix={t.suffix} />
                    </p>
                    <p className="text-sm text-white">{t.label}</p>
                  </li>
                ))}
              </ul>
              <a href={waKost()} target="_blank" rel="noopener noreferrer" className={button("glass", "md", "sm:ml-auto self-start sm:self-auto")}>
                <MessageCircle className="w-4 h-4" aria-hidden="true" /> Konsultasi WhatsApp{NEW_TAB}
              </a>
            </div>
          </div>

          {featured && (
            <div className="hidden lg:block lg:col-span-5 relative h-[460px]" aria-hidden="true">
              <div className="absolute right-0 top-0 w-[78%] h-[88%] rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white/20">
                <Photo src={featured.photos[0]} alt="" sizes="380px" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute left-[34%] right-5 bottom-5 text-right text-white">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 text-xs font-bold">● Tersedia</span>
                  <p className="mt-2 text-xl font-extrabold leading-tight">{featured.name}</p>
                  <p className="text-sm text-white">{featured.area}</p>
                  <p className="mt-2 text-sm text-white">mulai <span className="text-lg font-extrabold text-accent">Rp {featured.startPrice.toLocaleString("id-ID")}</span>/bulan</p>
                </div>
              </div>
              {second && (
                <div className="absolute left-0 bottom-0 w-[44%] aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/30">
                  <Photo src={second.photos[0]} alt="" sizes="200px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                  <p className="absolute left-3 right-3 bottom-3 text-sm font-bold text-white leading-tight">{second.name}</p>
                </div>
              )}
              <div className="absolute left-2 top-10 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-2xl">
                <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">✓</span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">Terverifikasi Brave</span>
                  <span className="block text-xs text-slate-500">Dikelola penuh tim operasional</span>
                </span>
              </div>
              <div className="absolute right-4 bottom-[-6px] flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 shadow-2xl">
                <span className="w-8 h-8 rounded-lg gradient-accent text-slate-950 text-sm font-extrabold flex items-center justify-center">Rp</span>
                <span className="text-xs font-semibold text-slate-700 leading-tight">Bayar & upload bukti<br />langsung di Dashboard</span>
              </div>
            </div>
          )}
        </Container>
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 inset-x-0 block w-full h-12 sm:h-16 lg:h-20 text-slate-50" aria-hidden="true">
          <path d="M0,30 C250,110 450,105 650,55 C850,10 1050,15 1200,45 L1200,120 L0,120 Z" fill="currentColor" />
        </svg>
      </section>

      {/* 2. Katalog (PRD §6.2 C–F) */}
      <section id="katalog" aria-labelledby="judul-katalog" className="scroll-mt-20 pt-6 sm:pt-8 pb-16 sm:pb-20">
        <Container>
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 id="judul-katalog" className="flex items-center gap-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
                <Building2 className="w-7 h-7 text-primary" aria-hidden="true" /> Katalog Kost Malang
              </h2>
              <p className="mt-2 text-slate-600">Semua gedung dikelola dan diverifikasi langsung oleh tim Brave.</p>
            </div>
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <BadgeCheck className="w-5 h-5" aria-hidden="true" /> Foto & harga diperbarui tim Brave
            </p>
          </div>
          <KostCatalog key={`${q}|${tipe}`} kosts={kosts} initialQuery={q} initialType={tipe} />
        </Container>
      </section>

      {/* 3. Cara sewa */}
      <section id="cara-sewa" aria-labelledby="judul-cara-sewa" className="scroll-mt-16 py-20 sm:py-24 bg-white border-y border-slate-200/80">
        <Container>
          <div className="text-center mb-14">
            <div className="mb-3"><Eyebrow>Cara Sewa</Eyebrow></div>
            <h2 id="judul-cara-sewa" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Sewa Kamar dalam 4 Langkah</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-base leading-relaxed">
              Semua proses berjalan online dari Dashboard Anda. Tanpa perlu bolak-balik ke lokasi, kecuali Anda ingin survey dulu.
            </p>
          </div>
          <ol className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 lg:before:content-[''] lg:before:absolute lg:before:top-10 lg:before:left-[12.5%] lg:before:right-[12.5%] lg:before:border-t-2 lg:before:border-dashed lg:before:border-primary/25">
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <li key={title} className="relative text-center px-2">
                <div className="relative mx-auto w-20 h-20 rounded-3xl gradient-primary text-white flex items-center justify-center shadow-lg shadow-primary/25 ring-8 ring-white">
                  <Icon className="w-8 h-8" aria-hidden="true" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full gradient-accent text-slate-950 text-sm font-extrabold flex items-center justify-center ring-4 ring-white" aria-hidden="true">
                    {i + 1}
                  </span>
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-widest text-primary">Langkah {i + 1}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">{desc}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 text-center">
            <a href="#katalog" className={button("primary", "lg")}>
              Ajukan Sewa Sekarang <ArrowUp className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </Container>
      </section>

      {/* 4. Keunggulan dikelola Brave */}
      <section aria-labelledby="judul-usp" className="py-20 sm:py-24">
        <Container className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="relative max-w-md mx-auto lg:mx-0 w-full">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-card">
              <Photo src={showcase?.photos[1] ?? showcase?.photos[0]} alt={showcase ? `Suasana ${showcase.name}` : "Kost Brave"} sizes="(min-width: 1024px) 448px, 100vw" />
            </div>
            <div className={card(false, "absolute -bottom-6 -right-2 sm:-right-8 p-4 flex items-center gap-3")}>
              <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center" aria-hidden="true">
                <Users className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-2xl font-extrabold text-slate-900 tabular-nums">{s.residents}</span>
                <span className="block text-xs text-slate-500">Penghuni aktif saat ini</span>
              </span>
            </div>
            <div className="on-purple absolute -top-5 -left-2 sm:-left-6 rounded-2xl gradient-hero px-4 py-3 shadow-2xl">
              <span className="flex items-center gap-2 text-sm font-bold text-white">
                <Headset className="w-5 h-5 text-accent" aria-hidden="true" /> Customer Care via WhatsApp
              </span>
            </div>
          </div>

          <div>
            <Eyebrow>Kenapa Kost Brave</Eyebrow>
            <h2 id="judul-usp" className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Dikelola Profesional, Bukan Sekadar Disewakan
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Setiap gedung dikelola langsung tim Brave, dari kebersihan sampai administrasi. Anda cukup fokus kuliah atau bekerja.
            </p>
            <ul className="mt-8 grid sm:grid-cols-2 gap-4">
              {USP.map(({ icon: Icon, title, desc }) => (
                <li key={title} className={card(true, "p-5")}>
                  <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center" aria-hidden="true">
                    <Icon className="w-6 h-6" />
                  </span>
                  <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* 5. Marquee mitra (C-17) */}
      <section aria-labelledby="judul-mitra" className="py-12 bg-white border-y border-slate-200/80">
        <Container>
          <h2 id="judul-mitra" className="text-center text-sm font-semibold text-slate-600 mb-8">
            Dipercaya Oleh Institusi, Kampus, & Brand Terkemuka di Malang Raya
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
                    className="w-28 sm:w-36 h-12 sm:h-16 object-contain grayscale opacity-60 transition duration-300 hover:grayscale-0 hover:opacity-100"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Testimoni (C-17 ticker) — disembunyikan bila data kosong */}
      {testimonials.length > 0 && (
        <section id="testimoni" className="scroll-mt-16 py-20 sm:py-24 bg-gradient-to-b from-primary/5 via-primary/10 to-transparent">
          <Container>
            <SectionHeader eyebrow="Testimoni" title="Apa Kata Penghuni & Pemilik Kost?">
              Cerita dari penghuni dan pemilik gedung yang telah merasakan layanan Brave. Nama disamarkan demi privasi.
            </SectionHeader>
          </Container>
          <div tabIndex={0} role="region" aria-label="Daftar testimoni, fokus untuk menghentikan gerak" className={TRACK_WRAP}>
            <div className="animate-ticker py-4">
              {[...testimonials, ...testimonials].map((t, i) => {
                const dup = i >= testimonials.length;
                return (
                  <div key={i} aria-hidden={dup || undefined} className="shrink-0 pr-6">
                    <figure className={card(true, "w-[300px] sm:w-[380px] h-[230px] p-6 sm:p-7 flex flex-col")}>
                      <div className="flex gap-0.5" role="img" aria-label={`Rating ${t.rating} dari 5`}>
                        {Array.from({ length: 5 }, (_, k) => (
                          <Star key={k} className={cn("w-4 h-4", k < t.rating ? "fill-accent text-accent" : "text-slate-300")} aria-hidden="true" />
                        ))}
                      </div>
                      <blockquote className="mt-4 text-slate-700 italic font-medium leading-relaxed line-clamp-3">“{t.content}”</blockquote>
                      <figcaption className="mt-auto flex items-center gap-3 pt-4 border-t border-slate-100">
                        <span aria-hidden="true" className="w-11 h-11 shrink-0 rounded-full gradient-primary text-white text-sm font-bold flex items-center justify-center">
                          {initials(t.name.replace(/^(Ibu|Bapak)\s+/, ""))}
                        </span>
                        <span>
                          <span className="block font-bold text-slate-900">{t.name}</span>
                          <span className="block text-xs text-slate-500">Layanan {t.tag} Brave</span>
                        </span>
                      </figcaption>
                    </figure>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 7. FAQ */}
      <section id="faq" aria-labelledby="judul-faq" className="scroll-mt-16 py-16 sm:py-20">
        <Container className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <Eyebrow>Tanya Jawab</Eyebrow>
            <h2 id="judul-faq" className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Pertanyaan yang Sering Diajukan</h2>
            <p className="mt-4 text-slate-600 leading-relaxed">Belum menemukan jawabannya? Tim Kost kami siap membantu setiap hari.</p>
            <a href={waKost("Halo Brave, saya punya pertanyaan tentang sewa Kost.")} target="_blank" rel="noopener noreferrer" className={button("whatsapp", "md", "mt-6")}>
              <MessageCircle className="w-4 h-4" aria-hidden="true" /> Tanya via WhatsApp{NEW_TAB}
            </a>
          </div>
          <div className="lg:col-span-8 space-y-3">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0} className={card(false, "group open:border-primary/40")}>
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none p-5 font-bold text-slate-900 [&::-webkit-details-marker]:hidden rounded-2xl">
                  {f.q}
                  <ChevronDown className="w-5 h-5 text-primary shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="px-5 pb-5 -mt-1 text-sm text-slate-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* 8. Banner CTA */}
      <section className="pt-8">
        <Container>
          <div className="on-purple relative overflow-hidden bg-brand-navy rounded-3xl p-10 sm:p-16 text-center">
            <div aria-hidden="true" className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-accent/15 blur-[80px]" />
            <div aria-hidden="true" className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-accent/15 blur-[80px]" />
            <div className="relative">
              <Eyebrow onPurple>Gratis Konsultasi 24/7</Eyebrow>
              <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">Siap Pindah ke Kost yang Lebih Nyaman?</h2>
              <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-white">
                Pilih kamar hari ini, bayar dari dashboard, dan tim Brave siapkan kamar Anda. Ada pertanyaan? Tanya kami lewat WhatsApp.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <a href="#katalog" className={button("accent", "lg")}>
                  Lihat Kamar Tersedia <ArrowUp className="w-4 h-4" aria-hidden="true" />
                </a>
                <a href={waKost()} target="_blank" rel="noopener noreferrer" className={button("glass", "lg", "animate-pulse-glow")}>
                  <MessageCircle className="w-4 h-4" aria-hidden="true" /> Chat via WhatsApp{NEW_TAB}
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
