import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_LOGIN_PATH } from "./lib/safe-redirect";

/**
 * Protege /admin en el edge: sin cookie admin_token → login de panel (no /login de tienda).
 * /admin/login es la única ruta admin pública; el API sigue validando JWT en cada request.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (pathname === ADMIN_LOGIN_PATH || pathname.startsWith(`${ADMIN_LOGIN_PATH}/`)) {
    return NextResponse.next();
  }

  if (!request.cookies.get("admin_token") && !request.cookies.get("admin_refresh")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ADMIN_LOGIN_PATH;
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
