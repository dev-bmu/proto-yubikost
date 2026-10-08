// Footer publik (PRD C-08; tampilan v1.3): latar tinta netral + logo putih, CTA penutup (pengganti banner ungu di landing).
// Teks sekunder paper/70 (8:1) & judul kolom paper/60 (6,3:1) di atas ink.
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Instagram, Mail, MapPin, MessageCircle, Phone, Youtube } from "lucide-react";
import { display } from "@/components/landing/theme";
import { cn, formatPhone } from "@/lib/format";
import { WA, waGeneral, waKost } from "@/lib/wa";

const COLUMNS = [
  {
    title: "Kost",
    links: [
      { label: "Katalog Kost", href: "/#katalog" },
      { label: "Cara Sewa", href: "/#cara-sewa" },
      { label: "Testimoni", href: "/#testimoni" },
      { label: "Tanya Jawab", href: "/#faq" },
    ],
  },
  {
    title: "Akun",
    links: [
      { label: "Masuk / Daftar", href: "/?auth=masuk" },
      { label: "Dashboard Customer", href: "/dashboard" },
      { label: "Admin Dashboard", href: "/admin" },
    ],
  },
  {
    title: "Perusahaan",
    links: [
      { label: "Syarat & Ketentuan", href: "/terms" },
      { label: "Kebijakan Privasi", href: "/privacy" },
    ],
  },
];

const SOCIAL = [
  { label: "Instagram", href: "https://instagram.com/bravebrawijaya", icon: <Instagram className="w-4 h-4" aria-hidden="true" /> },
  { label: "YouTube", href: "https://youtube.com/@bravebrawijaya", icon: <Youtube className="w-4 h-4" aria-hidden="true" /> },
  { label: "Linktree", href: "https://linktr.ee/bravebrawijaya", icon: <Image src="/Linktree.svg" alt="" width={16} height={16} className="w-4 h-4 brightness-0 invert" /> },
];

const NEW_TAB = <span className="sr-only"> (membuka tab baru)</span>;
const pill = "inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full text-sm font-semibold transition-colors";

export function Footer() {
  return (
    <footer className={cn(display.variable, "on-ink bg-night text-paper")}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-12 sm:pb-16 border-b border-paper/15">
          <p className="max-w-2xl font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-balance">
            Tinggal tenang di Malang, <span className="text-logo-gradient-light">urusan kost kami yang kelola.</span>
          </p>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link href="/#katalog" className={cn(pill, "bg-paper text-ink hover:bg-sand")}>
              Lihat katalog <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <a href={waKost()} target="_blank" rel="noopener noreferrer" className={cn(pill, "border border-paper/40 text-paper hover:bg-paper/10")}>
              <MessageCircle className="w-4 h-4" aria-hidden="true" /> Chat WhatsApp{NEW_TAB}
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-x-6 gap-y-10 pt-12">
          <div className="col-span-2 md:col-span-4 lg:col-span-6 space-y-5">
            <Link href="/" className="block w-fit" aria-label="yubikost — Beranda">
              <Image src="/brand/yubikost-horizontal-white.svg" alt="" width={168} height={48} className="h-10 sm:h-11 w-auto" />
            </Link>
            <p className="hidden sm:block max-w-sm text-sm leading-relaxed text-paper/70">
              Kost premium di Malang yang dikelola penuh dan terverifikasi tim Brave: bersih, aman 24 jam, kontrak dan pembayaran resmi.
            </p>
            <ul className="space-y-1 text-sm text-paper/80">
              <li>
                <a href={waGeneral()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 min-h-9 hover:text-paper hover:underline underline-offset-4">
                  <Phone className="w-4 h-4 shrink-0" aria-hidden="true" /> {formatPhone(WA.general)}{NEW_TAB}
                </a>
              </li>
              <li>
                <a href="mailto:info@bravebrawijaya.com" className="inline-flex items-center gap-3 min-h-9 hover:text-paper hover:underline underline-offset-4">
                  <Mail className="w-4 h-4 shrink-0" aria-hidden="true" /> info@bravebrawijaya.com
                </a>
              </li>
              <li className="flex items-start gap-3 py-2">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> Jl. Soekarno Hatta No. 47, Lowokwaru, Kota Malang
              </li>
            </ul>
            <div className="flex gap-2">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.label} (membuka tab baru)`}
                  className="w-11 h-11 rounded-full border border-paper/20 hover:bg-paper/10 flex items-center justify-center transition-colors"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="lg:col-span-2">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-paper/60">{col.title}</h2>
              <ul className="space-y-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-flex items-center min-h-9 text-sm text-paper hover:underline underline-offset-4">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-paper/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-paper/70">
          <p className="text-center sm:text-left">© {new Date().getFullYear()} Brave Brawijaya · Prototype yubikost (data dummy)</p>
          {/* Di mobile tautan legal sudah ada di kolom Perusahaan */}
          <div className="hidden sm:flex items-center gap-5">
            <Link href="/terms" className="inline-flex items-center min-h-9 hover:text-paper hover:underline underline-offset-4">Syarat & Ketentuan</Link>
            <Link href="/privacy" className="inline-flex items-center min-h-9 hover:text-paper hover:underline underline-offset-4">Privasi</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
