import { NextResponse } from "next/server";

/**
 * Every currently defined API path is registered explicitly elsewhere. This
 * catch-all guarantees any other `/api/*` path — including near-misses and
 * probes — gets an explicit 404 rather than falling through to a default
 * Next.js page response. The app is never an open proxy.
 */
function notFound() {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
