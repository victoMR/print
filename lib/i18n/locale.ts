export type Locale = "en" | "es";

export const LOCALES: Locale[] = ["es", "en"];
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "NEXT_LOCALE";

// Vercel injects this header at the edge based on the request's source IP —
// no external geo-IP service/library needed.
export const GEO_COUNTRY_HEADER = "x-vercel-ip-country";

// Locale forwarded request-to-request via internal header (same pattern as x-nonce
// in middleware.ts) so Server Components can read it without re-deriving it.
export const LOCALE_HEADER = "x-locale";

const COUNTRY_LOCALE: Record<string, Locale> = {
  US: "en",
  MX: "es",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "es";
}

export function localeFromCountry(country: string | null | undefined): Locale | undefined {
  if (!country) return undefined;
  return COUNTRY_LOCALE[country.toUpperCase()];
}

export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (header?.toLowerCase().startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

/**
 * Resolves the locale for a request: explicit cookie (manual override) wins,
 * then geo-detected country, then Accept-Language, then the site default.
 */
export function resolveLocale(input: {
  cookieValue?: string | null;
  country?: string | null;
  acceptLanguage?: string | null;
}): { locale: Locale; source: "cookie" | "geo" | "header" | "default" } {
  if (isLocale(input.cookieValue)) {
    return { locale: input.cookieValue, source: "cookie" };
  }

  const geoLocale = localeFromCountry(input.country);
  if (geoLocale) {
    return { locale: geoLocale, source: "geo" };
  }

  if (input.acceptLanguage) {
    return { locale: localeFromAcceptLanguage(input.acceptLanguage), source: "header" };
  }

  return { locale: DEFAULT_LOCALE, source: "default" };
}
