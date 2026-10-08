// Kerangka halaman legal (/terms, /privacy; tampilan v1.3 paper/ink): judul ringkas + teks prose max-w-3xl.
import type { ReactNode } from "react";
import { FileWarning, Mail, MapPin, MessageCircle } from "lucide-react";
import { Breadcrumb } from "@/components/kost/Breadcrumb";
import { display } from "@/components/landing/theme";
import { Container, Notice } from "@/components/ui";
import { cn, formatDate, formatPhone } from "@/lib/format";
import { WA, waLink } from "@/lib/wa";

const UPDATED = "2026-10-06";

export function LegalArticle({ crumb, title, intro, children }: { crumb: string; title: string; intro: string; children: ReactNode }) {
  return (
    <div className={cn(display.variable, "on-paper bg-paper text-ink")}>
      <Container className="max-w-3xl pt-10 sm:pt-14 pb-16 sm:pb-24">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: crumb }]} />
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Terakhir diperbarui {formatDate(UPDATED)}</p>
        <h1 className="mt-3 font-display font-extrabold text-4xl sm:text-5xl leading-[1.05] tracking-tight text-ink">{title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{intro}</p>
        <article className="mt-10 rounded-2xl border border-line bg-white p-6 sm:p-10">
          <Notice tone="warning" className="flex items-start gap-3 mb-8">
            <FileWarning className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>Draf prototype — perlu ditinjau Legal.</strong> Isi halaman ini adalah rancangan awal untuk keperluan prototype dan belum
              berlaku sebagai dokumen hukum resmi.
            </span>
          </Notice>
          <div className="text-ink-soft leading-relaxed space-y-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_h2]:pt-4 [&_h2]:scroll-mt-24 [&_h3]:font-bold [&_h3]:text-ink [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_strong]:text-ink [&_a]:font-semibold [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-brand">
            {children}
          </div>
        </article>
      </Container>
    </div>
  );
}

/** Blok kontak Customer Care untuk permintaan terkait akun & data pribadi. */
export function LegalContact() {
  return (
    <ul className="list-none! pl-0!">
      <li className="flex items-start gap-2">
        <MessageCircle className="w-4 h-4 shrink-0 mt-1 text-ink-muted" aria-hidden="true" />
        <span>
          WhatsApp Customer Care:{" "}
          <a href={waLink(WA.general, "Halo Admin Customer Care Brave, saya ingin mengajukan permintaan terkait akun/data pribadi saya.")} target="_blank" rel="noopener noreferrer">
            {formatPhone(WA.general)}
          </a>
        </span>
      </li>
      <li className="flex items-start gap-2">
        <Mail className="w-4 h-4 shrink-0 mt-1 text-ink-muted" aria-hidden="true" />
        <span>
          Email: <a href="mailto:info@bravebrawijaya.com">info@bravebrawijaya.com</a>
        </span>
      </li>
      <li className="flex items-start gap-2">
        <MapPin className="w-4 h-4 shrink-0 mt-1 text-ink-muted" aria-hidden="true" />
        Jl. Soekarno Hatta No. 47, Lowokwaru, Kota Malang
      </li>
    </ul>
  );
}
