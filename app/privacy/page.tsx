import LegalDocumentPage, {
  type LegalDocumentCopy,
} from "@/components/legal-document-page";
import { FITMATE_PRIVACY_VERSION } from "@/lib/legal";

const officialSources = [
  {
    label: "UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi",
    href: "https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022",
  },
  {
    label: "PP No. 71 Tahun 2019 tentang Penyelenggaraan Sistem dan Transaksi Elektronik",
    href: "https://peraturan.bpk.go.id/Details/122030/pp-no-71-tahun-2019",
  },
  {
    label: "PP No. 80 Tahun 2019 tentang Perdagangan Melalui Sistem Elektronik",
    href: "https://peraturan.bpk.go.id/Details/126143/pp-no-80-tahun-2019",
  },
];

const officialSourcesEn = [
  {
    label: "Law No. 27 of 2022 on Personal Data Protection",
    href: "https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022",
  },
  {
    label: "Government Regulation No. 71 of 2019 on Electronic Systems and Transactions",
    href: "https://peraturan.bpk.go.id/Details/122030/pp-no-71-tahun-2019",
  },
  {
    label: "Government Regulation No. 80 of 2019 on Electronic Commerce",
    href: "https://peraturan.bpk.go.id/Details/126143/pp-no-80-tahun-2019",
  },
];

const copyId: LegalDocumentCopy = {
  title: "Kebijakan Privasi",
  summary:
    "Kebijakan ini menjelaskan data yang diproses FitMate, tujuan pemrosesan, pihak yang membantu menyediakan layanan, serta kontrol dan hak pengguna.",
  updatedLabel: "Berlaku sejak",
  sections: [
    {
      heading: "Pengendali data",
      paragraphs: [
        "PT Growsia Solusi Indonesia Maju mengoperasikan FitMate dan bertindak sebagai pengendali data pribadi untuk pemrosesan yang dijelaskan dalam kebijakan ini.",
      ],
    },
    {
      heading: "Data yang kami proses",
      bullets: [
        "Data akun, seperti email, identitas akun, waktu pendaftaran, dan informasi autentikasi yang dikelola secara aman.",
        "Profil fitness, termasuk tujuan, pengalaman, usia, jenis kelamin, tinggi, berat, cedera, keterbatasan gerak, dan preferensi latihan.",
        "Aktivitas aplikasi, seperti program latihan, log set, progres, jurnal makanan, konsultasi AI, dan penggunaan kuota.",
        "Data opsional yang sensitif, seperti foto progres, gambar makanan, jawaban kesiapan, dan data lokasi presisi (GPS), termasuk titik koordinat serta rute jogging, apabila fitur jogging digunakan.",
        "Data transaksi yang diperlukan untuk mencocokkan status Premium. FitMate tidak menyimpan nomor kartu lengkap, PIN, OTP, atau secret key pembayaran.",
        "Log teknis yang diminimalkan untuk keamanan, pencegahan penyalahgunaan, pemecahan masalah, dan keandalan layanan.",
      ],
    },
    {
      heading: "Data lokasi dan lokasi latar belakang",
      paragraphs: [
        "FitMate menggunakan lokasi hanya untuk fitur Jogging yang kamu mulai sendiri. Rinciannya:",
      ],
      bullets: [
        "Data yang diakses: lokasi presisi (GPS), termasuk koordinat lintang/bujur, waktu titik lokasi, akurasi, kecepatan, elevasi/ketinggian bila tersedia, dan rangkaian titik yang membentuk rute Jogging.",
        "Kapan akses dimulai: hanya setelah kamu memilih Mulai/Lanjutkan Jogging, melihat pengungkapan lokasi di dalam aplikasi, lalu memberikan izin lokasi Android yang diminta.",
        "Penggunaan di latar belakang: selama sesi Jogging aktif, FitMate dapat mengakses lokasi di background saat aplikasi diminimalkan, layar dimatikan, ditutup dari tampilan, atau tidak sedang digunakan agar rute dan statistik tidak terputus.",
        "Tujuan: menampilkan posisi dan rute, menghitung jarak, pace, kecepatan, durasi, elevasi, split, serta statistik aktivitas Jogging yang kamu minta.",
        "Batas penggunaan: FitMate tidak melacak lokasi secara terus-menerus di luar sesi Jogging aktif dan tidak meminta lokasi untuk iklan atau analitik pemasaran.",
        "Penyimpanan: titik/rute dapat disimpan sementara di perangkat agar sesi tetap berjalan. Saat aktivitas disimpan, data dapat disinkronkan ke database FitMate untuk menampilkan riwayat Jogging di akunmu.",
        "Berbagi: data lokasi tidak dijual dan tidak digunakan untuk iklan, profil pemasaran, atau penargetan iklan. Rute hanya dibagikan kepada orang lain ketika kamu sendiri memakai fitur Bagikan dan memilih media yang akan dibagikan.",
        "Penyedia layanan: data lokasi dapat diproses oleh infrastruktur/penyimpanan yang membantu FitMate menjalankan sinkronisasi, keamanan, dan riwayat aktivitas, hanya sejauh diperlukan untuk menyediakan layanan.",
        "Retensi: data rute yang disimpan dipertahankan selama diperlukan untuk riwayat aktivitas atau akun, kecuali harus dipertahankan lebih lama karena kewajiban hukum. Penghapusan aktivitas/akun mengikuti kontrol yang tersedia di FitMate.",
        "Kontrol pengguna: kamu dapat menolak atau mencabut izin lokasi kapan saja melalui pengaturan perangkat. Tanpa izin, fitur lain tetap dapat digunakan, tetapi GPS Jogging dan statistik berbasis lokasi dapat tidak berfungsi.",
        "Penghentian: menekan Selesai menghentikan pelacakan sesi. Force-stop aplikasi juga menghentikan sesi native yang aktif.",
        "Privasi rute: rute dapat mengungkap lokasi sensitif seperti rumah atau tempat kerja; periksa kartu/media sebelum membagikannya.",
      ],
    },
    {
      heading: "Tujuan dan dasar pemrosesan",
      paragraphs: [
        "Data diproses untuk membuat dan memelihara akun, mempersonalisasi latihan, menyediakan fitur yang diminta, mengaktifkan Premium, menjaga keamanan, memenuhi kewajiban hukum, dan menangani permintaan pengguna.",
        "Bergantung pada aktivitasnya, pemrosesan dilakukan berdasarkan persetujuan, pelaksanaan layanan yang diminta pengguna, kewajiban hukum, perlindungan kepentingan penting, atau kepentingan sah yang telah dinilai sesuai peraturan yang berlaku.",
      ],
    },
    {
      heading: "Pemrosesan AI",
      paragraphs: [
        "Pesan, data profil yang relevan, atau gambar makanan yang dikirim ke fitur AI dapat diteruskan ke penyedia AI yang dikonfigurasi untuk menghasilkan jawaban. Jangan mengirim identitas, informasi medis, atau data pihak lain yang tidak diperlukan.",
        "Hasil AI dan telemetri penggunaan yang diminimalkan dapat disimpan untuk menampilkan riwayat, menerapkan kuota, memperbaiki mutu, dan mengamankan layanan.",
      ],
    },
    {
      heading: "Penyedia dan penerima data",
      bullets: [
        "Supabase untuk autentikasi, database, dan penyimpanan privat.",
        "OpenAI atau penyedia AI yang dikonfigurasi untuk fitur AI yang diminta pengguna.",
        "Xendit untuk pembuatan sesi pembayaran, pemrosesan transaksi, status, dan pencegahan penipuan.",
        "Penyedia hosting, keamanan, dan pemantauan yang diperlukan untuk menjalankan aplikasi.",
        "Otoritas atau pihak lain apabila diwajibkan hukum atau diperlukan untuk melindungi hak dan keamanan.",
      ],
    },
    {
      heading: "Transfer dan lokasi pemrosesan",
      paragraphs: [
        "Sebagian penyedia dapat memproses data melalui infrastruktur di luar Indonesia. Jika transfer lintas negara terjadi, kami akan menggunakan mekanisme dan perlindungan yang diwajibkan hukum yang berlaku serta membatasi data sesuai kebutuhan layanan.",
      ],
    },
    {
      heading: "Penyimpanan dan penghapusan",
      paragraphs: [
        "Data disimpan selama akun aktif atau selama diperlukan untuk tujuan yang dijelaskan. Pengguna dapat mengunduh data dan meminta penghapusan akun melalui Pengaturan. Catatan transaksi, keamanan, sengketa, dan kepatuhan tertentu dapat dipertahankan secara terbatas apabila diwajibkan hukum atau diperlukan untuk melindungi hak yang sah.",
      ],
    },
    {
      heading: "Hak dan kontrol pengguna",
      bullets: [
        "Meminta akses, salinan, perbaikan, pembaruan, atau penghapusan data sesuai hukum yang berlaku.",
        "Menarik persetujuan untuk pemrosesan berbasis persetujuan tanpa memengaruhi pemrosesan yang telah sah sebelumnya.",
        "Mengunduh data akun, menghapus akun, atau tidak menggunakan fitur opsional seperti foto, AI, dan GPS.",
        "Mengajukan keberatan, pertanyaan, atau keluhan terkait pemrosesan data.",
      ],
    },
    {
      heading: "Keamanan dan insiden",
      paragraphs: [
        "FitMate menggunakan kontrol akses, Row Level Security, penyimpanan privat, validasi server, dan pembatasan secret key. Tidak ada sistem yang sepenuhnya bebas risiko. Apabila terjadi insiden yang memenuhi kewajiban pemberitahuan, kami akan mengambil langkah penanganan dan memberikan informasi sesuai hukum yang berlaku.",
      ],
    },
    {
      heading: "Anak dan perubahan kebijakan",
      paragraphs: [
        "Pengguna yang belum dapat memberikan persetujuan secara mandiri berdasarkan hukum yang berlaku harus melibatkan orang tua atau wali. Perubahan material pada kebijakan ini akan disampaikan melalui aplikasi atau sarana kontak yang tersedia.",
      ],
    },
  ],
  sourcesTitle: "Rujukan peraturan resmi",
  sources: officialSources,
  contactTitle: "Permintaan privasi",
  contactText: "Kirim permintaan akses, koreksi, penghapusan, atau pertanyaan privasi ke alamat dukungan FitMate.",
  backLabel: "Kembali ke Pengaturan",
};

const copyEn: LegalDocumentCopy = {
  title: "Privacy Policy",
  summary:
    "This policy explains the data FitMate processes, why it is processed, the providers that help deliver the service, and the controls and rights available to users.",
  updatedLabel: "Effective date",
  sections: [
    {
      heading: "Data controller",
      paragraphs: [
        "PT Growsia Solusi Indonesia Maju operates FitMate and acts as the personal-data controller for the processing described in this policy.",
      ],
    },
    {
      heading: "Data we process",
      bullets: [
        "Account data, such as email, account identifiers, registration time, and securely managed authentication information.",
        "Fitness profile data, including goals, experience, age, gender, height, weight, injuries, movement limitations, and exercise preferences.",
        "App activity, including workout plans, set logs, progress, food journal entries, AI consultations, and quota usage.",
        "Optional sensitive data, such as progress photos, meal images, readiness answers, and precise location (GPS) data, including coordinate points and jogging routes, when the jogging feature is used.",
        "Transaction data needed to match Premium status. FitMate does not store full card numbers, PINs, OTPs, or payment secret keys.",
        "Minimized technical logs for security, abuse prevention, troubleshooting, and service reliability.",
      ],
    },
    {
      heading: "Location data and background location",
      paragraphs: [
        "FitMate uses location only for a Jogging session that you start yourself. Details:",
      ],
      bullets: [
        "Data accessed: precise location (GPS), including latitude/longitude coordinates, location timestamps, accuracy, speed, elevation/altitude when available, and the sequence of points that forms your Jogging route.",
        "When access starts: only after you choose Start/Resume Jogging, see the in-app location disclosure, and grant the requested Android location permission.",
        "Background use: while a Jogging session is active, FitMate may access location in the background, when the app is minimized, the screen is off, the app is closed from view, or the app is not in use so route and workout statistics can continue without interruption.",
        "Purpose: to show your position and route and calculate distance, pace, speed, duration, elevation, splits, and other Jogging statistics you requested.",
        "Usage limit: FitMate does not continuously track location outside an active Jogging session and does not request location for advertising or marketing analytics.",
        "Storage: route points may be stored temporarily on your device to keep the session running. When you save the activity, route data may be synchronized to FitMate's database to show Jogging history in your account.",
        "Sharing: location data is not sold and is not used for advertising, marketing profiles, or ad targeting. A route is shared with other people only when you intentionally use Share and choose the media to share.",
        "Service providers: location data may be processed by infrastructure/storage providers that support synchronization, security, and activity history, only as needed to provide FitMate services.",
        "Retention: saved route data is kept as needed for activity history or account functionality unless a longer period is legally required. Activity/account deletion follows the controls available in FitMate.",
        "User control: you can deny or revoke location permission at any time in device settings. Other FitMate features remain usable, but GPS Jogging and location-based statistics may not work without permission.",
        "Stopping tracking: tapping Finish stops session tracking. Force-stopping the app also ends an active native session.",
        "Route privacy: routes may reveal sensitive places such as your home or workplace; review a card or media before sharing it.",
      ],
    },
    {
      heading: "Purposes and legal grounds",
      paragraphs: [
        "Data is processed to create and maintain accounts, personalize workouts, provide requested features, activate Premium, protect security, comply with legal duties, and handle user requests.",
        "Depending on the activity, processing relies on consent, performance of the user-requested service, legal obligations, protection of vital interests, or assessed legitimate interests under applicable law.",
      ],
    },
    {
      heading: "AI processing",
      paragraphs: [
        "Messages, relevant profile data, or meal images submitted to AI features may be sent to the configured AI provider to produce the requested response. Do not submit unnecessary identity, medical, or third-party information.",
        "AI results and minimized usage telemetry may be retained to show history, enforce quotas, improve quality, and secure the service.",
      ],
    },
    {
      heading: "Providers and recipients",
      bullets: [
        "Supabase for authentication, databases, and private storage.",
        "OpenAI or the configured AI provider for user-requested AI features.",
        "Xendit for payment sessions, transaction processing, status, and fraud prevention.",
        "Hosting, security, and monitoring providers needed to run the app.",
        "Authorities or other parties when required by law or necessary to protect rights and safety.",
      ],
    },
    {
      heading: "Transfers and processing locations",
      paragraphs: [
        "Some providers may process data through infrastructure outside Indonesia. Where a cross-border transfer occurs, we will apply mechanisms and safeguards required by applicable law and limit data to service needs.",
      ],
    },
    {
      heading: "Retention and deletion",
      paragraphs: [
        "Data is retained while the account is active or as needed for the stated purposes. Users can download their data and request account deletion in Settings. Limited transaction, security, dispute, and compliance records may be retained where legally required or needed to protect legitimate rights.",
      ],
    },
    {
      heading: "User rights and controls",
      bullets: [
        "Request access, a copy, correction, updating, or deletion under applicable law.",
        "Withdraw consent for consent-based processing without affecting earlier lawful processing.",
        "Download account data, delete the account, or avoid optional photo, AI, and GPS features.",
        "Raise an objection, question, or complaint about personal-data processing.",
      ],
    },
    {
      heading: "Security and incidents",
      paragraphs: [
        "FitMate uses access controls, Row Level Security, private storage, server-side validation, and secret-key restrictions. No system is entirely risk-free. If an incident triggers notification duties, we will respond and provide information as required by applicable law.",
      ],
    },
    {
      heading: "Children and policy changes",
      paragraphs: [
        "Users who cannot independently consent under applicable law must involve a parent or guardian. Material policy changes will be communicated through the app or available contact channels.",
      ],
    },
  ],
  sourcesTitle: "Official regulatory references",
  sources: officialSourcesEn,
  contactTitle: "Privacy requests",
  contactText: "Send requests for access, correction, deletion, or privacy questions to FitMate support.",
  backLabel: "Back to Settings",
};

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      version={FITMATE_PRIVACY_VERSION}
      copyId={copyId}
      copyEn={copyEn}
      supportEmail={process.env.NEXT_PUBLIC_FITMATE_SUPPORT_EMAIL}
    />
  );
}
