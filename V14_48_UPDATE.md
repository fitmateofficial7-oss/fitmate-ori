# FitMate AI v14.48 — Xendit Webhook Reference Fix

## Yang diperbaiki

- Webhook kini mengenali referensi pembayaran Xendit yang diberi akhiran UUID.
- Referensi seperti `fitmate-premium-<user-id>_<payment-id>` dinormalisasi kembali menjadi referensi checkout FitMate sebelum pencarian database.
- Webhook sukses dapat mengaktifkan langganan Premium dan mencatat transaksinya.
- Webhook checkout FitMate yang belum dapat dicocokkan mengembalikan error agar Xendit mencoba mengirim ulang, bukan hilang diam-diam.
- Payload nominal pembayaran dibaca dari lebih banyak bentuk payload Xendit.

Tidak ada migrasi SQL baru untuk pembaruan ini.

## Setelah memasang pembaruan

1. Jalankan aplikasi dengan URL webhook publik yang aktif.
2. Pastikan callback token Xendit sama dengan `XENDIT_WEBHOOK_TOKEN` di aplikasi.
3. Di Dashboard Xendit, kirim ulang webhook pembayaran sukses yang asli (bukan hanya tombol **Tes dan simpan**).
4. Buka ulang halaman Premium/Dashboard FitMate. Status pengguna seharusnya menjadi aktif.

Jika webhook lama tidak dapat dikirim ulang, lakukan satu pembayaran uji baru setelah versi ini berjalan.
