// Skala & format angka chart (aman server/klien).
import { rupiah } from "@/lib/format";

export type Unit = "rupiah" | "count";

/** 12500000 → "12,5 jt" */
export const juta = (n: number) => (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt";

/** Teks sumbu/label (ringkas) atau nilai lengkap (tooltip/tabel). */
export const fmtShort = (unit: Unit, n: number) => (unit === "rupiah" ? (n ? juta(n) : "0") : n.toLocaleString("id-ID"));
export const fmtFull = (unit: Unit, n: number) => (unit === "rupiah" ? rupiah(n) : n.toLocaleString("id-ID"));

/** Tick bulat 0..top (≈4 interval, kelipatan 1/2/2,5/5 × 10^k). Hitungan → langkah bilangan bulat. */
export function niceTicks(max: number, integer: boolean, target = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  let step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  if (integer) step = Math.max(1, Math.ceil(step));
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}
