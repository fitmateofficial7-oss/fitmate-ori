"use client";

import FitMateBrand from "@/components/fitmate-brand";
import { useLanguage } from "@/components/language-provider";

type CompanySignatureProps = {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
};

export default function CompanySignature({
  className = "",
  compact = false,
  inverse = false,
}: CompanySignatureProps) {
  const { tr } = useLanguage();

  return (
    <div
      className={`${
        compact
          ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          : "flex flex-col items-center text-center"
      } ${className}`}
    >
      <FitMateBrand
        size={compact ? "sm" : "md"}
        showCompany
        inverse={inverse}
        centered={!compact}
      />
      <p
        className={`${compact ? "text-sm" : "mt-4 max-w-lg text-sm leading-6"} ${
          inverse ? "text-slate-400" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {tr(
          "© 2026 PT Growsia Solusi Indonesia Maju. Seluruh hak dilindungi.",
          "© 2026 PT Growsia Solusi Indonesia Maju. All rights reserved."
        )}
      </p>
    </div>
  );
}
