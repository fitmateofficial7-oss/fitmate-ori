"use client";

import Link from "next/link";

import CompanySignature from "@/components/company-signature";
import FitMateBrand from "@/components/fitmate-brand";
import { useLanguage } from "@/components/language-provider";

export type LegalSectionCopy = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalSourceCopy = {
  label: string;
  href: string;
};

export type LegalDocumentCopy = {
  title: string;
  summary: string;
  updatedLabel: string;
  sections: LegalSectionCopy[];
  sourcesTitle: string;
  sources: LegalSourceCopy[];
  contactTitle: string;
  contactText: string;
  backLabel: string;
};

type LegalDocumentPageProps = {
  version: string;
  copyId: LegalDocumentCopy;
  copyEn: LegalDocumentCopy;
  supportEmail?: string | null;
  backHref?: string;
};

const LEGAL_NAVIGATION = [
  { href: "/terms", id: "Ketentuan Penggunaan", en: "Terms of Use" },
  {
    href: "/subscription-terms",
    id: "Ketentuan Langganan",
    en: "Subscription Terms",
  },
  { href: "/privacy", id: "Privasi", en: "Privacy" },
  { href: "/refund", id: "Pembatalan & Refund", en: "Cancellation & Refund" },
];

export default function LegalDocumentPage({
  version,
  copyId,
  copyEn,
  supportEmail,
  backHref = "/settings",
}: LegalDocumentPageProps) {
  const { language, tr } = useLanguage();
  const copy = language === "id" ? copyId : copyEn;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-5 sm:py-12">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20">
        <header className="border-b border-white/10 bg-gradient-to-br from-green-500/15 via-transparent to-amber-400/10 p-6 sm:p-10">
          <FitMateBrand href="/" size="md" showCompany inverse />
          <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-green-300">
            {tr("Dokumen legal FitMate", "FitMate legal document")}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-slate-300">{copy.summary}</p>
          <p className="mt-4 text-sm font-semibold text-slate-400">
            {copy.updatedLabel}: {version}
          </p>
        </header>

        <nav
          aria-label={tr("Navigasi dokumen legal", "Legal document navigation")}
          className="flex gap-2 overflow-x-auto border-b border-white/10 p-4 sm:flex-wrap sm:px-10"
        >
          {LEGAL_NAVIGATION.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-slate-200 transition hover:border-green-400/50 hover:bg-green-400/10 hover:text-green-200"
            >
              {tr(item.id, item.en)}
            </Link>
          ))}
        </nav>

        <div className="space-y-8 p-6 leading-7 text-slate-300 sm:p-10">
          {copy.sections.map((section, index) => (
            <section key={`${section.heading}-${index}`}>
              <h2 className="text-xl font-black text-white sm:text-2xl">
                {index + 1}. {section.heading}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-3 list-disc space-y-2 pl-6">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="rounded-2xl border border-green-400/20 bg-green-400/5 p-5">
            <h2 className="text-lg font-black text-white">{copy.contactTitle}</h2>
            <p className="mt-2">{copy.contactText}</p>
            {supportEmail ? (
              <a
                href={`mailto:${supportEmail}`}
                className="mt-3 inline-flex font-black text-green-300 underline underline-offset-4"
              >
                {supportEmail}
              </a>
            ) : (
              <p className="mt-3 text-sm font-bold text-amber-200">
                {tr(
                  "Alamat dukungan belum diisi. Atur NEXT_PUBLIC_FITMATE_SUPPORT_EMAIL sebelum produksi.",
                  "The support address is not configured. Set NEXT_PUBLIC_FITMATE_SUPPORT_EMAIL before production."
                )}
              </p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-black text-white">{copy.sourcesTitle}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {copy.sources.map((source) => (
                <li key={source.href}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-green-300 underline underline-offset-4"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-7">
            <Link
              href={backHref}
              className="inline-flex rounded-2xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-500"
            >
              {copy.backLabel}
            </Link>
            <Link
              href="/premium"
              className="inline-flex rounded-2xl bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/15"
            >
              {tr("Lihat Premium", "View Premium")}
            </Link>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            {tr(
              "Dokumen ini disiapkan sebagai dasar operasional produk dan tidak menggantikan peninjauan penasihat hukum sebelum peluncuran komersial.",
              "This document is an operational product baseline and does not replace legal-counsel review before commercial launch."
            )}
          </p>
        </div>

        <CompanySignature inverse className="border-t border-white/10 px-6 py-8 sm:px-10" />
      </article>
    </main>
  );
}
