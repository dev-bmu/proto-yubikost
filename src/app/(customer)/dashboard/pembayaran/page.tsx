// Pembayaran (PRD §8.4, v1.2; Ketentuan Kos Brave 17 Juli 2026): uang muka → pelunasan saat check-in, perpanjangan, riwayat.
import Link from "next/link";
import { ArrowRight, CalendarCheck, CalendarClock, ReceiptText, Wallet } from "lucide-react";
import { CancelBookingButton } from "@/components/customer/CancelBookingButton";
import {
  BookingCard, BookingCountdown, BookingTerms, BookingWaitingCard, CancelViaCare, Info, inDays, PageHeader, PaymentHistory, ProgressSteps, WaitingCard,
} from "@/components/customer/parts";
import { PaymentForm } from "@/components/customer/PaymentForm";
import { Photo } from "@/components/media";
import { button, card, Pill } from "@/components/ui";
import { BOOKING_STAGE_LABEL, paymentLabel, paymentRef } from "@/lib/constants";
import { customerGuard } from "@/lib/customer-guard";
import { all, byId } from "@/lib/db";
import { addMonths, formatDate, formatDateTime, leaseStatus, rupiah } from "@/lib/format";
import { activeChannels } from "@/lib/queries";
import { waPaymentNotice } from "@/lib/wa";

export const metadata = { title: "Pembayaran" };

export default async function PembayaranPage() {
  const ctx = await customerGuard("/dashboard/pembayaran");
  const { member, resident, booking, bookingPayment, payments } = ctx;
  const channels = activeChannels();
  // Riwayat: label "Uang Muka 25%" butuh dpPct pesanan; nomor faktur dari tabel faktur.
  const dpOf = new Map(all("bookings").filter((b) => b.memberId === member.id).map((b) => [b.id, b.dpPct]));
  const invoiceNo = new Map(all("invoices").filter((i) => i.memberId === member.id).map((i) => [i.id, i.number]));
  const history = payments.map((p) => ({ ...p, dpPct: dpOf.get(p.bookingId), invoiceNumber: invoiceNo.get(p.invoiceId) }));

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
  } else if (booking) {
    const lunas = booking.stage === "PELUNASAN";
    const unpaid = booking.status === "MENUNGGU_PEMBAYARAN";
    const place = `${booking.kost?.name} · Kamar ${booking.room?.number}`;
    const checkIn = formatDate(booking.startDate);
    const typeName = booking.room && byId("roomTypes", booking.room.typeId)?.name;
    // Hanya field tagihan yang dikirim ke komponen klien (data kost lengkap tidak ikut).
    const { stage, status, months, monthlyPrice, dpPct, bill, paid, due } = booking;
    const cancelViaCare = <CancelViaCare name={member.name} place={`${place} (check-in ${checkIn})`} />;
    body = (
      <div className="space-y-6">
        <ProgressSteps current={lunas ? 3 : unpaid ? 1 : 2} rejected={unpaid && Boolean(booking.note)} />
        {unpaid ? (
          <>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                {lunas ? "Uang muka diterima · lunasi saat check-in" : `Bayar uang muka ${dpPct}%`}
              </h2>
              <p className="mt-1 text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
                {lunas
                  ? `Kamar ditahan untuk Anda sampai ${formatDateTime(booking.expiresAt)}. Bayar sisa sewa + deposit ${rupiah(due)} saat atau sebelum check-in ${checkIn}.`
                  : `Transfer ${rupiah(due)} lalu upload bukti sebelum ${formatDateTime(booking.expiresAt)}. Sisa sewa + deposit ${rupiah(bill.settle)} dibayar saat check-in ${checkIn}.`}
              </p>
            </div>
            {booking.note && (
              <div className="rounded-2xl bg-red-100 text-red-700 p-4 text-sm" role="alert">
                <strong>Bukti {BOOKING_STAGE_LABEL[stage]?.toLowerCase() ?? "pembayaran"} sebelumnya ditolak:</strong> {booking.note}. Upload ulang bukti yang benar.
              </div>
            )}
            <PaymentForm
              kind="SEWA_BARU"
              bookingId={booking.id}
              invoiceNumber={booking.invoice?.number}
              rent={{ stage, status, months, monthlyPrice, dpPct, bill, paid, due }}
              channels={channels}
              notice={{ name: member.name, kost: booking.kost?.name ?? "-", room: booking.room?.number ?? "-" }}
              head={
                <ItemHead
                  photo={booking.room?.photos[0] ?? booking.kost?.photos[0]}
                  title={`${paymentLabel({ kind: "SEWA_BARU", stage, dpPct })} · Kamar ${booking.room?.number}`}
                  subtitle={`${booking.kost?.name} · ${months} bulan`}
                >
                  <div className="mt-4 space-y-3">
                    <Info icon={CalendarCheck} label="Check-in" value={`${checkIn} · ${inDays(booking.startDate)}`} className="bg-primary-ultralight border-primary/20" />
                    <BookingCountdown booking={booking} />
                  </div>
                </ItemHead>
              }
              footer={lunas ? cancelViaCare : <CancelBookingButton id={booking.id} label={place} className="w-full" />}
            />
            <BookingTerms />
          </>
        ) : (
          <>
            {bookingPayment && <BookingWaitingCard booking={booking} payment={bookingPayment} memberName={member.name} />}
            <BookingCard booking={booking} typeName={typeName} />
            <div className="grid md:grid-cols-2 gap-4 items-start">
              {cancelViaCare}
              <BookingTerms />
            </div>
          </>
        )}
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
        <PaymentHistory payments={history} />
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
