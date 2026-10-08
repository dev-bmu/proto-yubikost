// Bagian Dashboard Customer yang dipakai beberapa halaman (tanpa state; aman untuk server & klien).
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle, ArrowRight, CalendarCheck, CalendarDays, Check, ChevronDown, DoorOpen, Headset, Hourglass, House, KeyRound, MapPin,
  MessageCircle, ReceiptText, ScrollText, ShieldCheck, Wallet, type LucideIcon,
} from "lucide-react";
import { Photo } from "@/components/media";
import { button, card, kostTypeClass, Pill } from "@/components/ui";
import {
  BOOKING_STAGE_LABEL, BOOKING_STATUS, DEPOSIT, DEPOSIT_TERMS, DP_TERMS, HOLD_HOURS, PAYMENT_STATUS, paymentLabel, paymentRef,
} from "@/lib/constants";
import { addMonths, cn, daysUntil, formatDate, formatDateTime, rupiah } from "@/lib/format";
import type { CustomerContext, KostCard, PaymentView } from "@/lib/queries";
import { waKost, waPaymentNotice } from "@/lib/wa";
import { Countdown } from "./Countdown";

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
  { label: "Ajukan Sewa", icon: DoorOpen },
  { label: "Bayar Uang Muka", icon: Wallet },
  { label: "Verifikasi", icon: ShieldCheck },
  { label: "Pelunasan saat Check-in", icon: KeyRound },
  { label: "Jadi Penghuni", icon: House },
];

/**
 * Stepper progres sewa (C-25, Ketentuan Kos Brave 17 Juli 2026). current = indeks langkah aktif (0–4); 5 = semua selesai.
 * rejected = bukti ditolak. Tahap pelunasan (bayar maupun verifikasi) = langkah 3.
 */
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

/** "7 hari lagi" · "hari ini" · "2 hari lalu" */
export function inDays(isoDate: string) {
  const d = daysUntil(isoDate);
  return d > 0 ? `${d} hari lagi` : d === 0 ? "hari ini" : `${-d} hari lalu`;
}

type ActiveBooking = NonNullable<CustomerContext["booking"]>;

/** Data rincian sewa baru: pesanan aktif (dari server), atau pratinjau di panel pemesanan. */
export type RentInfo = Pick<ActiveBooking, "stage" | "status" | "months" | "monthlyPrice" | "dpPct" | "bill" | "paid" | "due">;

/**
 * Isi <dl> rincian sewa baru (Ketentuan Kos Brave). Tahap DP: uang muka dibayar sekarang, sisa sewa + deposit saat check-in.
 * Tahap PELUNASAN: total sewa + deposit − yang sudah dibayar = sisa tagihan (due dari server).
 */
export function RentBill({ info: r }: { info: RentInfo }) {
  const rent = <Row label="Total sewa" hint={`${r.months} bulan × ${rupiah(r.monthlyPrice)}`} value={rupiah(r.bill.rent)} />;
  if (r.stage === "PELUNASAN") {
    return (
      <>
        {rent}
        <Row label="Deposit" hint="Kembali setelah masa sewa berakhir" value={rupiah(r.bill.deposit)} />
        <Row label="Sudah dibayar" hint={`Uang muka ${r.dpPct}%`} value={`− ${rupiah(r.paid)}`} />
        <TotalRow label="Sisa tagihan" value={r.due} />
      </>
    );
  }
  const verifying = r.status === "MENUNGGU_VERIFIKASI";
  return (
    <>
      {rent}
      <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-primary-ultralight border border-primary/20">
        <dt>
          <span className="block text-sm font-bold text-slate-900">{verifying ? `Uang muka ${r.dpPct}%` : "Bayar sekarang"}</span>
          <span className="block text-xs text-slate-600">{verifying ? "Sedang diverifikasi admin" : `Uang muka ${r.dpPct}% · dalam ${HOLD_HOURS} jam`}</span>
        </dt>
        <dd className="text-xl font-extrabold text-primary tracking-tight tabular-nums whitespace-nowrap" aria-live="polite">{rupiah(r.due)}</dd>
      </div>
      <Row label="Bayar saat check-in" hint={`Sisa sewa ${rupiah(r.bill.rent - r.bill.dp)} + deposit ${rupiah(r.bill.deposit)}`} value={rupiah(r.bill.settle)} />
      <div className="flex justify-between gap-4 pt-3 mt-1 border-t border-slate-200 text-sm">
        <dt className="font-bold text-slate-700">Total sewa + deposit</dt>
        <dd className="font-extrabold text-slate-900 tabular-nums whitespace-nowrap">{rupiah(r.bill.total)}</dd>
      </div>
    </>
  );
}

/** Kartu pesanan besar: foto kamar, kost & kamar, tanggal check-in, rincian tagihan sesuai tahap (C-20). */
export function BookingCard({ booking: b, typeName, children }: { booking: ActiveBooking; typeName?: string; children?: ReactNode }) {
  const status = BOOKING_STATUS[b.status] ?? { label: b.status, tone: "neutral" as const };
  return (
    <section className={card(false, "overflow-hidden")} aria-labelledby="pesanan-title">
      <div className="grid md:grid-cols-[minmax(0,300px)_1fr]">
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-72 bg-slate-100">
          <Photo src={b.room?.photos[0] ?? b.kost?.photos[0]} alt={`Foto kamar ${b.room?.number ?? ""}`} sizes="(min-width: 768px) 300px, 100vw" />
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
              <h2 id="pesanan-title" className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Kamar {b.room?.number}</h2>
              <p className="text-sm font-semibold text-slate-600">{b.kost?.name} · {b.kost?.area}</p>
              {b.invoice && (
                <p className="mt-0.5 text-xs text-slate-500">
                  No. faktur <span className="font-mono">{b.invoice.number}</span>
                </p>
              )}
            </div>
            <Pill tone={status.tone}>{BOOKING_STAGE_LABEL[b.stage] ?? "Sewa Baru"} · {status.label}</Pill>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <Info
              icon={CalendarCheck}
              label="Check-in"
              value={<>{formatDate(b.startDate)} <span className="font-semibold text-primary">· {inDays(b.startDate)}</span></>}
              className="bg-primary-ultralight border-primary/20"
            />
            <Info icon={CalendarDays} label="Masa sewa" value={`${b.months} bulan · s/d ${formatDate(addMonths(b.startDate, b.months), "short")}`} />
          </div>
          <dl className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <RentBill info={b} />
          </dl>
          {children}
        </div>
      </div>
    </section>
  );
}

export function Info({ icon: Icon, label, value, className }: { icon: LucideIcon; label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5 p-3 rounded-xl border border-slate-200", className)}>
      <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

/** Hitung mundur sesuai tahap: DP = batas bayar uang muka (24 jam); PELUNASAN = akhir masa berlaku uang muka. */
export function BookingCountdown({ booking: b }: { booking: ActiveBooking }) {
  const deadline = formatDateTime(b.expiresAt);
  return b.stage === "PELUNASAN" ? (
    <Countdown
      expiresAt={b.expiresAt}
      deadline={deadline}
      label="Kamar ditahan sampai"
      note={`Lunasi saat check-in ${formatDate(b.startDate)}. Lewat masa berlaku uang muka, pesanan batal dan uang muka hangus.`}
      hours={(b.tier?.days ?? 1) * 24}
    />
  ) : (
    <Countdown expiresAt={b.expiresAt} deadline={deadline} label="Bayar uang muka sebelum" note="Lewat batas, pesanan batal otomatis dan kamar dilepas." />
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

/** Pembayaran + data tampilan: dpPct untuk label "Uang Muka 25%", nomor faktur Accurate. */
export type HistoryPayment = PaymentView & { dpPct?: number; invoiceNumber?: string };

/** Kartu "bukti sedang diverifikasi": ringkasan bukti + timeline. */
export function WaitingCard({
  title, payment, notifyHref, steps, children,
}: { title: string; payment: HistoryPayment; notifyHref: string; steps: TimelineItem[]; children?: ReactNode }) {
  return (
    <section className={card(false, "p-6 sm:p-8 grid md:grid-cols-2 gap-8")} aria-labelledby="menunggu-title">
      <div>
        <Pill tone="info">
          <Hourglass className="w-3.5 h-3.5" aria-hidden="true" /> Menunggu Verifikasi
        </Pill>
        <h2 id="menunggu-title" className="mt-3 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{children ?? "Admin memverifikasi maksimal 1 hari kerja. Anda tidak perlu mengirim ulang bukti."}</p>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          {[
            ["Ref", <span key="r" className="font-mono">{paymentRef(payment.id)}</span>],
            ["Nominal", rupiah(payment.amount)],
            ["Jenis", `${paymentLabel(payment)} · ${payment.months} bulan`],
            ["Kanal", payment.channelLabel],
          ].map(([k, v]) => (
            <div key={k as string} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="font-bold text-slate-800 tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3">
          <NotifyAdmin href={notifyHref} />
        </div>
      </div>
      <Timeline items={steps} />
    </section>
  );
}

/** Bukti pesanan sedang diverifikasi — tahap uang muka atau pelunasan (Ringkasan & Pembayaran). */
export function BookingWaitingCard({ booking: b, payment, memberName }: { booking: ActiveBooking; payment: PaymentView; memberName: string }) {
  const label = paymentLabel({ kind: "SEWA_BARU", stage: b.stage, dpPct: b.dpPct }).toLowerCase();
  const checkIn = formatDate(b.startDate);
  const lunas = b.stage === "PELUNASAN";
  return (
    <WaitingCard
      title={`Bukti ${label} sedang diverifikasi`}
      payment={{ ...payment, dpPct: b.dpPct }}
      notifyHref={waPaymentNotice({ name: memberName, kind: label, kost: b.kost?.name ?? "-", room: b.room?.number ?? "-", amount: payment.amount, ref: paymentRef(payment.id) })}
      steps={
        lunas
          ? [
              { label: `Uang muka ${b.dpPct}% diterima`, desc: rupiah(b.paid), state: "done" },
              { label: "Bukti pelunasan dikirim", desc: formatDateTime(payment.createdAt), state: "done" },
              { label: "Verifikasi admin", desc: "Maksimal 1 hari kerja", state: "active" },
              { label: "Jadi penghuni", desc: `Lengkapi biodata · sewa mulai ${checkIn}`, state: "todo" },
            ]
          : [
              { label: "Pesanan dibuat", desc: formatDateTime(b.createdAt), state: "done" },
              { label: `Bukti uang muka ${b.dpPct}% dikirim`, desc: formatDateTime(payment.createdAt), state: "done" },
              { label: "Verifikasi admin", desc: "Maksimal 1 hari kerja", state: "active" },
              { label: "Pelunasan saat check-in", desc: `${rupiah(b.bill.settle)} · ${checkIn}`, state: "todo" },
              { label: "Jadi penghuni", desc: "Lengkapi biodata", state: "todo" },
            ]
      }
    >
      Admin memverifikasi maksimal 1 hari kerja.{" "}
      {lunas
        ? `Setelah disetujui, Anda resmi menjadi penghuni mulai check-in ${checkIn} dan diminta melengkapi biodata.`
        : `Setelah disetujui, kamar ditahan untuk Anda ${b.tier ? `${b.tier.days} hari sejak pembayaran` : "selama masa berlaku uang muka"}, mencakup check-in ${checkIn}.`}
    </WaitingCard>
  );
}

const REFUND_TERM = DP_TERMS.find((t) => t.startsWith("Refund")) ?? "";

/** Setelah uang muka dibayar, pembatalan hanya lewat Customer Care; refund sesuai ketentuan uang muka. */
export function CancelViaCare({ name, place, className }: { name: string; place: string; className?: string }) {
  return (
    <div className={cn("p-4 rounded-2xl border border-slate-200 bg-white space-y-3", className)}>
      <div>
        <p className="text-sm font-bold text-slate-900">Ingin membatalkan pesanan?</p>
        <p className="mt-1 text-xs text-slate-600 leading-relaxed">Uang muka sudah dibayar, jadi pembatalan diproses Customer Care. {REFUND_TERM}</p>
      </div>
      <a
        href={waKost(`Halo Admin Customer Care, saya ${name}. Saya ingin mengajukan pembatalan pesanan ${place}.`)}
        target="_blank"
        rel="noopener noreferrer"
        className={button("neutral", "md", "w-full")}
      >
        <Headset className="w-4 h-4" aria-hidden="true" /> Hubungi Customer Care untuk pembatalan
        <span className="sr-only">(membuka WhatsApp)</span>
      </a>
    </div>
  );
}

/** Ketentuan uang muka & deposit (Ketentuan dan Tata Tertib Kos Brave per 17 Juli 2026), dilipat. */
export function BookingTerms({ className }: { className?: string }) {
  return (
    <details className={cn("group rounded-xl border border-slate-200 bg-white", className)}>
      <summary className="flex items-center justify-between gap-3 min-h-11 px-4 py-2 rounded-xl cursor-pointer list-none [&::-webkit-details-marker]:hidden text-sm font-semibold text-slate-800 hover:text-primary">
        <span className="inline-flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary shrink-0" aria-hidden="true" /> Ketentuan uang muka & deposit
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="px-4 pb-4 space-y-3 text-xs text-slate-600 leading-relaxed">
        {([["Uang muka", DP_TERMS], [`Deposit ${DEPOSIT}`, DEPOSIT_TERMS]] as const).map(([title, items]) => (
          <div key={title}>
            <p className="font-bold text-slate-800">{title}</p>
            <ul className="mt-1 list-disc pl-4 space-y-1">
              {items.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

/** Riwayat pembayaran: tabel di md+, daftar kartu di mobile. */
export function PaymentHistory({ payments }: { payments: HistoryPayment[] }) {
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
  // No. penerimaan diberikan saat pembayaran disetujui.
  const receipt = (p: PaymentView) => (p.status === "DISETUJUI" ? p.receiptNo : "");
  return (
    <>
      <ul className="md:hidden space-y-3">
        {payments.map((p) => (
          <li key={p.id} className={card(false, "p-4")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-900">{paymentLabel(p)} · {p.months} bulan</p>
                <p className="text-xs text-slate-500">Kamar {p.roomNumber} · {p.kostName}</p>
              </div>
              <Pill tone={status(p).tone}>{status(p).label}</Pill>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-xs text-slate-500">{formatDateTime(p.createdAt)} · {p.channelLabel}</p>
              <p className="text-lg font-extrabold text-slate-900 tabular-nums">{rupiah(p.amount)}</p>
            </div>
            <dl className="mt-2 space-y-0.5 text-xs">
              <DocNo label="Ref" value={paymentRef(p.id)} />
              {p.invoiceNumber && <DocNo label="No. faktur" value={p.invoiceNumber} />}
              {receipt(p) && <DocNo label="No. penerimaan" value={receipt(p)} />}
            </dl>
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
                  <span className="font-semibold text-slate-900">{paymentLabel(p)}</span> · {p.months} bln
                  <span className="block text-xs text-slate-500 font-mono">Ref {paymentRef(p.id)}</span>
                  {p.invoiceNumber && <span className="block text-xs text-slate-500">No. faktur <span className="font-mono">{p.invoiceNumber}</span></span>}
                </td>
                <td className="px-5 py-4 text-slate-700">{p.roomNumber}<span className="block text-xs text-slate-500">{p.kostName}</span></td>
                <td className="px-5 py-4 text-slate-700">{p.channelLabel}</td>
                <td className="px-5 py-4 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">{rupiah(p.amount)}</td>
                <td className="px-5 py-4 max-w-56">
                  <Pill tone={status(p).tone}>{status(p).label}</Pill>
                  {receipt(p) && <span className="mt-1.5 block text-xs text-slate-500">No. penerimaan <span className="font-mono">{receipt(p)}</span></span>}
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

function DocNo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono text-slate-700 break-all">{value}</dd>
    </div>
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
