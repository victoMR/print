"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { languageForLocale, type Locale } from "@/lib/i18n/locale";

/**
 * The <html lang> attribute is set once in the root layout (app/layout.tsx),
 * which — being the single shared root layout for both /admin and
 * app/[locale]/** — does NOT re-render on a client-side navigation between
 * /mx and /us (only the [locale] segment and below does). Without this, the
 * lang attribute goes stale after using the language switcher. Imperatively
 * syncing it here re-runs on every locale change since this component lives
 * inside app/[locale]/layout.tsx.
 */
export function HtmlLangSync() {
  const locale = useLocale() as Locale;

  useEffect(() => {
    document.documentElement.lang = languageForLocale(locale);
  }, [locale]);

  return null;
}
