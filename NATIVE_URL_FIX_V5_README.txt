FITMATE NATIVE URL FIX V5 - 2026-08-18

Masalah yang diperbaiki:
- BUILD-PLAYSTORE-AAB.bat berhenti karena CAPACITOR_SERVER_URL / FITMATE_APP_URL / NEXT_PUBLIC_APP_URL kosong.

Perbaikan:
- Production native URL sekarang memiliki fallback aman ke https://fitmate.growsia.id.
- .env.local tidak wajib hanya untuk menentukan URL native production.
- Jika CAPACITOR_SERVER_URL / FITMATE_APP_URL / NEXT_PUBLIC_APP_URL diisi, nilainya tetap lebih diprioritaskan.
- verify-native-url, native welcome, Capacitor config, dan remote policy check memakai resolver yang konsisten.
- Remote policy check tetap wajib. Build akan tetap dihentikan bila https://fitmate.growsia.id/fitmate-release.json belum memakai marker Prominent Disclosure terbaru.

Cara pakai:
1. Extract source.
2. Masukkan android\fitmate-release-signing.properties milik Play Store bila belum ada.
3. Jalankan BUILD-PLAYSTORE-AAB.bat.

Tidak perlu membuat .env.local hanya untuk mengisi URL FitMate production.
