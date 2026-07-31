import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_LOGIN_PATH } from "./lib/safe-redirect";
import { extractClientIp } from "./lib/i18n/geo-lookup";
import {
  GEO_COUNTRY_HEADER,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_AUTO,
  LOCALE_HEADER,
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
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCustomerSession = Boolean(request.cookies.get("customer_token"));

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

  // Resolved after the redirect checks (not before) — it can trigger a real IP
  // geolocation lookup on a cache miss, so requests that just redirect never
  // pay for that. Only reused/skipped when a NEXT_LOCALE cookie is already
  // present (manual or still-fresh auto-detected — see resolveLocale docstring).
  const { locale, source } = await resolveLocale({
    cookieValue: request.cookies.get(LOCALE_COOKIE)?.value,
    country: request.headers.get(GEO_COUNTRY_HEADER),
    clientIp: extractClientIp(request.headers),
    acceptLanguage: request.headers.get("accept-language"),
  });

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

  // Only persist the cookie when it was freshly derived (source !== "cookie")
  // — a short max-age so the site re-checks periodically instead of trusting
  // one detection forever. A manual choice (set by app/actions/set-locale.ts
  // with the long max-age) is never touched here.
  // Written as a Set-Cookie response header (not document.cookie) so it isn't
  // subject to Safari ITP's 7-day cap on client-script-set cookies.
  if (source !== "cookie") {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE_AUTO,
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
