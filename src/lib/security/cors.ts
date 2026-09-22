import type { NextRequest, NextResponse } from "next/server";

/**
 * In production, `APP_ORIGIN` must be set to the exact HTTPS origin — there
 * is no wildcard or reflected-origin fallback. In development it defaults
 * to the reserved local app port.
 */
export const ALLOWED_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:3000";
export const ALLOWED_METHODS = "GET, POST, OPTIONS";
export const ALLOWED_HEADERS = "Content-Type, Authorization, X-Write-Key";

export function isAllowedOrigin(origin: string | null): boolean {
  return origin !== null && origin === ALLOWED_ORIGIN;
}

/**
 * Applies the CORS response headers for the single allowed app origin.
 * Credentials are not enabled here — no contract in this build slice
 * requires cross-origin cookies.
 */
export function applyCorsHeaders(
  response: NextResponse,
  request: NextRequest,
): NextResponse {
  const origin = request.headers.get("origin");
  if (isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  return response;
}
