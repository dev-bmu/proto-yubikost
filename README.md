# Prototype yubikost by BRAVE

Prototype Next.js berdasarkan `#DOCUMENT/PRD-YUBIKOST-BRAVE.md`. Mencakup Landing Page (langsung berisi Katalog Kost), Halaman Gedung + Gatekeeper, Dashboard Customer (sewa per tipe kamar dengan uang muka, pelunasan saat check-in, upload bukti, biodata), dan Admin Dashboard (grafik, manajemen Kost & Kamar, menu Finance dengan ekspor Accurate). Semua data adalah **data dummy berbentuk TSV**.

## Menjalankan

```bash
cd prototype
npm install
npm run dev
```

Buka http://localhost:3100. Kata sandi semua akun demo adalah `demo1234`.

Tombol **Demo** di pojok kanan bawah dipakai untuk masuk satu klik sebagai member atau admin (per peran), dan untuk mereset data. Akun penghuni/lead hasil generate (`mbr-gNN`, `mbr-lNN`) tidak ditampilkan di menu Demo; akun itu hanya mengisi data grafik dan tabel admin.

## Akun demo

| Akun | Kondisi untuk dicoba |
|---|---|
| Rina Aulia (Resident) | Biodata lengkap, sewa aktif |
| Dimas Pratama (Resident) | Jatuh tempo ≤ 14 hari, bukti perpanjangan menunggu verifikasi |
| Salsabila Putri (Resident) | Biodata belum diisi, dashboard dialihkan ke form biodata |
| Fajar Nugroho (Resident) | Lewat jatuh tempo |
| Ayu Lestari (Resident) | Hasil Direct Add, wajib ganti kata sandi |
| Bagus Santoso (Resident) | Kontrak 2 tahun, perpanjangan sudah disetujui |
| Putri Ananda (Prospect) | Kalpataru A-03, check-in 15 Okt: bukti **uang muka 25%** menunggu verifikasi |
| Yoga Firmansyah (Prospect) | Sumbersari A-02, check-in 20 Okt: uang muka 50% sudah diterima, **menunggu pelunasan** |
| Citra Maharani (Prospect) | Ketawanggede A-03, check-in 9 Okt: bukti **pelunasan** menunggu verifikasi |
| Nadia Rahma, Andre Wijaya (Prospect) | Lead tanpa pesanan; pakai untuk mencoba pesan kamar dari awal |
| `super@brave.test` | Super Admin, semua izin |
| `manager@` / `ops@` / `marketing@` / `finance@` / `legal@brave.test` | Izin per peran sesuai PRD §3.3 |

## Yang baru di v1.2

- **Home = Katalog Kost.** Menu Advertising dan Layanan Properti dihapus (route lama dialihkan ke `/`). Hero berisi kotak pencarian yang langsung menyaring katalog di bawahnya; di desktop kolom kanan menampilkan etalase gedung.
- **Admin › Kost & Kamar** (`/admin/kost`) menggantikan menu Kamar dan Katalog. Per gedung ada tab Info, Tipe Kamar, Kamar, dan Denah:
  - **Tipe kamar**: nama, ukuran, harga, deskripsi, fasilitas (checkbox, bukan isian bebas), dan **foto upload** (seret/pilih file, urutkan, foto pertama jadi sampul). Semua kamar satu tipe memakai foto, harga, dan fasilitas yang sama; mengubah tipe ikut memperbarui kamarnya.
  - **Tambah kamar massal**: pilih tipe + lantai + pola nomor (awalan, dari–sampai, jumlah digit), pratinjau nomor, nomor yang sudah ada dilewati.
  - Fasilitas gedung juga checkbox; foto gedung juga upload.
  - Foto upload disimpan di `storage/media/` dan disajikan lewat `/media/<id>`.
- **Admin Dashboard** berisi KPI kamar (Total = Terisi + Dipesan + Kosong), daftar Butuh tindakan, dan grafik: pendapatan terverifikasi per bulan (sewa baru vs perpanjangan), leads & konversi per bulan, status pembayaran, jatuh tempo 30 hari, serta ringkasan per gedung. Setiap grafik punya tooltip dan tombol **Lihat tabel**. Tidak ada persentase okupansi.
- **Dashboard Customer** didesain ulang: sidebar tetap di kiri (desktop), bottom nav + drawer (mobile), Ringkasan yang lebih informatif, alur Sewa 3 langkah (Kost → Tipe → Nomor kamar), halaman Pembayaran dua kolom dengan hitung mundur batas bayar.
- **Logo yubikost** menggantikan logo dan wordmark Brave di header, footer, Dashboard Customer, admin (sidebar dan halaman masuk), serta favicon. File di `public/brand/`: `yubikost-horizontal.svg` (berwarna, untuk permukaan terang), `yubikost-horizontal-white.svg` (putih, untuk gradien ungu dan sidebar admin `slate-900`), dan `yubikost-logo.svg` (bertumpuk dengan tagline, untuk ukuran besar). Favicon dari `src/app/icon.svg` (mark saja). Judul tab memakai template `%s | yubikost`. "Brave Brawijaya" tetap tampil sebagai nama pengelola di konten. Aturan pemakaian ada di PRD §4.12.

## Yang baru di v1.3

- **Landing page senada dengan logo**: judul memakai **Red Hat Display** (font wordmark logo yubikost; hasil perbandingan bentuk huruf 45 font Google, paling mirip ExtraBold), teks & tombol navy logo `#15275a`, aksen ungu-biru logo `#565ab3`, satu frasa judul bergradien seperti mark logo, dan foto utama hero berbingkai bentuk rumah seperti mark logo. Latar tetap putih/abu terang (bukan warna logo); footer hampir hitam kebiruan `#0d1631`. Di mobile hero hanya judul + kotak cari. Setiap kartu katalog dan Halaman Gedung menampilkan **DP mulai 25% · Deposit Rp 200.000** beserta penjelasannya. Font & token ada di `src/components/landing/theme.ts` dan `src/app/globals.css`.
- **Uang muka (DP) & deposit** sesuai *Ketentuan dan Tata Tertib Kos Brave per 17 Juli 2026*:
  - Uang muka minimal 25% dari total sewa paket (berlaku 13 hari sejak dibayar); 50% berlaku 20 hari; 100% berlaku 28 hari. Tanggal check-in harus masih dalam masa berlaku, jadi check-in maksimal 28 hari dari hari ini dan pilihan DP otomatis menyesuaikan.
  - Sisa sewa + **deposit Rp 200.000** dilunasi saat check-in. Ketentuan refund uang muka dan pengembalian deposit tampil di katalog, halaman gedung, dan Dashboard.
- **Menu Finance** (menggantikan menu Pembayaran; `/admin/pembayaran` dialihkan):
  - **Konfirmasi Pembayaran**: antrean bukti (uang muka, pelunasan, perpanjangan) dengan tanggal check-in, serta daftar pesanan yang menunggu uang muka/pelunasan.
  - **Data Transaksi**: data table semua pembayaran (cari, filter, urutkan, halaman).
  - **Ekspor Accurate** (Super Admin, Manager, Finance): pilih tanggal (harian/rentang), lalu ekspor berurutan **1 Data Pelanggan → 2 Faktur Penjualan → 3 Penerimaan Penjualan** ke file Excel memakai template impor Accurate dari tim Finance (`data/accurate/*.xlsx`). Baris yang sudah diekspor ditandai agar tidak terimpor dua kali.
- **Penomoran dokumen (sementara)**: faktur `INV-BRAVE-{bulan romawi}-{tahun}-{0001}` dibuat saat pesanan diajukan (perpanjangan: saat bukti dikirim); penerimaan `RCP-BRAVE-{bulan romawi}-{tahun}-{0001}` diberikan saat bukti disetujui; counter direset tiap bulan. ID Pelanggan Accurate `C.YK0001` diberikan saat faktur pertama.
- **Rekening & QRIS**: kolom baru **Kode akun Kas/Bank Accurate** per kanal (kolom EXPENSE ACCOUNT NO saat impor penerimaan).

## Alur sewa

```
Katalog Kost → [Ajukan Sewa] → Masuk/Daftar → Dashboard Customer /dashboard/sewa?kost=…&tipe=…
  → pilih tipe + nomor kamar → tanggal check-in (≤ 28 hari) + paket + uang muka (25/50/100%)
  → pesanan dibuat + faktur INV-…, kamar DITAHAN 24 jam untuk pembayaran uang muka
  → Pembayaran: transfer uang muka → upload bukti → Finance › Konfirmasi: Setujui (penerimaan RCP-…)
      → kamar tetap ditahan sampai masa berlaku uang muka (13/20/28 hari sejak dibayar)
  → Pelunasan saat check-in: transfer sisa sewa + deposit Rp 200.000 → upload bukti → Finance: Setujui
      → jadi Penghuni mulai tanggal check-in, kamar Terisi, faktur Lunas
  → Bukti ditolak → customer upload ulang (uang muka: batas 24 jam baru; pelunasan: tetap dalam masa berlaku)
  → Penghuni: wajib isi Biodata → perpanjangan lewat upload bukti (faktur + penerimaan baru)
```

Uang muka yang tidak dibayar dalam 24 jam, atau pelunasan yang lewat masa berlaku uang muka, membuat pesanan **Kedaluwarsa**: kamar dilepas dan faktur dibatalkan.

## Skenario demo end-to-end

1. Sebagai Guest buka **Katalog Kost**, klik **Ajukan Sewa**, lalu daftar akun baru. Anda langsung masuk ke Dashboard Customer halaman Sewa Kamar.
2. Pilih gedung → tipe kamar → nomor kamar → isi tanggal check-in, paket, dan uang muka → **Ajukan Sewa & Bayar Uang Muka**.
3. Di **Pembayaran**, pilih rekening/QRIS dan upload bukti transfer uang muka (JPG/PNG/WEBP/PDF, maks 3 MB).
4. Masuk sebagai Finance (`finance@brave.test`), buka **Finance › Konfirmasi Pembayaran**, klik **Lihat Bukti**, lalu **Setujui** (atau **Tolak** dengan alasan).
5. Kembali sebagai customer: Pembayaran sekarang menampilkan tagihan **pelunasan** (sisa sewa + deposit). Upload bukti, lalu Finance menyetujui → customer jadi penghuni dan Dashboard meminta **Biodata**.
6. Sebagai Finance buka **Finance › Ekspor Accurate**, pilih tanggal, lalu unduh berurutan Data Pelanggan → Faktur Penjualan → Penerimaan Penjualan.
7. Sebagai `ops@brave.test` atau `super@brave.test`, buka **Kost & Kamar** → pilih gedung → tab **Tipe Kamar** → tambah tipe (centang fasilitas, upload foto) → tab **Kamar** → **Tambah Massal**.

Data demo siap pakai: Putri (bukti uang muka), Citra (bukti pelunasan), dan Dimas (bukti perpanjangan) menunggu verifikasi; Yoga sudah membayar uang muka dan menunggu pelunasan. Faktur & penerimaan sebelum 1 Oktober 2026 sudah ditandai "diekspor"; Oktober belum.

## Data TSV

- `data/seed/*.tsv` adalah data asli. Aplikasi tidak pernah mengubahnya.
- `data/*.tsv` adalah data hidup. Dibuat otomatis dari seed saat pertama dibaca, dan berubah setiap ada aksi di aplikasi.
- Boleh diedit dengan spreadsheet atau editor teks, lalu refresh browser. Simpan sebagai UTF-8 dengan pemisah tab. Kolom daftar (fasilitas, foto) dipisah `|`.
- Reset ke kondisi awal: `npm run reset-data`, atau tombol Demo → **Reset data dummy**. Reset juga menghapus foto yang di-upload (`storage/media/`).
- Foto KTP dan bukti transfer disimpan di `storage/ktp/` dan `storage/bukti/` (privat, tidak di-serve publik). Spesimen dummy ada di `data/seed-ktp/` dan `data/seed-bukti/`.
- Template impor Accurate (dari tim Finance) ada di `data/accurate/`: `1-pelanggan.xlsx`, `2-faktur-penjualan.xlsx`, `3-penerimaan-penjualan.xlsx`. Ekspor mengisi baris data sheet pertama; header dan sheet penjelasan tidak diubah.

| File | Isi |
|---|---|
| `kosts.tsv` | Gedung kost (tipe, area, harga dasar, fasilitas, foto, peta, jumlah lantai, pemilik, status tayang) |
| `roomTypes.tsv` | Tipe kamar per gedung (ukuran, harga, fasilitas, foto, deskripsi) |
| `rooms.tsv` | Kamar per gedung + `typeId`, status `AVAILABLE` / `RESERVED` (dipesan) / `OCCUPIED` |
| `members.tsv` | Akun Prospect/Resident (kata sandi di-hash scrypt), ID Pelanggan Accurate `customerNo`, waktu terakhir diekspor |
| `leases.tsv` | Sewa: tanggal mulai, jatuh tempo, status |
| `profiles.tsv` | Biodata wajib penghuni |
| `inquiries.tsv` | Lead permintaan survey |
| `bookings.tsv` | Pesanan sewa dari Dashboard: tanggal check-in (`startDate`), tahap `DP`/`PELUNASAN`, persen uang muka, harga terkunci, faktur, batas bayar, status |
| `payments.tsv` | Bukti pembayaran (uang muka, pelunasan, perpanjangan) + status verifikasi, faktur, nomor penerimaan `RCP-…`, waktu diekspor |
| `invoices.tsv` | Faktur penjualan `INV-…`: pelanggan, kamar, paket, sewa, deposit, total, status (Belum Dibayar/Sebagian/Lunas/Batal), waktu diekspor |
| `channels.tsv` | Rekening & QRIS + kode akun Kas/Bank Accurate |
| `admins.tsv` | Akun admin per peran |
| `testimonials.tsv`, `audit.tsv` | Testimoni landing, audit log admin |

## Peta halaman

| Route | Isi |
|---|---|
| `/` | Landing Page + Katalog Kost (`#katalog`) |
| `/kost/[slug]` | Halaman Gedung (tipe kamar, fasilitas, peta, tata tertib) |
| `/terms`, `/privacy` | Halaman legal (draf) |
| `/dashboard` | Dashboard Customer: Ringkasan |
| `/dashboard/sewa`, `/dashboard/pembayaran` | Pilih gedung, tipe, kamar, tanggal check-in, dan uang muka; tagihan uang muka/pelunasan, upload bukti, riwayat |
| `/dashboard/biodata`, `/dashboard/bantuan`, `/dashboard/akun` | Biodata penghuni, Customer Care, ganti kata sandi |
| `/admin/login` | Masuk admin |
| `/admin` | Admin Dashboard (KPI + grafik) |
| `/admin/kost`, `/admin/kost/baru`, `/admin/kost/[id]` | Kost & Kamar: daftar gedung, tambah gedung, detail gedung (Info, Tipe Kamar, Kamar, Denah) |
| `/admin/finance/konfirmasi`, `/admin/finance/transaksi`, `/admin/finance/accurate` | Finance: konfirmasi pembayaran & tagihan berjalan, data table semua transaksi, ekspor harian Accurate |
| `/admin/leads`, `/admin/penghuni`, `/admin/rekening`, `/admin/audit` | Leads, Penghuni, Rekening & QRIS, Audit log |

## Struktur kode

- `src/lib/` — penyimpanan TSV (`db.ts`), query join (`queries.ts`), faktur/penerimaan/tagihan (`finance.ts`), data menu Finance (`finance-views.ts`), ekspor Accurate (`accurate.ts`) dengan pengisi template xlsx tanpa library (`xlsx.ts`), sesi, izin peran, format, template WhatsApp (`wa.ts`)
- `src/actions/` — server action member, customer (pesanan, uang muka, pelunasan, upload bukti), portal (biodata), admin (verifikasi), finance (ekspor Accurate), kost-admin (gedung, tipe, kamar, massal), media (upload foto), demo
- `src/components/` — primitif design system (`ui.tsx`, `Field.tsx`, `Modal.tsx`, `media.tsx`), Navbar, Footer, Gatekeeper (`gate/`), `admin/kost/` (form gedung, tipe, kamar, massal, upload foto, checkbox fasilitas), `admin/charts/` (grafik SVG tanpa library), `customer/` (shell & komponen dashboard)
- `src/app/globals.css` — token design system (PRD §4, Lampiran B)
- `public/brand/` — logo yubikost (SVG hasil trace dari logo raster; ganti dengan nama file yang sama bila file vektor resmi tersedia). Favicon di `src/app/icon.svg`, dengan fallback `src/app/favicon.ico` dan `src/app/apple-icon.png` (PRD §4.12)

## Batasan prototype (bukan untuk produksi)

- Sesi memakai cookie berisi ID tanpa tanda tangan. Produksi memakai JWT (PRD §7.6).
- Tidak ada rate limit login/daftar dan tidak ada OTP.
- Pesanan kedaluwarsa dicek saat halaman dibuka (lazy), bukan lewat cron.
- Belum ada notifikasi otomatis (email/WA) saat bukti disetujui atau ditolak; status terlihat di Dashboard.
- Data disimpan di file TSV lokal, satu proses. Produksi memakai PostgreSQL + Prisma (PRD §10).
- **Deploy ke Vercel:** filesystem Vercel read-only kecuali `/tmp`, jadi saat env `VERCEL` ada, data hidup dan upload ditulis ke `/tmp/yubikost` (seed tetap dibaca dari `data/seed`). Akibatnya:
  - data kembali ke seed setiap cold start, dan bisa berbeda antar-instance (contoh: akun yang baru didaftarkan bisa "hilang");
  - route handler `/media/[key]`, `/admin/bukti/[id]`, `/admin/ktp/[id]` jalan di function terpisah, sehingga foto, bukti transfer, dan KTP yang di-upload saat demo tampil 404. Foto seed dan spesimen tetap tampil.
  - Untuk demo dengan data yang bertahan, jalankan `npm run build && npm start` sebagai satu proses di host dengan disk yang bisa ditulis (VPS, Railway/Render dengan volume).
- Kredensial Direct Add dikirim admin lewat tautan `wa.me`, belum otomatis.
- Impor kamar dari Google Sheets (PRD §9.9) dan upload gambar QRIS belum ada. QRIS memakai URL gambar.
- Ekspor Accurate memakai kode master data sementara (`src/lib/accurate.ts`: item `SEWA-KOS` & `DEPOSIT-KOS`, satuan, gudang, cabang). Sebelum impor sungguhan, samakan dengan master data Accurate tim Finance; kode akun Kas/Bank diisi per kanal di Rekening & QRIS. Penomoran `INV-`/`RCP-`/`C.YK` juga masih sementara.
- Refund uang muka (pembatalan setelah DP) dan pengembalian deposit belum diproses di sistem; tampil sebagai ketentuan dan ditangani Customer Care/Finance secara manual.
- Upload foto tanpa kompresi/resize; maks 3 MB per file (JPG/PNG/WEBP, dicek dari isi file).
- Foto seed memakai Unsplash dan bukan foto asli kost. Nama mitra di marquee masih placeholder.
