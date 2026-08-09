import LegalDocumentPage, {
  type LegalDocumentCopy,
} from "@/components/legal-document-page";
import { FITMATE_REFUND_POLICY_VERSION } from "@/lib/legal";

const officialSources = [
  {
    label: "UU No. 8 Tahun 1999 tentang Perlindungan Konsumen",
    href: "https://peraturan.bpk.go.id/Details/45288/uu-no-8-tahun-1999",
  },
  {
    label: "PP No. 80 Tahun 2019 tentang Perdagangan Melalui Sistem Elektronik",
    href: "https://peraturan.bpk.go.id/Details/126143/pp-no-80-tahun-2019",
  },
  {
    label: "Panduan sengketa kartu Xendit",
    href: "https://docs.xendit.co/docs/cards-5",
  },
];

const officialSourcesEn = [
  {
    label: "Law No. 8 of 1999 on Consumer Protection",
    href: "https://peraturan.bpk.go.id/Details/45288/uu-no-8-tahun-1999",
  },
  {
    label: "Government Regulation No. 80 of 2019 on Electronic Commerce",
    href: "https://peraturan.bpk.go.id/Details/126143/pp-no-80-tahun-2019",
  },
  {
    label: "Xendit card dispute guide",
    href: "https://docs.xendit.co/docs/cards-5",
  },
];

const copyId: LegalDocumentCopy = {
  title: "Kebijakan Pembatalan & Pengembalian Dana",
  summary:
    "Kebijakan ini membedakan penghentian perpanjangan dari permintaan refund dan menjelaskan kondisi serta bukti yang diperlukan untuk peninjauan.",
  updatedLabel: "Berlaku sejak",
  sections: [
    {
      heading: "Pembatalan berbeda dengan refund",
      paragraphs: [
        "Pembatalan menghentikan tagihan otomatis berikutnya dan akses tetap berjalan sampai akhir periode yang sudah dibayar. Refund adalah pengembalian atas pembayaran tertentu setelah peninjauan. Menghentikan perpanjangan tidak otomatis menghasilkan refund.",
      ],
    },
    {
      heading: "Kondisi yang dapat ditinjau",
      bullets: [
        "Tagihan ganda untuk akun dan periode akses yang sama.",
        "Pembayaran tercatat berhasil oleh Xendit tetapi Premium tidak pernah aktif karena kesalahan FitMate yang dapat diverifikasi.",
        "Kegagalan teknis material yang dapat diverifikasi dan membuat manfaat Premium tidak dapat digunakan selama periode yang relevan.",
        "Transaksi tidak dikenal atau tidak sah, yang juga harus segera dilaporkan kepada bank atau penyedia metode pembayaran.",
        "Keadaan lain yang mewajibkan pengembalian dana berdasarkan hukum yang berlaku.",
      ],
    },
    {
      heading: "Kondisi yang umumnya tidak menghasilkan refund otomatis",
      bullets: [
        "Lupa menghentikan perpanjangan sebelum tanggal tagihan setelah informasi perpanjangan ditampilkan dan persetujuan diberikan.",
        "Berubah pikiran setelah Premium telah aktif atau fitur digital telah digunakan, kecuali hukum menentukan lain.",
        "Ketidakcocokan perangkat, jaringan, atau layanan pihak ketiga yang berada di luar kendali FitMate dan tidak disebabkan oleh kesalahan FitMate.",
      ],
    },
    {
      heading: "Cara mengajukan",
      bullets: [
        "Gunakan email yang terhubung dengan akun FitMate.",
        "Sertakan tanggal, jumlah, metode, ID transaksi atau reference ID, dan penjelasan masalah.",
        "Lampirkan bukti pembayaran yang tidak menampilkan PIN, OTP, nomor kartu penuh, atau informasi rahasia.",
        "Ajukan sesegera mungkin agar log dan status provider masih dapat diperiksa dengan baik.",
      ],
    },
    {
      heading: "Peninjauan dan hasil",
      paragraphs: [
        "FitMate akan mencocokkan data akun, status Xendit, webhook, aktivasi Premium, pemakaian fitur, dan bukti yang diberikan. Kami dapat meminta informasi tambahan yang wajar untuk mencegah kesalahan atau penipuan.",
        "Keputusan dan jumlah refund mempertimbangkan hasil verifikasi, manfaat yang telah diberikan, aturan metode pembayaran, dan hak konsumen yang berlaku.",
      ],
    },
    {
      heading: "Proses pengembalian dana",
      paragraphs: [
        "Refund yang disetujui diproses melalui metode atau jalur yang didukung penyedia pembayaran. Waktu dana terlihat pada rekening bergantung pada Xendit, bank, jaringan kartu, atau penyedia metode pembayaran. FitMate tidak akan meminta PIN atau OTP untuk memproses refund.",
      ],
    },
    {
      heading: "Dampak pada akses Premium",
      paragraphs: [
        "Refund penuh dapat mengakhiri akses Premium yang terkait dengan pembayaran tersebut. Refund sebagian, apabila tersedia, akan dijelaskan pada hasil peninjauan. Penghapusan akun bukan syarat untuk menghentikan perpanjangan.",
      ],
    },
    {
      heading: "Hak konsumen",
      paragraphs: [
        "Kebijakan ini tidak mengurangi hak konsumen yang tidak dapat dikesampingkan berdasarkan hukum Indonesia. Apabila penyelesaian langsung tidak tercapai, para pihak tetap dapat menggunakan mekanisme penyelesaian sengketa yang tersedia menurut hukum.",
      ],
    },
  ],
  sourcesTitle: "Rujukan resmi",
  sources: officialSources,
  contactTitle: "Ajukan permintaan",
  contactText: "Kirim permintaan refund dari email akun dan jangan pernah mengirim password, PIN, OTP, atau secret key.",
  backLabel: "Kembali ke Premium",
};

const copyEn: LegalDocumentCopy = {
  title: "Cancellation & Refund Policy",
  summary:
    "This policy distinguishes stopping renewal from requesting a refund and explains the circumstances and evidence used in a review.",
  updatedLabel: "Effective date",
  sections: [
    {
      heading: "Cancellation is different from a refund",
      paragraphs: [
        "Cancellation stops the next automatic charge while access continues through the paid period. A refund returns a specific payment after review. Stopping renewal does not automatically create a refund.",
      ],
    },
    {
      heading: "Circumstances that may be reviewed",
      bullets: [
        "Duplicate charges for the same account and access period.",
        "A payment marked successful by Xendit where Premium never activated because of a verifiable FitMate error.",
        "A verifiable material technical failure that prevented use of Premium benefits during the relevant period.",
        "An unrecognized or unauthorized transaction, which should also be reported promptly to the bank or payment-method provider.",
        "Other circumstances where applicable law requires a refund.",
      ],
    },
    {
      heading: "Circumstances that generally do not create an automatic refund",
      bullets: [
        "Forgetting to stop renewal before the billing date after the renewal disclosure was shown and consent was given.",
        "Changing your mind after Premium was activated or digital features were used, unless the law requires otherwise.",
        "Device, network, or third-party service incompatibility outside FitMate's control and not caused by a FitMate error.",
      ],
    },
    {
      heading: "How to submit a request",
      bullets: [
        "Use the email connected to the FitMate account.",
        "Include the date, amount, method, transaction or reference ID, and a description of the issue.",
        "Attach proof that does not expose a PIN, OTP, full card number, or confidential information.",
        "Submit promptly so provider status and logs remain available for effective review.",
      ],
    },
    {
      heading: "Review and outcome",
      paragraphs: [
        "FitMate will compare account data, Xendit status, webhooks, Premium activation, feature usage, and supplied evidence. We may request reasonably necessary information to prevent errors or fraud.",
        "The decision and refund amount consider verification results, benefits already delivered, payment-method rules, and applicable consumer rights.",
      ],
    },
    {
      heading: "Refund processing",
      paragraphs: [
        "Approved refunds use a route supported by the payment provider. The time before funds appear depends on Xendit, the bank, card network, or payment-method provider. FitMate will never ask for a PIN or OTP to process a refund.",
      ],
    },
    {
      heading: "Effect on Premium access",
      paragraphs: [
        "A full refund may end Premium access tied to that payment. The outcome will explain any available partial refund. Account deletion is not required to stop renewal.",
      ],
    },
    {
      heading: "Consumer rights",
      paragraphs: [
        "This policy does not reduce consumer rights that cannot be excluded under Indonesian law. If direct resolution is unsuccessful, the parties may use dispute-resolution mechanisms available under applicable law.",
      ],
    },
  ],
  sourcesTitle: "Official references",
  sources: officialSourcesEn,
  contactTitle: "Submit a request",
  contactText: "Send the request from the account email and never include passwords, PINs, OTPs, or secret keys.",
  backLabel: "Back to Premium",
};

export default function RefundPolicyPage() {
  return (
    <LegalDocumentPage
      version={FITMATE_REFUND_POLICY_VERSION}
      copyId={copyId}
      copyEn={copyEn}
      supportEmail={process.env.NEXT_PUBLIC_FITMATE_SUPPORT_EMAIL}
      backHref="/premium"
    />
  );
}
