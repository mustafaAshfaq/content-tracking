import { z } from "zod";
import { CONTENT_CATEGORIES } from "./constants";

/**
 * The v1 event catalogue. This module (plus its generated JSON Schema in
 * `schemas/event-catalogue.schema.json`) is the single source of truth for
 * event shapes; nothing downstream should redefine these contracts.
 */

const categoryEnum = z.enum(CONTENT_CATEGORIES);

export const pageViewPropertiesSchema = z
  .object({
    page_url: z.url(),
    page_type: z.enum(["home", "article", "category", "admin", "other"]),
    route_id: z.string().min(1),
    referrer: z.string().optional(),
    title: z.string().optional(),
    content_id: z.string().optional(),
    previous_route_id: z.string().optional(),
  })
  .strict();

export const articleViewedPropertiesSchema = z
  .object({
    content_id: z.string().min(1),
    content_version: z.number().int().positive(),
    content_type: z.literal("article"),
    view_method: z.enum(["loaded", "engaged"]),
    author_id: z.string().optional(),
    category_ids: z.array(categoryEnum).optional(),
    word_count: z.number().int().nonnegative().optional(),
    dwell_ms: z.number().int().nonnegative().optional(),
    position: z.number().int().nonnegative().optional(),
  })
  .strict();

export const recommendationClickedPropertiesSchema = z
  .object({
    recommendation_id: z.string().min(1),
    content_id: z.string().min(1),
    module_id: z.string().min(1),
    position: z.number().int().nonnegative(),
    impression_id: z.string().min(1),
    is_personalized: z.boolean(),
    algorithm_version: z.string().optional(),
    experiment_id: z.string().optional(),
    destination_url: z.url().optional(),
  })
  .strict();

export const experimentExposedPropertiesSchema = z
  .object({
    experiment_id: z.string().min(1),
    experiment_version: z.number().int().positive(),
    variant_id: z.enum(["control", "treatment"]),
    assignment_id: z.string().min(1),
    allocation: z.number().min(0).max(1).optional(),
    reason: z.string().optional(),
    context: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const signupCompletedPropertiesSchema = z
  .object({
    account_id: z.string().min(1).optional(),
    lead_id: z.string().min(1).optional(),
    signup_method: z.enum(["email", "sso", "demo"]),
    plan_id: z.string().min(1),
    campaign_id: z.string().optional(),
    experiment_id: z.string().optional(),
    value: z.number().nonnegative().optional(),
    currency: z.string().length(3).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.account_id || value.lead_id), {
    message: "signup_completed requires account_id or lead_id",
    path: ["account_id"],
  });

const purposeMapSchema = z
  .object({
    necessary: z.literal(true),
    analytics: z.boolean(),
    marketing: z.boolean(),
    personalisation: z.boolean(),
  })
  .strict();

export const consentUpdatedPropertiesSchema = z
  .object({
    purposes: purposeMapSchema,
    policy_version: z.string().min(1),
    source: z.enum(["banner", "settings", "api", "import"]),
    previous: purposeMapSchema.optional(),
    reason: z.string().optional(),
  })
  .strict();

export const segmentActivatedPropertiesSchema = z
  .object({
    segment_id: z.string().min(1),
    segment_version: z.number().int().positive(),
    activation_id: z.string().min(1),
    activation_reason: z.string().min(1),
    membership_source: z.string().optional(),
    effective_at: z.iso.datetime({ offset: true }).optional(),
    expires_at: z.iso.datetime({ offset: true }).optional(),
  })
  .strict();

export const eventPropertySchemas = {
  page_view: pageViewPropertiesSchema,
  article_viewed: articleViewedPropertiesSchema,
  recommendation_clicked: recommendationClickedPropertiesSchema,
  experiment_exposed: experimentExposedPropertiesSchema,
  signup_completed: signupCompletedPropertiesSchema,
  consent_updated: consentUpdatedPropertiesSchema,
  segment_activated: segmentActivatedPropertiesSchema,
} as const;

export type EventName = keyof typeof eventPropertySchemas;

export const EVENT_NAMES = Object.keys(eventPropertySchemas) as EventName[];

/**
 * Per-event schema version. Bump the entry for an event (and regenerate the
 * JSON Schema) whenever that event's property contract changes; downstream
 * consumers deduplicate on `(event_id, event_version)`.
 */
export const EVENT_VERSIONS = {
  page_view: 1,
  article_viewed: 1,
  recommendation_clicked: 1,
  experiment_exposed: 1,
  signup_completed: 1,
  consent_updated: 1,
  segment_activated: 1,
} as const satisfies Record<EventName, number>;

export type EventPropertiesByName = {
  [K in EventName]: z.infer<(typeof eventPropertySchemas)[K]>;
};
