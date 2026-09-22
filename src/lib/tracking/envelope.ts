import { z } from "zod";
import { EVENT_SOURCES, ENVIRONMENTS, type Environment, type EventSource } from "./constants";

export const identitySchema = z
  .object({
    anonymous_id: z.string().min(1).optional(),
    user_id: z.string().min(1).optional(),
  })
  .strict();

export type Identity = z.infer<typeof identitySchema>;

export const envelopeMetaSchema = z
  .object({
    event_id: z.uuid(),
    event_version: z.number().int().positive(),
    timestamp: z.iso.datetime({ offset: true }),
    environment: z.enum(ENVIRONMENTS),
    source: z.enum(EVENT_SOURCES),
  })
  .strict();

export type EnvelopeMeta = z.infer<typeof envelopeMetaSchema>;

/**
 * Resolves the running environment from configuration rather than trusting
 * the caller. Falls back to `development` so local/test runs are never
 * mistaken for `production`.
 */
export function resolveEnvironment(): Environment {
  const candidate =
    process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "development";
  return (ENVIRONMENTS as readonly string[]).includes(candidate)
    ? (candidate as Environment)
    : "development";
}

export function resolveSource(): EventSource {
  return typeof window === "undefined" ? "server" : "browser";
}

let uuidImpl: () => string = () => {
  throw new Error("No UUID implementation available in this environment");
};

if (typeof globalThis.crypto?.randomUUID === "function") {
  uuidImpl = () => globalThis.crypto.randomUUID();
}

/** Overridable only for tests; production code always uses `crypto.randomUUID`. */
export function generateUuid(): string {
  return uuidImpl();
}

export function createEnvelopeMeta(eventVersion: number): EnvelopeMeta {
  return {
    event_id: generateUuid(),
    event_version: eventVersion,
    timestamp: new Date().toISOString(),
    environment: resolveEnvironment(),
    source: resolveSource(),
  };
}
