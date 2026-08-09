# FitMate v14.74 — Simple Bubble UI + Persistent Rest Timer

Versi ini melanjutkan v14.73. Tidak ada migration database baru.

## UI

- Navigasi mobile kembali memakai pola bubble seperti Growsia.
- Empat shortcut tetap terlihat: Beranda, Latihan, Jogging, Coach.
- Tombol Menu menjadi bubble hijau di tengah.
- Menu lengkap memakai grid ringkas tanpa deskripsi tambahan pada setiap item.
- Status Free/Premium, tema, dan bahasa tetap tersedia di panel Menu.
- Padding, card, radius, heading, dan tombol dipadatkan untuk layar kecil.
- Copy pada halaman utama aplikasi dipangkas agar langsung ke inti.
- Landing, Login, Register, Dashboard, Plan, Workout, Jogging, Exercises, Progress, Nutrition, Coach, Settings, Premium, Motivation, Onboarding, dan halaman admin mendapat aturan mobile yang lebih ringkas.
- Legal pages tidak dipotong karena teks tersebut memang harus tetap lengkap.

## Rest Timer

Rest timer sekarang tidak lagi bergantung pada jumlah `setInterval` yang sempat berjalan.
Timer menyimpan `endsAt` (waktu selesai absolut), sehingga ketika browser/app masuk background atau layar mati, hitungan akan langsung disinkronkan ke waktu yang benar saat proses aktif kembali.

State timer disimpan di localStorage sehingga tidak reset hanya karena render/navigation biasa.

### Android/iOS Capacitor

- Menggunakan `@capacitor/local-notifications` yang sudah ada di dependency project.
- Local notification dijadwalkan saat timer dimulai.
- Android memakai notification channel ber-prioritas tinggi dan `allowWhileIdle`.
- Script native menambahkan `POST_NOTIFICATIONS` dan `SCHEDULE_EXACT_ALARM` ke Android Manifest setelah project native tersedia.
- Notification memiliki aksi `Matikan` untuk membersihkan timer.
- Saat FitMate aktif, alarm in-app terus berulang sampai tombol Matikan ditekan.

Setelah menambah/generasi platform native, jalankan:

```bash
npm run native:sync
```

Android 12+ tetap memberi pengguna kontrol untuk menonaktifkan exact alarms di pengaturan sistem. Jika exact alarm dinonaktifkan oleh pengguna, Android dapat menunda notification.

### Browser / PWA

Countdown tetap akurat karena memakai timestamp, bukan menghitung detik satu per satu. Web notification diminta saat user memulai timer bila browser mendukungnya. Namun browser/OS dapat menangguhkan JavaScript saat layar mati, sehingga alarm background yang paling andal tersedia pada build native Android/iOS.

## AI Scope

Pembatas v14.73 tetap dipertahankan:

- fitness
- olahraga
- gym
- nutrisi
- recovery
- kesehatan yang relevan

Pertanyaan kepemilikan FitMate tetap dijawab bahwa FitMate dikelola dan dimiliki oleh PT Growsia Solusi Indonesia Maju.

## QA

Audit yang tersedia:

```bash
npm run audit:mobile-ui
npm run audit:timer
npm run audit:ai-scope
npm run audit:imports
npm run audit:ui
npm run audit:jogging
npm run audit:subscription
npm run audit:premium-gates
npm run audit:sql
```

Full `npm ci`, typecheck, dan build tidak dapat diselesaikan di sandbox pembuatan release karena registry internal tidak menyediakan `zod-validation-error@4.0.2`. Jalankan `npm ci && npm run check` pada komputer/CI yang memiliki akses registry normal sebelum production deploy.
