// Helper format & tanggal. Aman dipakai di server maupun klien.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const rupiah = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

/** "2026-10-02" | ISO → "2 Oktober 2026" (long) / "2 Okt 2026" (short) */
export function formatDate(value: string, style: "long" | "short" = "long") {
  if (!value) return "-";
  const d = new Date(value.length === 10 ? value + "T00:00:00" : value);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: style === "long" ? "long" : "short", year: "numeric" });
}

export const todayIso = () => toIsoDate(new Date());

export function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Tambah N bulan kalender; bila tanggal tidak ada di bulan tujuan, pakai hari terakhir (PRD §8.4). */
export function addMonths(isoDate: string, months: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  return toIsoDate(target);
}

/** Selisih hari kalender dari hari ini ke tanggal (negatif = lewat). */
export function daysUntil(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - today) / 86_400_000);
}

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

/** Status sewa berdasarkan jatuh tempo, ambang H-14 (PRD §8.3, K-10). */
export function leaseStatus(dueDate: string): { label: string; tone: Tone; days: number } {
  const days = daysUntil(dueDate);
  if (days < 0) return { label: `Lewat Jatuh Tempo · ${-days} hari`, tone: "danger", days };
  if (days <= 14) return { label: `Segera Jatuh Tempo · ${days} hari lagi`, tone: "warning", days };
  return { label: "Aktif", tone: "success", days };
}

/** "08xx", "+62xx", "62xx" → "62xx" (hanya digit). Kosong bila tidak valid. */
export function normalizePhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  if (digits.startsWith("8")) digits = "62" + digits;
  return /^62\d{8,13}$/.test(digits) ? digits : "";
}

/** "6285187416505" → "0851-8741-6505" */
export function formatPhone(phone: string) {
  const local = phone.startsWith("62") ? "0" + phone.slice(2) : phone;
  return local.replace(/^(\d{4})(\d{4})(\d+)$/, "$1-$2-$3");
}

/** "3507123456780001" → "3507••••••••0001" */
export const maskNik = (nik: string) => (nik.length === 16 ? nik.slice(0, 4) + "•".repeat(8) + nik.slice(12) : "••••");

/** "6281234561234" → "0812-xxxx-1234" untuk tabel admin */
export const maskPhone = (phone: string) => formatPhone(phone).replace(/-(\d{4})-/, "-xxxx-");

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

export const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

/** ISO → "3 Okt 2026, 10.20" (zona waktu server/peramban) — untuk batas bayar & waktu kirim bukti. */
export function formatDateTime(iso: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
