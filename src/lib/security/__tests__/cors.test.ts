import { describe, it, expect } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { applyCorsHeaders, isAllowedOrigin, ALLOWED_ORIGIN } from "../cors";

function requestWithOrigin(origin: string | null) {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new NextRequest("http://localhost:3000/api/example", { headers });
}

describe("CORS policy", () => {
  it("allows only the configured app origin", () => {
    expect(isAllowedOrigin(ALLOWED_ORIGIN)).toBe(true);
    expect(isAllowedOrigin("http://evil.example.test")).toBe(false);
    expect(isAllowedOrigin(null)).toBe(false);
  });

  it("sets Access-Control-Allow-Origin only for the allowed origin", () => {
    const allowed = applyCorsHeaders(NextResponse.next(), requestWithOrigin(ALLOWED_ORIGIN));
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);

    const disallowed = applyCorsHeaders(
      NextResponse.next(),
      requestWithOrigin("http://evil.example.test"),
    );
    expect(disallowed.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("always declares the exact allowed methods and headers", () => {
    const response = applyCorsHeaders(NextResponse.next(), requestWithOrigin(ALLOWED_ORIGIN));
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, OPTIONS");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type, Authorization, X-Write-Key",
    );
  });
});
