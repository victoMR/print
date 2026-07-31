"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/locale";

/**
 * Explicit manual override from the language switcher. Always fires as a
 * server Set-Cookie (never client-side document.cookie) so it isn't subject
 * to Safari ITP's 7-day cap on script-set cookies.
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
