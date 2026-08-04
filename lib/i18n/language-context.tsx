"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Language } from "./locale";

const LanguageContext = createContext<Language | null>(null);

export function LanguageProvider({
  language,
  children,
}: {
  language: Language;
  children: ReactNode;
}) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

/** UI language (es|en) — independent of market (/mx|/us). */
export function useLanguage(): Language {
  const language = useContext(LanguageContext);
  if (!language) {
    throw new Error("useLanguage debe usarse dentro de LanguageProvider");
  }
  return language;
}
