// Konstanta domain bersama (aman untuk klien & server).

export const PACKAGES = [1, 3, 6, 12] as const;

export const PROFILE_RELATIONS = ["Ayah", "Ibu", "Wali", "Saudara Kandung", "Lainnya"];

export const KOST_TYPES = ["Putra", "Putri", "Campur"] as const;

/** Kode referensi pembayaran: "pay-1a2b3c4d" → "1A2B3C4D" */
export const paymentRef = (id: string) => id.replace(/^pay-/, "").toUpperCase();

/** Deposit sewa pertama = 1 × harga kamar per bulan (PRD K-15). Kamar ditahan 24 jam setelah pesanan (K-16). */
export const DEPOSIT_MONTHS = 1;
export const HOLD_HOURS = 24;

export const BOOKING_STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  MENUNGGU_PEMBAYARAN: { label: "Menunggu Pembayaran", tone: "warning" },
  MENUNGGU_VERIFIKASI: { label: "Menunggu Verifikasi", tone: "info" },
  DISETUJUI: { label: "Disetujui", tone: "success" },
  DIBATALKAN: { label: "Dibatalkan", tone: "neutral" },
  KEDALUWARSA: { label: "Kedaluwarsa", tone: "neutral" },
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  MENUNGGU_VERIFIKASI: { label: "Menunggu Verifikasi", tone: "info" },
  DISETUJUI: { label: "Disetujui", tone: "success" },
  DITOLAK: { label: "Ditolak", tone: "danger" },
};

export const PAYMENT_KIND_LABEL: Record<string, string> = { SEWA_BARU: "Sewa Baru", PERPANJANGAN: "Perpanjangan" };

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
export const DEPOSIT = "1 Bulan";

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

/** Tagihan sewa pertama: sewa × paket + deposit (dihitung sama di klien & server). */
export function bookingBill(monthlyPrice: number, months: number) {
  const rent = monthlyPrice * months;
  const deposit = monthlyPrice * DEPOSIT_MONTHS;
  return { rent, deposit, total: rent + deposit };
}
