import type { Language } from "./locale";

/** BCP-47 tag per UI language — independent of market/currency (see lib/utils.ts formatCurrency for that axis). */
const INTL_LOCALE: Record<Language, string> = { es: "es-MX", en: "en-US" };

export function formatOrderDate(
  date: Date | string,
  language: Language,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long", timeStyle: "short" },
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(INTL_LOCALE[language], options);
}
