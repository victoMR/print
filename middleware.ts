import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_LOGIN_PATH } from "./lib/safe-redirect";
import { extractClientIp } from "./lib/i18n/geo-lookup";
import {
  DEFAULT_LOCALE,
  GEO_COUNTRY_HEADER,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_AUTO,
  LOCALE_HEADER,
  LOCALES,
  resolveLocale,
} from "./lib/i18n/locale";

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // 'unsafe-inline' removed — nonce covers Next.js hydration scripts + our JsonLd tags.
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

// Rutas solo accesibles sin sesión de cliente (redirect a /cuenta si ya hay sesión).
// Comparadas contra el pathname SIN el prefijo de mercado (/mx, /us).
const CUSTOMER_GUEST_ONLY = ["/login", "/registro"];

// Rutas que requieren sesión de cliente activa (redirect a /login si no hay sesión).
const CUSTOMER_PROTECTED = ["/cuenta"];

const LOCALE_PREFIX_RE = new RegExp(`^/(${LOCALES.join("|")})(?=/|$)`);

/**
 * Genera un nonce criptográfico por request y lo aplica al CSP.
 * También protege rutas de admin, redirige "/" y rutas legacy sin prefijo
 * de mercado (/mx, /us) según ubicación real, y aplica las guardas de
 * sesión de cliente.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCustomerSession = Boolean(request.cookies.get("customer_token"));

  // Admin redirect — antes que cualquier lógica de mercado/nonce. /admin nunca
  // lleva prefijo de mercado y tiene su propia autenticación.
  if (pathname.startsWith("/admin")) {
    if (!(pathname === ADMIN_LOGIN_PATH || pathname.startsWith(`${ADMIN_LOGIN_PATH}/`))) {
      if (!request.cookies.get("admin_token") && !request.cookies.get("admin_refresh")) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = ADMIN_LOGIN_PATH;
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
    return NextResponse.next();
  }

  // /api tampoco lleva prefijo de mercado (rutas de proxy/webhooks) — se deja
  // pasar sin redirect de mercado ni guardas de cliente, pero sí recibe CSP/nonce
  // por consistencia con el resto (no le hace daño, y mantiene el comportamiento previo).
  const isApiPath = pathname.startsWith("/api");
  const localeMatch = isApiPath ? null : pathname.match(LOCALE_PREFIX_RE);

  if (!isApiPath && !localeMatch) {
    // "/" o cualquier ruta legacy sin prefijo (bookmarks, links viejos, resultados
    // de búsqueda ya indexados) — se redirige según la ubicación real detectada,
    // no siempre al mercado por default.
    const { locale } = await resolveLocale({
      cookieValue: request.cookies.get(LOCALE_COOKIE)?.value,
      country: request.headers.get(GEO_COUNTRY_HEADER),
      clientIp: extractClientIp(request.headers),
      acceptLanguage: request.headers.get("accept-language"),
    });

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    const response = NextResponse.redirect(url);

    // Recordar el mercado detectado para la próxima visita a una URL sin
    // prefijo (ej. "/" de nuevo desde otra pestaña) — TTL corto, se re-evalúa
    // periódicamente en vez de quedar fijo para siempre.
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE_AUTO,
      sameSite: "lax",
    });
    return response;
  }

  const currentLocale = localeMatch?.[1] ?? DEFAULT_LOCALE;
  const localelessPath = localeMatch ? pathname.slice(localeMatch[0].length) || "/" : pathname;

  if (!isApiPath) {
    // Rutas guest-only: si ya tiene sesión, redirigir a /cuenta (con el mismo prefijo).
    if (CUSTOMER_GUEST_ONLY.some((p) => localelessPath === p || localelessPath.startsWith(p + "/"))) {
      if (hasCustomerSession) {
        return NextResponse.redirect(new URL(`/${currentLocale}/cuenta`, request.url));
      }
    }

    // Rutas protegidas: si no tiene sesión, redirigir a /login (con el mismo prefijo) con ?redirect=.
    if (CUSTOMER_PROTECTED.some((p) => localelessPath === p || localelessPath.startsWith(p + "/"))) {
      if (!hasCustomerSession) {
        const loginUrl = new URL(`/${currentLocale}/login`, request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // Generate a 16-byte random nonce (base64-encoded) per request.
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const nonce = btoa(Array.from(array, (b) => String.fromCharCode(b)).join(""));

  // Forward the nonce to RSC via request header so Next.js applies it to its
  // generated inline hydration scripts and so layout.tsx can read it. Also
  // forward the resolved market so the root layout (which has no [locale]
  // param, since it wraps /admin too) can set <html lang> correctly.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(LOCALE_HEADER, currentLocale);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  if (localeMatch) response.headers.set("Content-Language", currentLocale);

  return response;
}

export const config = {
  // Run on all routes except Next.js internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)).*)",
  ],
};
