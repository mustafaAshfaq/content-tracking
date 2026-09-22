import { describe, it, expect } from "vitest";
import { resolveRecommendationOutcome } from "../resolve-outcome";
import { defaultConsentSnapshot } from "@/lib/tracking/consent";
import { FALLBACK_PRODUCT_IDS } from "@/content/products";

describe("resolveRecommendationOutcome", () => {
  it("falls back to the static Popular right now list when personalisation consent is absent", () => {
    const outcome = resolveRecommendationOutcome(defaultConsentSnapshot());
    expect(outcome.kind).toBe("fallback");
    if (outcome.kind !== "fallback") throw new Error("expected fallback");
    expect(outcome.reason).toBe("denied");
    expect(outcome.products.map((p) => p.id)).toEqual([...FALLBACK_PRODUCT_IDS]);
  });

  it("still falls back (no personalized payload) even when personalisation consent is granted, because activation isn't built yet", () => {
    const outcome = resolveRecommendationOutcome({
      ...defaultConsentSnapshot(),
      personalisation: true,
    });
    expect(outcome.kind).toBe("fallback");
    if (outcome.kind !== "fallback") throw new Error("expected fallback");
    expect(outcome.reason).toBe("unknown");
    expect(outcome.products.map((p) => p.id)).toEqual([...FALLBACK_PRODUCT_IDS]);
  });
});
