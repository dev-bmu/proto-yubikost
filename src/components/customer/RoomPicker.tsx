"use client";
// Sewa Kamar langkah 2–3 (PRD §8.3, v1.2): pilih tipe kamar → pilih nomor kamar → panel pemesanan
// (tanggal check-in, paket, uang muka sesuai Ketentuan Kos Brave 17 Juli 2026).
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BedDouble, CalendarDays, Check, Clock, Layers, MessageCircle, MousePointerClick, Ruler } from "lucide-react";
import { createBooking } from "@/actions/customer";
import { logSurvey } from "@/actions/member";
import { Input, RadioCard } from "@/components/Field";
import { FacilityChips, Photo } from "@/components/media";
import { button, card, Notice, Pill, Spinner } from "@/components/ui";
import { bookingBill, DP_TIERS, dpOptions, HOLD_HOURS, MAX_CHECKIN_DAYS, PACKAGES } from "@/lib/constants";
import { addMonths, cn, daysUntil, formatDate, rupiah, todayIso, toIsoDate } from "@/lib/format";
import { waSurvey } from "@/lib/wa";
import { BookingTerms, inDays, RentBill, Row, StepHeading } from "./parts";

export type TypeOption = {
  id: string; name: string; size: string; monthlyPrice: number; facilities: string[]; photos: string[]; description: string;
  rooms: { id: string; number: string; floor: string }[];
};

const FLOW = ["Pilih Kost", "Pilih Tipe Kamar", "Pilih Nomor & Ajukan"];

/** Indikator langkah 1-2-3 di atas halaman; mengikuti ?tipe= yang ditulis RoomPicker. */
export function SewaSteps({ hasKost }: { hasKost: boolean }) {
  const tipe = useSearchParams().get("tipe");
  const step = !hasKost ? 0 : tipe ? 2 : 1;
  return (
    <ol aria-label="Langkah sewa kamar" className={card(false, "p-2 grid grid-cols-3 gap-1")}>
      {FLOW.map((label, i) => (
        <li
          key={label}
          aria-current={i === step ? "step" : undefined}
          className={cn("flex flex-col sm:flex-row items-center justify-center gap-2 px-2 py-3 rounded-xl text-center", i === step && "bg-primary-ultralight")}
        >
          <span
            className={cn(
              "w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center shrink-0",
              i < step ? "bg-primary text-white" : i === step ? "gradient-primary text-white ring-4 ring-primary/20" : "bg-slate-100 text-slate-500",
            )}
            aria-hidden="true"
          >
            {i < step ? <Check className="w-4 h-4" /> : i + 1}
          </span>
          <span className={cn("text-xs sm:text-sm font-bold", i === step ? "text-primary" : i < step ? "text-slate-800" : "text-slate-500")}>
            {label}
            <span className="sr-only">{i < step ? " (selesai)" : i === step ? " (langkah saat ini)" : ""}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function RoomPicker({
  types, kost, memberName, initialTypeId, initialRoomId,
}: { types: TypeOption[]; kost: { id: string; name: string }; memberName: string; initialTypeId?: string; initialRoomId?: string }) {
  const open = types.filter((t) => t.rooms.length);
  const initType = open.find((t) => t.id === initialTypeId) ?? (open.length === 1 ? open[0] : undefined);
  const [typeId, setTypeId] = useState(initType?.id ?? "");
  const [roomId, setRoomId] = useState(initType?.rooms.some((r) => r.id === initialRoomId) ? initialRoomId! : "");
  const type = types.find((t) => t.id === typeId);
  const room = type?.rooms.find((r) => r.id === roomId);
  const floors = type ? [...new Set(type.rooms.map((r) => r.floor))] : [];

  // Pilihan disimpan di query (?tipe=&kamar=, PRD §8.3) tanpa memuat ulang data server.
  useEffect(() => {
    const url = new URL(window.location.href);
    const sync = (key: string, value: string) => (value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    sync("tipe", typeId);
    sync("kamar", roomId);
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [typeId, roomId]);

  function pickType(id: string) {
    setTypeId(id);
    setRoomId("");
  }

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
      <div className="space-y-8 min-w-0">
        <section aria-labelledby="pilih-tipe">
          <StepHeading n={2} id="pilih-tipe" title="Pilih Tipe Kamar">
            Kamar bertipe sama memiliki ukuran, fasilitas, dan harga yang sama.
          </StepHeading>
          <ul className="grid sm:grid-cols-2 gap-5">
            {types.map((t) => (
              <li key={t.id}>
                <TypeCard type={t} selected={t.id === typeId} onSelect={() => pickType(t.id)} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="pilih-nomor">
          <StepHeading n={3} id="pilih-nomor" title="Pilih Nomor Kamar">
            {type ? `${type.rooms.length} kamar tipe ${type.name} tersedia.` : "Pilih tipe kamar terlebih dahulu."}
          </StepHeading>
          {!type ? (
            <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 text-center text-sm text-slate-500">
              <MousePointerClick className="w-6 h-6 mx-auto mb-2 text-slate-400" aria-hidden="true" />
              Nomor kamar muncul setelah Anda memilih tipe.
            </div>
          ) : (
            <div className={card(false, "p-5 space-y-5")}>
              {floors.map((floor) => (
                <div key={floor}>
                  <p id={`lantai-${floor}`} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    <Layers className="w-3.5 h-3.5" aria-hidden="true" /> Lantai {floor}
                  </p>
                  <div role="radiogroup" aria-labelledby={`lantai-${floor}`} className="flex flex-wrap gap-2">
                    {type.rooms.filter((r) => r.floor === floor).map((r) => (
                      <label
                        key={r.id}
                        className={cn(
                          "relative min-w-20 min-h-12 px-4 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 text-sm font-bold cursor-pointer transition-colors",
                          "border-slate-200 text-slate-800 hover:border-primary/50",
                          "has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 has-[:focus-visible]:ring-offset-2",
                        )}
                      >
                        <input type="radio" name="room" value={r.id} checked={roomId === r.id} onChange={() => setRoomId(r.id)} className="sr-only" />
                        {roomId === r.id && <Check className="w-4 h-4" aria-hidden="true" />}
                        {r.number}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="xl:sticky xl:top-24" aria-label="Panel pemesanan">
        <BookingPanel kost={kost} type={type} room={room} memberName={memberName} />
      </aside>
    </div>
  );
}

function TypeCard({ type: t, selected, onSelect }: { type: TypeOption; selected: boolean; onSelect: () => void }) {
  const [active, setActive] = useState(0);
  const full = t.rooms.length === 0;
  const photos = t.photos.length ? t.photos : [""];
  return (
    <article className={card(false, cn("h-full flex flex-col overflow-hidden", selected && "ring-2 ring-primary border-primary", full && "opacity-75"))}>
      <div className="relative aspect-[16/10] bg-slate-100">
        <Photo src={photos[active]} alt={`Foto ${active + 1} kamar tipe ${t.name}`} sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" />
        <Pill solid tone={full ? "danger" : "success"} className="absolute top-3 left-3">{full ? "Penuh" : `${t.rooms.length} kamar tersedia`}</Pill>
        {selected && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-primary text-xs font-bold shadow-lg">
            <Check className="w-3.5 h-3.5" aria-hidden="true" /> Dipilih
          </span>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 px-4 pt-3" role="group" aria-label={`Foto kamar tipe ${t.name}`}>
          {photos.map((p, i) => (
            <button
              key={p + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Tampilkan foto ${i + 1}`}
              aria-pressed={active === i}
              className={cn("relative w-16 aspect-[4/3] rounded-lg overflow-hidden border-2 transition-colors", active === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100")}
            >
              <Photo src={p} alt="" sizes="64px" />
            </button>
          ))}
        </div>
      )}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold text-slate-900">{t.name}</h3>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Ruler className="w-3.5 h-3.5" aria-hidden="true" /> {t.size}
            </p>
          </div>
          <p className="text-right shrink-0">
            <span className="text-xl font-extrabold text-primary tracking-tight tabular-nums">{rupiah(t.monthlyPrice)}</span>
            <span className="block text-xs text-slate-500">/bulan</span>
          </p>
        </div>
        {t.description && <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{t.description}</p>}
        <FacilityChips items={t.facilities} max={5} />
        <button
          type="button"
          onClick={onSelect}
          disabled={full}
          aria-pressed={selected}
          className={button(selected ? "primary" : "neutral", "md", "w-full mt-auto")}
        >
          {full ? "Kamar penuh" : selected ? <><Check className="w-4 h-4" aria-hidden="true" /> Tipe dipilih</> : `Pilih tipe ${t.name}`}
        </button>
      </div>
    </article>
  );
}

/** Check-in paling jauh: hari ini + masa berlaku uang muka terpanjang. */
function lastCheckIn() {
  const d = new Date();
  d.setDate(d.getDate() + MAX_CHECKIN_DAYS);
  return toIsoDate(d);
}

function BookingPanel({
  kost, type, room, memberName,
}: { kost: { id: string; name: string }; type?: TypeOption; room?: TypeOption["rooms"][number]; memberName: string }) {
  const router = useRouter();
  const today = todayIso();
  const [startDate, setStartDate] = useState(today);
  const [months, setMonths] = useState<number>(PACKAGES[0]);
  const [dpPct, setDpPct] = useState<number>(DP_TIERS[0].pct);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [surveyed, setSurveyed] = useState(false);

  // Masa berlaku uang muka harus mencakup tanggal check-in (Ketentuan Kos Brave): check-in jauh → uang muka lebih besar.
  const last = lastCheckIn();
  const days = startDate ? daysUntil(startDate) : NaN;
  const dateOk = days >= 0 && days <= MAX_CHECKIN_DAYS;
  const eligible = dateOk ? dpOptions(days) : [];
  const tier = DP_TIERS.find((t) => t.pct === dpPct) ?? DP_TIERS[0];

  function pickDate(value: string) {
    setStartDate(value);
    setError(null);
    const min = value ? dpOptions(daysUntil(value))[0] : undefined;
    if (min) setDpPct(min.pct);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!room) return;
    setBusy(true);
    setError(null);
    const r = await createBooking({ roomId: room.id, startDate, months, dpPct }).catch(() => ({ ok: false as const, error: "Gagal terhubung ke server. Coba lagi.", field: undefined, code: undefined }));
    if (r.ok) {
      router.push("/dashboard/pembayaran");
      router.refresh();
      return;
    }
    setBusy(false);
    setError({ text: r.error, field: r.field });
    if (r.code === "TAKEN" || r.code === "HAS_BOOKING") router.refresh();
  }

  const header = (
    <div className="on-purple gradient-hero px-5 py-4 text-white">
      <p className="text-xs font-semibold text-white">Ringkasan pesanan</p>
      <p className="font-extrabold text-lg leading-tight">{room ? `Kamar ${room.number}` : kost.name}</p>
      <p className="text-sm text-white">{room && type ? `${type.name} · Lantai ${room.floor} · ${kost.name}` : "Pilih tipe & nomor kamar"}</p>
    </div>
  );

  if (!type || !room) {
    return (
      <div className={card(false, "overflow-hidden")}>
        {header}
        <div className="p-6 text-center">
          <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3" aria-hidden="true">
            <BedDouble className="w-6 h-6" />
          </span>
          <p className="text-sm text-slate-600">{type ? "Pilih nomor kamar untuk melihat rincian biaya." : "Pilih tipe dan nomor kamar untuk melihat rincian biaya."}</p>
        </div>
      </div>
    );
  }

  const bill = bookingBill(type.monthlyPrice, months, dpPct);
  return (
    <form onSubmit={submit} noValidate className={card(false, "overflow-hidden")}>
      {header}
      <div className="p-5 space-y-5">
        <Input
          label="Tanggal check-in"
          type="date"
          required
          min={today}
          max={last}
          value={startDate}
          onChange={(e) => pickDate(e.target.value)}
          hint={`Paling lambat ${formatDate(last)} (${MAX_CHECKIN_DAYS} hari dari hari ini).`}
          error={error?.field === "startDate" ? error.text : dateOk ? undefined : `Pilih tanggal antara hari ini dan ${formatDate(last)}.`}
        />
        <fieldset>
          <legend className="block text-xs font-semibold text-slate-600 mb-1.5">Paket sewa *</legend>
          <div className="grid grid-cols-2 gap-2">
            {PACKAGES.map((n) => (
              <RadioCard key={n} name="months" value={String(n)} checked={months === n} onChange={() => setMonths(n)} className="p-3">
                <span className="block font-bold text-slate-900">{n} Bulan</span>
                <span className="block text-xs text-slate-500 tabular-nums">{rupiah(type.monthlyPrice * n)}</span>
              </RadioCard>
            ))}
          </div>
          {error?.field === "months" && <p className="mt-1 text-xs text-red-600" role="alert">{error.text}</p>}
        </fieldset>
        <fieldset aria-describedby="dp-info">
          <legend className="block text-xs font-semibold text-slate-600 mb-1.5">Uang muka *</legend>
          <div className="space-y-2">
            {DP_TIERS.map((t) => {
              const ok = eligible.some((o) => o.pct === t.pct);
              return (
                <label
                  key={t.pct}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 text-sm transition-colors",
                    ok
                      ? "cursor-pointer hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary-ultralight has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40"
                      : "bg-slate-50 text-slate-500 cursor-not-allowed",
                  )}
                >
                  <input
                    type="radio"
                    name="dpPct"
                    value={t.pct}
                    checked={dpPct === t.pct}
                    disabled={!ok}
                    onChange={() => setDpPct(t.pct)}
                    className="w-4 h-4 accent-primary shrink-0"
                  />
                  <span className="flex-1 min-w-0">
                    <span className={ok ? "text-slate-700" : undefined}>
                      <strong className={cn("font-bold", ok && "text-slate-900")}>{t.pct}%</strong> ·{" "}
                      <span className="tabular-nums">{rupiah(bookingBill(type.monthlyPrice, months, t.pct).dp)}</span> · berlaku {t.days} hari
                    </span>
                    {!ok && dateOk && <span className="block text-xs">Tidak tersedia: check-in lebih dari {t.days} hari lagi</span>}
                  </span>
                </label>
              );
            })}
          </div>
          <p id="dp-info" className="mt-1.5 text-xs text-slate-500" aria-live="polite">
            {dateOk ? `Check-in ${inDays(startDate)}: uang muka minimal ${eligible[0].pct}%.` : "Pilih tanggal check-in yang valid untuk memilih uang muka."}
          </p>
          {error?.field === "dpPct" && <p className="mt-1 text-xs text-red-600" role="alert">{error.text}</p>}
        </fieldset>
        <dl className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <Row
            label={<span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" aria-hidden="true" /> Masa sewa</span>}
            value={dateOk ? `${formatDate(startDate, "short")} – ${formatDate(addMonths(startDate, months), "short")}` : "-"}
          />
          <RentBill info={{ stage: "DP", status: "MENUNGGU_PEMBAYARAN", months, monthlyPrice: type.monthlyPrice, dpPct, bill, paid: 0, due: bill.dp }} />
        </dl>
        <p className="flex items-start gap-2 text-xs text-slate-600">
          <Clock className="w-4 h-4 shrink-0 text-amber-700" aria-hidden="true" />
          Kamar ditahan {HOLD_HOURS} jam untuk pembayaran uang muka; setelah diverifikasi kamar ditahan sampai {tier.days} hari sejak pembayaran.
        </p>
        <BookingTerms />
        {error && !["startDate", "months", "dpPct"].includes(error.field ?? "") && (
          <Notice tone="danger">
            <span role="alert">{error.text}</span>
          </Notice>
        )}
        <button type="submit" disabled={busy} aria-busy={busy} className={button("primary", "lg", "w-full")}>
          {busy && <Spinner />} Ajukan Sewa & Bayar Uang Muka
        </button>

        <div className="pt-4 border-t border-slate-100 space-y-2">
          <a
            href={waSurvey({ name: memberName, kost: kost.name, room: room.number })}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setSurveyed(true);
              void logSurvey({ kostId: kost.id, roomId: room.id }).catch(() => {});
            }}
            className={button("neutral", "md", "w-full")}
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" aria-hidden="true" /> Ajukan Survey Lokasi
          </a>
          <p className="text-xs text-slate-500 text-center" role="status">
            {surveyed ? "Permintaan survey tercatat. Lanjutkan jadwal di WhatsApp." : "Opsional — survey tidak menahan kamar."}
          </p>
        </div>
      </div>
    </form>
  );
}
