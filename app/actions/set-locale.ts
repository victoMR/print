"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE_MANUAL, isLocale, type Locale } from "@/lib/i18n/locale";

/**
 * Explicit manual override from the language switcher. Always fires as a
 * server Set-Cookie (never client-side document.cookie) so it isn't subject
 * to Safari ITP's 7-day cap on script-set cookies. Uses the long ("manual")
 * max-age — that's what makes it outlive the short-lived auto-detected
 * cookie the middleware sets on its own, so a later visit (e.g. over a VPN)
 * doesn't silently overwrite this choice; see resolveLocale in lib/i18n/locale.ts.
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE_MANUAL,
    sameSite: "lax",
  });
}
