// Potongan tampilan tabel Finance (tanpa state; aman di Server & Client Component).
// Tanggal diformat manual dalam WIB agar render server & peramban identik (tanpa beda zona waktu / data ICU).
import type { ReactNode } from "react";
import { ExternalLink, FileSearch } from "lucide-react";
import { button, Pill } from "@/components/ui";
import type { Tone } from "@/lib/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const pad = (n: number) => String(n).padStart(2, "0");
const wib = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3_600_000);

/** "2026-10-08" → "8 Okt 2026" */
export const day = (isoDate: string) =>
  isoDate ? `${Number(isoDate.slice(8, 10))} ${MONTHS[Number(isoDate.slice(5, 7)) - 1]} ${isoDate.slice(0, 4)}` : "-";

/** ISO → "8 Okt 2026, 10.20" (WIB) */
export function dateTime(iso: string) {
  if (!iso) return "-";
  const d = wib(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}.${pad(d.getUTCMinutes())}`;
}

/** Tanggal + jam WIB dalam dua baris (kolom tabel ringkas). */
export function Stamp({ iso, children }: { iso: string; children?: ReactNode }) {
  const [date, time] = dateTime(iso).split(", ");
  return (
    <>
      <p className="whitespace-nowrap">{date}</p>
      {time && <p className="text-xs text-slate-500 whitespace-nowrap">{time} WIB</p>}
      {children}
    </>
  );
}

/** ISO → "08/10" (WIB) */
export const dayMonth = (iso: string) => {
  const d = wib(iso);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
/** Kunci urut nomor dokumen: "INV-BRAVE-X-2026-0001" → "2026-10-0001" (bulan romawi tidak urut secara abjad). */
export function docKey(no: string) {
  const m = /-([IVX]+)-(\d{4})-(\d+)$/.exec(no);
  return m ? `${m[2]}-${pad(ROMAN.indexOf(m[1]) + 1)}-${m[3]}` : no;
}

/** Sisa waktu ke batas: "5 jam lagi", "13 hari lagi", "lewat 20 menit". */
export function relative(iso: string) {
  const min = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  const a = Math.abs(min);
  const text = a < 60 ? `${a} menit` : a < 48 * 60 ? `${Math.round(a / 60)} jam` : `${Math.round(a / 1440)} hari`;
  return min < 0 ? `lewat ${text}` : `${text} lagi`;
}

/** Kelompok jenis pembayaran untuk filter: Uang Muka / Pelunasan / Perpanjangan / Sewa Baru (data lama). */
export const kindGroup = (r: { kind: string; stage: string }) =>
  r.kind === "PERPANJANGAN" ? "Perpanjangan" : r.stage === "PELUNASAN" ? "Pelunasan" : r.stage === "DP" ? "Uang Muka" : "Sewa Baru (lama)";
export const KIND_OPTIONS = ["Uang Muka", "Pelunasan", "Perpanjangan", "Sewa Baru (lama)"].map((v) => ({ value: v, label: v }));

/** Pill jenis pembayaran dari paymentLabel(): sewa baru (uang muka/pelunasan) ungu, perpanjangan abu. */
export function KindPill({ label }: { label: string }) {
  return <Pill tone={label === "Perpanjangan" ? "neutral" : "info"}>{label}</Pill>;
}

export function StatusPill({ map, value }: { map: Record<string, { label: string; tone: Tone }>; value: string }) {
  const s = map[value];
  return s ? <Pill tone={s.tone}>{s.label}</Pill> : <span className="text-slate-500">-</span>;
}

export function Place({ room, kost }: { room: string; kost: string }) {
  return (
    <>
      <p className="font-semibold text-slate-800 whitespace-nowrap">Kamar {room}</p>
      <p className="text-xs text-slate-500">{kost}</p>
    </>
  );
}

/** "Sudah diekspor dd/mm" / "Belum diekspor" (impor Accurate). */
export function Exported({ at }: { at: string }) {
  return at ? <Pill tone="success">Sudah diekspor {dayMonth(at)}</Pill> : <Pill tone="warning">Belum diekspor</Pill>;
}

/** Tombol buka bukti transfer (tab baru, rute privat /admin/bukti). */
export function ProofLink({ id, name }: { id: string; name: string }) {
  return (
    <a
      href={`/admin/bukti/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={button("neutral", "sm", "min-h-11 sm:min-h-9 whitespace-nowrap")}
      aria-label={`Lihat bukti transfer ${name} (tab baru)`}
    >
      <FileSearch className="w-4 h-4" aria-hidden="true" /> Bukti <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
    </a>
  );
}
