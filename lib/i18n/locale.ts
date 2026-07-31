import { extractClientIp, lookupCountryByIp } from "./geo-lookup";

export type Locale = "en" | "es";

export const LOCALES: Locale[] = ["es", "en"];
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "NEXT_LOCALE";

// Manual choices persist for a year; auto-detected ones expire after a day so
// the site periodically re-checks (via IP geolocation) without ever calling
// the lookup on every single request — the short-lived cookie itself is the cache.
export const LOCALE_COOKIE_MAX_AGE_MANUAL = 60 * 60 * 24 * 365;
export const LOCALE_COOKIE_MAX_AGE_AUTO = 60 * 60 * 24;

// Vercel injects this header at the edge based on the request's source IP.
// Present only when hosted on Vercel — on a self-hosted VPS (no Vercel edge)
// this is always absent and we fall back to a real IP lookup (see below).
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
 * Resolves the locale for a request.
 *
 * If a NEXT_LOCALE cookie is present at all — manual or auto-detected — it's
 * used as-is with no extra work. The distinction between "manual" and "auto"
 * lives entirely in how long the cookie lives (see LOCALE_COOKIE_MAX_AGE_*):
 * a manual choice gets a year, so it simply outlives casual re-checks; an
 * auto-detected one gets a day, so it naturally falls through to be
 * re-derived once it expires — e.g. a returning visitor connecting over a
 * US VPN after previously browsing from Mexico gets re-detected once their
 * short-lived MX cookie ages out, without ever clobbering an actual manual choice.
 *
 * When there's no cookie to reuse, the locale is derived in this order:
 * 1. Vercel's edge geo header, when present (only true when hosted on Vercel).
 * 2. A real IP geolocation lookup (see lib/i18n/geo-lookup.ts) — the path that
 *    matters for a self-hosted VPS behind nginx, where there is no Vercel edge.
 * 3. Accept-Language.
 * 4. The site default.
 */
export async function resolveLocale(input: {
  cookieValue?: string | null;
  country?: string | null;
  clientIp?: string | null;
  acceptLanguage?: string | null;
}): Promise<{ locale: Locale; source: "cookie" | "geo" | "header" | "default" }> {
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

  if (input.acceptLanguage) {
    return { locale: localeFromAcceptLanguage(input.acceptLanguage), source: "header" };
  }

  return { locale: DEFAULT_LOCALE, source: "default" };
}

export { extractClientIp };
