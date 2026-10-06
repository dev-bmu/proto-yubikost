// Helper murni Manajemen Kost — dipakai form klien (pratinjau) dan server action (validasi).

/** "Kost Casa Midville" → "kost-casa-midville" */
export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const COORD = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;
const MAPS = /^https:\/\/(www\.)?google\.[a-z.]+\/maps|^https:\/\/maps\.google\.[a-z.]+\//;

function coordEmbed(latRaw: string, lngRaw: string) {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
}

/**
 * Tautan Google Maps embed / kode <iframe> / koordinat "lat,lng" / tautan Maps biasa berisi "@lat,lng" → URL embed.
 * "" bila kosong, null bila tidak dikenali. Tautan Maps biasa (tanpa embed) tidak bisa tampil di iframe.
 */
export function toMapsEmbed(input: string): string | null {
  const raw = input.trim();
  if (!raw) return "";
  const c = raw.match(COORD);
  if (c) return coordEmbed(c[1]!, c[2]!);
  const url = (raw.match(/src=["']([^"']+)["']/)?.[1] ?? raw).replace(/&amp;/g, "&");
  if (!MAPS.test(url)) return null;
  if (/\/maps\/embed|[?&]output=embed/.test(url)) return url;
  const at = url.match(/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  return at ? coordEmbed(at[1]!, at[2]!) : null;
}

/** Nomor kamar: huruf/angka/tanda hubung, maks 10 karakter, disimpan huruf besar. */
export const normalizeRoomNumber = (s: string) => s.trim().toUpperCase();
export const isRoomNumber = (s: string) => /^[A-Z0-9][A-Z0-9-]{0,9}$/.test(s);

export const MAX_BULK = 100;

/** Ukuran tipe "3,5x4 m" ⇄ { length, width } */
export const formatSize = (length: number, width: number) =>
  `${String(length).replace(".", ",")}x${String(width).replace(".", ",")} m`;

export function parseSize(size: string) {
  const m = size.match(/([\d.,]+)\s*x\s*([\d.,]+)/i);
  return m ? { length: m[1]!.replace(",", "."), width: m[2]!.replace(",", ".") } : { length: "", width: "" };
}
