# Setup Legal FitMate

Halaman legal tersedia tanpa login dan mengikuti pilihan bahasa FitMate.

## URL

- `/terms` — Ketentuan Penggunaan
- `/privacy` — Kebijakan Privasi
- `/subscription-terms` — Ketentuan Langganan Premium
- `/refund` — Kebijakan Pembatalan & Pengembalian Dana

## Environment yang perlu diisi sebelum produksi

```env
NEXT_PUBLIC_FITMATE_SUPPORT_EMAIL=support@domain-anda.com
```

Gunakan alamat email perusahaan yang aktif dan benar-benar dipantau. Jangan menggunakan email pribadi untuk operasional jangka panjang.

## Pencatatan persetujuan

Checkout mencatat:

- `subscription_terms` untuk QRIS dan otomatis;
- `recurring_payment` khusus langganan otomatis.

Catatan berisi versi dokumen, waktu persetujuan, sumber checkout, dan jenis pembayaran. Jalankan migrasi v14.50 sebelum mencoba checkout.

## Peninjauan manual sebelum rilis

Konfirmasi dengan penasihat hukum:

- alamat dan identitas perusahaan yang wajib ditampilkan;
- email serta alur pengaduan konsumen;
- periode retensi data dan catatan pembayaran;
- proses refund yang benar-benar dapat dijalankan tim;
- pemrosesan data kesehatan, foto, lokasi GPS, dan transfer lintas negara;
- usia minimum atau keterlibatan orang tua/wali;
- mekanisme pemberitahuan perubahan harga dan ketentuan.
