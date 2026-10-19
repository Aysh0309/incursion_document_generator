import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.match(/\.(docx|pdf|png|jpg|jpeg|svg|ico|webp|woff|woff2|ttf)$/i) ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Allow genuinely public pages and routes:
  // - Homepage: "/"
  // - NextAuth OAuth authentication handlers: "/api/auth/*"
  // - Institutional email signing links: "/sign/*"
  // - Public token-based signature verification and submission: "/api/signatures/*"
  if (
    pathname === "/" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/sign") ||
    pathname.startsWith("/api/signatures")
  ) {
    return NextResponse.next();
  }

  // 3. Inspect genuine Auth.js session cookies
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) {
    // If unauthenticated request is an API call, reject with HTTP 401 Unauthorized
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Unauthorized: Active authenticated session required" },
        { status: 401 }
      );
    }

    // If unauthenticated request is a protected web page, redirect to home with reason
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("error", "SessionRequired");
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
