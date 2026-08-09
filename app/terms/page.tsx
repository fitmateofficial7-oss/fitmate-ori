import LegalDocumentPage, {
  type LegalDocumentCopy,
} from "@/components/legal-document-page";
import { FITMATE_TERMS_VERSION } from "@/lib/legal";

const officialSources = [
  {
    label: "UU No. 8 Tahun 1999 tentang Perlindungan Konsumen",
    href: "https://peraturan.bpk.go.id/Details/45288/uu-no-8-tahun-1999",
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

const copyId: LegalDocumentCopy = {
  title: "Ketentuan Penggunaan",
  summary:
    "Ketentuan ini mengatur penggunaan FitMate AI, tanggung jawab pengguna, batasan panduan AI, dan hubungan pengguna dengan PT Growsia Solusi Indonesia Maju.",
  updatedLabel: "Berlaku sejak",
  sections: [
    {
      heading: "Operator dan penerimaan ketentuan",
      paragraphs: [
        "FitMate AI dikembangkan dan dioperasikan oleh PT Growsia Solusi Indonesia Maju. Dengan membuat akun atau menggunakan FitMate, pengguna menyatakan telah membaca dan menyetujui Ketentuan Penggunaan serta Kebijakan Privasi yang berlaku.",
      ],
    },
    {
      heading: "Sifat layanan fitness",
      paragraphs: [
        "FitMate menyediakan informasi kebugaran, latihan, jogging, dan nutrisi untuk tujuan edukasi. FitMate bukan layanan medis, diagnosis, terapi, atau penanganan keadaan darurat.",
        "Hentikan latihan dan cari bantuan yang sesuai jika mengalami nyeri tajam, nyeri dada, pingsan, sesak berat, atau gejala mengkhawatirkan lainnya. Pengguna dengan kondisi kesehatan atau riwayat cedera sebaiknya meminta arahan tenaga kesehatan sebelum latihan intensif.",
      ],
    },
    {
      heading: "Batasan AI dan panduan visual",
      paragraphs: [
        "Rencana latihan, jawaban AI, estimasi nutrisi, kalori, dan animasi gerakan 3D dapat tidak lengkap atau tidak akurat. Hasil harus ditinjau dengan pertimbangan pengguna dan tidak boleh menjadi satu-satunya dasar keputusan medis atau keselamatan.",
      ],
    },
    {
      heading: "Akun dan keamanan",
      bullets: [
        "Gunakan informasi akun yang benar dan jaga password serta kode verifikasi tetap rahasia.",
        "Satu akun digunakan oleh pemilik akun dan tidak boleh diperjualbelikan atau dipakai untuk menghindari batas penggunaan.",
        "Pengguna bertanggung jawab atas aktivitas yang dilakukan melalui akunnya sampai akses tidak sah dilaporkan.",
      ],
    },
    {
      heading: "Penggunaan yang diperbolehkan",
      bullets: [
        "Dilarang menyerang, mengganggu, membebani, merekayasa balik, atau mencoba melewati keamanan dan batas kuota FitMate.",
        "Dilarang mengunggah materi melanggar hukum, merugikan orang lain, atau materi yang pengguna tidak berhak proses.",
        "FitMate dapat membatasi akun untuk melindungi pengguna, sistem, dan layanan apabila ditemukan penyalahgunaan atau risiko keamanan.",
      ],
    },
    {
      heading: "Paket Free dan Premium",
      paragraphs: [
        "Hak penggunaan setiap paket ditampilkan pada aplikasi. Paket Free memiliki kuota terbatas. Premium memberi kuota lebih besar selama masa akses aktif, termasuk maksimal 10 pembuatan ulang program latihan per minggu dengan reset setiap Senin pukul 00.00 WIB.",
        "Harga, cara pembayaran, masa akses, perpanjangan, dan pembatalan Premium diatur lebih lanjut pada Ketentuan Langganan.",
      ],
    },
    {
      heading: "Ketersediaan dan perubahan layanan",
      paragraphs: [
        "Kami berupaya menjaga layanan tetap tersedia, tetapi pemeliharaan, gangguan penyedia, keamanan, atau keadaan di luar kendali dapat menyebabkan layanan sementara tidak tersedia. Perubahan material terhadap ketentuan akan diberitahukan melalui aplikasi atau sarana kontak yang tersedia.",
      ],
    },
    {
      heading: "Hak kekayaan intelektual",
      paragraphs: [
        "Nama, merek, antarmuka, materi, kode, dan aset FitMate dimiliki atau digunakan secara sah oleh operator dan pemberi lisensinya. Pengguna tetap memiliki konten pribadi yang diunggah, tetapi memberikan izin terbatas untuk memprosesnya sejauh diperlukan untuk menyediakan fitur yang diminta.",
      ],
    },
    {
      heading: "Hak konsumen dan penyelesaian masalah",
      paragraphs: [
        "Tidak ada bagian dari ketentuan ini yang dimaksudkan untuk menghapus hak konsumen yang tidak dapat dikesampingkan berdasarkan hukum Indonesia. Pengguna diminta menghubungi dukungan terlebih dahulu agar masalah dapat diperiksa dan diselesaikan secara wajar.",
      ],
    },
  ],
  sourcesTitle: "Rujukan peraturan resmi",
  sources: officialSources,
  contactTitle: "Kontak",
  contactText: "Pertanyaan mengenai ketentuan atau penggunaan layanan dapat dikirim ke alamat dukungan FitMate.",
  backLabel: "Kembali ke Pengaturan",
};

const copyEn: LegalDocumentCopy = {
  title: "Terms of Use",
  summary:
    "These terms govern the use of FitMate AI, user responsibilities, AI limitations, and the relationship between users and PT Growsia Solusi Indonesia Maju.",
  updatedLabel: "Effective date",
  sections: [
    {
      heading: "Operator and acceptance",
      paragraphs: [
        "FitMate AI is developed and operated by PT Growsia Solusi Indonesia Maju. By creating an account or using FitMate, you confirm that you have read and accepted the current Terms of Use and Privacy Policy.",
      ],
    },
    {
      heading: "Nature of the fitness service",
      paragraphs: [
        "FitMate provides educational fitness, exercise, jogging, and nutrition information. It is not medical care, diagnosis, treatment, or an emergency service.",
        "Stop exercising and seek suitable assistance if you experience sharp pain, chest pain, fainting, severe shortness of breath, or other concerning symptoms. Users with health conditions or previous injuries should seek professional guidance before intensive exercise.",
      ],
    },
    {
      heading: "AI and visual-guide limitations",
      paragraphs: [
        "Workout plans, AI answers, nutrition or calorie estimates, and 3D movement animations may be incomplete or inaccurate. Results require user judgment and must not be the sole basis for medical or safety decisions.",
      ],
    },
    {
      heading: "Accounts and security",
      bullets: [
        "Provide accurate account information and keep passwords and verification codes confidential.",
        "An account is for its owner and must not be sold or used to bypass usage limits.",
        "You remain responsible for account activity until unauthorized access is reported.",
      ],
    },
    {
      heading: "Acceptable use",
      bullets: [
        "Do not attack, disrupt, overload, reverse engineer, or bypass FitMate security or quotas.",
        "Do not upload unlawful content, content that harms others, or content you have no right to process.",
        "FitMate may restrict an account to protect users, systems, and the service when abuse or a security risk is detected.",
      ],
    },
    {
      heading: "Free and Premium plans",
      paragraphs: [
        "Each plan's entitlements are displayed in the application. Free has limited quotas. Premium provides larger quotas while access is active, including up to 10 workout-plan generations per week, resetting every Monday at 00:00 Asia/Jakarta.",
        "Price, payment type, access period, renewal, and cancellation are further governed by the Subscription Terms.",
      ],
    },
    {
      heading: "Availability and service changes",
      paragraphs: [
        "We work to keep the service available, but maintenance, provider interruptions, security events, or circumstances beyond our control can cause temporary unavailability. Material changes to these terms will be communicated through the app or available contact channels.",
      ],
    },
    {
      heading: "Intellectual property",
      paragraphs: [
        "FitMate names, marks, interfaces, materials, code, and assets are owned or lawfully used by the operator and its licensors. You retain your personal content while granting the limited permission needed to process it for requested features.",
      ],
    },
    {
      heading: "Consumer rights and resolution",
      paragraphs: [
        "Nothing in these terms removes consumer rights that cannot be excluded under Indonesian law. Please contact support first so an issue can be investigated and resolved fairly.",
      ],
    },
  ],
  sourcesTitle: "Official regulatory references",
  sources: officialSources,
  contactTitle: "Contact",
  contactText: "Questions about these terms or the service may be sent to FitMate support.",
  backLabel: "Back to Settings",
};

export default function TermsPage() {
  return (
    <LegalDocumentPage
      version={FITMATE_TERMS_VERSION}
      copyId={copyId}
      copyEn={copyEn}
      supportEmail={process.env.NEXT_PUBLIC_FITMATE_SUPPORT_EMAIL}
    />
  );
}
