"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALE_MANUAL_COOKIE, isLocale, type Locale } from "@/lib/i18n/locale";

/**
 * Explicit manual override from the language switcher. Always fires as a
 * server Set-Cookie (never client-side document.cookie) so it isn't subject
 * to Safari ITP's 7-day cap on script-set cookies. Also sets the "manual" flag
 * cookie so the middleware stops re-deriving the locale from geo/Accept-Language
 * on future requests — otherwise a later visit (e.g. over a VPN) would silently
 * overwrite this choice.
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  const store = await cookies();
  const options = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };
  store.set(LOCALE_COOKIE, locale, options);
  store.set(LOCALE_MANUAL_COOKIE, "1", options);
}
