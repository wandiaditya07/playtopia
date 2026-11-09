# Playtopia POS & Smart Turnstile Gate System

Sistem manajemen kasir terpadu (Point of Sale), kontrol akses gerbang turnstile otomatis, dan manajemen keanggotaan RFID untuk outlet Playtopia Playground & Cafe.

---

## 1. Ikhtisar Sistem

Playtopia POS mengintegrasikan operasional loket tiket masuk arena bermain, transaksi cafe & merchandise, verifikasi akses pengunjung real-time melalui gerbang turnstile, dan program loyalitas pelanggan dalam satu platform terdistribusi.

### Kemampuan Utama
- **Kasir POS Terpadu**: Transaksi paket bermain durasi (1 Jam, 2 Jam, All-Day, Birthday Group) dan menu F&B Cafe dalam satu pesanan.
- **Layar Pelanggan (Dual-Screen Display)**: Tampilan sekunder menghadap pelanggan dengan latensi 0ms berbasis `BroadcastChannel`, menampilkan katalog promo (Idle), rincian keranjang belanja (Cart), QRIS dinamis (Payment), dan notifikasi struk/kembalian (Success).
- **Kontrol Turnstile Gate (Access Control)**: Validasi tiket QR dan kartu RFID pada gerbang masuk (IN) dan keluar (OUT), penghitungan toleransi keterlambatan (10 menit), pembatasan kuota re-entry (maksimal 2x), dan perhitungan otomatis denda overtime.
- **Manajemen Member & Kartu RFID**: Direktori CRM pelanggan terdaftar, terminal pembaca kartu contactless (13.56MHz Mifare / 125KHz EM), pengisian saldo dompet instan, dan kontrol blokir kartu fisik.
- **Konfigurasi Paket Membership**: Manajemen paket langganan berjangka (Silver, Gold, Platinum) dengan kuota kunjungan dan diskon otomatis di kasir.
- **Closing Shift Kasir**: Rekonsiliasi kas laci (cash drawer float vs actual cash), pencatatan selisih kas (variance), dan pencetakan berita acara penutupan shift.
- **Dynamic 3-in-1 RBAC**: Manajemen matriks hak akses hierarkis (Menu terikat Role, Role menaungi Pengguna) dengan granularitas Create, Read, Update, Delete per modul.
- **Pusat Operasional & Ekspor Data**: Monitoring riwayat transaksi, mutasi denda, audit log, dan ekspor 1-klik ke format CSV (UTF-8 BOM).

---

## 2. Arsitektur Teknologi

### Frontend
- **Framework**: Vue 3 (Composition API, `<script setup>`)
- **Build Tool**: Vite 6
- **State Management**: Pinia Store (`posAuth`, `user`)
- **Routing**: Vue Router 4 (Route Guards & Role Verification)
- **UI Framework**: Bootstrap 5, Scss, Lucide Monochrome SVG Icons
- **Inter-Window Communication**: Web BroadcastChannel API (`pos_customer_display`)

### Backend
- **Runtime**: Node.js (ES Module)
- **Web Server**: Express.js
- **Primary Database**: MySQL 8.0 / MariaDB (`playtopia_id`)
- **Fallback High-Availability Store**: Node.js SQLite (`playground_pos.sqlite`)
- **Autentikasi**: JSON Web Token (JWT) dengan enkripsi bcryptjs

---

## 3. Prasyarat & Persiapan Lingkungan

Pastikan server atau komputer kasir telah terpasang:
- **Node.js**: Versi 22.x LTS atau lebih baru
- **MySQL**: Versi 8.0+ (atau MariaDB 10.5+)
- **Git**: Versi 2.30+

### Konfigurasi Database MySQL
Konfigurasi koneksi MySQL berada pada berkas `backend/src/db_mysql.js` atau dapat ditentukan melalui environment variables:
```env
DB_HOST=100.113.174.74
DB_USER=wandi
DB_PASSWORD=wandi
DB_NAME=playtopia_id
DB_PORT=3306
JWT_SECRET=playtopia-secure-jwt-secret-key-2026
```

---

## 4. Panduan Instalasi & Menjalankan Aplikasi

### Langkah 1: Pasang Dependensi
```bash
# Dependensi Frontend
npm install

# Dependensi Backend
cd backend
npm install
cd ..
```

### Langkah 2: Jalankan Layanan Backend
```bash
npm run server
```
Server backend akan aktif pada port `http://localhost:8080`.

### Langkah 3: Jalankan Layanan Frontend (Vite)
Buka terminal baru:
```bash
npm run dev
```
Aplikasi kasir akan dapat diakses pada browser di `http://localhost:5173`.

### Langkah 4: Membuka Layar Pelanggan (Dual-Screen)
Pada layar kedua yang menghadap pelanggan, buka URL:
```text
http://localhost:5173/customer-display
```
Layar ini akan otomatis menerima pembaruan keranjang belanja dan QRIS secara real-time dari terminal kasir.

---

## 5. Akun Pengguna Bawaan (Default Credentials)

| Role | Email | Password | Hak Akses |
|---|---|---|---|
| **Owner (Client)** | `owner@playtopia.id` | `owner123` | Akses penuh eksekutif, rekap omset, dan laporan audit |
| **Administrator** | `admin@playtopia.id` | `admin123` | Manajemen RBAC, pengguna, unit bisnis, katalog, dan member |
| **Kasir (Staff)** | `kasir@playtopia.id` | `kasir123` | Transaksi POS, verifikasi tiket, top-up member, dan tutup shift |

---

## 6. Integrasi Perangkat Keras (Hardware)

1. **Turnstile Gate Controller**:
   - Komunikasi via REST API endpoint: `POST /api/v1/gate/verify-access`.
   - Menggunakan header `x-gate-key: GATE-SECRET-PLAYTOPIA-2026` atau Bearer JWT Token.
   - Respon gate: `OPEN_GATE` (LED Hijau / Palang Membuka) atau `KEEP_LOCKED` (LED Merah / Palang Terkunci).
2. **RFID Contactless Reader**:
   - Kompatibel dengan pembaca USB HID / Keyboard Wedge (13.56MHz Mifare Classic & 125KHz EM).
   - Memasukkan UID kartu secara otomatis pada input scan dengan karakter penutup `Enter`.
3. **Printer Struk Kasir**:
   - Mendukung printer thermal 58mm dan 80mm (ESC/POS) melalui dialog cetak sistem bawaan (`@media print`).

---

## 7. Kebijakan Git & Pengujian Kualitas

Proyek ini menggunakan script proteksi integritas 4-tahap (`scripts/git-guard.mjs`) sebelum kode diperbolehkan dipush:
1. Pemeriksaan tanda konflik merge (`<<<<<<<`, `=======`, `>>>>>>>`).
2. Pemeriksaan kelengkapan 12 berkas inti aplikasi.
3. Verifikasi sintaks Node.js pada seluruh modul backend (`node --check`).
4. Kompilasi penuh aset frontend Vue (`vite build`).

### Perintah Validasi & Manajemen Git:
```bash
# Validasi integritas kode
npm run git:validate

# Backup lokal cepat
npm run git:local

# Sinkronisasi ke repositori GitHub publik
npm run git:public
```

### Kebijakan Cabang (Branch Strategy):
- `dev`: Cabang aktif pengembangan dan penambahan fitur.
- `prod`: Cabang stabil siap produksi (selalu disinkronkan secara fast-forward dari `dev`).

---

## 8. Lisensi & Hak Cipta

&copy; 2026 **Playtopia Indonesia**. Hak Cipta Dilindungi Undang-Undang.
Dokumentasi dan kode sumber ini diperuntukkan untuk operasional internal Playtopia Indonesia.
