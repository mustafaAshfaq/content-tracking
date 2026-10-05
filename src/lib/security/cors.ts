import type { NextRequest, NextResponse } from "next/server";
import { resolveSecurityConfig, type SecurityEnv } from "./config";

/**
 * In production, `APP_ORIGIN` must be an exact HTTPS origin — there is no
 * wildcard, reflected-origin, or localhost fallback. Outside production an
 * unset origin defaults to the reserved local app port.
 */
export const ALLOWED_METHODS = "GET, POST, OPTIONS";
export const ALLOWED_HEADERS = "Content-Type, Authorization, X-Write-Key";

export function allowedOrigin(env: SecurityEnv = process.env): string {
  return resolveSecurityConfig(env).appOrigin;
}

export function isAllowedOrigin(
  origin: string | null,
  env: SecurityEnv = process.env,
): boolean {
  return origin !== null && origin === allowedOrigin(env);
}

/**
 * Applies the CORS response headers for the single allowed app origin.
 * Credentials are not enabled here — no contract in this build slice
 * requires cross-origin cookies. First-party cookies use
 * `firstPartyCookieAttributes` and set `Secure` on https origins.
 */
export function applyCorsHeaders(
  response: NextResponse,
  request: NextRequest,
  env: SecurityEnv = process.env,
): NextResponse {
  const origin = request.headers.get("origin");
  const allowed = allowedOrigin(env);
  if (origin === allowed) {
    response.headers.set("Access-Control-Allow-Origin", allowed);
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  return response;
}
