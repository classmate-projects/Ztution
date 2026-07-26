import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/authorize";

// Optimistic, fast-fail check only: rejects requests that carry no session at
// all before they reach a route handler / page. This is NOT the source of
// truth for authorization — Next.js 16 recommends against relying on Proxy
// for real auth decisions (a matcher change could silently remove coverage),
// so every API route still calls authenticate()/requirePermission() from
// lib/authorize.ts, and dashboard pages call getSession() from lib/session.ts
// themselves. See docs/app/getting-started/16-proxy.md.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession =
    Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value) ||
    Boolean(request.headers.get("authorization")?.startsWith("Bearer "));

  if (pathname.startsWith("/api/")) {
    if (!hasSession) {
      return NextResponse.json(
        { status: "error", message: "Missing session cookie or Authorization header", data: null },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard") && !hasSession) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/((?!auth/login|auth/register).*)", "/dashboard/:path*"],
};
