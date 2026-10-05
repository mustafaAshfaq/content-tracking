import { describe, expect, it } from "vitest";
import { firstPartyCookieAttributes, resolveSecurityConfig } from "../config";

const productionEnv = {
  NODE_ENV: "production",
  APP_ORIGIN: "https://app.example.com",
  NEXT_PUBLIC_GTM_TAGGING_ORIGIN: "https://tags.example.com",
  NEXT_PUBLIC_RUDDERSTACK_DATAPLANE_URL: "https://data.example.com",
  NEXT_PUBLIC_GTM_PREVIEW_ORIGIN: "https://preview.example.com",
  NEXT_PUBLIC_MOCK_DESTINATIONS_ORIGIN: "https://mocks.example.com",
};

describe("resolveSecurityConfig", () => {
  it("uses the reserved localhost origins outside production", () => {
    const config = resolveSecurityConfig({ NODE_ENV: "test" });

    expect(config.appOrigin).toBe("http://localhost:3000");
    expect(config.gtmTaggingOrigin).toBe("http://localhost:8080");
    expect(config.rudderstackOrigin).toBe("http://localhost:8082");
    expect(config.gtmPreviewOrigin).toBe("http://localhost:8081");
    expect(config.mockDestinationsOrigin).toBe("http://localhost:8090");
    expect(config.tagAssistantOrigin).toBe("https://tagassistant.google.com");
    expect(config.secureCookies).toBe(false);
  });

  it("requires exact https origins in production and drops mock and preview", () => {
    const config = resolveSecurityConfig(productionEnv);

    expect(config.appOrigin).toBe("https://app.example.com");
    expect(config.gtmTaggingOrigin).toBe("https://tags.example.com");
    expect(config.rudderstackOrigin).toBe("https://data.example.com");
    expect(config.gtmPreviewOrigin).toBeUndefined();
    expect(config.mockDestinationsOrigin).toBeUndefined();
    expect(config.tagAssistantOrigin).toBeUndefined();
    expect(config.secureCookies).toBe(true);
  });

  it("fails closed when a required production origin is missing", () => {
    expect(() =>
      resolveSecurityConfig({
        ...productionEnv,
        APP_ORIGIN: undefined,
      }),
    ).toThrow(/APP_ORIGIN/);
  });

  it("fails closed when a production origin is not an exact https origin", () => {
    expect(() =>
      resolveSecurityConfig({
        ...productionEnv,
        APP_ORIGIN: "http://app.example.com",
      }),
    ).toThrow(/https/);

    expect(() =>
      resolveSecurityConfig({
        ...productionEnv,
        NEXT_PUBLIC_GTM_TAGGING_ORIGIN: "https://*.example.com",
      }),
    ).toThrow(/exact https/);
  });
});

describe("firstPartyCookieAttributes", () => {
  it("sets Secure when cookies are served from an https origin", () => {
    const httpLocal = resolveSecurityConfig({ NODE_ENV: "development" });
    expect(firstPartyCookieAttributes(httpLocal)).toEqual({
      path: "/",
      sameSite: "Lax",
      secure: false,
    });

    const httpsLocal = resolveSecurityConfig({
      NODE_ENV: "development",
      APP_ORIGIN: "https://localhost:3000",
    });
    expect(firstPartyCookieAttributes(httpsLocal).secure).toBe(true);

    const production = resolveSecurityConfig(productionEnv);
    expect(firstPartyCookieAttributes(production)).toEqual({
      path: "/",
      sameSite: "Lax",
      secure: true,
    });
  });
});
