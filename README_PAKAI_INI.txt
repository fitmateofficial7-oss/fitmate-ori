FITMATE - PAKAI SOURCE INI UNTUK PERBAIKAN GOOGLE PLAY
======================================================
Versi perbaikan: 2026-08-17 / Prominent Disclosure v3
Package: com.growsia.fitmate

MASALAH YANG DIPERBAIKI
-----------------------
Google Play menolak FitMate karena layar yang muncul sebelum/ketika lokasi diminta
belum menjelaskan penggunaan data lokasi secara memadai.

Source ini memperbaiki alur menjadi:
Jogging -> Mulai/Lanjutkan -> disclosure FitMate -> Setuju & Izinkan Lokasi
-> baru permission/lokasi Android -> tracking dimulai.

PENTING: SOURCE ANDROID FITMATE MEMBUKA WEB FITMATE PRODUKSI
-----------------------------------------------------------
Karena itu, JANGAN langsung build AAB setelah mengganti source lokal.
Deploy source web terbaru ke server FitMate terlebih dahulu.

URUTAN YANG BENAR
-----------------
1. Salin source ini ke project FitMate utama.
2. Pastikan file env lokal mengarah ke URL HTTPS FitMate produksi:
   CAPACITOR_SERVER_URL=...
   FITMATE_APP_URL=...
   NEXT_PUBLIC_APP_URL=...
3. Deploy source web terbaru ke server produksi FitMate.
4. Pastikan URL berikut dapat dibuka dari internet:
   https://DOMAIN-FITMATE/fitmate-release.json
5. Nilai locationDisclosureVersion harus:
   2026-08-17-prominent-disclosure-v3
6. Setelah server benar-benar terbaru, jalankan:
   BUILD-PLAYSTORE-AAB.bat
7. BAT sekarang akan MENOLAK build apabila server masih memakai UI/disclosure lama.
8. BAT juga memeriksa source manifest dan merged manifest agar
   ACCESS_BACKGROUND_LOCATION tidak ikut masuk ke AAB.
9. Upload hanya AAB BARU dengan versionCode yang lebih tinggi.

JANGAN PAKAI BUILDER LAMA
-------------------------
BUILD_FITMATE_AAB_AUTO_VERSION.bat sekarang hanya meneruskan ke builder resmi:
BUILD-PLAYSTORE-AAB.bat

TEST WAJIB SEBELUM UPLOAD
-------------------------
A. Bersihkan data/install app baru.
B. Buka FitMate -> Jogging -> tekan Mulai.
C. Modal "Penggunaan Data Lokasi" HARUS muncul SEBELUM dialog Android apa pun.
D. Tekan "Tidak Setuju": tidak boleh ada permission Android dan GPS tidak berjalan.
E. Tekan Mulai lagi -> "Setuju & Izinkan Lokasi".
F. Baru setelah itu dialog/lokasi Android boleh muncul.
G. Izinkan, mulai Jogging, minimalkan app/matikan layar, pastikan notifikasi tracking aktif.
H. Akhiri Jogging, pastikan tracking berhenti.
I. Ulangi dengan layanan Location/GPS perangkat dalam keadaan OFF. Disclosure FitMate
   tetap harus muncul lebih dulu; setelah setuju barulah Android boleh meminta lokasi aktif.

CATATAN SIGNING
---------------
Source ini tidak menyertakan password signing atau private upload keystore.
Gunakan fitmate-release-signing.properties dan upload key milikmu yang sudah ada
secara lokal. Jangan commit file tersebut.

DOKUMEN PANDUAN
---------------
Baca: PLAY_CONSOLE_SUBMISSION_GUIDE_20260817.md
QA: FITMATE_LOCATION_FIX_QA_RESULTS.txt
