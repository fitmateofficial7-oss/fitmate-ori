# FitMate V8 Remote Verify Fix — 2026-08-18

Perbaikan additive untuk komputer/ISP yang dapat membuka `fitmate-release.json` di browser tetapi me-reset Node/curl.

- Verifier mencoba Node fetch, HTTPS IPv4, curl HTTP/1.1 + TLS 1.2, lalu Chrome/Edge headless.
- Jika semua koneksi otomatis gagal, builder membuka marker production di browser dan meminta konfirmasi Y/N.
- Jalur manual tetap memvalidasi `public/fitmate-release.json` terhadap package, disclosure version, dan `ACCESS_BACKGROUND_LOCATION=false`.
- Tidak mengubah UI, database, billing, permission, jogging, entitlement, atau signing.
