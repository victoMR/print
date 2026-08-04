import { cookies, headers } from "next/headers";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import {
  LANGUAGE_COOKIE,
  LANGUAGE_HEADER,
  languageFromAcceptLanguage,
  resolveLanguage,
} from "@/lib/i18n/locale";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  // next-intl "locale" stays the market path segment (mx|us) for routing / useLocale().
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const cookieStore = await cookies();
  const headerList = await headers();
  const language = resolveLanguage(
    cookieStore.get(LANGUAGE_COOKIE)?.value ??
      headerList.get(LANGUAGE_HEADER) ??
      languageFromAcceptLanguage(headerList.get("accept-language")),
  );

  return {
    locale,
    messages: (await import(`../messages/${language}.json`)).default,
  };
});
