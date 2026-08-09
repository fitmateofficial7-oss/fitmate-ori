# Cara memasang database Premium FitMate

Error `Could not find the table public.user_subscriptions in the schema cache` berarti kode aplikasi sudah memakai fitur Premium, tetapi tabel dan fungsi Premium belum dipasang pada project Supabase yang sedang digunakan.

## Langkah pemasangan

1. Buka Supabase Dashboard dan pilih project FitMate yang URL-nya sama dengan `NEXT_PUBLIC_SUPABASE_URL` di `.env.local`.
2. Masuk ke **SQL Editor** lalu pilih **New query**.
3. Buka file `supabase/FITMATE_PREMIUM_SETUP.sql` dari proyek ini.
4. Salin seluruh isinya ke SQL Editor, kemudian tekan **Run**.
5. Pastikan hasilnya `Success. No rows returned` dan tidak ada pesan merah.
6. Restart server lokal dengan `npm run dev`.
7. Logout lalu login kembali, kemudian buka halaman `/plan` dan `/coach`.

File setup tersebut memasang tabel subscription, transaksi billing, kuota generate, kuota konsultasi, kuota scan makanan, checkout lock, dan fungsi penyelesaian AI secara atomik. Di bagian akhir, schema cache Supabase juga dimuat ulang otomatis.
