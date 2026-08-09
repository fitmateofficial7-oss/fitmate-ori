# FitMate Jogging – Setup

## 1. Jalankan migrasi Supabase

Buka **Supabase Dashboard → SQL Editor**, lalu jalankan seluruh isi:

```text
supabase/migrations/202607310011_jogging_tracker.sql
```

Migrasi tersebut membuat tabel `public.jogging_sessions`, index, trigger `updated_at`, dan RLS agar setiap pengguna hanya bisa membaca serta mengubah rutenya sendiri.

Tanpa migrasi, fitur tetap berjalan dan menyimpan riwayat sementara di perangkat melalui `localStorage`, tetapi data belum tersinkron antarperangkat.

## 2. Pastikan aplikasi memakai HTTPS

GPS browser memerlukan secure context. `localhost` dapat dipakai saat development, tetapi deployment publik harus memakai HTTPS.

## 3. Izin lokasi

`next.config.ts` sudah diubah menjadi:

```text
geolocation=(self)
```

Pengguna tetap harus memberi izin lokasi presisi melalui browser/perangkat.

## 4. Map tiles

Default development configuration:

```env
NEXT_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
NEXT_PUBLIC_MAP_ATTRIBUTION="© OpenStreetMap contributors"
```

Untuk trafik produksi yang besar, gunakan penyedia tiles khusus dan ubah kedua environment variable di atas. Jangan menghapus attribution yang diwajibkan penyedia peta.

## 5. Pengujian di ponsel

1. Login menggunakan akun Free.
2. Buka `/jogging` dari menu bubble atau dashboard.
3. Izinkan lokasi presisi.
4. Tekan **Mulai jogging** di area terbuka.
5. Pastikan titik mulai, garis track, jarak, waktu, pace, dan kalori berubah.
6. Uji **Jeda → Lanjutkan → Selesai**.
7. Uji mode share **Track** dan **Foto**.
8. Download PNG dan coba Web Share pada Android/iPhone.
9. Logout/login kembali dan pastikan riwayat tetap tersedia setelah migrasi dijalankan.

## Catatan produk

- Fitur ini tidak dibungkus `PremiumFeatureGate`; akun Free dan Premium sama-sama dapat mengaksesnya.
- Foto share tidak diunggah ke Supabase. Foto hanya diproses di perangkat untuk membuat kartu PNG.
- Kalori adalah estimasi dari berat badan, durasi, dan kecepatan rata-rata.
- GPS route merupakan data lokasi sensitif. Jangan membagikannya tanpa pertimbangan privasi.
