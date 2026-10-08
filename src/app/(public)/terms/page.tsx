// Syarat & Ketentuan (PRD G-04, C-08). Draf prototype — perlu ditinjau Legal.
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { LegalArticle, LegalContact } from "@/components/catalog/LegalArticle";
import { DEPOSIT, DP_TERMS, HOLD_HOURS, MIN_CONTRACT, PACKAGES } from "@/lib/constants";

export const metadata: Metadata = { title: "Syarat & Ketentuan" };
export const viewport: Viewport = { themeColor: "#ffffff" };

export default function TermsPage() {
  return (
    <LegalArticle
      crumb="Syarat & Ketentuan"
      title="Syarat & Ketentuan Penggunaan"
      intro="Ketentuan ini mengatur penggunaan akun yubikost by BRAVE, termasuk memesan kamar, membayar sewa, dan memakai Dashboard Customer."
    >
      <p>
        Dengan mendaftar atau menggunakan layanan yubikost by BRAVE (&quot;Layanan&quot;) yang dikelola Brave Brawijaya (&quot;Kami&quot;), Anda
        menyetujui Syarat & Ketentuan ini serta <Link href="/privacy">Kebijakan Privasi</Link>. Bila Anda tidak setuju, mohon tidak menggunakan
        Layanan.
      </p>

      <h2>1. Ruang Lingkup Layanan</h2>
      <ul>
        <li>Katalog Kost yang dikelola dan diverifikasi Brave, termasuk pilihan tipe dan nomor kamar untuk member yang sudah masuk.</li>
        <li>Pemesanan kamar, pembayaran sewa, dan unggah bukti pembayaran melalui Dashboard Customer.</li>
        <li>Pengajuan survey lokasi Kost melalui WhatsApp admin.</li>
        <li>Fitur Penghuni: biodata, informasi sewa, perpanjangan, riwayat pembayaran, dan Customer Care.</li>
      </ul>

      <h2>2. Akun Member</h2>
      <ul>
        <li>Pendaftaran memerlukan nama lengkap, Nomor WhatsApp aktif, dan kata sandi minimal 8 karakter. Email bersifat opsional.</li>
        <li>Satu Nomor WhatsApp hanya dapat dipakai untuk satu akun. Anda wajib memberikan data yang benar dan milik Anda sendiri.</li>
        <li>Anda bertanggung jawab menjaga kerahasiaan kata sandi dan seluruh aktivitas yang terjadi melalui akun Anda.</li>
        <li>Akun Penghuni yang dibuat oleh admin menerima kata sandi sementara melalui WhatsApp dan wajib menggantinya saat pertama masuk.</li>
        <li>Bila lupa kata sandi, ajukan reset melalui WhatsApp admin dari nomor yang terdaftar.</li>
      </ul>

      <h2>3. Kamar & Ketersediaan</h2>
      <ul>
        <li>Foto interior, fasilitas, dan harga per tipe kamar ditampilkan lengkap setelah Anda masuk sebagai member.</li>
        <li>Status ketersediaan dapat berubah sewaktu-waktu. Melihat kamar tidak berarti memesan atau mengunci kamar.</li>
        <li>Foto dan deskripsi adalah gambaran umum tipe kamar; kondisi aktual dapat dipastikan saat survey lokasi.</li>
      </ul>

      <h2>4. Pemesanan & Pembayaran</h2>
      <ul>
        <li>Paket sewa tersedia {PACKAGES.join(", ")} bulan. Pemesanan dilakukan dengan membayar uang muka dari total sewa paket; sisa sewa dan deposit {DEPOSIT} dilunasi saat check-in.</li>
        {DP_TERMS.map((t) => (
          <li key={t}>{t}</li>
        ))}
        <li>
          Kamar ditahan {HOLD_HOURS} jam sejak pesanan dibuat untuk pembayaran uang muka. Bila bukti uang muka belum diunggah sampai batas waktu, atau
          pelunasan belum dibayar sampai masa berlaku uang muka habis, pesanan kedaluwarsa dan kamar dilepas.
        </li>
        <li>Pembayaran dianggap sah setelah bukti diverifikasi tim Finance. Bukti yang ditolak dapat diunggah ulang sesuai alasan penolakan.</li>
        <li>Pembayaran hanya ke rekening atau QRIS resmi yang tampil di Dashboard. Kami tidak pernah meminta transfer ke rekening pribadi.</li>
      </ul>

      <h2>5. Survey Lokasi</h2>
      <ul>
        <li>Tombol &quot;Ajukan Survey Lokasi&quot; membuka percakapan WhatsApp dengan admin Kost. Kami mencatat minat Anda untuk menindaklanjuti.</li>
        <li>Jadwal survey dikonfirmasi oleh admin dan menyesuaikan ketersediaan petugas.</li>
        <li>Survey tidak mengikat dan tidak menjamin kamar tetap tersedia sampai pembayaran diverifikasi.</li>
        <li>Saat survey, Anda wajib datang sesuai jadwal, menjaga ketertiban, dan menghormati privasi Penghuni lain. Kabari admin bila berhalangan.</li>
      </ul>

      <h2>6. Penghuni</h2>
      <ul>
        <li>
          Kontrak minimal {MIN_CONTRACT} dengan deposit {DEPOSIT}. Ketentuan sewa lain mengikuti perjanjian dan tata tertib masing-masing Kost.
        </li>
        <li>Penghuni wajib melengkapi biodata (termasuk NIK dan foto KTP) sebelum memakai fitur Dashboard lainnya.</li>
        <li>Perpanjangan sewa diajukan melalui menu Pembayaran; masa sewa diperbarui setelah pembayaran diverifikasi.</li>
        <li>Akses fitur Penghuni berakhir mengikuti berakhirnya masa sewa.</li>
      </ul>

      <h2>7. Larangan</h2>
      <ul>
        <li>Memakai data palsu, nomor milik orang lain, atau mengakses akun orang lain.</li>
        <li>Mengunggah bukti pembayaran palsu atau milik transaksi lain.</li>
        <li>Mengganggu, menguji celah, atau membebani sistem secara tidak wajar.</li>
        <li>Menyalin dan menyebarkan konten katalog untuk kepentingan komersial tanpa izin tertulis.</li>
      </ul>

      <h2>8. Penangguhan & Penutupan Akun</h2>
      <p>
        Kami dapat menangguhkan atau menutup akun yang melanggar ketentuan ini. Anda dapat meminta penutupan akun kapan saja melalui Customer
        Care; data Anda diproses sesuai <Link href="/privacy">Kebijakan Privasi</Link>.
      </p>

      <h2>9. Batasan Tanggung Jawab</h2>
      <p>
        Informasi di Layanan disediakan apa adanya. Harga, fasilitas, dan ketersediaan kamar dikonfirmasi final saat pesanan dibuat. Kami tidak
        bertanggung jawab atas kerugian akibat kelalaian Anda menjaga kata sandi atau membayar ke rekening yang tidak resmi.
      </p>

      <h2>10. Perubahan Ketentuan</h2>
      <p>Kami dapat memperbarui ketentuan ini. Perubahan penting akan diumumkan di Layanan dan berlaku sejak tanggal pembaruan.</p>

      <h2>11. Kontak</h2>
      <LegalContact />
    </LegalArticle>
  );
}
