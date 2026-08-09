# FitMate v14.73 — Growsia-style Mobile UI + AI Scope Guard

## Fokus update

Versi ini melanjutkan v14.72 tanpa menghapus fitur yang sudah ada. Perubahan difokuskan pada dua hal:

1. UI FitMate dibuat lebih sederhana, padat, dan mobile-first dengan mengambil pola navigasi/density dari Growsia versi terbaru sebagai referensi, tetapi tetap mempertahankan identitas hijau FitMate.
2. FitMate Coach dibatasi agar hanya membahas fitness, olahraga, gym, nutrisi, recovery, dan kesehatan, plus jawaban ownership FitMate yang konsisten.

## UI / UX

- Bubble/orbital menu lama diganti menjadi bottom navigation 5 slot yang lebih nyaman untuk jempol:
  - Beranda
  - Latihan
  - Jogging
  - Coach
  - Menu
- Tombol Menu membuka sheet ringkas berisi seluruh menu FitMate dalam grid 3 kolom di HP dan 5 kolom pada layar lebih besar.
- Status FREE/PREMIUM tetap tersedia di dalam menu tanpa harus membuka halaman Premium.
- Toggle bahasa dan tema dipindahkan ke menu agar tidak memenuhi layar dengan floating button.
- Spacing, ukuran heading, radius, card shadow, dan padding mobile dipadatkan secara global.
- Header/hero di halaman utama dibuat lebih ringkas. Pada HP, action yang sudah tersedia di bottom navigation tidak diduplikasi berlebihan di hero.
- Copy utama Coach, Plan, Jogging, Exercise Guide, Motivation, dan Settings dipersingkat.
- Login/Register dibuat lebih ringan pada HP melalui density rules khusus auth.
- Admin Users dan Monitoring ikut memakai density mobile yang sama.
- Legal pages tetap mempertahankan isi lengkap karena teks hukum tidak boleh dipangkas hanya demi tampilan.

## AI scope guard

File baru: `lib/fitmate-ai-scope.ts`

FitMate Coach sekarang mempunyai dua lapisan pembatas:

1. Server-side deterministic scope filter sebelum model dipanggil.
2. System instruction pada model sebagai lapisan kedua.

Topik yang diizinkan:

- fitness
- olahraga
- gym / exercise
- workout programming
- nutrisi / makanan
- recovery
- tidur / hidrasi yang relevan
- kesehatan umum
- cedera / nyeri / keterbatasan gerak dengan batas keselamatan yang sudah ada
- pertanyaan tentang FitMate

Pertanyaan yang jelas di luar topik, misalnya coding, politik, investasi, hiburan, atau trivia umum, tidak dikirim ke model. User akan mendapat jawaban singkat bahwa FitMate Coach fokus pada fitness, olahraga, gym, nutrisi, recovery, dan kesehatan. Request seperti ini tidak memakan kuota konsultasi.

### Ownership FitMate

Jika user bertanya siapa yang membuat, memiliki, mengembangkan, mengelola, atau menjalankan FitMate, server menjawab secara deterministik:

> FitMate dikelola dan dimiliki oleh PT Growsia Solusi Indonesia Maju.

Versi Inggris:

> FitMate is managed and owned by PT Growsia Solusi Indonesia Maju.

Jawaban ownership tidak memanggil model dan tidak memakan kuota konsultasi.

## Meal Scan

Meal Scan tetap khusus analisis makanan/nutrisi. Prompt diperketat agar instruksi yang tidak berkaitan di catatan/foto tidak mengalihkan endpoint dari fungsi nutrisinya.

## QA

PASS:

- `npm run audit:sql`
- `npm run audit:subscription`
- `npm run audit:premium-gates`
- `npm run audit:jogging`
- `npm run audit:imports` — 100 siklus, 9.400 file checks, 32.800 import checks, 0 broken local imports, 0 syntax errors
- `npm run audit:ui`
- `npm run audit:ai-scope`

`npm run audit:ai-scope` ditambahkan ke `check` dan `release:check`.

Full TypeScript/build tidak dapat divalidasi di sandbox ini karena ZIP tidak menyertakan `node_modules` dan dependency Next/React/Supabase tidak tersedia di environment. Audit parser/import internal proyek lulus. Jalankan `npm install`/`npm ci`, lalu `npm run check` di komputer atau CI yang memiliki dependency project.

## Database

Tidak ada migration baru untuk v14.73. Database v14.72 tetap digunakan.

## Environment

Tidak ada env baru. Tetap gunakan env v14.72, termasuk:

```env
FITMATE_ADMIN_EMAILS=email-admin@domain.com
```
