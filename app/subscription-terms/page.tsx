import LegalDocumentPage, {
  type LegalDocumentCopy,
} from "@/components/legal-document-page";
import { FITMATE_SUBSCRIPTION_TERMS_VERSION } from "@/lib/legal";
import { PREMIUM_MONTHLY_PRICE_IDR, formatIdr } from "@/lib/subscription";

const price = formatIdr(PREMIUM_MONTHLY_PRICE_IDR);
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
    label: "Panduan sengketa kartu Xendit untuk transaksi berulang",
    href: "https://docs.xendit.co/docs/cards-5",
  },
];

const copyId: LegalDocumentCopy = {
  title: "Ketentuan Langganan Premium",
  summary:
    "Ketentuan ini menjelaskan perbedaan QRIS sekali bayar dan langganan otomatis, aktivasi, kuota, perpanjangan, serta cara menghentikan tagihan.",
  updatedLabel: "Berlaku sejak",
  sections: [
    {
      heading: "Produk Premium",
      paragraphs: [
        `FitMate Premium saat ini berharga ${price}. Sebelum pembayaran, aplikasi menampilkan pilihan jenis pembayaran, harga, masa akses, dan apakah pembayaran akan diperpanjang otomatis.`,
      ],
    },
    {
      heading: "QRIS sekali bayar",
      bullets: [
        `Pembayaran sebesar ${price} memberikan akses Premium selama 30 hari setelah pembayaran berhasil diverifikasi.`,
        "QRIS pada opsi ini bukan langganan otomatis dan tidak akan menarik biaya kembali tanpa tindakan pembayaran baru dari pengguna.",
        "Setelah 30 hari, pengguna dapat memperpanjang secara manual melalui halaman Premium.",
      ],
    },
    {
      heading: "Langganan otomatis bulanan",
      bullets: [
        `Pengguna memberi izin penagihan ${price} setiap bulan melalui metode yang mendukung pembayaran berulang sampai perpanjangan dihentikan.`,
        "Harga, interval bulanan, dan persetujuan tagihan berulang ditampilkan sebelum tombol checkout dapat digunakan.",
        "Tanggal tagihan mengikuti jadwal penyedia pembayaran yang ditampilkan pada checkout. Perubahan jadwal karena kegagalan, retry, atau aturan metode pembayaran dapat diproses oleh Xendit.",
      ],
    },
    {
      heading: "Aktivasi dan status",
      paragraphs: [
        "Premium diaktifkan setelah FitMate menerima dan memverifikasi notifikasi pembayaran berhasil dari Xendit. Halaman redirect atau tangkapan layar pembayaran saja tidak menjadi bukti final apabila status provider belum terverifikasi.",
        "Jika konfirmasi terlambat, status dapat sementara tampil pending. Jangan melakukan pembayaran kedua sebelum memeriksa riwayat transaksi atau menghubungi dukungan.",
      ],
    },
    {
      heading: "Kuota Premium",
      bullets: [
        "Pembuatan atau generate ulang program latihan maksimal 10 kali per minggu.",
        "Kuota mingguan reset setiap Senin pukul 00.00 WIB (Asia/Jakarta). Percobaan yang gagal sebelum menghasilkan dan menyimpan program tidak mengurangi kuota.",
        "Kuota konsultasi AI dan scan makanan mengikuti angka yang ditampilkan pada aplikasi dan dapat memiliki periode reset yang berbeda.",
      ],
    },
    {
      heading: "Menghentikan perpanjangan",
      paragraphs: [
        "Pengguna langganan otomatis dapat menghentikan perpanjangan melalui halaman Premium. Permintaan tersebut mencegah tagihan berikutnya setelah berhasil diproses. Akses yang sudah dibayar tetap tersedia sampai akhir periode berjalan, kecuali terdapat refund penuh atau tindakan keamanan yang sah.",
      ],
    },
    {
      heading: "Pembayaran gagal dan masa tenggang",
      paragraphs: [
        "Jika pembayaran berulang gagal, penyedia dapat mencoba kembali sesuai jadwal. Status Premium dapat menjadi past due atau berakhir ketika periode berbayar selesai. Pengguna tidak dikenai penalti FitMate hanya karena memilih tidak memperpanjang, tetapi kewajiban transaksi yang telah sah tetap dapat diproses.",
      ],
    },
    {
      heading: "Perubahan harga atau manfaat",
      paragraphs: [
        "Perubahan harga atau manfaat tidak berlaku surut pada periode yang sudah dibayar. Untuk langganan otomatis, perubahan material akan diberitahukan sebelum periode berikutnya sejauh diwajibkan atau memungkinkan, sehingga pengguna dapat memutuskan untuk melanjutkan atau menghentikan perpanjangan.",
      ],
    },
    {
      heading: "Pembatalan dan refund",
      paragraphs: [
        "Menghentikan perpanjangan tidak otomatis mengembalikan dana periode berjalan. Tagihan ganda, pembayaran berhasil tanpa aktivasi, kesalahan teknis terverifikasi, atau hak lain berdasarkan hukum akan ditinjau berdasarkan Kebijakan Pembatalan dan Pengembalian Dana.",
      ],
    },
  ],
  sourcesTitle: "Rujukan resmi",
  sources: officialSources,
  contactTitle: "Bantuan langganan",
  contactText: "Untuk masalah pembayaran, sertakan email akun, tanggal, jumlah, dan ID transaksi tanpa mengirim password, PIN, OTP, atau secret key.",
  backLabel: "Kembali ke Premium",
};

const copyEn: LegalDocumentCopy = {
  title: "Premium Subscription Terms",
  summary:
    "These terms explain the difference between one-time QRIS access and automatic renewal, activation, quotas, renewal, and stopping future charges.",
  updatedLabel: "Effective date",
  sections: [
    {
      heading: "Premium product",
      paragraphs: [
        `FitMate Premium currently costs ${price}. Before payment, the app displays the payment type, price, access period, and whether the payment automatically renews.`,
      ],
    },
    {
      heading: "One-time QRIS",
      bullets: [
        `A ${price} payment provides 30 days of Premium access after successful payment verification.`,
        "QRIS under this option is not an automatic subscription and will not charge again without a new payment action by the user.",
        "After 30 days, the user can renew manually from the Premium page.",
      ],
    },
    {
      heading: "Automatic monthly subscription",
      bullets: [
        `The user authorizes a ${price} monthly charge through a recurring-compatible method until renewal is stopped.`,
        "The price, monthly interval, and recurring-charge consent are shown before checkout can begin.",
        "The billing date follows the provider schedule shown during checkout. Failed-payment retries or payment-method rules may affect provider processing.",
      ],
    },
    {
      heading: "Activation and status",
      paragraphs: [
        "Premium activates after FitMate receives and verifies a successful-payment notification from Xendit. A return page or payment screenshot alone is not final proof when the provider status is not yet verified.",
        "When confirmation is delayed, the status may temporarily remain pending. Do not make a second payment before checking transaction history or contacting support.",
      ],
    },
    {
      heading: "Premium quotas",
      bullets: [
        "Workout-plan generation or regeneration is limited to 10 successful results per week.",
        "The weekly quota resets every Monday at 00:00 Asia/Jakarta. Attempts that fail before a plan is generated and saved do not consume quota.",
        "AI consultation and meal-scan quotas follow the amounts displayed in the app and may use different reset periods.",
      ],
    },
    {
      heading: "Stopping renewal",
      paragraphs: [
        "Automatic subscribers can stop renewal from the Premium page. Once processed, this prevents the next charge. Paid access remains available through the current period unless a full refund is issued or a lawful security action applies.",
      ],
    },
    {
      heading: "Failed payment and grace status",
      paragraphs: [
        "If a recurring payment fails, the provider may retry according to its schedule. Premium can become past due or end when the paid period expires. FitMate does not impose a penalty merely for choosing not to renew, while valid transaction obligations may still be processed.",
      ],
    },
    {
      heading: "Price or benefit changes",
      paragraphs: [
        "Changes do not retroactively affect a paid period. For automatic subscriptions, material changes will be communicated before the next period where required or reasonably possible so users can continue or stop renewal.",
      ],
    },
    {
      heading: "Cancellation and refunds",
      paragraphs: [
        "Stopping renewal does not automatically refund the current period. Duplicate charges, successful payment without activation, verified technical errors, or other applicable legal rights are reviewed under the Cancellation and Refund Policy.",
      ],
    },
  ],
  sourcesTitle: "Official references",
  sources: officialSources,
  contactTitle: "Subscription support",
  contactText: "For payment issues, include the account email, date, amount, and transaction ID without sending passwords, PINs, OTPs, or secret keys.",
  backLabel: "Back to Premium",
};

export default function SubscriptionTermsPage() {
  return (
    <LegalDocumentPage
      version={FITMATE_SUBSCRIPTION_TERMS_VERSION}
      copyId={copyId}
      copyEn={copyEn}
      supportEmail={process.env.NEXT_PUBLIC_FITMATE_SUPPORT_EMAIL}
      backHref="/premium"
    />
  );
}
