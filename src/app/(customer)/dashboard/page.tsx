// Ringkasan Dashboard Customer (PRD §8.2, v1.2): tampilan sesuai tahap sewa.
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, BedDouble, Building2, CalendarClock, Clock, CreditCard, ExternalLink, Headset, Hourglass, IdCard,
  Layers, LayoutDashboard, MapPin, MessageCircle, ReceiptText, Ruler, ScrollText, ShieldCheck, Upload, UserRound, Wallet, type LucideIcon,
} from "lucide-react";
import { CancelBookingButton } from "@/components/customer/CancelBookingButton";
import {
  BookingCard, BookingCountdown, BookingWaitingCard, CancelViaCare, KostPickCard, PageHeader, ProgressSteps,
} from "@/components/customer/parts";
import { FacilityChips, Photo } from "@/components/media";
import { button, card, Eyebrow, kostTypeClass, Notice, Pill } from "@/components/ui";
import { BOOKING_STAGE_LABEL, BOOKING_STATUS, DEPOSIT, DP_TIERS, HOLD_HOURS, PAYMENT_STATUS, paymentLabel, paymentRef } from "@/lib/constants";
import { customerGuard } from "@/lib/customer-guard";
import { all, byId } from "@/lib/db";
import { addMonths, cn, daysUntil, firstName, formatDate, formatDateTime, formatPhone, leaseStatus, maskNik, rupiah } from "@/lib/format";
import { kostCards, type CustomerContext } from "@/lib/queries";
import { waKost } from "@/lib/wa";

export const metadata = { title: "Ringkasan" };

/** Sapaan sesuai jam WIB (PRD §8.2). Dirender di server, jadi tidak memicu hydration mismatch. */
function greeting(name: string) {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(new Date()));
  return `${h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam"}, ${firstName(name)}`;
}

export default async function DashboardPage() {
  const ctx = await customerGuard("/dashboard");
  if (ctx.resident) return <ResidentView ctx={ctx} />;
  if (ctx.booking) return <BookingView ctx={ctx} />;
  return <ProspectView ctx={ctx} />;
}

/* ───────────── Calon penghuni tanpa pesanan ───────────── */

function ProspectView({ ctx }: { ctx: CustomerContext }) {
  const { member } = ctx;
  const free = all("rooms").filter((r) => r.status === "AVAILABLE");
  const freeOf = (kostId: string) => free.filter((r) => r.kostId === kostId).length;
  // Hanya gedung tayang: kamar di gedung draf tidak ikut dihitung.
  const cards = kostCards();
  const freeTotal = cards.reduce((n, k) => n + freeOf(k.id), 0);
  const picks = cards
    .filter((k) => freeOf(k.id) > 0)
    .sort((a, b) => freeOf(b.id) - freeOf(a.id))
    .slice(0, 3);
  const last = all("bookings")
    .filter((b) => b.memberId === member.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const lastRoom = last && byId("rooms", last.roomId);

  return (
    <div className="space-y-10">
      <section className="on-purple relative overflow-hidden rounded-3xl gradient-hero text-white shadow-card">
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -bottom-24 right-40 w-56 h-56 rounded-full bg-accent/15" aria-hidden="true" />
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 items-center p-6 sm:p-10">
          <div>
            <Eyebrow onPurple>Calon Penghuni</Eyebrow>
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">{greeting(member.name)}</h1>
            <p className="mt-2 text-base sm:text-lg text-white max-w-xl leading-relaxed">
              Temukan kamar Kost yang pas, ajukan sewa, lalu selesaikan pembayaran langsung dari dashboard ini.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/sewa" className={button("accent", "lg")}>
                <BedDouble className="w-5 h-5" aria-hidden="true" /> Pilih Kamar Sekarang
              </Link>
              <Link href="/" className={button("glass", "lg")}>Lihat Katalog Kost</Link>
            </div>
          </div>
          <dl className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:w-56">
            <div className="p-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm">
              <dt className="text-xs text-white">Kamar tersedia</dt>
              <dd className="text-3xl font-extrabold tabular-nums">{freeTotal}</dd>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm">
              <dt className="text-xs text-white">Gedung Kost</dt>
              <dd className="text-3xl font-extrabold tabular-nums">{cards.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      {last && lastRoom && (last.status === "KEDALUWARSA" || last.status === "DIBATALKAN") && (
        <Notice tone="neutral">
          Pesanan Kamar {lastRoom.number} terakhir Anda {BOOKING_STATUS[last.status]?.label.toLowerCase()}
          {last.status === "KEDALUWARSA"
            ? last.stage === "PELUNASAN"
              ? " karena pelunasan belum dibayar sampai masa berlaku uang muka habis"
              : ` karena uang muka belum dibayar dalam ${HOLD_HOURS} jam`
            : ""}
          . Silakan pilih kamar lagi.
        </Notice>
      )}

      <section aria-labelledby="progres">
        <h2 id="progres" className="text-lg font-bold text-slate-900 mb-4">Progres sewa Anda</h2>
        <ProgressSteps current={0} />
      </section>

      <section aria-labelledby="rekomendasi">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 id="rekomendasi" className="text-lg font-bold text-slate-900">Rekomendasi Kost</h2>
            <p className="text-sm text-slate-600">Gedung dengan kamar paling banyak tersedia saat ini.</p>
          </div>
          <Link href="/dashboard/sewa" className="shrink-0 inline-flex items-center gap-1 min-h-11 text-sm font-bold text-primary hover:text-primary-dark">
            Semua Kost <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
        {picks.length ? (
          <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {picks.map((k) => (
              <li key={k.id}>
                <KostPickCard kost={k} available={freeOf(k.id)} href={`/dashboard/sewa?kost=${k.slug}`} />
              </li>
            ))}
          </ul>
        ) : (
          <Notice tone="neutral">Semua kamar sedang terisi. Tanyakan jadwal kamar kosong berikutnya ke Customer Care.</Notice>
        )}
      </section>

      <section aria-labelledby="cara-sewa">
        <h2 id="cara-sewa" className="text-lg font-bold text-slate-900 mb-4">Yang perlu Anda tahu</h2>
        <ul className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Tip icon={Clock} tone="bg-amber-100 text-amber-800" title={`Kamar ditahan ${HOLD_HOURS} jam`}>
            Setelah mengajukan sewa, bayar uang muka dalam {HOLD_HOURS} jam. Setelah diverifikasi, kamar ditahan untuk Anda sampai check-in.
          </Tip>
          <Tip icon={Wallet} tone="bg-primary/10 text-primary" title={`Uang muka mulai ${DP_TIERS[0].pct}%`}>
            Sisa sewa dan deposit {DEPOSIT} dilunasi saat check-in. Deposit kembali setelah masa sewa berakhir sesuai ketentuan.
          </Tip>
          <Tip icon={ShieldCheck} tone="bg-emerald-100 text-emerald-700" title="Verifikasi 1 hari kerja">
            Upload bukti transfer di menu Pembayaran; admin memverifikasi maksimal 1 hari kerja.
          </Tip>
          <Tip icon={MapPin} tone="bg-sky-100 text-sky-700" title="Survey lokasi opsional">
            Ingin melihat kamar dulu? Ajukan jadwal survey via WhatsApp dari halaman Sewa Kamar.
          </Tip>
        </ul>
      </section>

      <HelpBanner href={waKost(`Halo Admin Customer Care, saya ${member.name} (calon penghuni). Saya ingin bertanya: `)} />
    </div>
  );
}

function Tip({ icon: Icon, tone, title, children }: { icon: LucideIcon; tone: string; title: string; children: React.ReactNode }) {
  return (
    <li className={card(false, "p-5")}>
      <span className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-3", tone)} aria-hidden="true">
        <Icon className="w-5 h-5" />
      </span>
      <p className="font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600 leading-relaxed">{children}</p>
    </li>
  );
}

function HelpBanner({ href }: { href: string }) {
  return (
    <section className={card(false, "p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4")} aria-label="Bantuan">
      <span className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0" aria-hidden="true">
        <Headset className="w-6 h-6" />
      </span>
      <div className="flex-1">
        <p className="font-bold text-slate-900">Masih ragu memilih kamar?</p>
        <p className="text-sm text-slate-600">Tanyakan harga, fasilitas, atau jadwal survey langsung ke Admin Kost.</p>
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer" className={button("whatsapp", "md")}>
        <MessageCircle className="w-4 h-4" aria-hidden="true" /> Chat via WhatsApp
      </a>
    </section>
  );
}

/* ───────────── Calon penghuni dengan pesanan aktif ───────────── */

function BookingView({ ctx }: { ctx: CustomerContext }) {
  const { member, bookingPayment } = ctx;
  const booking = ctx.booking!;
  const typeName = booking.room && byId("roomTypes", booking.room.typeId)?.name;
  const label = `${booking.kost?.name} · Kamar ${booking.room?.number}`;
  const lunas = booking.stage === "PELUNASAN";
  const checkIn = formatDate(booking.startDate);

  if (booking.status === "MENUNGGU_PEMBAYARAN") {
    return (
      <div className="space-y-8">
        <PageHeader icon={LayoutDashboard} title={greeting(member.name)}>
          {lunas
            ? `Uang muka Anda sudah diterima dan kamar ditahan sampai ${formatDateTime(booking.expiresAt)}. Lunasi sisa sewa + deposit saat check-in ${checkIn}.`
            : "Kamar sudah ditahan untuk Anda. Bayar uang muka sebelum batas waktu agar pesanan tidak batal."}
        </PageHeader>
        <ProgressSteps current={lunas ? 3 : 1} rejected={Boolean(booking.note)} />
        {booking.note && (
          <div className="rounded-2xl bg-red-100 text-red-700 p-4 text-sm" role="alert">
            <strong>Bukti {BOOKING_STAGE_LABEL[booking.stage]?.toLowerCase() ?? "pembayaran"} sebelumnya ditolak:</strong> {booking.note}. Silakan transfer ulang
            atau upload bukti yang benar.
          </div>
        )}
        <BookingCard booking={booking} typeName={typeName}>
          <div className="mt-4">
            <BookingCountdown booking={booking} />
          </div>
          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <Link href="/dashboard/pembayaran" className={button("primary", "lg", "sm:flex-1")}>
              <CreditCard className="w-5 h-5" aria-hidden="true" /> {lunas ? "Bayar Pelunasan" : "Bayar Uang Muka"}
            </Link>
            {!lunas && <CancelBookingButton id={booking.id} label={label} size="lg" />}
          </div>
          {lunas && <CancelViaCare className="mt-4" name={member.name} place={`${label} (check-in ${checkIn})`} />}
        </BookingCard>
        <section aria-labelledby="cara-bayar">
          <h2 id="cara-bayar" className="text-lg font-bold text-slate-900 mb-4">Cara membayar</h2>
          <ol className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: Wallet,
                title: lunas ? "Transfer pelunasan" : "Transfer uang muka",
                text: `${rupiah(booking.due)} ke rekening atau QRIS resmi Brave yang tertera di menu Pembayaran.`,
              },
              { icon: Upload, title: "Upload bukti", text: "Foto atau PDF bukti transfer, maksimal 3 MB." },
              {
                icon: BadgeCheck,
                title: "Verifikasi admin",
                text: lunas
                  ? "Maksimal 1 hari kerja, lalu Anda resmi menjadi Penghuni dan melengkapi biodata."
                  : "Maksimal 1 hari kerja. Kamar lalu ditahan sampai check-in; sisa sewa + deposit dilunasi saat check-in.",
              },
            ].map((s, i) => (
              <li key={s.title} className={card(false, "p-5 flex gap-4")}>
                <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0" aria-hidden="true">
                  <s.icon className="w-5 h-5" />
                </span>
                <div>
                  <p className="font-bold text-slate-900">{i + 1}. {s.title}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    );
  }

  // MENUNGGU_VERIFIKASI (bukti uang muka atau pelunasan)
  return (
    <div className="space-y-8">
      <PageHeader icon={LayoutDashboard} title={greeting(member.name)}>
        Bukti {lunas ? "pelunasan" : "uang muka"} Anda sudah kami terima. Admin sedang memverifikasinya.
      </PageHeader>
      <ProgressSteps current={lunas ? 3 : 2} />
      {bookingPayment && <BookingWaitingCard booking={booking} payment={bookingPayment} memberName={member.name} />}
      <BookingCard booking={booking} typeName={typeName} />
    </div>
  );
}

/* ───────────── Penghuni ───────────── */

function ResidentView({ ctx }: { ctx: CustomerContext }) {
  const { member, profile, payments } = ctx;
  const { lease, room, kost, pendingPayment } = ctx.resident!;
  const type = byId("roomTypes", room.typeId);
  const status = leaseStatus(lease.dueDate);
  // Periode berjalan (C-21): dari jatuh tempo sebelum perpanjangan terakhir disetujui, atau dari check-in.
  const renewal = payments.find((p) => p.kind === "PERPANJANGAN" && p.status === "DISETUJUI");
  const prevDue = renewal ? addMonths(lease.dueDate, -renewal.months) : "";
  const periodStart = prevDue > lease.startDate ? prevDue : lease.startDate;
  const left = daysUntil(lease.dueDate);
  const total = Math.max(1, left - daysUntil(periodStart));
  const fill = Math.min(100, Math.max(0, (left / total) * 100));
  const lastPay = payments[0];
  const lastRenewal = payments.find((p) => p.kind === "PERPANJANGAN");
  const dpOf = new Map(all("bookings").filter((b) => b.memberId === member.id).map((b) => [b.id, b.dpPct]));
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(kost.address)}`;

  return (
    <div className="space-y-8">
      <section className="on-purple relative overflow-hidden rounded-3xl text-white shadow-card min-h-72 flex">
        <Photo src={room.photos[0] ?? kost.photos[0]} alt={`Foto kamar ${room.number}`} sizes="(min-width: 1024px) 70vw, 100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-hero-deep via-primary/90 to-primary/40" aria-hidden="true" />
        <div className="relative flex flex-col justify-end gap-5 p-6 sm:p-10 w-full">
          <div>
            <Pill solid tone="success"><BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> Penghuni Aktif</Pill>
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">Halo, {firstName(member.name)}</h1>
            <p className="mt-1 text-lg sm:text-xl font-bold">Kamar {room.number} · {kost.name}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white">
              {type && <span className="inline-flex items-center gap-1.5"><BedDouble className="w-4 h-4 text-accent" aria-hidden="true" /> Tipe {type.name}</span>}
              <span className="inline-flex items-center gap-1.5"><Layers className="w-4 h-4 text-accent" aria-hidden="true" /> Lantai {room.floor}</span>
              <span className="inline-flex items-center gap-1.5"><Ruler className="w-4 h-4 text-accent" aria-hidden="true" /> {room.size}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/pembayaran" className={button("accent", "md")}>
              <CreditCard className="w-4 h-4" aria-hidden="true" /> Perpanjang Sewa
            </Link>
            <Link href={`/kost/${kost.slug}`} className={button("glass", "md")}>Halaman Kost</Link>
          </div>
        </div>
      </section>

      {pendingPayment ? (
        <Notice tone="info">
          Bukti perpanjangan paket {pendingPayment.months} bulan ({rupiah(pendingPayment.amount)}, Ref{" "}
          <span className="font-mono font-bold">{paymentRef(pendingPayment.id)}</span>) sedang diverifikasi admin.
        </Notice>
      ) : lastRenewal?.status === "DITOLAK" ? (
        <div className="rounded-2xl bg-red-100 text-red-700 p-4 text-sm">
          <strong>Bukti perpanjangan terakhir ditolak:</strong> {lastRenewal.note || "tanpa catatan"}.{" "}
          <Link href="/dashboard/pembayaran" className="font-bold underline">Upload ulang di Pembayaran</Link>
        </div>
      ) : null}

      <section aria-label="Status sewa" className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile icon={Hourglass} tile="bg-primary/10 text-primary" label="Sisa masa sewa">
          <p className={cn("text-3xl font-extrabold tracking-tight tabular-nums", left < 0 ? "text-red-700" : "text-slate-900")}>
            {Math.abs(left)} <span className="text-base font-bold text-slate-500">{left < 0 ? "hari lewat" : "hari lagi"}</span>
          </p>
          <div
            role="meter"
            aria-label="Sisa masa sewa"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={Math.max(0, left)}
            aria-valuetext={left < 0 ? `Lewat jatuh tempo ${-left} hari` : `${left} dari ${total} hari tersisa`}
            className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden"
          >
            <div className={cn("h-full rounded-full", status.tone === "success" ? "bg-emerald-600" : status.tone === "warning" ? "bg-amber-600" : "bg-red-600")} style={{ width: `${fill}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">Periode {formatDate(periodStart, "short")} – {formatDate(lease.dueDate, "short")}</p>
        </StatTile>
        <StatTile icon={CalendarClock} tile="bg-amber-100 text-amber-800" label="Jatuh tempo">
          <p className="text-xl font-extrabold text-slate-900">{formatDate(lease.dueDate)}</p>
          <Pill tone={status.tone} className="mt-2 whitespace-normal">{status.label}</Pill>
        </StatTile>
        <StatTile icon={Wallet} tile="bg-emerald-100 text-emerald-700" label="Biaya per bulan">
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">{rupiah(room.monthlyPrice)}</p>
          <p className="mt-1 text-xs text-slate-500">{type ? `Tipe ${type.name} · ` : ""}{room.size}</p>
        </StatTile>
        <StatTile icon={ReceiptText} tile="bg-sky-100 text-sky-700" label="Pembayaran terakhir">
          {lastPay ? (
            <>
              <Pill tone={PAYMENT_STATUS[lastPay.status]?.tone ?? "neutral"}>{PAYMENT_STATUS[lastPay.status]?.label ?? lastPay.status}</Pill>
              <p className="mt-2 text-lg font-extrabold text-slate-900 tabular-nums">{rupiah(lastPay.amount)}</p>
              <p className="text-xs text-slate-500">{formatDate(lastPay.createdAt, "short")}</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">Belum ada pembayaran tercatat.</p>
          )}
        </StatTile>
      </section>

      <section aria-labelledby="aksi-cepat">
        <h2 id="aksi-cepat" className="text-lg font-bold text-slate-900 mb-4">Aksi cepat</h2>
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction href="/dashboard/pembayaran" icon={CreditCard} tile="bg-primary/10 text-primary" title="Perpanjang Sewa" desc="Paket 1–12 bulan" />
          <QuickAction href="/dashboard/bantuan" icon={Headset} tile="bg-emerald-100 text-emerald-700" title="Customer Care" desc="Tanya via WhatsApp" />
          <QuickAction href="/dashboard/biodata" icon={IdCard} tile="bg-sky-100 text-sky-700" title="Biodata" desc="Data diri & wali" />
          <QuickAction href="/dashboard/akun" icon={UserRound} tile="bg-amber-100 text-amber-800" title="Akun" desc="Ganti kata sandi" />
        </ul>
      </section>

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        <section className={card(false, "lg:col-span-3 overflow-hidden")} aria-labelledby="bayar-terakhir">
          <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-slate-100">
            <h2 id="bayar-terakhir" className="font-bold text-slate-900">Pembayaran terakhir</h2>
            <Link href="/dashboard/pembayaran#riwayat" className="inline-flex items-center gap-1 min-h-11 text-sm font-bold text-primary hover:text-primary-dark">
              Lihat riwayat <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
          {payments.length ? (
            <ul className="divide-y divide-slate-100">
              {payments.slice(0, 3).map((p) => {
                const s = PAYMENT_STATUS[p.status] ?? { label: p.status, tone: "neutral" as const };
                return (
                  <li key={p.id} className="px-5 sm:px-6 py-4 flex items-center gap-4">
                    <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0" aria-hidden="true">
                      <ReceiptText className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">{paymentLabel({ ...p, dpPct: dpOf.get(p.bookingId) })} · {p.months} bulan</p>
                      <p className="text-xs text-slate-500">{formatDate(p.createdAt, "short")} · <span className="font-mono">Ref {paymentRef(p.id)}</span></p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-slate-900 tabular-nums">{rupiah(p.amount)}</p>
                      <Pill tone={s.tone} className="mt-1">{s.label}</Pill>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-6 py-8 text-sm text-slate-500 text-center">Belum ada pembayaran tercatat.</p>
          )}
        </section>

        <section className={card(false, "lg:col-span-2 overflow-hidden")} aria-labelledby="kost-anda">
          <div className="relative aspect-[16/7] bg-slate-100">
            <Photo src={kost.photos[0]} alt={`Foto luar gedung ${kost.name}`} sizes="(min-width: 1024px) 30vw, 100vw" />
            <Pill solid className={cn("absolute top-3 left-3", kostTypeClass(kost.type))}>Kost {kost.type}</Pill>
          </div>
          <div className="p-5 sm:p-6 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Kost Anda</p>
              <h2 id="kost-anda" className="text-lg font-bold text-slate-900">{kost.name}</h2>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" /> {kost.address}
              </p>
            </div>
            <FacilityChips items={kost.facilities} max={5} />
            <div className="flex flex-wrap gap-x-5 gap-y-1 pt-3 border-t border-slate-100 text-sm font-semibold">
              <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-11 text-primary hover:underline">
                <ExternalLink className="w-4 h-4" aria-hidden="true" /> Buka peta
              </a>
              <Link href={`/kost/${kost.slug}`} className="inline-flex items-center gap-1.5 min-h-11 text-primary hover:underline">
                <Building2 className="w-4 h-4" aria-hidden="true" /> Halaman Kost
              </Link>
              <Link href={`/kost/${kost.slug}#tata-tertib`} className="inline-flex items-center gap-1.5 min-h-11 text-primary hover:underline">
                <ScrollText className="w-4 h-4" aria-hidden="true" /> Tata tertib
              </Link>
            </div>
          </div>
        </section>
      </div>

      {profile && (
        <section aria-labelledby="biodata-title" className={card(false, "p-5 sm:p-6")}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 id="biodata-title" className="font-bold text-slate-900 flex items-center gap-2">
              <IdCard className="w-5 h-5 text-primary" aria-hidden="true" /> Ringkasan biodata
            </h2>
            <Link href="/dashboard/biodata" className="inline-flex items-center gap-1 min-h-11 text-sm font-bold text-primary hover:text-primary-dark">
              Detail <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
          <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {[
              ["Nama sesuai KTP", profile.fullNameKtp],
              ["NIK", <span key="nik" className="font-mono">{maskNik(profile.nik)}</span>],
              [profile.occupation === "MAHASISWA" ? "Mahasiswa" : "Pekerja", profile.institution],
              ["Kontak darurat", `${profile.guardianRelation} · ${formatPhone(profile.guardianWhatsapp)}`],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="font-semibold text-slate-800 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, tile, label, children }: { icon: LucideIcon; tile: string; label: string; children: React.ReactNode }) {
  return (
    <div className={card(false, "p-5")}>
      <div className="flex items-center gap-3 mb-3">
        <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", tile)} aria-hidden="true">
          <Icon className="w-5 h-5" />
        </span>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
      </div>
      {children}
    </div>
  );
}

function QuickAction({ href, icon: Icon, tile, title, desc }: { href: string; icon: LucideIcon; tile: string; title: string; desc: string }) {
  return (
    <li>
      <Link href={href} className={card(true, "group flex flex-col gap-3 p-5 h-full")}>
        <span className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 motion-reduce:transition-none", tile)} aria-hidden="true">
          <Icon className="w-6 h-6" />
        </span>
        <span>
          <span className="block font-bold text-slate-900 group-hover:text-primary">{title}</span>
          <span className="block text-xs text-slate-500">{desc}</span>
        </span>
      </Link>
    </li>
  );
}
