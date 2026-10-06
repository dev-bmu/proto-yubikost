// Tautan & template WhatsApp — PRD Lampiran A. Satu-satunya tempat nomor WA didefinisikan.
import { rupiah } from "./format";

export const WA = {
  general: process.env.NEXT_PUBLIC_WA_GENERAL_NUMBER || "6285187416505",
  kost: process.env.NEXT_PUBLIC_WA_KOST_NUMBER || "6285187416505",
};

const v = (s: string | number | undefined) => (s === undefined || s === "" ? "-" : String(s).trim());

export const waLink = (number: string, text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

/** WA-SRV — Ajukan Survey Lokasi */
export const waSurvey = (p: { name: string; kost: string; room: string }) =>
  waLink(WA.kost, `Halo Admin Kost, saya ${v(p.name)} tertarik dengan ${v(p.kost)} - Kamar ${v(p.room)}. Saya ingin janjian jadwal survey lokasi.`);

/** Notifikasi opsional setelah upload bukti di Dashboard (menggantikan WA-PAY). */
export const waPaymentNotice = (p: { name: string; kind: string; kost: string; room: string; amount: number; ref: string }) =>
  waLink(
    WA.kost,
    `Halo Admin Kost, saya ${v(p.name)} sudah mengunggah bukti pembayaran ${v(p.kind)} untuk ${v(p.kost)} - Kamar ${v(p.room)} sebesar ${rupiah(p.amount)} di Dashboard. (Ref: ${v(p.ref)})`,
  );

export const CC_TOPICS = ["sewa", "pembayaran", "informasi kost"] as const;
export type CcTopic = (typeof CC_TOPICS)[number];

/** WA-CC — Customer Care */
export const waCustomerCare = (p: { name: string; room: string; kost: string; topic: CcTopic }) =>
  waLink(WA.kost, `Halo Admin Customer Care, saya ${v(p.name)} dari Kamar ${v(p.room)} – ${v(p.kost)}. Saya ingin bertanya mengenai ${p.topic}: `);

/** WA-CRED — Kirim kredensial (dikirim admin ke nomor penghuni) */
export const waCredential = (p: { name: string; phone: string; password: string; siteUrl: string }) =>
  waLink(
    p.phone,
    `Halo ${v(p.name)}, akun Dashboard Brave Anda sudah aktif. Masuk di ${p.siteUrl}/?auth=masuk dengan Nomor WhatsApp ${v(p.phone)} dan kata sandi sementara ${p.password}. Anda akan diminta mengganti kata sandi saat pertama masuk.`,
  );

/** WA-RST — Lupa kata sandi */
export const waForgot = (phone: string) =>
  waLink(WA.kost, `Halo Admin Kost, saya pemilik akun Brave dengan nomor ${v(phone)}. Saya lupa kata sandi dan mohon bantuan reset.`);

/** WA-KOST — Konsultasi kost umum */
export const waKost = (text = "Halo Brave Brawijaya, saya tertarik dengan Kost di Malang.") => waLink(WA.kost, text);

/** WA-GEN — Konsultasi umum */
export const waGeneral = () => waLink(WA.general, "Halo Brave Brawijaya, saya tertarik konsultasi layanan Brave.");

/** Chat langsung ke nomor (dipakai admin ke prospect/penghuni) */
export const waChat = (phone: string, text = "") => `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
