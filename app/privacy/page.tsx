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
        "FitMate mengakses dan mengumpulkan data lokasi presisi (GPS) hanya ketika pengguna memilih menggunakan fitur Jogging. Data ini digunakan untuk merekam rute, menghitung jarak, pace, kecepatan, durasi, elevasi, dan statistik aktivitas terkait.",
        "Saat pengguna memulai sesi Jogging, FitMate menggunakan layanan lokasi latar depan Android agar sesi aktif dapat terus mengakses lokasi ketika aplikasi diminimalkan atau layar dimatikan. Android dapat menampilkan notifikasi sistem berkelanjutan selama pelacakan sesi aktif berlangsung.",
        "Pelacakan lokasi hanya dimulai setelah pengguna menekan tombol untuk memulai atau melanjutkan sesi Jogging dan secara aktif melanjutkan dari pengungkapan lokasi di aplikasi. FitMate tidak menggunakan lokasi untuk memantau pengguna secara terus-menerus di luar sesi Jogging aktif.",
        "Titik lokasi dan rute dari sesi Jogging dapat disimpan sementara di perangkat untuk menjaga sesi tetap berjalan dan, setelah aktivitas disimpan, dapat disinkronkan ke database FitMate agar riwayat aktivitas dapat ditampilkan kembali. Data lokasi tidak dijual dan tidak digunakan untuk iklan, profil pemasaran, atau penargetan iklan.",
        "Pengguna dapat menolak atau mencabut izin lokasi kapan saja melalui pengaturan perangkat. Jika izin lokasi tidak diberikan, FitMate tetap dapat digunakan, tetapi fitur Jogging yang membutuhkan GPS, perekaman rute, dan statistik berbasis lokasi mungkin tidak berfungsi. Mengakhiri sesi Jogging menghentikan pelacakan oleh FitMate; melakukan force-stop pada aplikasi juga menghentikan sesi native yang sedang berjalan.",
        "FitMate hanya membagikan rute kepada pihak lain apabila pengguna sendiri memilih fungsi berbagi aktivitas. Pengguna disarankan memeriksa isi kartu atau media yang dibagikan karena rute dapat mengungkap lokasi yang sensitif.",
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
        "FitMate accesses and collects precise location (GPS) data only when you choose to use the Jogging feature. This data is used to record your route and calculate distance, pace, speed, duration, elevation, and related workout statistics.",
        "When you start a Jogging session, FitMate uses an Android location foreground service so the active session can continue accessing location while the app is minimized or the screen is off. Android may display an ongoing system notification while this active-session tracking is running.",
        "Location tracking starts only after you choose to start or resume a Jogging session and affirmatively continue from the in-app location disclosure. FitMate does not continuously monitor your location outside an active Jogging session.",
        "Location points and route data from a Jogging session may be stored temporarily on your device to preserve the active session and, after the activity is saved, may be synchronized to FitMate's database so your activity history can be restored. Location data is not sold and is not used for advertising, marketing profiles, or ad targeting.",
        "You may deny or revoke location permission at any time in your device settings. If location permission is not granted, FitMate remains usable, but GPS-based Jogging, route recording, and location-based workout statistics may not function. Ending a Jogging session stops FitMate tracking; force-stopping the app also ends an active native session.",
        "FitMate shares route information with other people only when you intentionally use an activity-sharing feature. Review any card or media before sharing because a route can reveal sensitive locations.",
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
