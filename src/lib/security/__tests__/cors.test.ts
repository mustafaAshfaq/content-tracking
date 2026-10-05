import { describe, it, expect } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { applyCorsHeaders, isAllowedOrigin, allowedOrigin } from "../cors";

const productionEnv = {
  NODE_ENV: "production",
  APP_ORIGIN: "https://app.example.com",
  NEXT_PUBLIC_GTM_TAGGING_ORIGIN: "https://tags.example.com",
  NEXT_PUBLIC_RUDDERSTACK_DATAPLANE_URL: "https://data.example.com",
};

function requestWithOrigin(origin: string | null) {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new NextRequest("http://localhost:3000/api/example", { headers });
}

describe("CORS policy", () => {
  it("allows only the configured app origin", () => {
    const origin = allowedOrigin();
    expect(origin).toBe("http://localhost:3000");
    expect(isAllowedOrigin(origin)).toBe(true);
    expect(isAllowedOrigin("http://evil.example.test")).toBe(false);
    expect(isAllowedOrigin(null)).toBe(false);
  });

  it("sets Access-Control-Allow-Origin only for the allowed origin", () => {
    const origin = allowedOrigin();
    const allowed = applyCorsHeaders(NextResponse.next(), requestWithOrigin(origin));
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe(origin);

    const disallowed = applyCorsHeaders(
      NextResponse.next(),
      requestWithOrigin("http://evil.example.test"),
    );
    expect(disallowed.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("always declares the exact allowed methods and headers", () => {
    const response = applyCorsHeaders(NextResponse.next(), requestWithOrigin(allowedOrigin()));
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, OPTIONS");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type, Authorization, X-Write-Key",
    );
  });

  it("uses the exact https app origin in production and rejects localhost", () => {
    expect(isAllowedOrigin("https://app.example.com", productionEnv)).toBe(true);
    expect(isAllowedOrigin("http://localhost:3000", productionEnv)).toBe(false);

    const response = applyCorsHeaders(
      NextResponse.next(),
      requestWithOrigin("https://app.example.com"),
      productionEnv,
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example.com");
  });

  it("fails closed when the production app origin is missing", () => {
    expect(() => isAllowedOrigin("https://app.example.com", { NODE_ENV: "production" })).toThrow(
      /APP_ORIGIN/,
    );
  });
});
