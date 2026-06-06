import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware: enforce server-side route protection for the admin panel.
 * Without this, the admin page HTML and JS bundle are served to all visitors
 * and the auth check is client-only.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin — require the HttpOnly cookie set on login.
  if (pathname.startsWith("/admin")) {
    const adminToken = request.cookies.get("admin_token");
    if (!adminToken) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
