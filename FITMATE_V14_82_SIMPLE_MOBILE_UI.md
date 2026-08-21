# FitMate v14.82 — Simple Mobile UI + Bubble Sound

## Perubahan
- Seluruh halaman aplikasi dibuat lebih ringkas pada layar <= 640px.
- Background mobile dibuat lebih tenang dan flat agar terasa seperti native utility app.
- Card, spacing, heading, form, tombol, shadow, dan radius dipadatkan tanpa mengubah fungsi halaman.
- Login/register dan landing mobile ikut diringkas agar visual lebih konsisten.
- Struktur bottom dock dipertahankan: Home, Workout, center Menu bubble, Jogging, Coach.
- Suara bubble diperbaiki agar `AudioContext` benar-benar resume sebelum tone dimainkan, termasuk WebView/Capacitor yang sebelumnya sering menelan bunyi pertama.
- Volume dan harmonic pop dinaikkan sedikit supaya tetap terdengar dari speaker HP namun tidak seperti notification beep.

## File yang diubah
- `components/floating-bubble-menu.tsx`
- `app/globals.css`
