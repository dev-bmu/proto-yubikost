// Footer (PRD C-08, v1.2). Teks kecil di atas ungu memakai text-white (aturan kontras §4.2.7).
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, FileText, Instagram, Lock, Mail, MapPin, MessageCircle, Phone, Youtube } from "lucide-react";
import { button } from "@/components/ui";
import { formatPhone } from "@/lib/format";
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

export function Footer() {
  return (
    <footer className="on-purple relative overflow-hidden mt-16 sm:mt-24 bg-gradient-to-b from-primary via-hero-mid to-hero-deep text-white rounded-t-[2.5rem] sm:rounded-t-[3.5rem] lg:rounded-t-[4rem] border-t-2 border-accent/40 shadow-[0_-15px_50px_rgba(255,223,58,0.18)]">
      <div className="absolute -left-32 top-0 w-96 h-96 bg-accent/15 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          <div className="lg:col-span-4 space-y-5">
            <Link href="/" className="block w-fit" aria-label="yubikost — Beranda">
              <Image src="/brand/yubikost-horizontal-white.svg" alt="" width={168} height={48} className="h-11 sm:h-12 w-auto" />
            </Link>
            <p className="text-sm text-white leading-relaxed max-w-sm">
              Kost premium di Malang yang dikelola penuh dan terverifikasi tim Brave: bersih, aman 24 jam, kontrak dan pembayaran resmi.
            </p>
            <ul className="space-y-3 text-sm">
              <li>
                <a href={waGeneral()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:underline">
                  <Phone className="w-4 h-4 text-accent shrink-0" aria-hidden="true" /> {formatPhone(WA.general)}
                </a>
              </li>
              <li>
                <a href="mailto:info@bravebrawijaya.com" className="flex items-center gap-3 hover:underline">
                  <Mail className="w-4 h-4 text-accent shrink-0" aria-hidden="true" /> info@bravebrawijaya.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden="true" /> Jl. Soekarno Hatta No. 47, Lowokwaru, Kota Malang
              </li>
            </ul>
            <div className="flex gap-2.5">
              {SOCIAL.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="w-11 h-11 rounded-lg bg-white/10 hover:bg-accent/20 flex items-center justify-center">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="lg:col-span-2">
              <h2 className="text-sm font-extrabold uppercase tracking-widest mb-5">{col.title}</h2>
              <ul className="space-y-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="group inline-flex items-center gap-2 min-h-9 text-sm text-white hover:translate-x-1.5 transition-transform">
                      <ChevronRight className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="md:col-span-2 lg:col-span-2 space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-widest mb-5">Butuh Bantuan?</h2>
            <p className="text-sm text-white leading-relaxed">Tim Kost kami bantu carikan kamar sesuai budget Anda.</p>
            <a href={waKost()} target="_blank" rel="noopener noreferrer" className={button("glass", "md", "w-full lg:w-auto")}>
              <MessageCircle className="w-4 h-4" aria-hidden="true" /> Chat Tim Kost<span className="sr-only"> (membuka tab baru)</span>
            </a>
          </div>
        </div>

        <div className="border-t border-white/15 pt-6 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white">
          <p>© {new Date().getFullYear()} Brave Brawijaya · Prototype yubikost (data dummy)</p>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="flex items-center gap-1.5 min-h-9 hover:underline"><FileText className="w-3.5 h-3.5" aria-hidden="true" /> Syarat & Ketentuan</Link>
            <Link href="/privacy" className="flex items-center gap-1.5 min-h-9 hover:underline"><Lock className="w-3.5 h-3.5" aria-hidden="true" /> Privasi</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
