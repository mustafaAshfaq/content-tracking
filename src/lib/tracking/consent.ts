import { z } from "zod";
import { CONSENT_POLICY_VERSION } from "./constants";

/**
 * Consent purposes recognised by the platform. `necessary` is always granted;
 * the other three are denied by default until the visitor explicitly opts in.
 */
export const CONSENT_PURPOSES = [
  "analytics",
  "marketing",
  "personalisation",
] as const;

export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const consentSnapshotSchema = z
  .object({
    necessary: z.literal(true),
    analytics: z.boolean(),
    marketing: z.boolean(),
    personalisation: z.boolean(),
    policy_version: z.string().min(1),
    captured_at: z.iso.datetime({ offset: true }),
  })
  .strict();

export type ConsentSnapshot = z.infer<typeof consentSnapshotSchema>;

/** The default, fail-closed snapshot used whenever no consent record exists yet. */
export function defaultConsentSnapshot(now: Date = new Date()): ConsentSnapshot {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    personalisation: false,
    policy_version: CONSENT_POLICY_VERSION,
    captured_at: now.toISOString(),
  };
}

const CONSENT_COOKIE_NAME = "cpp_consent";

/**
 * Reads the current consent snapshot. Consent is untrusted input: anything
 * missing, malformed, or carrying an unrecognised policy version fails closed
 * to the default (deny-all-but-necessary) snapshot rather than throwing.
 */
export function getConsentSnapshot(): ConsentSnapshot {
  if (typeof document === "undefined") {
    return defaultConsentSnapshot();
  }

  const raw = readCookie(document.cookie, CONSENT_COOKIE_NAME);
  if (!raw) {
    return defaultConsentSnapshot();
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    const result = consentSnapshotSchema.safeParse(parsed);
    if (!result.success || result.data.policy_version !== CONSENT_POLICY_VERSION) {
      return defaultConsentSnapshot();
    }
    return result.data;
  } catch {
    return defaultConsentSnapshot();
  }
}

function readCookie(cookieString: string, name: string): string | null {
  const parts = cookieString.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) {
      return rest.join("=");
    }
  }
  return null;
}

/**
 * Which consent purpose (if any) an event requires before it may reach the
 * data layer. `consent_updated` is intentionally absent: it is always
 * dispatchable so the consent lifecycle itself can be recorded.
 */
export const EVENT_CONSENT_REQUIREMENTS = {
  page_view: "analytics",
  article_viewed: "analytics",
  recommendation_clicked: "analytics",
  experiment_exposed: "personalisation",
  signup_completed: "marketing",
  consent_updated: undefined,
  segment_activated: "personalisation",
} as const satisfies Record<string, ConsentPurpose | undefined>;

export function isPurposeGranted(
  snapshot: ConsentSnapshot,
  purpose: ConsentPurpose,
): boolean {
  return snapshot[purpose] === true;
}
