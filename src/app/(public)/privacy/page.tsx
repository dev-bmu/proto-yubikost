// Kebijakan Privasi sesuai UU No. 27/2022 PDP (PRD SEC-06, SEC-07). Draf prototype — perlu ditinjau Legal.
import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle, LegalContact } from "@/components/catalog/LegalArticle";
import { maskNik } from "@/lib/format";

export const metadata: Metadata = { title: "Kebijakan Privasi" };

const DATA = [
  { group: "Data akun", items: "Nama lengkap, Nomor WhatsApp, email (opsional), dan kata sandi (disimpan dalam bentuk hash)." },
  { group: "Identitas Penghuni", items: "Nama sesuai KTP, NIK, alamat sesuai KTP, dan foto KTP." },
  { group: "Data akademik/pekerjaan", items: "Status pekerjaan, institusi atau kampus, fakultas, dan program studi." },
  { group: "Kontak darurat", items: "Nama, Nomor WhatsApp, dan hubungan wali atau keluarga." },
  { group: "Data layanan", items: "Riwayat minat kamar dan survey, data sewa, perpanjangan, pembayaran beserta bukti transfernya, serta waktu persetujuan Anda." },
];

export default function PrivacyPage() {
  return (
    <LegalArticle
      crumb="Kebijakan Privasi"
      title="Kebijakan Privasi"
      intro="Kami menghormati data pribadi Anda. Kebijakan ini menjelaskan data apa yang kami kumpulkan, untuk apa, bagaimana kami melindunginya, dan hak Anda sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi."
    >
      <p>
        Brave Brawijaya, pengelola yubikost by BRAVE (&quot;Kami&quot;), bertindak sebagai Pengendali Data Pribadi atas data yang Anda berikan
        saat mendaftar, memesan kamar, mengajukan survey, dan memakai Dashboard Customer.
      </p>

      <h2>1. Data yang Kami Kumpulkan</h2>
      <ul>
        {DATA.map((d) => (
          <li key={d.group}>
            <strong>{d.group}:</strong> {d.items}
          </li>
        ))}
      </ul>

      <h2>2. Dasar & Persetujuan</h2>
      <p>
        Kami memproses data berdasarkan persetujuan eksplisit Anda, yang diberikan melalui kotak centang saat mendaftar dan saat mengisi biodata.
        Waktu persetujuan dicatat. Pemrosesan juga dilakukan untuk melaksanakan perjanjian sewa dan memenuhi kewajiban hukum.
      </p>

      <h2>3. Tujuan Penggunaan</h2>
      <ul>
        <li>Membuat dan mengelola akun serta menampilkan detail kamar.</li>
        <li>Menghubungi Anda terkait survey lokasi, sewa, perpanjangan, dan pembayaran melalui WhatsApp.</li>
        <li>Memverifikasi identitas Penghuni dan menjaga keamanan lingkungan Kost.</li>
        <li>Menghubungi kontak darurat bila terjadi keadaan mendesak.</li>
        <li>Administrasi sewa, pencatatan pembayaran, dan peningkatan layanan.</li>
      </ul>
      <p>Kami tidak menjual data pribadi Anda dan tidak memakainya untuk iklan pihak ketiga.</p>

      <h2>4. Penyimpanan & Keamanan</h2>
      <ul>
        <li>
          <strong>Foto KTP</strong> disimpan di penyimpanan privat yang tidak dapat diakses publik dan hanya dapat dibuka oleh admin berwenang.
        </li>
        <li>
          <strong>NIK</strong> ditampilkan tersamar, misalnya <span className="font-mono tabular-nums">{maskNik("3573010101010001")}</span>. NIK
          lengkap hanya dapat dibuka oleh admin berwenang dan setiap pembukaan dicatat dalam log audit.
        </li>
        <li>
          <strong>Bukti pembayaran</strong> disimpan privat dan hanya dapat dibuka oleh admin yang berwenang memverifikasi pembayaran.
        </li>
        <li>Akses data dibatasi sesuai peran admin. Kata sandi disimpan dalam bentuk hash, bukan teks asli.</li>
        <li>Saat Anda menekan tombol WhatsApp, percakapan berlangsung di layanan WhatsApp yang tunduk pada kebijakan privasinya sendiri.</li>
      </ul>

      <h2>5. Berbagi Data</h2>
      <p>
        Data hanya diakses oleh tim pengelola Brave yang berwenang. Kami membagikan data kepada pihak lain hanya bila diwajibkan peraturan
        perundang-undangan atau atas permintaan resmi aparat yang berwenang.
      </p>

      <h2>6. Retensi Data</h2>
      <ul>
        <li>Data akun disimpan selama akun Anda aktif.</li>
        <li>
          <strong>Foto KTP dihapus paling lambat 12 bulan setelah masa sewa terakhir Anda berakhir.</strong>
        </li>
        <li>Catatan transaksi disimpan selama diwajibkan ketentuan hukum dan perpajakan, lalu dihapus atau dianonimkan.</li>
      </ul>

      <h2>7. Hak Anda</h2>
      <p>Sebagai Subjek Data Pribadi, Anda berhak:</p>
      <ul>
        <li>Mengakses dan memperoleh salinan data pribadi Anda.</li>
        <li>Memperbaiki atau memperbarui data yang tidak akurat.</li>
        <li>Meminta penghapusan data atau penutupan akun.</li>
        <li>Menarik persetujuan dan mengajukan keberatan atas pemrosesan.</li>
      </ul>
      <p>
        Ajukan permintaan melalui Customer Care pada kontak di bawah. Kami akan memverifikasi identitas Anda sebelum memproses permintaan dan
        menindaklanjutinya dalam jangka waktu yang diatur UU PDP. Penghapusan dapat dibatasi untuk data yang wajib kami simpan menurut hukum.
      </p>

      <h2>8. Insiden Data</h2>
      <p>
        Bila terjadi kegagalan pelindungan data pribadi, Kami akan memberitahu Anda secara tertulis paling lambat 3 x 24 jam sesuai UU PDP, berisi
        data yang terdampak, waktu, dan langkah penanganan.
      </p>

      <h2>9. Perubahan Kebijakan</h2>
      <p>
        Kebijakan ini dapat diperbarui. Perubahan penting akan diumumkan di Layanan. Baca juga <Link href="/terms">Syarat & Ketentuan</Link>.
      </p>

      <h2>10. Kontak Pelindungan Data</h2>
      <LegalContact />
    </LegalArticle>
  );
}
