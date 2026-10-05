import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function preflight(origin: string) {
  return new NextRequest("http://localhost:3000/api/not-a-real-route", {
    method: "OPTIONS",
    headers: { origin },
  });
}

describe("proxy security headers", () => {
  it("attaches the CORS allowlist without accepting an unknown preflight itself", () => {
    const response = proxy(preflight("http://localhost:3000"));
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, OPTIONS");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type, Authorization, X-Write-Key",
    );
  });

  it("does not reflect a disallowed preflight origin", () => {
    const response = proxy(preflight("http://evil.example.test"));
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("sets a wildcard-free CSP on document responses", () => {
    const response = proxy(new NextRequest("http://localhost:3000/articles"));
    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain("*");
  });
});
