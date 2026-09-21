# 01 — Scaffold + typed `trackEvent()` data-layer boundary

**What to build:** A developer can clone the repo, run `npm run dev`, and get a booting Next.js
App Router / TypeScript / React app. A single typed `trackEvent()` function is the only way events
enter the browser data layer: it validates every event against the runtime schema, stamps
implementation-owned metadata, attaches a consent-snapshot shape, and drops anything invalid before
it can reach `dataLayer`. The event catalogue and its generated JSON Schema are the versioned source
of truth, checked for drift in CI. This is the walking skeleton every later slice builds on.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `npm run dev` boots the Next.js App Router app; lint, typecheck, and production build pass in CI.
- [ ] `trackEvent({ name, properties, correlation_id?, identity? })` enforces strict runtime
      validation: required fields, closed enums, and rejection of unknown properties, in every
      environment.
- [ ] Each accepted event is stamped with implementation-owned metadata: UUIDv4 `event_id`,
      `event_version`, UTC timestamp, environment, and source.
- [ ] Every event carries the consent-snapshot shape (`necessary`, `analytics`, `marketing`,
      `personalisation`, `policy_version`, `captured_at`).
- [ ] Rejected events never enter `dataLayer`; the caller receives an explicit validation/consent
      reason (no throw-and-swallow).
- [ ] `page_view` is emitted once per committed normalized route key, not once per framework callback.
- [ ] JSON Schema is generated from the TypeScript/runtime schema; a CI diff check fails on drift or
      event-catalogue changes that were not regenerated.
- [ ] Unit tests cover the data-layer boundary (validation, metadata stamping, reject-before-dataLayer).
