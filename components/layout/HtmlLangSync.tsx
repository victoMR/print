"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

/**
 * Syncs <html lang> on client navigations and language switches.
 * Root layout sets the initial value; this keeps it fresh when only
 * the language cookie changes (market path may stay the same).
 */
export function HtmlLangSync() {
  const language = useLanguage();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return null;
}
