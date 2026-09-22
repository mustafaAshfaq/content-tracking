# Local Content Personalization & A/B Attribution Platform

**Status:** implementation-ready handoff  
**Scope:** standalone Next.js application and local martech stack  
**Audience:** an implementation team that did not participate in the planning sessions

This document is the implementation contract. The linked decision tickets are supporting context;
if an implementation detail appears ambiguous, do not invent a new behavior—raise a decision
against the relevant ticket.

## 1. Product summary and success criteria

Build a local article site that records consent-aware behavioral events, turns qualifying article
engagement into warehouse-backed audiences, activates those audiences into a personalized product
module, runs one controlled presentation experiment, and reports conversion attribution.

Success means a developer can run the local stack, browse articles, authenticate a demo user, grant
consent, qualify for a category segment, see same-category recommendations, and inspect trusted
event, audience, experiment, and attribution outputs. See [content model](issues/01-content-model-and-personalization-mechanism.md),
[audience activation](issues/06-audience-compute-and-activation.md), and
[attribution](issues/08-attribution-reporting.md).

## 2. Locked architecture

Use Next.js App Router, TypeScript, and React. Articles are static/ISR. The recommendation module
is client-rendered after hydration. The data path is:

```text
Browser data layer
  -> GTM web container
  -> GTM server-side tagging container
  -> RudderStack OSS ingestion
  -> Postgres warehouse
  -> app-owned audience worker / SQL
  -> same-origin /segments/:userId
  -> client recommendation module
```

Compose owns Postgres, RudderStack, GTM tagging, GTM preview, and mock destinations. Next.js runs
on the host with `npm run dev`. RudderStack handles ingestion and warehouse loading; audience
compute and activation are application-owned because the OSS distribution does not provide
Audiences or reverse ETL. See [GTM research](research/04-gtm-server-side-findings.md),
[RudderStack research](research/05-rudderstack-oss-findings.md), and
[Docker/CI](issues/11-docker-compose-and-ci.md).

## 3. Content and recommendation UX

### Fixtures

Use checked-in MDX and JSON/TypeScript fixtures; no CMS or database seed is required. Taxonomy is
exactly `travel`, `finance`, `health`, and `technology`. Every item has exactly one category.

Fixture version 1 contains three articles per category:

- Travel: `packing-light`, `rail-itineraries`, `local-weekends`
- Finance: `building-an-emergency-fund`, `index-funds-explained`, `understanding-credit`
- Health: `sleep-routines`, `strength-basics`, `meal-prep`
- Technology: `privacy-by-design`, `calmer-notifications`, `local-first-tools`

Article IDs are stable namespaced IDs such as `article_travel_packing_light`; articles use
`content_version: 1`.

Fixture version 1 contains three products per category:

- Travel: `carry_on_organizer`, `city_guide_notebook`, `compact_daypack`
- Finance: `budget_planner`, `index_fund_fieldbook`, `credit_tracker`
- Health: `sleep_mask`, `mobility_band`, `meal_prep_kit`
- Technology: `focus_timer`, `notification_lamp`, `local_backup_drive`

Products use `product_version: 1`, stable editorial ranks, image references, and destination URLs.
`engaged_<category>` maps only to products in that category, sorted by editorial rank. The fixed
fallback list, in order, is `compact_daypack`, `budget_planner`, `focus_timer`. CI validates IDs,
metadata, versions, ordering, mappings, and fallback contents. See [fixtures decision](issues/15-sample-content-fixtures.md).

### Rendering and states

Articles remain cacheable and contain no personalized payload. After hydration, the inline
recommendation module appears after the article introduction. Use the validated card-grid design:
three products on desktop, one column on narrow screens, and reserved geometry across all states.

- Fallback heading: `Popular right now`.
- Loading: reserved three-card geometry/skeleton.
- Successful authorized membership: `Recommended for you` plus minimal human-readable category
  context.
- Empty, expired, denied, unknown, timeout, and error: static fallback list with a concise note.
- Cards show image, name, category, and `View product`.
- Clicks include product/recommendation identity, module ID, position, impression ID, and whether
  the module was personalized or default.

Do not expose segment rules or sensitive traits. See [module UX decision](issues/13-prototype-recommendation-module-ux.md)
and the [throwaway prototype](prototype-recommendation-module.html).

## 4. Event schema and typed data layer

The v1 event catalogue is:

`page_view`, `article_viewed`, `recommendation_clicked`, `experiment_exposed`,
`signup_completed`, `consent_updated`, and server-side `segment_activated`.

Implement `trackEvent({ name, properties, correlation_id?, identity? }): TrackResult`. Add
implementation-owned UUIDv4 `event_id`, `event_version`, UTC timestamp, environment, source, and
the optional opaque identity. Validate required fields, closed enums, and unknown properties at
runtime in every environment. Rejects never enter `dataLayer`; blocked events return an explicit
consent reason. Generate JSON Schema from the TypeScript/runtime schemas.

Every event carries a consent snapshot: `necessary`, `analytics`, `marketing`, `personalisation`,
`policy_version`, and `captured_at`. Capture it at dispatch time. Preserve `event_id` through
forwarding and deduplicate downstream by `(event_id, event_version)`. Propagate
`correlation_id` through derived browser/server events.

`page_view` emits once per committed normalized route key, not once per framework callback. The
event-specific required properties and optional fields are authoritative in
[event schema decision](issues/02-event-schema-and-data-layer.md).

## 5. Identity

Mint a cryptographically random host-only `anonymous_id` cookie before consent as Necessary
storage. It is first-party, `Path=/`, `SameSite=Lax`, `Secure` under HTTPS, readable by the data
layer/GTM, and has a 13-month rolling lifetime. It is not merged before authentication.

The server owns opaque `userId` values. On signup/login, atomically persist an idempotent
`identity_aliases` edge, then send RudderStack `alias` and `identify`. Subsequent events may carry
both IDs; raw events remain immutable and reporting resolves canonical identity through aliases.
No client-supplied canonical ID is trusted. Anonymous visitors never call an anonymous activation
endpoint. See [identity decision](issues/03-identity-model.md).

## 6. Audience compute and activation

For each category, create `engaged_<category>` when a canonical known user has viewed at least
three distinct articles in that category during the trailing 30 days. Repeated views of one
article do not increase the count. Only validated `article_viewed` events whose event-time
consent snapshot has `personalisation=true` qualify; anonymous-only activity does not create
membership.

A Node worker/CLI runs every five minutes and supports on-demand recomputation. It takes a
Postgres advisory lock, resolves aliases, computes a complete snapshot, and atomically replaces
`audience_membership`. Store segment version, computed/effective/expiry timestamps, and membership
source. On failure, preserve the last complete snapshot and expose health/error state.

Implement:

```http
GET /segments/:userId
```

Require an owned authenticated session, validate the opaque ID, require Personalisation consent,
and rate-limit to 60 requests per minute per user/IP. Return the documented segment response with
`activationId`, or `200` with an empty list for a valid user without memberships. Use
`private, max-age=60`; client timeout is one second. Statuses are `401`, `403`, `404`, `200`, and
`503` as defined in [audience activation](issues/06-audience-compute-and-activation.md).

Successful membership responses emit `segment_activated`; denied, empty, timeout, unauthorized,
and fallback paths do not. All failures render the static fallback.

## 7. Experimentation

Ship experiment `recommendations_layout`, version 1, with fixed 50/50 `control` and `treatment`
presentation variants. Eligibility, segments, products, and ranking do not change. Exclude bots,
staff, and demo accounts.

Assign lazily with:

```text
SHA-256(experiment_id:experiment_version:identity_key)
```

Interpret the first eight hex digits modulo 10,000: `0..4999` control, `5000..9999` treatment.
Persist the assignment in a host-only first-party `experiment_assignment` cookie only after
Analytics consent. Preserve an anonymous assignment through signup/login.

Assignment is not exposure. Emit `experiment_exposed` only after Personalisation consent,
successful activation with recommendations, rendered assigned variant, and viewport visibility.
Deduplicate by `(experiment_id, experiment_version, assignment_id, module_instance_id)` per page
view. See [experimentation decision](issues/07-ab-experimentation.md).

## 8. Attribution and reporting

The primary conversion is the first valid deduplicated `signup_completed` per canonical user in a
requested UTC window of at most 90 days. `recommendation_clicked` is secondary engagement.

Capture allowlisted first-touch UTM parameters (`source`, `medium`, `campaign`, `term`, `content`),
normalize them, and retain a 13-month Necessary-scoped attribution touch. Report it only with
Analytics consent and never send it to Marketing without Marketing consent. Preserve a direct /
none bucket for conversions without valid UTM data.

Use shared Postgres views/materialized views: `canonical_events`, `deduped_events`,
`experiment_exposure_cohort`, and `conversion_attribution`. Reports are served from protected
`/admin/attribution` with conversion-by-variant, conversion-by-UTM-source, health panel, and
JSON/CSV export. Suppress small cells, omit direct identifiers, and show explicit stale/unavailable
states. See [attribution decision](issues/08-attribution-reporting.md).

## 9. Consent and privacy gates

Klaro purposes are Necessary, Analytics, Marketing, and Personalisation. Necessary is always on;
the other three are denied by default and require explicit action. Analytics gates behavioral
events; Marketing gates `signup_completed` and marketing tags; Personalisation gates activation
and personalized rendering. `consent_updated` remains dispatchable and is emitted only for an
effective purpose-map transition.

Persist consent in a versioned server-readable Klaro cookie. Validate it as untrusted input and
fail closed for missing, malformed, unknown-purpose, or future-schema values. A policy-version
change requires re-consent. `/segments/:userId` independently returns `403 consent_required`
when consent is denied or invalid.

GTM initializes default-denied and receives explicit updates: Analytics maps to
`analytics_storage`, Marketing to `ad_storage` and `ad_user_data`, and Personalisation to
`ad_personalization`. Application and GTM checks both apply. Withdrawal stops collection and
activation, invalidates in-flight responses, clears purpose-owned state, and restores fallback
rendering. No blocked event is buffered or replayed. See [consent decision](issues/09-consent-gating.md).

## 10. Local runtime and security policy

Reserve ports: app `3000`, GTM tagging `8080`, GTM preview `8081`, RudderStack `8082`, and mocks
`8090`. Compose healthchecks gate startup; named project volumes preserve Postgres/logs and a
documented reset command removes only those volumes.

Use explicit development origins and no wildcards. CSP uses `default-src 'self'`; `connect-src`
allows only intended app/GTM/RudderStack/mock origins; `img-src` allows self, `data:`, and GTM;
`frame-src` allows self, GTM preview, and development-only Tag Assistant. CORS allows only the
app origin, `GET, POST, OPTIONS`, and required `Content-Type`, `Authorization`, and `X-Write-Key`
headers. Restrict paths and return explicit 4xx responses for unknown paths.

Production uses exact HTTPS environment origins, `Secure` cookies, no mock origin, and no preview
runtime dependency. Automated tests reject wildcard/unintended hosts and consent leakage. See
[CSP/CORS decision](issues/14-csp-cors-policy.md) and [Docker/CI decision](issues/11-docker-compose-and-ci.md).

## 11. Docker Compose and configuration

Compose services:

- `postgres`: isolated RudderStack state and warehouse schemas/databases.
- `rudderstack`: static mounted `workspaceConfig.json`.
- `gtm-server`: pinned GTM cloud image tagging role on `8080`.
- `gtm-preview`: pinned preview role on `8081`.
- `mock-destinations`: Node/Express logging GA4/ads test payloads on `8090`.

Next.js connects through environment-driven localhost URLs. Bootstrap initializes databases,
migrations, fixtures, and configuration; audience recomputation remains an explicit command.
Check in `.env.example`, per-environment GTM export JSON, and non-secret config. Do not commit
credentials, container config secrets, or tokens. State clearly that GTM local is not truly
air-gapped: the image fetches published configuration from Google. See [GTM findings](research/04-gtm-server-side-findings.md)
and [Docker/CI decision](issues/11-docker-compose-and-ci.md).

## 12. QA and CI acceptance gates

Every change runs lint, typecheck, unit tests, schema generation/diff checks, contract tests,
fixture validation, and the production build. Pull requests also run targeted Playwright against
an ephemeral Compose stack with mocks. Main/scheduled runs perform heavier real-container
preflight and local-stack audits.

Tests must prove strict event validation, deterministic assignment, exact route event counts,
exactly-once exposure, privacy constraints, full consent lifecycle, activation denial/no-request
paths, no replay, withdrawal invalidation, CORS/CSP behavior, duplicate-ID rejection, and
event-catalogue drift. Maintain a repeatable GTM Preview/Tag Assistant walkthrough. Preserve
critical-path evidence: CI results, schema diffs, Playwright traces/screenshots, denial network
logs, and dated GTM walkthrough output. See [QA decision](issues/10-qa-testing-strategy.md).

## 13. Non-goals and constraints

- No CMS, production content authoring, or database-sourced content.
- No personalized SSR, edge personalization, or personalized shared-cache responses.
- No RudderStack Cloud Audiences/reverse ETL; activation is application-owned.
- No raw email or direct identifiers in event properties, recommendations, or reports.
- No retroactive replay of consent-blocked events.
- No claim of a truly air-gapped GTM runtime.
- No production ad/analytics destinations; local mocks are development/test infrastructure.

## 14. Implementation order

1. Scaffold Next.js, typed events, runtime schemas, generated JSON Schema, and fixture validation.
2. Add MDX/article routes, product module, identity cookie, and Klaro configuration.
3. Add Compose Postgres/RudderStack/GTM/mocks, migrations, and bootstrap healthchecks.
4. Implement data-layer forwarding, consent gates, CSP/CORS, and mock observability.
5. Implement aliasing, audience worker, `/segments/:userId`, and segment activation events.
6. Add experiment assignment/exposure, UTM capture, attribution views, and admin report.
7. Add unit/contract/Playwright suites, CI tiers, GTM walkthrough, and evidence collection.

