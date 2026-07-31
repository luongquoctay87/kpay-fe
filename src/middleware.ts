import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants/auth";
import { adminLoginHref, isPublicPath, ROUTES } from "@/lib/constants/routes";

/**
 * Soft gate via session marker cookie (set with access token).
 * Skip `/api/*` — proxied to Spring Boot (login must not be redirected to HTML).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.get(SESSION_COOKIE)?.value === "1";
  const publicPath = isPublicPath(pathname);

  if (!publicPath && !hasSession) {
    return NextResponse.redirect(new URL(adminLoginHref(pathname), request.url));
  }

  if (pathname === ROUTES.login && hasSession) {
    return NextResponse.redirect(new URL(ROUTES.home, request.url));
  }

  if (pathname === ROUTES.portalLogin && hasSession) {
    return NextResponse.redirect(new URL(ROUTES.home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
