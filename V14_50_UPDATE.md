# FitMate AI v1.4.50

## Perubahan utama

- Halaman legal diperbarui dalam Bahasa Indonesia dan Inggris:
  - `/terms`
  - `/privacy`
  - `/subscription-terms`
  - `/refund`
- Checkout QRIS maupun otomatis sekarang mewajibkan persetujuan Ketentuan Langganan dan Kebijakan Pembatalan/Refund.
- Langganan otomatis memiliki persetujuan tagihan berulang terpisah dan eksplisit.
- Persetujuan pembayaran dicatat pada `user_consents` beserta versi dokumen, waktu, sumber, dan jenis pembayaran.
- Premium dibatasi maksimal 10 generate program latihan berhasil per minggu.
- Kuota Premium reset setiap Senin pukul 00.00 WIB (`Asia/Jakarta`).
- Percobaan AI yang gagal sebelum program tersimpan tidak mengurangi kuota.
- Badge akun `PREMIUM` atau `FREE` tampil di atas tombol menu pada seluruh halaman aplikasi.

## Langkah manual wajib

Untuk database FitMate yang sudah pernah menjalankan SQL Premium versi sebelumnya:

1. Buka Supabase Dashboard.
2. Pilih proyek FitMate.
3. Buka **SQL Editor**.
4. Jalankan seluruh isi:
   `supabase/migrations/202608050013_legal_and_premium_weekly_quota.sql`
5. Pastikan tidak ada error sebelum mencoba checkout atau generate program.

Untuk database baru, cukup jalankan versi terbaru:

`supabase/FITMATE_PREMIUM_SETUP.sql`

## Persiapan sebelum produksi

Isi alamat dukungan resmi pada environment:

```env
NEXT_PUBLIC_FITMATE_SUPPORT_EMAIL=support@domain-anda.com
```

Dokumen legal dalam aplikasi adalah dasar operasional. Sebelum peluncuran komersial, minta penasihat hukum Indonesia memeriksa identitas perusahaan, alamat, saluran pengaduan, retensi data, proses refund, dan ketentuan transaksi yang benar-benar diterapkan.
