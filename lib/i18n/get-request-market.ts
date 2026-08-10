import { headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale, type Locale } from "./locale";

/** Market (mx|us) for the current RSC/request, from the x-locale header set by middleware. */
export async function getRequestMarket(): Promise<Locale> {
  const headerList = await headers();
  const fromHeader = headerList.get(LOCALE_HEADER);
  return isLocale(fromHeader) ? fromHeader : DEFAULT_LOCALE;
}
