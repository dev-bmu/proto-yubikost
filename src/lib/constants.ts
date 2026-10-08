// Konstanta domain bersama (aman untuk klien & server).

export const PACKAGES = [1, 3, 6, 12] as const;

export const PROFILE_RELATIONS = ["Ayah", "Ibu", "Wali", "Saudara Kandung", "Lainnya"];

export const KOST_TYPES = ["Putra", "Putri", "Campur"] as const;

/** Kode referensi pembayaran: "pay-1a2b3c4d" → "1A2B3C4D" */
export const paymentRef = (id: string) => id.replace(/^pay-/, "").toUpperCase();

/** Kamar ditahan 24 jam setelah pesanan untuk pembayaran uang muka (K-16). */
export const HOLD_HOURS = 24;

// ── Uang muka & deposit (Ketentuan dan Tata Tertib Kos Brave per 17 Juli 2026) ──
/** Uang muka (DP) minimal & masa berlakunya sejak DP dibayar. Pelunasan + deposit dibayar saat check-in. */
export const DP_TIERS = [
  { pct: 25, days: 13 },
  { pct: 50, days: 20 },
  { pct: 100, days: 28 },
] as const;
export type DpPct = (typeof DP_TIERS)[number]["pct"];
/** Check-in paling jauh = masa berlaku DP terpanjang. */
export const MAX_CHECKIN_DAYS = DP_TIERS[DP_TIERS.length - 1].days;
/** Deposit kos bulanan, dibayar saat check-in bersama pelunasan. */
export const DEPOSIT_AMOUNT = 200_000;

/** DP yang boleh dipilih bila check-in N hari lagi: masa berlaku DP harus mencakup tanggal check-in. */
export const dpOptions = (daysToCheckIn: number) => DP_TIERS.filter((t) => daysToCheckIn <= t.days);

/** Rincian tagihan sewa baru (dihitung sama di klien & server). settle = sisa sewa + deposit, dibayar saat check-in. */
export function bookingBill(monthlyPrice: number, months: number, dpPct: number) {
  const rent = monthlyPrice * months;
  const dp = Math.round((rent * dpPct) / 100);
  const deposit = DEPOSIT_AMOUNT;
  return { rent, dp, deposit, settle: rent - dp + deposit, total: rent + deposit };
}

export const DP_TERMS = [
  "Uang muka minimal 25% dari total sewa, berlaku 13 hari sejak dibayar. Uang muka 50% berlaku 20 hari, 100% berlaku 28 hari.",
  "Tanggal check-in harus masih dalam masa berlaku uang muka. Sisa sewa dan deposit dilunasi saat check-in.",
  "Refund 100% uang muka bila pembatalan dikonfirmasi paling lambat 3 hari sejak pembayaran; refund 50% bila paling lambat 8 hari. Lewat dari itu uang muka tidak dapat di-refund.",
];

export const DEPOSIT_TERMS = [
  "Deposit Rp 200.000 dibayar saat check-in bersama pelunasan sewa.",
  "Kembali 100% setelah masa sewa berakhir bila semua barang lengkap dan tidak rusak.",
  "Kembali 50% bila sprei, bantal, guling, lampu, keset, tong sampah, rak sepatu, cermin, atau set kunci rusak/hilang, atau kamar mandi dalam ditinggalkan kotor.",
  "Hangus bila kursi atau meja rusak/hilang. Kerusakan barang lain diganti senilai harga per unit.",
];

/** Tahap pesanan: DP (uang muka) → PELUNASAN (sisa sewa + deposit saat check-in). */
export const BOOKING_STAGE_LABEL: Record<string, string> = { DP: "Uang Muka", PELUNASAN: "Pelunasan" };

export const BOOKING_STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  MENUNGGU_PEMBAYARAN: { label: "Menunggu Pembayaran", tone: "warning" },
  MENUNGGU_VERIFIKASI: { label: "Menunggu Verifikasi", tone: "info" },
  DISETUJUI: { label: "Disetujui", tone: "success" },
  DIBATALKAN: { label: "Dibatalkan", tone: "neutral" },
  KEDALUWARSA: { label: "Kedaluwarsa", tone: "neutral" },
};

/** Label status pesanan menurut tahap: "Menunggu Uang Muka", "DP Diterima · Menunggu Pelunasan", dst. */
export function bookingStatusLabel(b: { stage: string; status: string }) {
  if (b.status === "MENUNGGU_PEMBAYARAN") return b.stage === "PELUNASAN" ? "DP Diterima · Menunggu Pelunasan" : "Menunggu Uang Muka";
  if (b.status === "MENUNGGU_VERIFIKASI") return b.stage === "PELUNASAN" ? "Verifikasi Pelunasan" : "Verifikasi Uang Muka";
  return BOOKING_STATUS[b.status]?.label ?? b.status;
}

export const PAYMENT_STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  MENUNGGU_VERIFIKASI: { label: "Menunggu Verifikasi", tone: "info" },
  DISETUJUI: { label: "Disetujui", tone: "success" },
  DITOLAK: { label: "Ditolak", tone: "danger" },
};

export const PAYMENT_KIND_LABEL: Record<string, string> = { SEWA_BARU: "Sewa Baru", PERPANJANGAN: "Perpanjangan" };

/** Label pembayaran: "Uang Muka 25%", "Pelunasan", "Perpanjangan"; data lama tanpa tahap = "Sewa Baru". */
export const paymentLabel = (p: { kind: string; stage: string; dpPct?: number }) =>
  p.kind === "PERPANJANGAN"
    ? "Perpanjangan"
    : p.stage === "PELUNASAN"
      ? "Pelunasan"
      : p.stage === "DP"
        ? `Uang Muka${p.dpPct ? ` ${p.dpPct}%` : ""}`
        : "Sewa Baru";

export const INVOICE_STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  BELUM_LUNAS: { label: "Belum Dibayar", tone: "warning" },
  SEBAGIAN: { label: "Dibayar Sebagian", tone: "info" },
  LUNAS: { label: "Lunas", tone: "success" },
  BATAL: { label: "Batal", tone: "neutral" },
};

// ── Penomoran dokumen Accurate (sementara, PRD §9.10) ──
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
/** "INV" + "2026-10-08" + 1 → "INV-BRAVE-X-2026-0001". Counter direset tiap bulan. */
export const docNumber = (prefix: "INV" | "RCP", isoDate: string, counter: number) =>
  `${prefix}-BRAVE-${ROMAN[Number(isoDate.slice(5, 7)) - 1]}-${isoDate.slice(0, 4)}-${String(counter).padStart(4, "0")}`;
/** Prefix bulan untuk mencari counter terakhir: "INV-BRAVE-X-2026-" */
export const docPrefix = (prefix: "INV" | "RCP", isoDate: string) => docNumber(prefix, isoDate, 0).slice(0, -4);
/** ID pelanggan Accurate (sementara): "C.YK0001". */
export const customerNo = (counter: number) => `C.YK${String(counter).padStart(4, "0")}`;

export const INQUIRY_STATUSES = ["NEW", "CONTACTED", "CLOSED_WON", "CLOSED_LOST"] as const;

/** Pilihan fasilitas (checkbox) — gedung & tipe kamar. Ikon di components/media.tsx facilityMeta. */
export const BUILDING_FACILITIES = [
  "WiFi", "CCTV 24 Jam", "Akses Kartu", "Security 24 Jam", "Parkir Motor", "Parkir Mobil", "Dapur Bersama",
  "Laundry", "Ruang Tamu", "Jemuran", "Taman", "Rooftop", "Gym", "Mushola",
];
export const ROOM_FACILITIES = [
  "AC", "Kipas Angin", "Kamar Mandi Dalam", "Water Heater", "Kasur", "Lemari", "Meja Belajar", "Kursi",
  "TV", "Kulkas", "Balkon", "Jendela Luar", "Dapur Pribadi",
];

/** Kebijakan global sampai K-12 diputuskan */
export const MIN_CONTRACT = "1 Bulan";
export const DEPOSIT = "Rp 200.000";

export const KOST_RULES = [
  {
    category: "Umum",
    items: [
      "Mengisi surat pernyataan dan menyerahkan salinan identitas (KTP/Kartu Pelajar/KTM/KK) kepada MinBrave saat check-in.",
      "Penghuni berstatus pasangan suami istri wajib menyerahkan salinan Kartu Keluarga atau buku nikah saat check-in.",
      "Penghuni wajib menjaga kebersihan, ketertiban, keamanan, dan kenyamanan bersama.",
      "Penghuni wajib menjaga kelengkapan fasilitas utama, bersama, dan fasilitas lainnya.",
    ],
  },
  {
    category: "Khusus",
    items: [
      "Menjaga kerapian dan melepas alas kaki ketika memasuki rumah kos.",
      "Tidak menjemur pakaian di area yang bukan semestinya.",
      "Tidak mencoret, merusak, mengganti cat, atau menempel objek pada dinding, pintu, dan perabot.",
      "Melaporkan setiap kendala, kerusakan, atau gangguan kepada MinBrave.",
      "Menggunakan listrik dan air secara hemat; tidak memodifikasi instalasi listrik tanpa izin.",
      "Selalu mengunci pagar dan pintu akses luar saat masuk atau keluar.",
      "Tidak merokok di dalam kamar atau area tertutup.",
      "Dilarang membawa atau mengonsumsi minuman keras, obat terlarang, dan barang ilegal.",
      "Kunjungan tamu wajib dilaporkan ke MinBrave paling lambat 24 jam sebelumnya; batas kunjungan pukul 22.00 WIB.",
      "Dilarang memelihara hewan peliharaan tanpa izin MinBrave.",
    ],
  },
  {
    category: "Sanksi & Pelanggaran",
    items: [
      "Melanggar ketentuan inap tanpa izin dikenakan denda Rp150.000 per malam per orang.",
      "Merusak atau menghilangkan fasilitas wajib mengganti senilai fasilitas.",
      "Kamar mandi dalam kotor saat masa sewa berakhir: deposit dikembalikan 50%.",
      "Melebihi batas check-out lebih dari 2 minggu dianggap memperpanjang sewa 1 bulan penuh.",
    ],
  },
  {
    category: "Ketentuan Lain-lain",
    items: [
      "Tidak boleh menyewakan atau mengalihkan kamar kepada pihak lain tanpa izin.",
      "Tata tertib berlaku sejak pembayaran uang muka atau sejak mulai menempati kamar.",
      "Hal yang belum diatur dapat ditetapkan manajemen sewaktu-waktu demi ketertiban dan keamanan.",
    ],
  },
];

