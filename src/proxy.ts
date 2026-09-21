import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "@/lib/security/csp";
import { applyCorsHeaders } from "@/lib/security/cors";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

/**
 * Applies the CSP header to every response and CORS handling to `/api/*`
 * routes (including short-circuiting preflight `OPTIONS` requests). Route
 * handlers still return their own explicit 4xx for unknown paths — this
 * only adds the shared security headers. (Next.js 16 renamed this file
 * convention from `middleware.ts` to `proxy.ts`.)
 */
export function proxy(request: NextRequest) {
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");

  if (isApiRequest && request.method === "OPTIONS") {
    return applyCorsHeaders(new NextResponse(null, { status: 204 }), request);
  }

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy());

  if (isApiRequest) {
    applyCorsHeaders(response, request);
  }

  return response;
}
