"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AppLanguage = "id" | "en";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  tr: (indonesian: string, english: string) => string;
};

const LANGUAGE_STORAGE_KEY = "fitmate_language";

const LanguageContext =
  createContext<LanguageContextValue | null>(null);

function applyDocumentLanguage(language: AppLanguage) {
  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;
}

export default function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguageState] =
    useState<AppLanguage>("id");

  useEffect(() => {
    const saved = window.localStorage.getItem(
      LANGUAGE_STORAGE_KEY
    );
    const initialLanguage: AppLanguage =
      saved === "en" ? "en" : "id";

    applyDocumentLanguage(initialLanguage);

    const timeoutId = window.setTimeout(() => {
      setLanguageState(initialLanguage);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const setLanguage = useCallback(
    (nextLanguage: AppLanguage) => {
      setLanguageState(nextLanguage);
      window.localStorage.setItem(
        LANGUAGE_STORAGE_KEY,
        nextLanguage
      );
      applyDocumentLanguage(nextLanguage);
    },
    []
  );

  const tr = useCallback(
    (indonesian: string, english: string) =>
      language === "id" ? indonesian : english,
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, tr }),
    [language, setLanguage, tr]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider."
    );
  }

  return context;
}
