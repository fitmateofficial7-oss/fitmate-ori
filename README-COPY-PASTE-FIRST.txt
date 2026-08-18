FITMATE READY COPY-PASTE V7 — 2026-08-18

1. Extract ZIP ini.
2. Copy SEMUA isi hasil extract langsung ke ROOT project FitMate kamu.
3. Jika Windows bertanya Replace/Merge, pilih Replace files in destination.
4. JANGAN timpa credential production asli (.env/.env.production, keystore, fitmate-release-signing.properties).
5. Commit/push/deploy source web ini ke fitmate.growsia.id.
6. Pastikan https://fitmate.growsia.id/fitmate-release.json menampilkan JSON, bukan 404.
7. Setelah web production benar, jalankan BUILD-PLAYSTORE-AAB.bat untuk AAB baru.

V7 menambahkan compatibility alias Exercise2DPreset dan prebuild guard agar error TypeScript
exercise-pose-thumbnail tidak muncul lagi walaupun folder tujuan masih memiliki komponen lama.
