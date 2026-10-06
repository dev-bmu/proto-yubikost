// Pembayaran (PRD §8.4, v1.2): tagihan, kanal transfer/QRIS, upload bukti, riwayat.
import Link from "next/link";
import { ArrowRight, CalendarClock, Hourglass, ReceiptText, Wallet } from "lucide-react";
import { CancelBookingButton } from "@/components/customer/CancelBookingButton";
import { Countdown } from "@/components/customer/Countdown";
import { BookingCard, NotifyAdmin, PageHeader, PaymentHistory, ProgressSteps, Timeline } from "@/components/customer/parts";
import { PaymentForm } from "@/components/customer/PaymentForm";
import { Photo } from "@/components/media";
import { button, card, Pill } from "@/components/ui";
import { paymentRef } from "@/lib/constants";
import { customerGuard } from "@/lib/customer-guard";
import { byId } from "@/lib/db";
import { addMonths, formatDate, formatDateTime, leaseStatus, rupiah } from "@/lib/format";
import { activeChannels, type PaymentView } from "@/lib/queries";
import { waPaymentNotice } from "@/lib/wa";

export const metadata = { title: "Pembayaran" };

export default async function PembayaranPage() {
  const ctx = await customerGuard("/dashboard/pembayaran");
  const { member, resident, booking, bookingPayment, payments } = ctx;
  const channels = activeChannels();

  let body: React.ReactNode;
  if (resident) {
    const { room, kost, lease, pendingPayment } = resident;
    const status = leaseStatus(lease.dueDate);
    const pending = pendingPayment && payments.find((p) => p.id === pendingPayment.id);
    body = pending ? (
      <WaitingCard
        title="Bukti perpanjangan sedang diverifikasi"
        payment={pending}
        notifyHref={waPaymentNotice({ name: member.name, kind: "perpanjangan", kost: kost.name, room: room.number, amount: pending.amount, ref: paymentRef(pending.id) })}
        steps={[
          { label: "Bukti perpanjangan dikirim", desc: formatDateTime(pending.createdAt), state: "done" },
          { label: "Verifikasi admin", desc: "Maksimal 1 hari kerja", state: "active" },
          { label: "Masa sewa diperpanjang", desc: `s/d ${formatDate(addMonths(lease.dueDate, pending.months))}`, state: "todo" },
        ]}
      />
    ) : (
      <PaymentForm
        kind="PERPANJANGAN"
        monthlyPrice={room.monthlyPrice}
        dueDate={lease.dueDate}
        channels={channels}
        notice={{ name: member.name, kost: kost.name, room: room.number }}
        head={
          <ItemHead photo={room.photos[0] ?? kost.photos[0]} title={`Perpanjang Kamar ${room.number}`} subtitle={kost.name}>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <CalendarClock className="w-4 h-4 text-primary" aria-hidden="true" /> Jatuh tempo {formatDate(lease.dueDate)}
              <Pill tone={status.tone}>{status.label}</Pill>
            </p>
          </ItemHead>
        }
      />
    );
  } else if (booking?.status === "MENUNGGU_PEMBAYARAN") {
    const label = `${booking.kost?.name} · Kamar ${booking.room?.number}`;
    body = (
      <div className="space-y-6">
        <ProgressSteps current={1} rejected={Boolean(booking.note)} />
        {booking.note && (
          <div className="rounded-2xl bg-red-100 text-red-700 p-4 text-sm" role="alert">
            <strong>Bukti sebelumnya ditolak:</strong> {booking.note}. Upload ulang bukti yang benar.
          </div>
        )}
        <PaymentForm
          kind="SEWA_BARU"
          bookingId={booking.id}
          monthlyPrice={booking.room?.monthlyPrice ?? 0}
          months={booking.months}
          channels={channels}
          notice={{ name: member.name, kost: booking.kost?.name ?? "-", room: booking.room?.number ?? "-" }}
          head={
            <ItemHead
              photo={booking.room?.photos[0] ?? booking.kost?.photos[0]}
              title={`Sewa Baru · Kamar ${booking.room?.number}`}
              subtitle={`${booking.kost?.name} · mulai ${formatDate(booking.startDate, "short")}`}
            >
              <div className="mt-4">
                <Countdown expiresAt={booking.expiresAt} deadline={formatDateTime(booking.expiresAt)} />
              </div>
            </ItemHead>
          }
          footer={<CancelBookingButton id={booking.id} label={label} className="w-full" />}
        />
      </div>
    );
  } else if (booking?.status === "MENUNGGU_VERIFIKASI") {
    const typeName = booking.room && byId("roomTypes", booking.room.typeId)?.name;
    body = (
      <div className="space-y-6">
        <ProgressSteps current={2} />
        {bookingPayment && (
          <WaitingCard
            title="Bukti pembayaran sedang diverifikasi"
            payment={bookingPayment}
            notifyHref={waPaymentNotice({ name: member.name, kind: "sewa baru", kost: booking.kost?.name ?? "-", room: booking.room?.number ?? "-", amount: bookingPayment.amount, ref: paymentRef(bookingPayment.id) })}
            steps={[
              { label: "Pesanan dibuat", desc: formatDateTime(booking.createdAt), state: "done" },
              { label: "Bukti pembayaran dikirim", desc: formatDateTime(bookingPayment.createdAt), state: "done" },
              { label: "Verifikasi admin", desc: "Maksimal 1 hari kerja", state: "active" },
              { label: "Lengkapi biodata", state: "todo" },
            ]}
          />
        )}
        <BookingCard booking={booking} typeName={typeName} />
      </div>
    );
  } else {
    body = (
      <div className={card(false, "p-8 sm:p-12 text-center")}>
        <span className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <ReceiptText className="w-8 h-8" />
        </span>
        <h2 className="text-xl font-bold text-slate-900">Belum ada tagihan</h2>
        <p className="text-sm text-slate-600 mt-1 mb-6 max-w-sm mx-auto">Tagihan muncul setelah Anda memilih kamar dan mengajukan sewa.</p>
        <Link href="/dashboard/sewa" className={button("primary", "md")}>
          Pilih Kamar <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div>
        <PageHeader icon={Wallet} title="Pembayaran">
          {resident ? "Perpanjang masa sewa: pilih paket, transfer, lalu upload bukti." : "Transfer ke rekening atau QRIS resmi Brave, lalu upload bukti di sini."} Admin
          memverifikasi maksimal 1 hari kerja.
        </PageHeader>
        {body}
      </div>

      <section id="riwayat" aria-labelledby="riwayat-title" className="scroll-mt-24">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <h2 id="riwayat-title" className="text-xl font-extrabold tracking-tight text-slate-900">Riwayat pembayaran</h2>
            <p className="text-sm text-slate-600">{payments.length} pembayaran tercatat, terbaru di atas.</p>
          </div>
        </div>
        <PaymentHistory payments={payments} />
      </section>
    </div>
  );
}


function ItemHead({ photo, title, subtitle, children }: { photo?: string; title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
          <Photo src={photo} alt="" sizes="64px" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 leading-snug">{title}</p>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function WaitingCard({ title, payment, notifyHref, steps }: { title: string; payment: PaymentView; notifyHref: string; steps: Parameters<typeof Timeline>[0]["items"] }) {
  return (
    <section className={card(false, "p-6 sm:p-8 grid md:grid-cols-2 gap-8")} aria-labelledby="menunggu-title">
      <div>
        <Pill tone="info">
          <Hourglass className="w-3.5 h-3.5" aria-hidden="true" /> Menunggu Verifikasi
        </Pill>
        <h2 id="menunggu-title" className="mt-3 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">Admin memverifikasi maksimal 1 hari kerja. Anda tidak perlu mengirim ulang bukti.</p>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          {[
            ["Ref", <span key="r" className="font-mono">{paymentRef(payment.id)}</span>],
            ["Nominal", rupiah(payment.amount)],
            ["Paket", `${payment.months} bulan`],
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
