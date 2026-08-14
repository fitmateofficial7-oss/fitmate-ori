import Image from "next/image";
import Link from "next/link";

const SIZE_STYLES = {
  sm: {
    mark: "h-10 w-10 rounded-xl",
    image: 30,
    name: "text-lg",
    company: "text-[0.62rem]",
  },
  md: {
    mark: "h-12 w-12 rounded-2xl",
    image: 36,
    name: "text-xl",
    company: "text-[0.68rem]",
  },
  lg: {
    mark: "h-16 w-16 rounded-[1.4rem]",
    image: 48,
    name: "text-2xl",
    company: "text-xs",
  },
} as const;

type FitMateBrandProps = {
  href?: string;
  size?: keyof typeof SIZE_STYLES;
  showCompany?: boolean;
  companyLabel?: string;
  className?: string;
  centered?: boolean;
  inverse?: boolean;
  showName?: boolean;
};

export default function FitMateBrand({
  href,
  size = "md",
  showCompany = true,
  companyLabel = "by Growsia",
  className = "",
  centered = false,
  inverse = false,
  showName = true,
}: FitMateBrandProps) {
  const style = SIZE_STYLES[size];
  const content = (
    <span
      className={`fitmate-brand inline-flex items-center gap-3 ${
        centered ? "justify-center text-center" : ""
      } ${className}`}
    >
      <span
        className={`fitmate-brand__mark relative flex shrink-0 items-center justify-center overflow-hidden border border-green-400/45 bg-[#07110c] shadow-lg shadow-green-500/15 ${style.mark}`}
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(52,211,153,.18),transparent_55%)]" />
        <Image
          src="/brand/fitmate-mark.png"
          alt=""
          width={style.image}
          height={style.image}
          priority
          className="relative h-[76%] w-[76%] object-contain"
        />
      </span>

      {showName && (
        <span className={`flex min-w-0 flex-col ${centered ? "items-center" : "items-start"}`}>
          <span
            className={`fitmate-brand__name ${style.name} font-black leading-none tracking-tight ${
              inverse ? "text-white" : "text-slate-950 dark:text-white"
            }`}
          >
            FitMate
          </span>
          {showCompany && (
            <span
              className={`fitmate-brand__company mt-1.5 font-bold uppercase tracking-[0.16em] ${style.company} ${
                inverse
                  ? "text-green-200/90"
                  : "text-slate-400 dark:text-slate-400"
              }`}
            >
              {companyLabel}
            </span>
          )}
        </span>
      )}
    </span>
  );

  return href ? (
    <Link href={href} aria-label="FitMate by Growsia" className="inline-flex">
      {content}
    </Link>
  ) : (
    content
  );
}
