"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/components/language-provider";

const items = [
  { href: "/admin/users", id: "Pengguna", en: "Users" },
  { href: "/admin/monitoring", id: "Monitoring", en: "Monitoring" },
];

export default function AdminNavigation() {
  const pathname = usePathname();
  const { tr } = useLanguage();

  return (
    <nav className="flex flex-wrap gap-2" aria-label={tr("Navigasi admin", "Admin navigation")}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            {tr(item.id, item.en)}
          </Link>
        );
      })}
    </nav>
  );
}
