FITMATE - ANDROID API 36 LICENSE FIX V6
Tanggal: 2026-08-18

Masalah yang diperbaiki:
- sdkmanager menampilkan "Accept? (y/N)" tetapi jawaban otomatis tidak masuk.
- Paket build-tools;36.0.0, platforms;android-36, dan platform-tools kemudian dilewati.
- Verifikasi gagal karena platforms\android-36\android.jar belum ada.

Perbaikan:
- Penerimaan license sekarang menggunakan file input sementara yang di-redirect ke stdin sdkmanager.
- Tidak lagi menggunakan pipe `(echo y) | call sdkmanager.bat`, yang bermasalah pada sebagian konfigurasi CMD Windows.
- Exit code `sdkmanager --licenses` dan instalasi paket diperiksa.
- Verifikasi memastikan android.jar, Build-Tools 36.0.0, dan Platform-Tools benar-benar ada.
- INSTALL-ANDROID-API36-V2.bat lama sekarang hanya meneruskan ke installer V6 terbaru.

Cara pakai:
1. Jalankan BUILD-PLAYSTORE-AAB.bat seperti biasa.
2. Jika API 36 belum terpasang, builder otomatis menjalankan INSTALL-ANDROID-API36.bat /AUTO.
3. Tunggu sampai muncul "ANDROID API 36 SIAP".
4. Build AAB akan lanjut otomatis.

Tidak perlu PowerShell.
