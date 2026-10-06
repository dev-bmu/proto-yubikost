// Kerangka halaman legal (/terms, /privacy): hero ringkas + teks prose max-w-3xl.
import type { ReactNode } from "react";
import { FileWarning, Mail, MapPin, MessageCircle } from "lucide-react";
import { Breadcrumb } from "@/components/kost/Breadcrumb";
import { Container, Eyebrow, Notice } from "@/components/ui";
import { formatDate, formatPhone } from "@/lib/format";
import { WA, waLink } from "@/lib/wa";

const UPDATED = "2026-10-06";

export function LegalArticle({ crumb, title, intro, children }: { crumb: string; title: string; intro: string; children: ReactNode }) {
  return (
    <>
      <section className="on-purple relative overflow-hidden bg-gradient-to-br from-primary via-hero-mid to-hero-deep pt-12 sm:pt-16 pb-24 sm:pb-28">
        <Container className="relative z-10 max-w-3xl space-y-5">
          <Breadcrumb onPurple items={[{ label: "Home", href: "/" }, { label: crumb }]} />
          <Eyebrow onPurple>Terakhir diperbarui {formatDate(UPDATED)}</Eyebrow>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight text-white">{title}</h1>
          <p className="text-base sm:text-lg leading-relaxed text-white">{intro}</p>
        </Container>
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 inset-x-0 block w-full h-12 sm:h-16 text-slate-50" aria-hidden="true">
          <path d="M0,30 C250,110 450,105 650,55 C850,10 1050,15 1200,45 L1200,120 L0,120 Z" fill="currentColor" />
        </svg>
      </section>
      <Container className="-mt-10 sm:-mt-12 relative z-10">
        <article className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-card p-6 sm:p-10">
          <Notice tone="warning" className="flex items-start gap-3 mb-8">
            <FileWarning className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>Draf prototype — perlu ditinjau Legal.</strong> Isi halaman ini adalah rancangan awal untuk keperluan prototype dan belum
              berlaku sebagai dokumen hukum resmi.
            </span>
          </Notice>
          <div className="text-slate-600 leading-relaxed space-y-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:pt-4 [&_h2]:scroll-mt-24 [&_h3]:font-bold [&_h3]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_strong]:text-slate-800 [&_a]:font-semibold [&_a]:text-primary [&_a:hover]:text-primary-dark [&_a]:underline">
            {children}
          </div>
        </article>
      </Container>
    </>
  );
}

/** Blok kontak Customer Care untuk permintaan terkait akun & data pribadi. */
export function LegalContact() {
  return (
    <ul className="list-none! pl-0!">
      <li className="flex items-start gap-2">
        <MessageCircle className="w-4 h-4 shrink-0 mt-1 text-primary" aria-hidden="true" />
        <span>
          WhatsApp Customer Care:{" "}
          <a href={waLink(WA.general, "Halo Admin Customer Care Brave, saya ingin mengajukan permintaan terkait akun/data pribadi saya.")} target="_blank" rel="noopener noreferrer">
            {formatPhone(WA.general)}
          </a>
        </span>
      </li>
      <li className="flex items-start gap-2">
        <Mail className="w-4 h-4 shrink-0 mt-1 text-primary" aria-hidden="true" />
        <span>
          Email: <a href="mailto:info@bravebrawijaya.com">info@bravebrawijaya.com</a>
        </span>
      </li>
      <li className="flex items-start gap-2">
        <MapPin className="w-4 h-4 shrink-0 mt-1 text-primary" aria-hidden="true" />
        Jl. Soekarno Hatta No. 47, Lowokwaru, Kota Malang
      </li>
    </ul>
  );
}
