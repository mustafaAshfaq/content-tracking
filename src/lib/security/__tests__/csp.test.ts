import { describe, it, expect } from "vitest";
import { buildContentSecurityPolicy } from "../csp";

describe("buildContentSecurityPolicy", () => {
  it("locks default-src to self and never includes a wildcard", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain("*");
  });

  it("allows only the app, GTM tagging, and RudderStack origins in connect-src by default", () => {
    const csp = buildContentSecurityPolicy();
    const connectSrc = csp.split("; ").find((d) => d.startsWith("connect-src"));
    expect(connectSrc).toContain("http://localhost:3000");
    expect(connectSrc).toContain("http://localhost:8080");
    expect(connectSrc).toContain("http://localhost:8082");
  });

  it("allows self, GTM preview, and Tag Assistant in frame-src outside production", () => {
    const csp = buildContentSecurityPolicy(false);
    const frameSrc = csp.split("; ").find((d) => d.startsWith("frame-src"));
    expect(frameSrc).toContain("http://localhost:8081");
    expect(frameSrc).toContain("https://tagassistant.google.com");
  });

  it("omits the mock-destinations origin, GTM preview, and Tag Assistant in production", () => {
    const csp = buildContentSecurityPolicy(true);
    const connectSrc = csp.split("; ").find((d) => d.startsWith("connect-src"));
    const frameSrc = csp.split("; ").find((d) => d.startsWith("frame-src"));
    expect(connectSrc).not.toContain("8090");
    expect(frameSrc).not.toContain("8081");
    expect(frameSrc).not.toContain("tagassistant.google.com");
  });
});
