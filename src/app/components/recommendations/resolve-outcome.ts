import {
  getConsentSnapshot,
  isPurposeGranted,
  type ConsentSnapshot,
} from "@/lib/tracking/consent";
import { getFallbackProducts, type Product } from "@/content/products";
import type { ContentCategory } from "@/lib/tracking";

/**
 * Every non-success outcome the module can render. `denied` and `unknown`
 * are reachable today (no consent UI / no activation backend exist yet in
 * this build slice); `empty`, `expired`, `timeout`, and `error` are modeled
 * now so the activation work in a later slice only has to supply the
 * outcome, not new UI states.
 */
export type FallbackReason =
  | "denied"
  | "empty"
  | "expired"
  | "unknown"
  | "timeout"
  | "error";

export type RecommendationOutcome =
  | { kind: "success"; products: Product[]; category: ContentCategory }
  | { kind: "fallback"; reason: FallbackReason; products: Product[] };

export const FALLBACK_NOTES: Record<FallbackReason, string> = {
  denied:
    "Showing popular picks. Turn on Personalisation in privacy settings to see picks based on what you read.",
  empty: "Showing popular picks. No personalized picks are available yet.",
  expired: "Showing popular picks while your personalized picks refresh.",
  unknown: "Showing popular picks. Personalized recommendations aren't available right now.",
  timeout: "Showing popular picks. Personalized recommendations took too long to load.",
  error: "Showing popular picks. Something went wrong loading personalized recommendations.",
};

/**
 * Decides what the module shows. With no consent and no personalization
 * backend in this build slice, every visitor sees the truthful static
 * "Popular right now" fallback — never an empty slot, and never a
 * personalized payload without Personalisation consent.
 */
export function resolveRecommendationOutcome(
  consent: ConsentSnapshot,
): RecommendationOutcome {
  if (!isPurposeGranted(consent, "personalisation")) {
    return { kind: "fallback", reason: "denied", products: getFallbackProducts() };
  }

  // Personalisation is granted, but audience activation (a later build
  // slice) doesn't exist yet, so there is nothing to personalize with.
  return { kind: "fallback", reason: "unknown", products: getFallbackProducts() };
}

export function getCurrentRecommendationOutcome(): RecommendationOutcome {
  return resolveRecommendationOutcome(getConsentSnapshot());
}
