import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_LOGIN_PATH } from "./lib/safe-redirect";

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // 'unsafe-inline' removed — nonce covers Next.js hydration scripts + our JsonLd tags.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://va.vercel-scripts.com https://*.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline' https://use.typekit.net",
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

/**
 * Genera un nonce criptográfico por request y lo aplica al CSP.
 * También protege /admin en el edge: sin cookie admin_token → login de panel.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // Generate a 16-byte random nonce (base64-encoded) per request.
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const nonce = btoa(Array.from(array, (b) => String.fromCharCode(b)).join(""));

  // Forward the nonce to RSC via request header so Next.js applies it to its
  // generated inline hydration scripts and so layout.tsx can read it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  return response;
}

export const config = {
  // Run on all routes except Next.js internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)).*)",
  ],
};
