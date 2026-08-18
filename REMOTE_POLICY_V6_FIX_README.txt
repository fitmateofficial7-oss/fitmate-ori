FITMATE REMOTE POLICY VERIFIER V6 - 2026-08-18

Masalah yang diperbaiki:
- Node.js dapat menampilkan `fetch failed` di Windows walaupun browser masih dapat membuka domain.
- Builder V5 menyatukan error jaringan dan server lama menjadi satu pesan sehingga diagnosis kurang tepat.

V6 melakukan verifikasi berlapis:
1. Node fetch dengan IPv4 diprioritaskan.
2. Node HTTPS native dipaksa IPv4.
3. Fallback curl.exe IPv4 dengan redirect + retry.
4. Jika semua gagal, builder menampilkan detail error setiap metode.
5. AAB tetap TIDAK dibuild bila remote marker tidak bisa diverifikasi, agar reviewer Google Play tidak mendapat UI disclosure lama.

Marker production yang wajib tersedia:
https://fitmate.growsia.id/fitmate-release.json

Nilai wajib:
- packageName = com.growsia.fitmate
- locationDisclosureVersion = 2026-08-17-prominent-disclosure-v3
- accessBackgroundLocationDeclared = false

Catatan:
V6 tidak menghapus safety check dan tidak mem-bypass kebijakan Google Play.
