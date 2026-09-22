export { trackEvent } from "./track-event";
export type {
  TrackEventInput,
  TrackResult,
  TrackedEvent,
  ValidationIssue,
} from "./track-event";

export {
  EVENT_NAMES,
  EVENT_VERSIONS,
  eventPropertySchemas,
} from "./events";
export type { EventName, EventPropertiesByName } from "./events";

export { CONTENT_CATEGORIES, ENVIRONMENTS, EVENT_SOURCES } from "./constants";
export type { ContentCategory, Environment, EventSource } from "./constants";

export {
  CONSENT_PURPOSES,
  consentSnapshotSchema,
  defaultConsentSnapshot,
  getConsentSnapshot,
  isPurposeGranted,
  EVENT_CONSENT_REQUIREMENTS,
} from "./consent";
export type { ConsentPurpose, ConsentSnapshot } from "./consent";

export type { Identity } from "./envelope";
export { generateUuid } from "./envelope";

export { getDataLayer } from "./data-layer";

export { PageViewTracker, buildRouteKey } from "./page-view-tracker";
export type { PageViewDescriptor } from "./page-view-tracker";
