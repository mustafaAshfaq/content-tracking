import { describe, it, expect } from "vitest";
import { buildContentSecurityPolicy } from "../csp";

const productionEnv = {
  NODE_ENV: "production",
  APP_ORIGIN: "https://app.example.com",
  NEXT_PUBLIC_GTM_TAGGING_ORIGIN: "https://tags.example.com",
  NEXT_PUBLIC_RUDDERSTACK_DATAPLANE_URL: "https://data.example.com",
  NEXT_PUBLIC_GTM_PREVIEW_ORIGIN: "https://preview.example.com",
  NEXT_PUBLIC_MOCK_DESTINATIONS_ORIGIN: "https://mocks.example.com",
};

function directive(csp: string, name: string): string {
  const match = csp.split("; ").find((entry) => entry.startsWith(`${name} `));
  expect(match).toBeDefined();
  return match ?? "";
}

describe("buildContentSecurityPolicy", () => {
  it("locks default-src to self and never includes a wildcard", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain("*");
  });

  it("allowlists app, GTM tagging, RudderStack, and mocks in connect-src outside production", () => {
    const connectSrc = directive(buildContentSecurityPolicy(), "connect-src");
    expect(connectSrc).toContain("http://localhost:3000");
    expect(connectSrc).toContain("http://localhost:8080");
    expect(connectSrc).toContain("http://localhost:8082");
    expect(connectSrc).toContain("http://localhost:8090");
  });

  it("allowlists self, data, and GTM tagging in img-src", () => {
    const imgSrc = directive(buildContentSecurityPolicy(), "img-src");
    expect(imgSrc).toBe("img-src 'self' data: http://localhost:8080");
  });

  it("allows self, GTM preview, and Tag Assistant in frame-src outside production", () => {
    const frameSrc = directive(buildContentSecurityPolicy(false), "frame-src");
    expect(frameSrc).toContain("http://localhost:8081");
    expect(frameSrc).toContain("https://tagassistant.google.com");
  });

  it("uses only the exact https app, tagging, and RudderStack origins in production", () => {
    const csp = buildContentSecurityPolicy(true, productionEnv);
    const connectSrc = directive(csp, "connect-src");
    const frameSrc = directive(csp, "frame-src");
    expect(connectSrc).toContain("https://app.example.com");
    expect(connectSrc).toContain("https://tags.example.com");
    expect(connectSrc).toContain("https://data.example.com");
    expect(connectSrc).not.toContain("mocks.example.com");
    expect(connectSrc).not.toContain("localhost");
    expect(frameSrc).toBe("frame-src 'self'");
    expect(csp).not.toContain("preview.example.com");
    expect(csp).not.toContain("tagassistant.google.com");
  });

  it("fails closed when production origins are missing or not exact https", () => {
    expect(() => buildContentSecurityPolicy(true, { NODE_ENV: "production" })).toThrow(
      /APP_ORIGIN/,
    );
    expect(() =>
      buildContentSecurityPolicy(true, {
        ...productionEnv,
        APP_ORIGIN: "http://app.example.com",
      }),
    ).toThrow(/exact https/);
  });
});
