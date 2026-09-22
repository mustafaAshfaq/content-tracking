import { z } from "zod";
import {
  EVENT_VERSIONS,
  eventPropertySchemas,
  type EventName,
  type EventPropertiesByName,
} from "./events";
import { createEnvelopeMeta, identitySchema, type Identity } from "./envelope";
import {
  EVENT_CONSENT_REQUIREMENTS,
  getConsentSnapshot,
  isPurposeGranted,
  type ConsentPurpose,
  type ConsentSnapshot,
} from "./consent";
import { pushToDataLayer } from "./data-layer";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface TrackEventInput<N extends EventName> {
  name: N;
  properties: EventPropertiesByName[N];
  correlation_id?: string;
  identity?: Identity;
}

export interface TrackedEvent<N extends EventName = EventName> {
  event: N;
  event_id: string;
  event_version: number;
  timestamp: string;
  environment: string;
  source: string;
  correlation_id?: string;
  identity?: Identity;
  consent: ConsentSnapshot;
  properties: EventPropertiesByName[N];
}

export type TrackResult<N extends EventName = EventName> =
  | { status: "dispatched"; event: TrackedEvent<N> }
  | {
      status: "blocked";
      reason: "consent_required";
      requiredPurpose: ConsentPurpose;
      message: string;
    }
  | {
      status: "rejected";
      reason: "validation_error" | "infrastructure_error";
      message: string;
      errors?: ValidationIssue[];
    };

function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * The sole entry point for pushing events into the browser data layer.
 *
 * Every event is (1) validated against its runtime schema — required fields,
 * closed enums, and no unknown properties — (2) stamped with
 * implementation-owned envelope metadata, (3) attached to a consent
 * snapshot, and (4) purpose-gated. Anything invalid or consent-blocked is
 * rejected/blocked before it can reach `dataLayer`; there is no
 * throw-and-swallow path.
 */
export function trackEvent<N extends EventName>(
  input: TrackEventInput<N>,
): TrackResult<N> {
  const { name, properties, correlation_id, identity } = input;

  const propertySchema = eventPropertySchemas[name] as unknown as z.ZodType<
    EventPropertiesByName[N]
  >;
  if (!propertySchema) {
    return {
      status: "rejected",
      reason: "validation_error",
      message: `Unknown event name: ${String(name)}`,
    };
  }

  const propertiesResult = propertySchema.safeParse(properties);
  if (!propertiesResult.success) {
    return {
      status: "rejected",
      reason: "validation_error",
      message: `Event "${name}" failed property validation`,
      errors: toValidationIssues(propertiesResult.error),
    };
  }

  if (identity !== undefined) {
    const identityResult = identitySchema.safeParse(identity);
    if (!identityResult.success) {
      return {
        status: "rejected",
        reason: "validation_error",
        message: `Event "${name}" carried an invalid identity`,
        errors: toValidationIssues(identityResult.error),
      };
    }
  }

  const consent = getConsentSnapshot();
  const requiredPurpose = EVENT_CONSENT_REQUIREMENTS[name];
  if (requiredPurpose && !isPurposeGranted(consent, requiredPurpose)) {
    return {
      status: "blocked",
      reason: "consent_required",
      requiredPurpose,
      message: `Event "${name}" requires "${requiredPurpose}" consent, which has not been granted`,
    };
  }

  const meta = createEnvelopeMeta(EVENT_VERSIONS[name]);

  const trackedEvent: TrackedEvent<N> = {
    event: name,
    ...meta,
    ...(correlation_id ? { correlation_id } : {}),
    ...(identity ? { identity } : {}),
    consent,
    properties: propertiesResult.data,
  };

  const pushResult = pushToDataLayer(
    trackedEvent as unknown as Record<string, unknown>,
  );
  if (!pushResult.ok) {
    return {
      status: "rejected",
      reason: "infrastructure_error",
      message: `Failed to dispatch event "${name}" to dataLayer: ${pushResult.message}`,
    };
  }

  return { status: "dispatched", event: trackedEvent };
}
