import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_LOGIN_PATH } from "./lib/safe-redirect";
import { extractClientIp } from "./lib/i18n/geo-lookup";
import {
  DEFAULT_LOCALE,
  GEO_COUNTRY_HEADER,
  LANGUAGE_COOKIE,
  LANGUAGE_COOKIE_MAX_AGE,
  LANGUAGE_HEADER,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_AUTO,
  LOCALE_COOKIE_MAX_AGE_MANUAL,
  LOCALE_HEADER,
  LOCALES,
  isLanguage,
  languageFromAcceptLanguage,
  resolveLocale,
  type Language,
} from "./lib/i18n/locale";

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://va.vercel-scripts.com https://*.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "font-src 'self' data: https://use.typekit.net https://p.typekit.net",
    `connect-src 'self' ${apiOrigin} https://api.stripe.com https://vitals.vercel-insights.com https://*.vercel-insights.com`,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' mailto:",
    "navigate-to 'self' https: http: mailto: tel:",
  ].join("; ");
}

const CUSTOMER_GUEST_ONLY = ["/login", "/registro"];
const CUSTOMER_PROTECTED = ["/cuenta"];

const LOCALE_PREFIX_RE = new RegExp(`^/(${LOCALES.join("|")})(?=/|$)`);

function resolveRequestLanguage(request: NextRequest): { language: Language; setCookie: boolean } {
  const cookieValue = request.cookies.get(LANGUAGE_COOKIE)?.value;
  if (isLanguage(cookieValue)) {
    return { language: cookieValue, setCookie: false };
  }
  return {
    language: languageFromAcceptLanguage(request.headers.get("accept-language")),
    setCookie: true,
  };
}

/**
 * Genera un nonce criptográfico por request y lo aplica al CSP.
 * También protege rutas de admin, redirige "/" y rutas legacy sin prefijo
 * de mercado (/mx, /us) según ubicación real, y aplica las guardas de
 * sesión de cliente.
 *
 * Mercado (path) e idioma (cookie NEXT_LANGUAGE) son independientes.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCustomerSession = Boolean(request.cookies.get("customer_token"));

  const isAdminPath = pathname.startsWith("/admin");
  if (isAdminPath) {
    if (!(pathname === ADMIN_LOGIN_PATH || pathname.startsWith(`${ADMIN_LOGIN_PATH}/`))) {
      if (!request.cookies.get("admin_token") && !request.cookies.get("admin_refresh")) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = ADMIN_LOGIN_PATH;
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  const isApiPath = pathname.startsWith("/api");
  const skipMarketLogic = isAdminPath || isApiPath;
  const localeMatch = skipMarketLogic ? null : pathname.match(LOCALE_PREFIX_RE);
  const { language, setCookie: setLanguageCookie } = resolveRequestLanguage(request);

  if (!skipMarketLogic && !localeMatch) {
    const { locale } = await resolveLocale({
      cookieValue: request.cookies.get(LOCALE_COOKIE)?.value,
      country: request.headers.get(GEO_COUNTRY_HEADER),
      clientIp: extractClientIp(request.headers),
    });

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    const response = NextResponse.redirect(url);

    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE_AUTO,
      sameSite: "lax",
    });
    if (setLanguageCookie) {
      response.cookies.set(LANGUAGE_COOKIE, language, {
        path: "/",
        maxAge: LANGUAGE_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    }
    return response;
  }

  const currentLocale = localeMatch?.[1] ?? DEFAULT_LOCALE;
  const localelessPath = localeMatch ? pathname.slice(localeMatch[0].length) || "/" : pathname;

  if (!skipMarketLogic) {
    if (CUSTOMER_GUEST_ONLY.some((p) => localelessPath === p || localelessPath.startsWith(p + "/"))) {
      if (hasCustomerSession) {
        return NextResponse.redirect(new URL(`/${currentLocale}/cuenta`, request.url));
      }
    }

    if (CUSTOMER_PROTECTED.some((p) => localelessPath === p || localelessPath.startsWith(p + "/"))) {
      if (!hasCustomerSession) {
        const loginUrl = new URL(`/${currentLocale}/login`, request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const nonce = btoa(Array.from(array, (b) => String.fromCharCode(b)).join(""));

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(LOCALE_HEADER, currentLocale);
  requestHeaders.set(LANGUAGE_HEADER, language);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  if (localeMatch) {
    response.headers.set("Content-Language", language);
    // Keep market cookie aligned with the path the user is actually browsing.
    response.cookies.set(LOCALE_COOKIE, currentLocale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE_MANUAL,
      sameSite: "lax",
    });
  }
  if (setLanguageCookie) {
    response.cookies.set(LANGUAGE_COOKIE, language, {
      path: "/",
      maxAge: LANGUAGE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)).*)",
  ],
};
