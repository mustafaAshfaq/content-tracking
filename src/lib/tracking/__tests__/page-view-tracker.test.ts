import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildRouteKey, commitPageView, __resetPageViewTrackingForTests } from "../page-view-tracker";
import { getDataLayer, __resetServerDataLayerForTests } from "../data-layer";
import { defaultConsentSnapshot } from "../consent";
import * as consentModule from "../consent";

function pageViewEvents(): Array<Record<string, unknown>> {
  return getDataLayer().filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === "object" &&
      entry !== null &&
      "event" in entry &&
      (entry as { event: unknown }).event === "page_view",
  );
}

function grantAnalytics() {
  vi.spyOn(consentModule, "getConsentSnapshot").mockReturnValue({
    ...defaultConsentSnapshot(),
    analytics: true,
  });
}

describe("commitPageView", () => {
  beforeEach(() => {
    getDataLayer().length = 0;
    __resetServerDataLayerForTests();
    __resetPageViewTrackingForTests();
    vi.restoreAllMocks();
  });

  it("emits one page_view for a committed normalized route key", () => {
    grantAnalytics();

    const result = commitPageView({
      pathname: "/articles/packing-light",
      searchParams: new URLSearchParams("utm_source=newsletter"),
      queryAllowlist: ["utm_source"],
      routeId: "article-detail",
      pageType: "article",
      pageUrl: "https://example.test/articles/packing-light",
      title: "Packing Light",
    });

    expect(result.status).toBe("dispatched");
    expect(pageViewEvents()).toHaveLength(1);
    expect(pageViewEvents()[0]).toMatchObject({
      event: "page_view",
      properties: {
        page_url: "https://example.test/articles/packing-light",
        page_type: "article",
        route_id: "article-detail",
        title: "Packing Light",
      },
    });
  });

  it("does not emit a second page_view for the same committed route key", () => {
    grantAnalytics();

    const input = {
      pathname: "/",
      searchParams: new URLSearchParams(""),
      routeId: "home",
      pageType: "home" as const,
      pageUrl: "https://example.test/",
    };

    expect(commitPageView(input).status).toBe("dispatched");
    expect(commitPageView(input).status).toBe("suppressed");
    expect(pageViewEvents()).toHaveLength(1);
  });

  it("emits again when a different normalized route key commits", () => {
    grantAnalytics();

    commitPageView({
      pathname: "/",
      searchParams: new URLSearchParams(""),
      routeId: "home",
      pageType: "home",
      pageUrl: "https://example.test/",
    });
    const second = commitPageView({
      pathname: "/articles/packing-light",
      searchParams: new URLSearchParams(""),
      routeId: "article-detail",
      pageType: "article",
      pageUrl: "https://example.test/articles/packing-light",
    });

    expect(second.status).toBe("dispatched");
    if (second.status !== "dispatched") throw new Error("expected dispatch");
    expect(pageViewEvents()).toHaveLength(2);
    expect(second.event.properties.previous_route_id).toBe("home");
  });

  it("does not replay a consent-blocked page_view for the same route key", () => {
    vi.spyOn(consentModule, "getConsentSnapshot").mockReturnValue(
      defaultConsentSnapshot(),
    );

    const blocked = commitPageView({
      pathname: "/",
      searchParams: new URLSearchParams(""),
      routeId: "home",
      pageType: "home",
      pageUrl: "https://example.test/",
    });
    expect(blocked.status).toBe("blocked");
    expect(pageViewEvents()).toHaveLength(0);

    grantAnalytics();
    const retried = commitPageView({
      pathname: "/",
      searchParams: new URLSearchParams(""),
      routeId: "home",
      pageType: "home",
      pageUrl: "https://example.test/",
    });

    expect(retried.status).toBe("suppressed");
    expect(pageViewEvents()).toHaveLength(0);
  });
});

describe("buildRouteKey", () => {
  it("returns the bare pathname when no allowlisted query params are present", () => {
    const key = buildRouteKey("/articles/packing-light", new URLSearchParams(""), ["utm_source"]);
    expect(key).toBe("/articles/packing-light");
  });

  it("appends only allowlisted query params, sorted for stability", () => {
    const key = buildRouteKey(
      "/articles/packing-light",
      new URLSearchParams("b=2&a=1&ignored=zzz"),
      ["a", "b"],
    );
    expect(key).toBe("/articles/packing-light?a=1&b=2");
  });

  it("ignores query params not in the allowlist", () => {
    const key = buildRouteKey(
      "/articles/packing-light",
      new URLSearchParams("session=abc"),
      ["utm_source"],
    );
    expect(key).toBe("/articles/packing-light");
  });
});
