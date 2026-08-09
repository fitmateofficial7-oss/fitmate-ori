"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase";

type GetStartedButtonProps = {
  className?: string;
  children: React.ReactNode;
};

export default function GetStartedButton({
  className,
  children,
}: GetStartedButtonProps) {
  const router = useRouter();
  const { tr } = useLanguage();
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState("");

  const handleClick = async () => {
    if (checking) {
      return;
    }

    setChecking(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setNotice(
          tr(
            "Akun kamu sudah aktif. Membuka dashboard…",
            "Your account is active. Opening the dashboard…"
          )
        );
        window.setTimeout(() => {
          router.push("/dashboard");
        }, 900);
        return;
      }

      router.push("/register");
    } catch {
      router.push("/register");
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={checking}
        className={className}
      >
        {checking
          ? tr("Memeriksa…", "Checking…")
          : children}
      </button>

      {notice && (
        <div
          role="status"
          className="fixed left-1/2 top-5 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-green-200 bg-white px-5 py-4 text-center text-sm font-bold text-green-800 shadow-2xl shadow-green-500/20"
        >
          {notice}
        </div>
      )}
    </>
  );
}
