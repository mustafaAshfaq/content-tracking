/**
 * Shared taxonomy and environment constants used by the tracking data layer,
 * fixtures, and the recommendation module. Keeping these in one place ensures
 * the event schema and the content model never drift apart.
 */

export const CONTENT_CATEGORIES = [
  "travel",
  "finance",
  "health",
  "technology",
] as const;

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

export const ENVIRONMENTS = ["development", "staging", "production"] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export const EVENT_SOURCES = ["browser", "server"] as const;

export type EventSource = (typeof EVENT_SOURCES)[number];

/** The consent policy version currently in effect. Bumping this forces re-consent. */
export const CONSENT_POLICY_VERSION = "1";
