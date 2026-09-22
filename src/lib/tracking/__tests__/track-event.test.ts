import { describe, it, expect, beforeEach, vi } from "vitest";
import { trackEvent } from "../track-event";
import { getDataLayer, __resetServerDataLayerForTests } from "../data-layer";
import { defaultConsentSnapshot } from "../consent";
import * as consentModule from "../consent";

function lastPushed(): Record<string, unknown> {
  const layer = getDataLayer();
  return layer[layer.length - 1] as Record<string, unknown>;
}

describe("trackEvent", () => {
  beforeEach(() => {
    getDataLayer().length = 0;
    __resetServerDataLayerForTests();
    vi.restoreAllMocks();
  });

  it("stamps implementation-owned envelope metadata on a valid, consented event", () => {
    vi.spyOn(consentModule, "getConsentSnapshot").mockReturnValue({
      ...defaultConsentSnapshot(),
      analytics: true,
    });

    const result = trackEvent({
      name: "page_view",
      properties: {
        page_url: "https://example.test/articles/packing-light",
        page_type: "article",
        route_id: "article-detail",
      },
    });

    expect(result.status).toBe("dispatched");
    if (result.status !== "dispatched") throw new Error("expected dispatch");

    expect(result.event.event_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result.event.event_version).toBe(1);
    expect(result.event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    expect(result.event.environment).toBe("development");
    expect(result.event.source).toBe("browser"); // jsdom test environment provides `window`
    expect(result.event.consent.necessary).toBe(true);
    expect(result.event.consent.analytics).toBe(true);
    expect(result.event.consent.policy_version).toBeTruthy();
    expect(result.event.consent.captured_at).toBeTruthy();

    expect(lastPushed()).toMatchObject({ event: "page_view" });
  });

  it("generates a distinct event_id for every call", () => {
    vi.spyOn(consentModule, "getConsentSnapshot").mockReturnValue({
      ...defaultConsentSnapshot(),
      analytics: true,
    });

    const first = trackEvent({
      name: "page_view",
      properties: { page_url: "https://example.test/", page_type: "home", route_id: "home" },
    });
    const second = trackEvent({
      name: "page_view",
      properties: { page_url: "https://example.test/", page_type: "home", route_id: "home" },
    });

    if (first.status !== "dispatched" || second.status !== "dispatched") {
      throw new Error("expected both dispatches to succeed");
    }
    expect(first.event.event_id).not.toBe(second.event.event_id);
  });

  it("rejects an event missing a required field and never pushes it", () => {
    vi.spyOn(consentModule, "getConsentSnapshot").mockReturnValue({
      ...defaultConsentSnapshot(),
      analytics: true,
    });

    const result = trackEvent({
      name: "page_view",
      // @ts-expect-error intentionally missing required `route_id`
      properties: { page_url: "https://example.test/", page_type: "home" },
    });

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("expected rejection");
    expect(result.reason).toBe("validation_error");
    expect(result.errors?.some((issue) => issue.path === "route_id")).toBe(true);
    expect(getDataLayer()).toHaveLength(0);
  });

  it("rejects an event with an unrecognised enum value", () => {
    vi.spyOn(consentModule, "getConsentSnapshot").mockReturnValue({
      ...defaultConsentSnapshot(),
      analytics: true,
    });

    const result = trackEvent({
      name: "page_view",
      properties: {
        page_url: "https://example.test/",
        // @ts-expect-error intentionally invalid enum value
        page_type: "not-a-real-page-type",
        route_id: "home",
      },
    });

    expect(result.status).toBe("rejected");
    expect(getDataLayer()).toHaveLength(0);
  });

  it("rejects an event carrying an unknown property", () => {
    vi.spyOn(consentModule, "getConsentSnapshot").mockReturnValue({
      ...defaultConsentSnapshot(),
      analytics: true,
    });

    const result = trackEvent({
      name: "page_view",
      properties: {
        page_url: "https://example.test/",
        page_type: "home",
        route_id: "home",
        // @ts-expect-error intentionally unknown property
        totally_unexpected_field: "should be rejected",
      },
    });

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("expected rejection");
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(getDataLayer()).toHaveLength(0);
  });

  it("blocks an analytics-gated event when analytics consent has not been granted, with an explicit reason", () => {
    vi.spyOn(consentModule, "getConsentSnapshot").mockReturnValue(
      defaultConsentSnapshot(),
    );

    const result = trackEvent({
      name: "article_viewed",
      properties: {
        content_id: "article_travel_packing_light",
        content_version: 1,
        content_type: "article",
        view_method: "loaded",
      },
    });

    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("expected block");
    expect(result.reason).toBe("consent_required");
    expect(result.requiredPurpose).toBe("analytics");
    expect(getDataLayer()).toHaveLength(0);
  });

  it("never blocks consent_updated regardless of current consent state", () => {
    vi.spyOn(consentModule, "getConsentSnapshot").mockReturnValue(
      defaultConsentSnapshot(),
    );

    const result = trackEvent({
      name: "consent_updated",
      properties: {
        purposes: {
          necessary: true,
          analytics: true,
          marketing: false,
          personalisation: false,
        },
        policy_version: "1",
        source: "banner",
      },
    });

    expect(result.status).toBe("dispatched");
  });

  it("rejects when the data layer push itself fails, instead of silently dropping the event", () => {
    vi.spyOn(consentModule, "getConsentSnapshot").mockReturnValue({
      ...defaultConsentSnapshot(),
      analytics: true,
    });

    const layer = getDataLayer();
    vi.spyOn(layer, "push").mockImplementation(() => {
      throw new Error("simulated infrastructure failure");
    });

    const result = trackEvent({
      name: "page_view",
      properties: { page_url: "https://example.test/", page_type: "home", route_id: "home" },
    });

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("expected rejection");
    expect(result.reason).toBe("infrastructure_error");
  });

  it("carries category_ids, event-scoped optional fields, and identity through to the dispatched event", () => {
    vi.spyOn(consentModule, "getConsentSnapshot").mockReturnValue({
      ...defaultConsentSnapshot(),
      analytics: true,
    });

    const result = trackEvent({
      name: "article_viewed",
      properties: {
        content_id: "article_travel_packing_light",
        content_version: 1,
        content_type: "article",
        view_method: "engaged",
        category_ids: ["travel"],
        dwell_ms: 4200,
      },
      correlation_id: "11111111-1111-4111-8111-111111111111",
      identity: { anonymous_id: "anon-123" },
    });

    expect(result.status).toBe("dispatched");
    if (result.status !== "dispatched") throw new Error("expected dispatch");
    expect(result.event.correlation_id).toBe("11111111-1111-4111-8111-111111111111");
    expect(result.event.identity).toEqual({ anonymous_id: "anon-123" });
    expect(result.event.properties.category_ids).toEqual(["travel"]);
  });
});
