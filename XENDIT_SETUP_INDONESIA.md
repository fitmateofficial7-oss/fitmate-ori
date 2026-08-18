# Panduan Menghubungkan FitMate Premium ke Xendit

Versi ini menggunakan **Xendit Subscriptions 2026-01-01** melalui hosted Payment Session. Harga FitMate Premium adalah **Rp49.000 per bulan** dan diperpanjang otomatis sampai pengguna menghentikan perpanjangan.

Premium hanya aktif setelah server FitMate menerima webhook pembayaran sukses yang valid. Kembali dari halaman checkout saja tidak akan mengaktifkan Premium.

## Yang sudah tersedia di kode

- Tombol Upgrade pada `/premium`.
- Persetujuan tagihan berulang sebelum checkout.
- Pembuatan Xendit hosted checkout dari server.
- Pencegahan checkout ganda per pengguna.
- Verifikasi `x-callback-token` secara constant-time.
- Pemrosesan webhook idempoten dan dapat dicoba ulang bila pemrosesan sebelumnya gagal.
- Validasi pembayaran harus tepat **IDR 49.000** sebelum Premium aktif.
- Riwayat transaksi, status langganan, penghentian perpanjangan, dan akses sampai akhir periode yang telah dibayar.
- Kuota Free/Premium dan lock fitur 3D, Progres, serta Nutrisi.

## Bagian manual yang wajib dilakukan pemilik

### 1. Terapkan database Premium di Supabase

1. Masuk ke Supabase project FitMate.
2. Buka **SQL Editor** lalu pilih **New query**.
3. Buka file `supabase/FITMATE_PREMIUM_SETUP.sql` dari proyek ini.
4. Salin seluruh isinya, jalankan, dan pastikan tidak ada error.
5. Cek di Table Editor bahwa tabel berikut tersedia:
   - `user_subscriptions`
   - `billing_transactions`
   - `billing_webhook_events`
   - `billing_checkout_locks`
   - `plan_generation_usage`
   - `ai_feature_usage`

Jalankan SQL ini sebelum memasang kode baru di server. File setup bersifat idempoten sehingga aman dijalankan ulang bila sebelumnya sudah pernah dijalankan.

### 2. Siapkan URL FitMate yang terpisah dan memakai HTTPS

Karena VPS juga menjalankan Growsia, gunakan domain/subdomain dan proses yang terpisah, misalnya:

```text
https://fitmate.growsia.id
```

FitMate harus memiliki direktori, `.env.production`, port internal, dan proses PM2 sendiri. Jangan menaruh credential FitMate di folder atau proses Growsia. URL webhook harus dapat diakses publik melalui HTTPS:

```text
https://fitmate.growsia.id/api/billing/webhook/xendit
```

### 3. Mulai dari Xendit Test Mode

1. Masuk ke Xendit Dashboard dan aktifkan **Test Mode**.
2. Buka pengaturan **API Keys**.
3. Buat/copy **Secret API Key** test yang berawalan `xnd_development_`.
4. Pastikan key memiliki izin Money-in Read/Write dan akses ke Payment Sessions/Subscriptions.
5. Jika menu atau API Subscriptions belum tersedia, minta aktivasi produk Subscriptions kepada Xendit.

Jangan menaruh secret key di GitHub dan jangan mengirimkannya melalui chat.

### 4. Daftarkan webhook Xendit

1. Buka **Settings → Webhooks** pada Xendit Dashboard dalam Test Mode.
2. Gunakan URL berikut untuk webhook yang tersedia:

```text
https://DOMAIN-FITMATE/api/billing/webhook/xendit
```

3. Aktifkan event Subscription berikut:
   - `recurring.plan.activated`
   - `recurring.plan.inactivated`
   - `recurring.cycle.created`
   - `recurring.cycle.retrying`
   - `recurring.cycle.succeeded`
   - `recurring.cycle.failed`
   - `recurring.cycle.force_attempt_failed`
4. Jika Dashboard menyediakan kategori terpisah, arahkan juga event Payment Session completed/expired, Payment succeeded/failed, dan Refund succeeded/failed ke URL yang sama.
5. Copy **Webhook verification token / callback token** dari halaman Webhooks. Nilai inilah yang digunakan sebagai `XENDIT_WEBHOOK_TOKEN`.

### 5. Isi environment variable hanya di server FitMate

Buat `.env.production` di root proyek FitMate dan isi nilai sebenarnya:

```env
FITMATE_APP_URL=https://DOMAIN-FITMATE
NEXT_PUBLIC_APP_URL=https://DOMAIN-FITMATE

XENDIT_SECRET_KEY=YOUR_XENDIT_SECRET_KEY
XENDIT_WEBHOOK_TOKEN=YOUR_XENDIT_WEBHOOK_TOKEN
```

Pastikan variabel Supabase dan OpenAI yang ada di `.env.example` juga sudah terisi. Jangan pernah mengubah nama credential Xendit menjadi `NEXT_PUBLIC_XENDIT_...` karena itu akan membocorkannya ke browser.

### 6. Verifikasi koneksi dan restart FitMate

Di direktori FitMate pada VPS:

```bash
npm ci
npm run verify:xendit
npm run build
pm2 restart fitmate --update-env
```

`npm run verify:xendit` tidak menampilkan secret key. Hasil yang benar akan menunjukkan koneksi API Xendit berhasil dan menampilkan URL webhook yang harus didaftarkan.

### 7. Uji pembayaran end-to-end

1. Buat akun FitMate test baru dan login.
2. Buka `/premium`.
3. Centang persetujuan tagihan berulang.
4. Tekan **Upgrade ke Premium**.
5. Selesaikan metode pembayaran test pada hosted checkout Xendit.
6. Kembali ke FitMate dan tekan **Periksa status** bila status belum berubah otomatis.
7. Pastikan akun menjadi Premium hanya setelah webhook sukses masuk.
8. Di Supabase, cek:
   - `user_subscriptions.status` menjadi `active`;
   - `provider_plan_id` terisi;
   - `current_period_end` terisi;
   - `billing_transactions.status` berisi `succeeded`;
   - `billing_webhook_events.processed` bernilai `true`.
9. Kirim ulang webhook yang sama dari Dashboard. Transaksi tidak boleh tercatat dua kali.
10. Uji **Hentikan perpanjangan**. Tagihan berikutnya berhenti, sedangkan akses yang sudah dibayar tetap aktif sampai `current_period_end`.

### 8. Pindah ke Live Mode

Lakukan setelah seluruh pengujian Test Mode lulus:

1. Selesaikan verifikasi/KYC dan aktivasi channel pembayaran pada akun Xendit.
2. Aktifkan Subscriptions untuk Live Mode.
3. Buat secret key live yang berawalan `xnd_production_`.
4. Daftarkan ulang URL webhook pada **Live Mode** dan copy token webhook Live Mode.
5. Ganti dua credential Xendit pada `.env.production`.
6. Jalankan kembali:

```bash
npm run verify:xendit
npm run build
pm2 restart fitmate --update-env
```

7. Lakukan satu pembayaran live nominal Rp49.000 menggunakan akun internal sebelum membuka fitur Premium untuk publik.

## Arti error yang umum

| Error | Penyebab paling umum | Tindakan |
| --- | --- | --- |
| `Missing XENDIT_SECRET_KEY` | Secret key belum terbaca proses FitMate | Isi `.env.production`, lalu restart PM2 dengan `--update-env` |
| `INVALID_API_KEY` / HTTP 401 | Key salah, tertukar test/live, atau public key dipakai | Copy ulang Secret API Key pada mode yang sama |
| `REQUEST_FORBIDDEN` / HTTP 403 | Izin key atau produk Subscriptions belum aktif | Aktifkan Money-in dan minta aktivasi Subscriptions |
| `Invalid webhook token` | Token Dashboard berbeda dari server | Samakan callback token Xendit dengan `XENDIT_WEBHOOK_TOKEN` |
| Tes webhook Dashboard mengirim objek contoh | Objek tes tidak memiliki langganan lokal FitMate | Endpoint akan menyimpan dan mengakui event dengan HTTP 200 tanpa mengaktifkan Premium |
| Checkout selesai tetapi masih Free | Webhook belum masuk atau gagal diproses | Cek Webhook Logs Xendit dan `billing_webhook_events.processing_error` |
| `Payment amount mismatch` | Webhook bukan pembayaran FitMate Rp49.000 IDR | Jangan aktifkan Premium; periksa konfigurasi plan/session Xendit |
| `Unable to lock checkout` | Migrasi Premium belum dijalankan | Jalankan `supabase/FITMATE_PREMIUM_SETUP.sql` |

## Catatan keamanan

- Jangan aktifkan Premium dari query `?checkout=success`.
- Jangan memasukkan secret key Xendit ke frontend, GitHub, screenshot, atau chat.
- Gunakan token webhook berbeda untuk Test dan Live Mode.
- Backup database sebelum migrasi dan pantau Webhook Logs saat peluncuran.
- Endpoint webhook memang publik, tetapi hanya event dengan callback token Xendit yang valid yang diproses.
