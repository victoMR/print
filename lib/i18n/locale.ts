import { extractClientIp, lookupCountryByIp } from "./geo-lookup";

/**
 * Market (/mx or /us) — currency, shipping assumptions, catalog pricing.
 * Independent of UI language (see Language below).
 */
export type Locale = "mx" | "us";
/** @deprecated Prefer `Market` alias — same as Locale (path segment). */
export type Market = Locale;

/** UI language — message catalogs and product-content translations. */
export type Language = "es" | "en";

export const LOCALES: Locale[] = ["mx", "us"];
export const DEFAULT_LOCALE: Locale = "mx";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LANGUAGES: Language[] = ["es", "en"];
export const DEFAULT_LANGUAGE: Language = "es";
export const LANGUAGE_COOKIE = "NEXT_LANGUAGE";

// Manual market choices persist for a year; auto-detected ones expire after a day.
export const LOCALE_COOKIE_MAX_AGE_MANUAL = 60 * 60 * 24 * 365;
export const LOCALE_COOKIE_MAX_AGE_AUTO = 60 * 60 * 24;
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Vercel injects this header at the edge based on the request's source IP.
export const GEO_COUNTRY_HEADER = "x-vercel-ip-country";

// Forwarded request-to-request so root layout / HtmlLangSync can set <html lang>.
export const LOCALE_HEADER = "x-locale";
export const LANGUAGE_HEADER = "x-language";

const COUNTRY_LOCALE: Record<string, Locale> = {
  US: "us",
  MX: "mx",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "mx" || value === "us";
}

export function isLanguage(value: string | null | undefined): value is Language {
  return value === "es" || value === "en";
}

export function localeFromCountry(country: string | null | undefined): Locale | undefined {
  if (!country) return undefined;
  return COUNTRY_LOCALE[country.toUpperCase()];
}

/** Default UI language from Accept-Language — never used to pick market/currency. */
export function languageFromAcceptLanguage(header: string | null | undefined): Language {
  if (header?.toLowerCase().startsWith("en")) return "en";
  return DEFAULT_LANGUAGE;
}

export function resolveLanguage(value: string | null | undefined): Language {
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}

/**
 * @deprecated Market no longer implies language. Use `resolveLanguage` / `useLanguage`.
 * Kept only for gradual call-site migration; always returns Spanish for mx, English for us
 * as a last-resort fallback when no language cookie exists.
 */
export function languageForLocale(locale: Locale | null | undefined): Language {
  return locale === "us" ? "en" : "es";
}

/**
 * Resolves the market for a request (URL-less entry: "/" or legacy unprefixed paths).
 *
 * Order: cookie → geo (Vercel / IP) → default mx.
 * Accept-Language is intentionally NOT used for market (that only picks UI language).
 */
export async function resolveLocale(input: {
  cookieValue?: string | null;
  country?: string | null;
  clientIp?: string | null;
}): Promise<{ locale: Locale; source: "cookie" | "geo" | "default" }> {
  if (isLocale(input.cookieValue)) {
    return { locale: input.cookieValue, source: "cookie" };
  }

  const headerGeoLocale = localeFromCountry(input.country);
  if (headerGeoLocale) {
    return { locale: headerGeoLocale, source: "geo" };
  }

  if (input.clientIp) {
    const country = await lookupCountryByIp(input.clientIp);
    const ipGeoLocale = localeFromCountry(country);
    if (ipGeoLocale) {
      return { locale: ipGeoLocale, source: "geo" };
    }
  }

  return { locale: DEFAULT_LOCALE, source: "default" };
}

export { extractClientIp };
