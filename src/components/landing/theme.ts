// Gaya halaman publik v1.3: font display = Red Hat Display (font wordmark logo yubikost) + dua gaya tombol.
// Token warna di globals.css (paper/sand = latar putih & abu terang, ink = navy logo, brand = ungu-biru logo).
import { Red_Hat_Display } from "next/font/google";

/** Sans display untuk judul (sama dengan wordmark logo). Pasang `display.variable` di pembungkus agar utilitas `font-display` aktif. */
export const display = Red_Hat_Display({ subsets: ["latin"], variable: "--font-redhat", display: "swap" });

const pill = "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200 cursor-pointer shadow-none hover:shadow-none";
/** Tombol utama: navy logo penuh. */
export const inkBtn = `${pill} bg-ink text-paper hover:bg-ink/85`;
/** Tombol sekunder: garis navy, terisi saat hover. */
export const lineBtn = `${pill} border border-ink bg-transparent text-ink hover:bg-ink hover:text-paper`;
