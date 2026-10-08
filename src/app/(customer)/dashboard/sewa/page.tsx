// Sewa Kamar (PRD §8.3, v1.2): 1 pilih Kost → 2 pilih tipe kamar → 3 pilih nomor kamar & ajukan sewa.
import Link from "next/link";
import { ArrowRight, BedDouble, Building2, ChevronDown, CreditCard, ExternalLink, MapPin, MessageCircle } from "lucide-react";
import { BookingCard, KostPickCard, PageHeader, StepHeading } from "@/components/customer/parts";
import { RoomPicker, SewaSteps, type TypeOption } from "@/components/customer/RoomPicker";
import { FacilityChips, Photo } from "@/components/media";
import { button, card, kostTypeClass, Notice, Pill } from "@/components/ui";
import { HOLD_HOURS } from "@/lib/constants";
import { customerGuard } from "@/lib/customer-guard";
import { all, byId } from "@/lib/db";
import { cn, rupiah } from "@/lib/format";
import { kostCards, roomTypesWithAvailability } from "@/lib/queries";
import { waKost } from "@/lib/wa";

export const metadata = { title: "Sewa Kamar" };

export default async function SewaPage({ searchParams }: { searchParams: Promise<{ kost?: string; tipe?: string; kamar?: string }> }) {
  const { kost: slug, tipe, kamar } = await searchParams;
  // URL tujuan setelah login tetap memuat pilihan kost/tipe/kamar (PRD §7.3).
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ kost: slug, tipe, kamar })) if (typeof v === "string") qs.set(k, v);
  const ctx = await customerGuard(`/dashboard/sewa${qs.size ? `?${qs}` : ""}`);

  if (ctx.resident) {
    const { room, kost } = ctx.resident;
    return (
      <>
        <PageHeader icon={BedDouble} title="Sewa Kamar" />
        <InfoCard
          title={`Anda sudah menempati Kamar ${room.number}`}
          text={`${kost.name}. Perpanjangan sewa ada di menu Pembayaran; pindah kamar diajukan lewat Customer Care.`}
          action={<Link href="/dashboard/pembayaran" className={button("primary", "md")}><CreditCard className="w-4 h-4" aria-hidden="true" /> Ke Pembayaran</Link>}
        />
      </>
    );
  }

  if (ctx.booking) {
    const typeName = ctx.booking.room && byId("roomTypes", ctx.booking.room.typeId)?.name;
    // Pembatalan mandiri hanya sebelum uang muka dibayar; setelahnya lewat Customer Care.
    const canCancel = ctx.booking.stage === "DP" && ctx.booking.status === "MENUNGGU_PEMBAYARAN";
    return (
      <div className="space-y-6">
        <PageHeader icon={BedDouble} title="Sewa Kamar">
          Anda sudah punya pesanan aktif. Selesaikan pembayaran di menu Pembayaran
          {canCancel ? ", atau batalkan pesanan untuk memilih kamar lain." : "; pembatalan diajukan lewat Customer Care."}
        </PageHeader>
        <BookingCard booking={ctx.booking} typeName={typeName}>
          <Link href="/dashboard/pembayaran" className={button("primary", "lg", "mt-5 w-full sm:w-auto")}>
            <CreditCard className="w-5 h-5" aria-hidden="true" /> Ke Pembayaran
          </Link>
        </BookingCard>
      </div>
    );
  }

  const free = all("rooms").filter((r) => r.status === "AVAILABLE");
  const freeOf = (kostId: string) => free.filter((r) => r.kostId === kostId).length;
  const kosts = kostCards().sort((a, b) => Number(freeOf(b.id) > 0) - Number(freeOf(a.id) > 0));
  const selected = slug ? kosts.find((k) => k.slug === slug) : undefined;
  const types: TypeOption[] = selected
    ? roomTypesWithAvailability(selected.id).map(({ type, rooms }) => ({
        id: type.id,
        name: type.name,
        size: type.size,
        monthlyPrice: type.monthlyPrice,
        facilities: type.facilities,
        photos: type.photos,
        description: type.description,
        rooms: rooms.map(({ id, number, floor }) => ({ id, number, floor })),
      }))
    : [];
  const grid = (
    <ul className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
      {kosts.map((k) => (
        <li key={k.id}>
          <KostPickCard
            kost={k}
            available={freeOf(k.id)}
            href={`/dashboard/sewa?kost=${k.slug}#tipe-kamar`}
            selected={k.id === selected?.id}
            cta={k.id === selected?.id ? "Dipilih" : "Pilih"}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-8">
      <PageHeader icon={BedDouble} title="Sewa Kamar">
        Pilih gedung, tipe kamar, lalu nomor kamar yang tersedia. Setelah mengajukan sewa, kamar ditahan {HOLD_HOURS} jam untuk pembayaran uang muka.
      </PageHeader>

      <SewaSteps hasKost={Boolean(selected)} />

      <section aria-labelledby="pilih-kost">
        <StepHeading n={1} id="pilih-kost" title="Pilih Kost">
          {selected ? "Gedung terpilih. Ganti bila ingin melihat gedung lain." : `${kosts.length} gedung Kost terverifikasi di Malang.`}
        </StepHeading>
        {slug && !selected && (
          <Notice tone="danger" className="mb-4">
            <span role="alert">Kost tidak ditemukan. Silakan pilih dari daftar di bawah.</span>
          </Notice>
        )}
        {!selected ? (
          grid
        ) : (
          <>
            <div className={card(false, "overflow-hidden grid sm:grid-cols-[240px_1fr]")}>
              <div className="relative aspect-video sm:aspect-auto sm:min-h-44 bg-slate-100">
                <Photo src={selected.photos[0]} alt={`Foto luar gedung ${selected.name}`} sizes="(min-width: 640px) 240px, 100vw" />
                <Pill solid className={cn("absolute top-3 left-3", kostTypeClass(selected.type))}>Kost {selected.type}</Pill>
              </div>
              <div className="p-5 space-y-3 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-xl font-extrabold tracking-tight text-slate-900">{selected.name}</h3>
                    <p className="mt-0.5 flex items-start gap-1.5 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" /> {selected.address}
                    </p>
                  </div>
                  <p className="text-right">
                    <span className="block text-xs text-slate-500">Mulai</span>
                    <span className="text-xl font-extrabold text-primary tabular-nums">{rupiah(selected.startPrice)}</span>
                    <span className="text-xs text-slate-500"> /bulan</span>
                  </p>
                </div>
                <FacilityChips items={selected.facilities} max={6} />
                <Link href={`/kost/${selected.slug}`} target="_blank" className="inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-primary hover:underline">
                  Lihat halaman Kost (peta & tata tertib) <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="sr-only">(membuka tab baru)</span>
                </Link>
              </div>
            </div>
            <details className="group mt-3">
              <summary className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <Building2 className="w-4 h-4" aria-hidden="true" /> Ganti Kost
                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="mt-4">{grid}</div>
            </details>
          </>
        )}
      </section>

      {selected && (
        <div id="tipe-kamar" className="scroll-mt-24">
          {types.some((t) => t.rooms.length) ? (
            <RoomPicker key={selected.id} types={types} kost={{ id: selected.id, name: selected.name }} memberName={ctx.member.name} initialTypeId={tipe} initialRoomId={kamar} />
          ) : (
            <div className={card(false, "p-8 sm:p-12 text-center")}>
              <span className="w-14 h-14 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <BedDouble className="w-7 h-7" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">Semua kamar sedang terisi</h2>
              <p className="text-sm text-slate-600 mt-1 mb-6 max-w-md mx-auto">Pilih Kost lain, atau tanyakan jadwal kamar kosong berikutnya ke Admin Kost.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-2">
                <a
                  href={waKost(`Halo Admin Kost, saya ${ctx.member.name} ingin menanyakan ketersediaan kamar di ${selected.name}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={button("whatsapp", "md")}
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" /> Tanya Ketersediaan
                </a>
                <Link href="/dashboard/sewa" className={button("neutral", "md")}>
                  Pilih Kost lain <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, text, action }: { title: string; text: string; action: React.ReactNode }) {
  return (
    <div className={card(false, "p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5")}>
      <span className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0" aria-hidden="true">
        <BedDouble className="w-7 h-7" />
      </span>
      <div className="flex-1">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600 mt-1">{text}</p>
      </div>
      {action}
    </div>
  );
}
