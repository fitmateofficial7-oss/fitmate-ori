# FitMate v14.94 — Perbaikan checkout QRIS

Basis: source lengkap v14.93 (password reset rate limit), 31 Agustus 2026.
Tanggal perbaikan: 2 September 2026.

## Masalah dan perbaikan

Tombol **Bayar dengan QRIS** sebelumnya gagal dengan pesan
`Payment provider error: Metadata value must be a string`.
Checkout QRIS mengirim `recurring_consent_version: null` ke Xendit.
Xendit mewajibkan setiap nilai metadata berupa string.

- Kolom persetujuan pembayaran berulang sekarang hanya dikirim untuk mode
  otomatis. Checkout QRIS tidak lagi mengirim kolom tersebut.
- Tipe metadata di route dan kedua fungsi pembuatan sesi Xendit dibatasi ke
  `Record<string, string>` agar nilai null/angka/boolean tidak lolos typecheck.
- Harga tetap Rp49.000; QRIS tetap sekali bayar dengan akses 30 hari.
- Perilaku webhook, aktivasi Premium, checkout lock, idempotency, dan
  perpanjangan otomatis tidak diubah. Perbaikan sebelumnya tetap disertakan.

Referensi kontrak API: https://docs.xendit.co/apidocs/create-session

## Memasang perbaikan

Jika server sudah memakai v14.93, ekstrak ZIP patch lalu salin isi folder
`fitmate` ke root project FitMate yang sama. Alternatifnya gunakan ZIP full
yang sudah berisi seluruh source terbaru. Jangan menaruh folder `fitmate`
di dalam folder project `fitmate` yang sudah ada.

Pertahankan environment produksi yang sudah digunakan (.env di server atau
environment di panel deployment). Tidak ada API key baru, perubahan harga,
atau migrasi database yang diperlukan untuk perbaikan ini.

Jalankan dari root project:

```sh
npm ci
npm run test:billing-checkout
npm run typecheck
npm run build
```

Deploy/restart aplikasi menggunakan proses server yang biasa dipakai. Jika
memakai Docker, rebuild image dan jalankan container dari image yang baru.
Perbaikan baru aktif setelah server menjalankan build baru; menyalin source
saja tidak memperbarui proses aplikasi yang masih berjalan.

Setelah deploy, login dengan akun gratis, buka Premium, pilih QRIS, centang
persetujuan, lalu klik **Bayar dengan QRIS**. Halaman seharusnya mengarah ke
checkout Xendit. Pembayaran sungguhan tetap perlu dicek di server produksi.

## Pengujian

- Kode v14.93 berhasil mereproduksi error metadata yang sama pada simulasi
  checkout QRIS pelanggan baru dan pelanggan yang sudah punya customer ID.
- Setelah perbaikan, 6 pengujian route checkout dan client Xendit lulus:
  QRIS/otomatis, pelanggan baru/tersimpan, persetujuan berulang, serta
  pelepasan lock saat provider menolak permintaan.
- Pengujian memeriksa JSON yang dikirim client Xendit, harga Rp49.000,
  metadata string, referensi idempotency, dan status lokal tetap pending.
- Pengujian periode akses 30 hari, TypeScript, dan lint file berubah lulus.
- Build produksi Next.js 16.2.12 lulus dengan environment dummy untuk
  Supabase/OpenAI. Build ini hanya untuk validasi; ZIP berisi source, bukan
  hasil build dengan konfigurasi dummy. Build ulang dengan environment
  produksi saat deploy.
- Seluruh request Xendit dan database dalam pengujian checkout menggunakan
  simulasi; tidak ada transaksi atau perubahan database produksi.

File utama: `app/api/billing/checkout/route.ts`, `lib/xendit.ts`.
Tes regresi: `scripts/test-billing-checkout.cjs`.
