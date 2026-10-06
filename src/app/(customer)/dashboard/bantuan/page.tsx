// Bantuan / Customer Care (PRD §8.6): topik → WhatsApp Admin Kost, plus FAQ.
import { ArrowUpRight, BedDouble, Building2, ChevronDown, Headset, MessageCircle, Phone, Wallet, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/customer/parts";
import { card } from "@/components/ui";
import { DEPOSIT_MONTHS, HOLD_HOURS } from "@/lib/constants";
import { customerGuard } from "@/lib/customer-guard";
import { cn, formatPhone } from "@/lib/format";
import { CC_TOPICS, WA, waCustomerCare, waKost, type CcTopic } from "@/lib/wa";

export const metadata = { title: "Bantuan" };

const TOPIC: Record<CcTopic, { title: string; desc: string; icon: LucideIcon; tile: string }> = {
  sewa: { title: "Sewa", desc: "Pemesanan kamar, masa sewa, check-in, atau pindah kamar.", icon: BedDouble, tile: "bg-primary/10 text-primary" },
  pembayaran: { title: "Pembayaran", desc: "Tagihan, transfer, bukti pembayaran, atau deposit.", icon: Wallet, tile: "bg-emerald-100 text-emerald-700" },
  "informasi kost": { title: "Informasi Kost", desc: "Fasilitas, tata tertib, lokasi, atau perubahan biodata.", icon: Building2, tile: "bg-sky-100 text-sky-700" },
};

const FAQ = [
  { q: "Berapa lama verifikasi pembayaran?", a: "Maksimal 1 hari kerja setelah bukti transfer terkirim. Status dapat dipantau di menu Pembayaran." },
  { q: "Berapa lama kamar ditahan setelah mengajukan sewa?", a: `${HOLD_HOURS} jam sejak pesanan dibuat. Lewat batas waktu tanpa bukti pembayaran, pesanan batal otomatis dan kamar dilepas.` },
  { q: "Apa saja yang dibayar di tagihan pertama?", a: `Sewa sesuai paket (1, 3, 6, atau 12 bulan) ditambah deposit ${DEPOSIT_MONTHS} bulan. Deposit dikembalikan saat masa sewa berakhir sesuai tata tertib.` },
  { q: "Bukti pembayaran saya ditolak, lalu bagaimana?", a: "Alasan penolakan tampil di menu Pembayaran. Transfer ulang bila perlu, lalu upload bukti yang benar." },
  { q: "Bagaimana cara memperpanjang sewa?", a: "Buka menu Pembayaran, pilih paket perpanjangan, transfer, lalu upload bukti. Masa sewa bertambah setelah admin menyetujui." },
  { q: "Bisakah saya survey lokasi sebelum menyewa?", a: "Bisa. Di halaman Sewa Kamar, pilih kamar lalu tekan Ajukan Survey Lokasi untuk menjadwalkan lewat WhatsApp." },
];

export default async function BantuanPage() {
  const { member, resident } = await customerGuard("/dashboard/bantuan");
  const link = (topic: CcTopic) =>
    resident
      ? waCustomerCare({ name: member.name, room: resident.room.number, kost: resident.kost.name, topic })
      : waKost(`Halo Admin Customer Care, saya ${member.name} (calon penghuni). Saya ingin bertanya mengenai ${topic}: `);

  return (
    <div className="space-y-10">
      <PageHeader icon={Headset} title="Bantuan">Pilih topik, lalu lanjutkan pertanyaan Anda di WhatsApp Admin Kost.</PageHeader>

      <section aria-labelledby="topik">
        <h2 id="topik" className="text-lg font-bold text-slate-900 mb-4">Mau tanya soal apa?</h2>
        <ul className="grid md:grid-cols-3 gap-5">
          {CC_TOPICS.map((topic) => {
            const t = TOPIC[topic];
            return (
              <li key={topic}>
                <a href={link(topic)} target="_blank" rel="noopener noreferrer" className={card(true, "group flex flex-col h-full p-6")}>
                  <span className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", t.tile)} aria-hidden="true">
                    <t.icon className="w-6 h-6" />
                  </span>
                  <span className="text-lg font-bold text-slate-900 group-hover:text-primary">{t.title}</span>
                  <span className="mt-1 text-sm text-slate-600 leading-relaxed flex-1">{t.desc}</span>
                  <span className="mt-5 pt-4 border-t border-slate-100 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                    <MessageCircle className="w-4 h-4" aria-hidden="true" /> Chat via WhatsApp
                    <ArrowUpRight className="w-4 h-4 ml-auto text-slate-400 group-hover:text-primary" aria-hidden="true" />
                  </span>
                  <span className="sr-only">(membuka WhatsApp)</span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <section aria-labelledby="faq" className={card(false, "overflow-hidden")}>
          <h2 id="faq" className="px-6 py-4 font-bold text-slate-900 border-b border-slate-100">Pertanyaan umum</h2>
          <div className="divide-y divide-slate-100">
            {FAQ.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex items-center justify-between gap-4 px-6 min-h-14 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-sm font-semibold text-slate-800 hover:text-primary">
                  {f.q}
                  <ChevronDown className="w-5 h-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180 group-open:text-primary motion-reduce:transition-none" aria-hidden="true" />
                </summary>
                <p className="px-6 pb-5 -mt-1 text-sm text-slate-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        <aside className="on-purple gradient-hero rounded-2xl p-6 text-white shadow-card">
          <Headset className="w-8 h-8 text-accent mb-3" aria-hidden="true" />
          <p className="text-lg font-bold">Admin Customer Care</p>
          <p className="mt-1 text-sm text-white">Hubungi kami langsung bila pertanyaan Anda tidak ada di daftar.</p>
          <p className="mt-4 flex items-center gap-2 font-mono text-lg font-bold tabular-nums">
            <Phone className="w-5 h-5 text-accent" aria-hidden="true" /> {formatPhone(WA.kost)}
          </p>
          <a
            href={link("sewa")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-2 w-full min-h-11 px-4 rounded-xl bg-whatsapp hover:bg-whatsapp-dark text-slate-950 text-sm font-bold"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" /> Chat Sekarang
          </a>
        </aside>
      </div>
    </div>
  );
}
