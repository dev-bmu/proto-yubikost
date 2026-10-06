// Bagian Dashboard Customer yang dipakai beberapa halaman (tanpa state; aman untuk server & klien).
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle, ArrowRight, CalendarDays, Check, DoorOpen, House, IdCard, MapPin, MessageCircle, ReceiptText, ShieldCheck, Wallet, type LucideIcon,
} from "lucide-react";
import { Photo } from "@/components/media";
import { card, kostTypeClass, Pill } from "@/components/ui";
import { BOOKING_STATUS, bookingBill, PAYMENT_KIND_LABEL, PAYMENT_STATUS, paymentRef } from "@/lib/constants";
import { addMonths, cn, formatDate, formatDateTime, rupiah } from "@/lib/format";
import type { CustomerContext, KostCard, PaymentView } from "@/lib/queries";

/** Header halaman: tile ikon + H1 + deskripsi + aksi opsional. */
export function PageHeader({ icon: Icon, title, children, actions }: { icon: LucideIcon; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="flex items-start gap-4">
        <span className="w-12 h-12 rounded-2xl gradient-primary text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/25" aria-hidden="true">
          <Icon className="w-6 h-6" />
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          {children && <p className="mt-1 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">{children}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

/** Judul langkah bernomor (Sewa Kamar, Pembayaran). */
export function StepHeading({ n, title, id, children }: { n: number; title: string; id?: string; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <span className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0" aria-hidden="true">{n}</span>
      <div>
        <h2 id={id} className="text-lg font-bold text-slate-900 leading-8">
          <span className="sr-only">Langkah {n}: </span>
          {title}
        </h2>
        {children && <p className="text-sm text-slate-600">{children}</p>}
      </div>
    </div>
  );
}

const STEPS: { label: string; icon: LucideIcon }[] = [
  { label: "Pilih Kamar", icon: DoorOpen },
  { label: "Bayar & Upload Bukti", icon: Wallet },
  { label: "Verifikasi Admin", icon: ShieldCheck },
  { label: "Lengkapi Biodata", icon: IdCard },
  { label: "Penghuni Aktif", icon: House },
];

/** Stepper progres sewa (C-25). current = indeks langkah aktif (0–4); 5 = semua selesai. rejected = bukti ditolak. */
export function ProgressSteps({ current, rejected, className }: { current: number; rejected?: boolean; className?: string }) {
  return (
    <ol aria-label="Progres sewa kamar" className={card(false, cn("p-5 sm:p-6 flex flex-col sm:grid sm:grid-cols-5 gap-4 sm:gap-x-0", className))}>
      {STEPS.map(({ label, icon: Icon }, i) => {
        const done = i < current;
        const active = i === current;
        const error = active && rejected;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="relative flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2 sm:text-center sm:px-1">
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute rounded-full left-5 top-11 w-0.5 h-[calc(100%-1.75rem)] sm:left-[calc(50%+1.75rem)] sm:right-[calc(-50%+1.75rem)] sm:top-5 sm:w-auto sm:h-0.5",
                  done ? "bg-primary" : "bg-slate-200",
                )}
              />
            )}
            <span
              className={cn(
                "relative w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                error ? "bg-red-100 text-red-700 ring-4 ring-red-50"
                  : done ? "bg-primary text-white"
                  : active ? "gradient-primary text-white ring-4 ring-primary/20 shadow-lg shadow-primary/30"
                  : "bg-slate-100 text-slate-500",
              )}
              aria-hidden="true"
            >
              {error ? <AlertCircle className="w-5 h-5" /> : done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
            </span>
            <span className="min-w-0 pt-0.5 sm:pt-0">
              <span className="block text-xs font-semibold text-slate-500">Langkah {i + 1}</span>
              <span className={cn("block text-sm font-bold leading-snug", error ? "text-red-700" : active ? "text-primary" : done ? "text-slate-800" : "text-slate-500")}>
                {label}
              </span>
              <span className="sr-only">{done ? " (selesai)" : error ? " (bukti ditolak, perlu diulang)" : active ? " (langkah saat ini)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Baris ringkasan tagihan (C-20). */
export function Row({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-slate-500">
        {label}
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </dt>
      <dd className="text-right font-semibold text-slate-800 tabular-nums whitespace-nowrap">{value}</dd>
    </div>
  );
}

export function TotalRow({ label = "Total tagihan", value }: { label?: string; value: number }) {
  return (
    <div className="flex items-end justify-between gap-4 pt-3 mt-1 border-t border-slate-200">
      <dt className="text-sm font-bold text-slate-700">{label}</dt>
      <dd className="text-2xl font-extrabold text-primary tracking-tight tabular-nums whitespace-nowrap" aria-live="polite">{rupiah(value)}</dd>
    </div>
  );
}

type ActiveBooking = NonNullable<CustomerContext["booking"]>;

/** Kartu pesanan besar: foto kamar, kost & kamar & tipe, masa sewa, rincian tagihan (C-20). */
export function BookingCard({ booking, typeName, children }: { booking: ActiveBooking; typeName?: string; children?: ReactNode }) {
  const price = booking.room?.monthlyPrice ?? 0;
  const bill = bookingBill(price, booking.months);
  const status = BOOKING_STATUS[booking.status] ?? { label: booking.status, tone: "neutral" as const };
  return (
    <section className={card(false, "overflow-hidden")} aria-labelledby="pesanan-title">
      <div className="grid md:grid-cols-[minmax(0,300px)_1fr]">
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-72 bg-slate-100">
          <Photo src={booking.room?.photos[0] ?? booking.kost?.photos[0]} alt={`Foto kamar ${booking.room?.number ?? ""}`} sizes="(min-width: 768px) 300px, 100vw" />
          {typeName && (
            <span className="absolute top-3 left-3">
              <Pill tone="info" solid>Tipe {typeName}</Pill>
            </span>
          )}
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pesanan sewa</p>
              <h2 id="pesanan-title" className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Kamar {booking.room?.number}</h2>
              <p className="text-sm font-semibold text-slate-600">{booking.kost?.name} · {booking.kost?.area}</p>
            </div>
            <Pill tone={status.tone}>{status.label}</Pill>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Info icon={CalendarDays} label="Mulai sewa" value={formatDate(booking.startDate)} />
            <Info icon={ReceiptText} label="Masa sewa" value={`${booking.months} bulan · s/d ${formatDate(addMonths(booking.startDate, booking.months), "short")}`} />
          </div>
          <dl className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <Row label={`Sewa ${booking.months} × ${rupiah(price)}`} value={rupiah(bill.rent)} />
            <Row label="Deposit 1 bulan" hint="Dikembalikan saat sewa berakhir" value={rupiah(bill.deposit)} />
            <TotalRow value={bill.total} />
          </dl>
          {children}
        </div>
      </div>
    </section>
  );
}

export function Info({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200">
      <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export type TimelineItem = { label: string; desc?: ReactNode; state: "done" | "active" | "todo" };

/** Timeline vertikal status (menunggu verifikasi). */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative">
      {items.map((it, i) => (
        <li key={it.label} className="relative flex gap-4 pb-6 last:pb-0" aria-current={it.state === "active" ? "step" : undefined}>
          {i < items.length - 1 && (
            <span aria-hidden="true" className={cn("absolute left-[15px] top-9 bottom-1 w-0.5 rounded-full", it.state === "done" ? "bg-primary" : "bg-slate-200")} />
          )}
          <span
            aria-hidden="true"
            className={cn(
              "relative w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              it.state === "done" ? "bg-primary text-white" : it.state === "active" ? "bg-primary-ultralight text-primary ring-4 ring-primary/15" : "bg-slate-100 text-slate-500",
            )}
          >
            {it.state === "done" ? <Check className="w-4 h-4" /> : it.state === "active" ? <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse motion-reduce:animate-none" /> : <span className="text-xs font-bold">{i + 1}</span>}
          </span>
          <div className="pt-1 min-w-0">
            <p className={cn("text-sm font-bold", it.state === "todo" ? "text-slate-500" : "text-slate-900")}>
              {it.label}
              <span className="sr-only">{it.state === "done" ? " (selesai)" : it.state === "active" ? " (sedang berlangsung)" : ""}</span>
            </p>
            {it.desc && <div className="text-sm text-slate-600 mt-0.5">{it.desc}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Riwayat pembayaran: tabel di md+, daftar kartu di mobile. */
export function PaymentHistory({ payments }: { payments: PaymentView[] }) {
  if (!payments.length) {
    return (
      <div className={card(false, "p-8 text-center")}>
        <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3" aria-hidden="true">
          <ReceiptText className="w-6 h-6" />
        </span>
        <p className="font-bold text-slate-800">Belum ada pembayaran</p>
        <p className="text-sm text-slate-500 mt-1">Bukti pembayaran yang Anda kirim akan tercatat di sini.</p>
      </div>
    );
  }
  const status = (p: PaymentView) => PAYMENT_STATUS[p.status] ?? { label: p.status, tone: "neutral" as const };
  return (
    <>
      <ul className="md:hidden space-y-3">
        {payments.map((p) => (
          <li key={p.id} className={card(false, "p-4")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-900">{PAYMENT_KIND_LABEL[p.kind] ?? p.kind} · {p.months} bulan</p>
                <p className="text-xs text-slate-500">Kamar {p.roomNumber} · {p.kostName}</p>
              </div>
              <Pill tone={status(p).tone}>{status(p).label}</Pill>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-xs text-slate-500">
                {formatDateTime(p.createdAt)} · {p.channelLabel}
                <span className="block font-mono">Ref {paymentRef(p.id)}</span>
              </p>
              <p className="text-lg font-extrabold text-slate-900 tabular-nums">{rupiah(p.amount)}</p>
            </div>
            {p.note && <p className="mt-3 p-2.5 rounded-lg bg-slate-50 text-xs text-slate-700"><strong>Catatan admin:</strong> {p.note}</p>}
          </li>
        ))}
      </ul>
      <div className={card(false, "hidden md:block overflow-x-auto")}>
        <table className="w-full text-sm">
          <caption className="sr-only">Riwayat pembayaran</caption>
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Dikirim", "Jenis", "Kamar", "Kanal", "Nominal", "Status"].map((h) => (
                <th key={h} scope="col" className={cn("px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500", h === "Nominal" && "text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/60 align-top">
                <td className="px-5 py-4 whitespace-nowrap text-slate-700">{formatDateTime(p.createdAt)}</td>
                <td className="px-5 py-4">
                  <span className="font-semibold text-slate-900">{PAYMENT_KIND_LABEL[p.kind] ?? p.kind}</span> · {p.months} bln
                  <span className="block text-xs text-slate-500 font-mono">Ref {paymentRef(p.id)}</span>
                </td>
                <td className="px-5 py-4 text-slate-700">{p.roomNumber}<span className="block text-xs text-slate-500">{p.kostName}</span></td>
                <td className="px-5 py-4 text-slate-700">{p.channelLabel}</td>
                <td className="px-5 py-4 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">{rupiah(p.amount)}</td>
                <td className="px-5 py-4 max-w-56">
                  <Pill tone={status(p).tone}>{status(p).label}</Pill>
                  {p.note && <p className="mt-1.5 text-xs text-slate-600">{p.note}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Kartu gedung untuk dipilih (Sewa Kamar langkah 1, Rekomendasi di Ringkasan). Seluruh kartu = satu link. */
export function KostPickCard({ kost: k, available, href, selected, cta = "Lihat kamar" }: { kost: KostCard; available: number; href: string; selected?: boolean; cta?: string }) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={card(true, cn("group flex flex-col h-full overflow-hidden", selected && "ring-2 ring-primary border-primary"))}
    >
      <span className="relative block aspect-video overflow-hidden bg-slate-100">
        <Photo
          src={k.photos[0]}
          alt={`Foto luar gedung ${k.name}`}
          sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
          className="transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
        />
        <span className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" aria-hidden="true" />
        <Pill solid tone={available ? "success" : "danger"} className="absolute top-3 left-3">{available ? `${available} kamar tersedia` : "Penuh"}</Pill>
        <Pill solid className={cn("absolute top-3 right-3", kostTypeClass(k.type))}>Kost {k.type}</Pill>
        {selected && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-primary text-xs font-bold shadow-lg">
            <Check className="w-3.5 h-3.5" aria-hidden="true" /> Dipilih
          </span>
        )}
        <span className="absolute bottom-3 left-3 right-24 flex items-center gap-1.5 text-sm font-semibold text-white">
          <MapPin className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
          <span className="truncate">{k.area}</span>
        </span>
      </span>
      <span className="p-4 flex flex-col gap-2 flex-1">
        <span className="font-extrabold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">{k.name}</span>
        <span className="flex items-end justify-between gap-2 mt-auto">
          <span>
            <span className="block text-xs text-slate-500">Mulai</span>
            <span className="text-lg font-extrabold text-primary tracking-tight tabular-nums">{rupiah(k.startPrice)}</span>
            <span className="text-xs text-slate-500"> /bln</span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">
            {cta} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </span>
      </span>
    </Link>
  );
}

/** Notifikasi opsional ke Admin Kost setelah upload bukti (menggantikan konfirmasi WA-PAY). */
export function NotifyAdmin({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-primary hover:underline">
      <MessageCircle className="w-4 h-4 text-emerald-600" aria-hidden="true" /> Kabari Admin via WhatsApp (opsional)
    </a>
  );
}
