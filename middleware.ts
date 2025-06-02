// middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🔐 Protéger /admin et tous ses sous-routes
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const isAdminLoggedIn =
      request.cookies.get("admin_logged_in")?.value === "true";
    if (!isAdminLoggedIn) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // ✅ Laisse passer toutes les autres routes
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/formulaire/:path*"],
};
