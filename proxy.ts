import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Optimistic, fast-fail check only: rejects requests that carry no session at
// all before they reach a route handler / page. This is NOT the source of
// truth for authorization — Next.js 16 recommends against relying on Proxy
// for real auth decisions (a matcher change could silently remove coverage),
// so every API route still calls authenticate()/requirePermission() from
// lib/authorize.ts, and dashboard pages call getSession() from lib/session.ts
// themselves. See docs/app/getting-started/16-proxy.md.
//
// Also does double duty as the Supabase session-refresh point: updateSession()
// calls supabase.auth.getUser(), which transparently renews an expiring access
// token and writes the refreshed cookies onto the response, so users stay
// signed in across the refresh-token lifetime instead of hard-expiring.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user } = await updateSession(request);
  const hasSession = Boolean(user) || Boolean(request.headers.get("authorization")?.startsWith("Bearer "));

  if (pathname.startsWith("/api/")) {
    if (!hasSession) {
      return NextResponse.json(
        { status: "error", message: "Missing session cookie or Authorization header", data: null },
        { status: 401 }
      );
    }
    return response;
  }

  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/billing")) && !hasSession) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return response;
}

export const config = {
  // /api/webhooks/* is called directly by Stripe (no session cookie/header
  // exists on those requests) — its own signature check is the real guard.
  matcher: [
    "/api/((?!auth/login|auth/register|webhooks/).*)",
    "/dashboard/:path*",
    "/billing/:path*",
  ],
};
