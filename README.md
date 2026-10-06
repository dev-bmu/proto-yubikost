# Prototype yubikost by BRAVE

Prototype Next.js berdasarkan `#DOCUMENT/PRD-YUBIKOST-BRAVE.md`. Mencakup Landing Page (langsung berisi Katalog Kost), Halaman Gedung + Gatekeeper, Dashboard Customer (sewa per tipe kamar, pembayaran dengan upload bukti, biodata), dan Admin Dashboard (grafik, manajemen Kost & Kamar). Semua data adalah **data dummy berbentuk TSV**.

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
| Putri Ananda (Prospect) | Pesanan Kamar Kalpataru A-03, bukti menunggu verifikasi |
| Nadia, Yoga, Citra, Andre (Prospect) | Leads dengan status berbeda, belum memesan |
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

## Alur sewa

```
Katalog Kost → [Ajukan Sewa] → Masuk/Daftar → Dashboard Customer /dashboard/sewa?kost=…&tipe=…
  → pilih tipe kamar → pilih nomor kamar → tanggal mulai + paket → pesanan dibuat, kamar DITAHAN 24 jam
  → Pembayaran: transfer (sewa × paket + deposit 1 bulan) → upload bukti → "Menunggu Verifikasi"
  → Admin (Finance) Pembayaran: Lihat Bukti → Setujui → jadi Penghuni, kamar Terisi
                                          → Tolak (alasan) → customer upload ulang (24 jam baru)
  → Penghuni: wajib isi Biodata → perpanjangan juga lewat upload bukti di Dashboard
```

Pesanan tanpa bukti lewat batas 24 jam otomatis **Kedaluwarsa** dan kamar dilepas.

## Skenario demo end-to-end

1. Sebagai Guest buka **Katalog Kost**, klik **Ajukan Sewa**, lalu daftar akun baru. Anda langsung masuk ke Dashboard Customer halaman Sewa Kamar.
2. Pilih gedung → tipe kamar → nomor kamar → isi tanggal mulai & paket → **Ajukan Sewa & Lanjut Bayar**.
3. Di **Pembayaran**, pilih rekening/QRIS dan upload bukti transfer (JPG/PNG/WEBP/PDF, maks 3 MB).
4. Masuk sebagai Finance (`finance@brave.test`), buka **Pembayaran**, klik **Lihat Bukti**, lalu **Setujui** (atau **Tolak** dengan alasan).
5. Kembali sebagai customer: setelah disetujui, Dashboard meminta **Biodata**; setelah itu menu penghuni (perpanjangan, Customer Care) terbuka.
6. Sebagai `ops@brave.test` atau `super@brave.test`, buka **Kost & Kamar** → pilih gedung → tab **Tipe Kamar** → tambah tipe (centang fasilitas, upload foto) → tab **Kamar** → **Tambah Massal**.

Data demo siap pakai: Putri Ananda punya pesanan yang buktinya menunggu verifikasi; Dimas Pratama punya bukti perpanjangan menunggu verifikasi.

## Data TSV

- `data/seed/*.tsv` adalah data asli. Aplikasi tidak pernah mengubahnya.
- `data/*.tsv` adalah data hidup. Dibuat otomatis dari seed saat pertama dibaca, dan berubah setiap ada aksi di aplikasi.
- Boleh diedit dengan spreadsheet atau editor teks, lalu refresh browser. Simpan sebagai UTF-8 dengan pemisah tab. Kolom daftar (fasilitas, foto) dipisah `|`.
- Reset ke kondisi awal: `npm run reset-data`, atau tombol Demo → **Reset data dummy**. Reset juga menghapus foto yang di-upload (`storage/media/`).
- Foto KTP dan bukti transfer disimpan di `storage/ktp/` dan `storage/bukti/` (privat, tidak di-serve publik). Spesimen dummy ada di `data/seed-ktp/` dan `data/seed-bukti/`.

| File | Isi |
|---|---|
| `kosts.tsv` | Gedung kost (tipe, area, harga dasar, fasilitas, foto, peta, jumlah lantai, pemilik, status tayang) |
| `roomTypes.tsv` | Tipe kamar per gedung (ukuran, harga, fasilitas, foto, deskripsi) |
| `rooms.tsv` | Kamar per gedung + `typeId`, status `AVAILABLE` / `RESERVED` (dipesan) / `OCCUPIED` |
| `members.tsv` | Akun Prospect/Resident (kata sandi di-hash scrypt) |
| `leases.tsv` | Sewa: tanggal mulai, jatuh tempo, status |
| `profiles.tsv` | Biodata wajib penghuni |
| `inquiries.tsv` | Lead permintaan survey |
| `bookings.tsv` | Pesanan sewa dari Dashboard (batas bayar, status) |
| `payments.tsv` | Bukti pembayaran sewa baru & perpanjangan + status verifikasi |
| `channels.tsv` | Rekening & QRIS |
| `admins.tsv` | Akun admin per peran |
| `testimonials.tsv`, `audit.tsv` | Testimoni landing, audit log admin |

## Peta halaman

| Route | Isi |
|---|---|
| `/` | Landing Page + Katalog Kost (`#katalog`) |
| `/kost/[slug]` | Halaman Gedung (tipe kamar, fasilitas, peta, tata tertib) |
| `/terms`, `/privacy` | Halaman legal (draf) |
| `/dashboard` | Dashboard Customer: Ringkasan |
| `/dashboard/sewa`, `/dashboard/pembayaran` | Pilih gedung, tipe, dan kamar lalu ajukan sewa; tagihan, upload bukti, riwayat |
| `/dashboard/biodata`, `/dashboard/bantuan`, `/dashboard/akun` | Biodata penghuni, Customer Care, ganti kata sandi |
| `/admin/login` | Masuk admin |
| `/admin` | Admin Dashboard (KPI + grafik) |
| `/admin/kost`, `/admin/kost/baru`, `/admin/kost/[id]` | Kost & Kamar: daftar gedung, tambah gedung, detail gedung (Info, Tipe Kamar, Kamar, Denah) |
| `/admin/leads`, `/admin/penghuni`, `/admin/pembayaran`, `/admin/rekening`, `/admin/audit` | Leads, Penghuni, verifikasi Pembayaran, Rekening & QRIS, Audit log |

## Struktur kode

- `src/lib/` — penyimpanan TSV (`db.ts`), query join (`queries.ts`), sesi, izin peran, format, template WhatsApp (`wa.ts`)
- `src/actions/` — server action member, customer (pesanan & upload bukti), portal (biodata), admin (verifikasi), kost-admin (gedung, tipe, kamar, massal), media (upload foto), demo
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
- Upload foto tanpa kompresi/resize; maks 3 MB per file (JPG/PNG/WEBP, dicek dari isi file).
- Foto seed memakai Unsplash dan bukan foto asli kost. Nama mitra di marquee masih placeholder.
