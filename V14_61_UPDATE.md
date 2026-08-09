# FitMate v14.61 – Full 29 Exercise Human Pose Recalibration

Fokus versi ini:
- kalibrasi ulang semua 29 exercise dengan pendekatan human pose normalization, bukan sekadar patch kecil
- wajah, badan, kaki, dan arah depan-belakang dipaksa lebih konsisten agar karakter tidak terlihat anomali
- basis orientasi karakter dibuat stabil agar muka tidak sering berlawanan dengan badan / kaki
- postur duduk, berlutut, hanging, standing, dan hinge dibedakan dengan profil kalibrasi masing-masing
- seated row dibuat ulang agar handle, kabel, dan posisi tangan lebih masuk akal
- offset alat terhadap tangan diperkecil dan disesuaikan agar lebih jarang menembus badan
- cable row equipment dirapikan ulang agar kursi, foot plate, kabel, dan handle lebih selaras dengan pose
- fallback standing drill tetap hidup tetapi lebih manusiawi dan konsisten

Perbaikan teknis inti:
- humanizePoseForPreset() untuk semua preset
- stabilisasi arah muka / badan menggunakan basis orientasi tetap
- penataan ulang alignment torso, pelvis, lutut, dan pergelangan per kategori pose
- audit 1000 cycles tetap lulus setelah perbaikan

Audit:
- 29 exercise preset
- 1000 cycles
- 435.000 deterministic checks
- status PASS
