import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_LOGIN_PATH } from "./lib/safe-redirect";
import {
  GEO_COUNTRY_HEADER,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  LOCALE_MANUAL_COOKIE,
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
const CUSTOMER_GUEST_ONLY = ["/login", "/registro"];

// Rutas que requieren sesión de cliente activa (redirect a /login si no hay sesión).
const CUSTOMER_PROTECTED = ["/cuenta"];

/**
 * Genera un nonce criptográfico por request y lo aplica al CSP.
 * También protege rutas de admin y aplica guardas de sesión de cliente.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCustomerSession = Boolean(request.cookies.get("customer_token"));

  // Locale resolution is pure/read-only here — the cookie is only written on the
  // final response below, mirroring how the CSP nonce is applied only there too.
  const { locale, source } = resolveLocale({
    cookieValue: request.cookies.get(LOCALE_COOKIE)?.value,
    isManual: request.cookies.get(LOCALE_MANUAL_COOKIE)?.value === "1",
    country: request.headers.get(GEO_COUNTRY_HEADER),
    acceptLanguage: request.headers.get("accept-language"),
  });

  // Admin redirect — antes de generar nonce para no hacer trabajo innecesario.
  if (pathname.startsWith("/admin")) {
    if (!(pathname === ADMIN_LOGIN_PATH || pathname.startsWith(`${ADMIN_LOGIN_PATH}/`))) {
      if (!request.cookies.get("admin_token") && !request.cookies.get("admin_refresh")) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = ADMIN_LOGIN_PATH;
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // Rutas guest-only: si ya tiene sesión, redirigir a /cuenta.
  if (CUSTOMER_GUEST_ONLY.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (hasCustomerSession) {
      return NextResponse.redirect(new URL("/cuenta", request.url));
    }
  }

  // Rutas protegidas: si no tiene sesión, redirigir a /login con ?redirect=.
  if (CUSTOMER_PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (!hasCustomerSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Generate a 16-byte random nonce (base64-encoded) per request.
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const nonce = btoa(Array.from(array, (b) => String.fromCharCode(b)).join(""));

  // Forward the nonce to RSC via request header so Next.js applies it to its
  // generated inline hydration scripts and so layout.tsx can read it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(LOCALE_HEADER, locale);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("Content-Language", locale);

  // Only persist the cookie when it wasn't a manual choice — an auto-detected
  // locale is re-derived and re-written on every request (so a returning
  // visitor from a different country gets re-detected), while a manual
  // choice (source === "cookie", gated on LOCALE_MANUAL_COOKIE) stays put.
  // Written as a Set-Cookie response header (not document.cookie) so it isn't
  // subject to Safari ITP's 7-day cap on client-script-set cookies.
  if (source !== "cookie") {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  // Run on all routes except Next.js internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)).*)",
  ],
};
