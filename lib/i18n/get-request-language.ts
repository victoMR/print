import { cookies, headers } from "next/headers";
import {
  LANGUAGE_COOKIE,
  LANGUAGE_HEADER,
  languageFromAcceptLanguage,
  resolveLanguage,
  type Language,
} from "./locale";

/** Language for the current RSC/request (cookie → header → Accept-Language → es). */
export async function getRequestLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LANGUAGE_COOKIE)?.value;
  if (fromCookie) return resolveLanguage(fromCookie);

  const headerList = await headers();
  const fromHeader = headerList.get(LANGUAGE_HEADER);
  if (fromHeader) return resolveLanguage(fromHeader);

  return languageFromAcceptLanguage(headerList.get("accept-language"));
}
