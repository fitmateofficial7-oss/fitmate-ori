# FitMate v14.89 — Exercise Video Guide

## Perubahan

- 29 video MP4 exercise dari paket `video fitmate.zip` dipindahkan ke `public/exercise-videos/` dengan nama file yang stabil.
- Exercise Guide sekarang memakai video sebagai visual utama pada bagian **Langkah Gerakan**.
- Video autoplay dalam keadaan muted, loop, dan `playsInline` agar nyaman di Android/iOS WebView.
- Seluruh video dapat di-pause/play dengan menekan area video.
- Gambar langkah lama tetap dipakai sebagai poster/fallback bila video tidak tersedia.
- Mapping alias ditambahkan untuk nama exercise lama/berbeda penulisan, termasuk Forearm Plank, Treadmill Walking, Wheel Rollout, dan dumbbell press.
- Bottom navigation tidak diubah.

## QA

- 29/29 MP4 terdeteksi dan valid sebagai video H.264.
- 29/29 canonical Exercise Guide memiliki mapping video.
- Mobile UI audit PASS.
- UI content audit PASS.
- i18n audit PASS.
- premium gating audit PASS.
- import/syntax source audit 100 cycles PASS.

## Catatan

Video disimpan di dalam `public/exercise-videos`. Karena total video sekitar 44 MB, ukuran build web/APK/AAB dapat bertambah dibanding versi sebelumnya.
