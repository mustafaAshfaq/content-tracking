---
labels: [ready-for-agent]
status: ready-for-agent
source-map: map.md
---

# Spec: Local Content Personalization & A/B Attribution Platform

## Problem Statement

A front-end/martech engineer needs to demonstrate, end to end and fully offline, that they can
stand up a consent-aware content site whose behavioral data actually drives personalization and
proves attribution. Today that story is scattered across vendor demos and cloud-only features:
there is no single local artifact where a visitor's article engagement becomes a warehouse-backed
audience, that audience activates into personalized recommendations, an experiment measures the
presentation, and conversion attribution can be inspected — all runnable with `docker-compose up`
and `npm run dev`, and all correct with respect to consent. Without this, personalization and
attribution behavior can't be trusted, audited, or shown to work without a live cloud stack.

## Solution

Build a standalone Next.js (App Router) / TypeScript / React article site plus a local martech
stack that a developer can run offline. A visitor browses static/ISR articles; a typed data layer
records consent-gated behavioral events through a GTM web container, a GTM server-side tagging
container, RudderStack OSS ingestion, and into a Postgres warehouse. An application-owned audience
worker turns qualifying article engagement into `engaged_<category>` audiences, which a same-origin
`/segments/:userId` API activates into a client-rendered "Recommended for you" product module. A
single 50/50 presentation experiment measures the module, and first-touch UTM plus deduplicated
signup conversions produce an attribution report at `/admin/attribution`. Every collection,
activation, and rendering path is gated by four Klaro consent purposes and fails closed. From the
user's perspective: run the stack, browse articles, sign in as a demo user, grant consent, qualify
for a category segment, see same-category recommendations, and inspect trustworthy event, audience,
experiment, and attribution outputs.

## User Stories

1. As a developer evaluating the platform, I want to bring up the entire stack with `docker-compose up` and `npm run dev`, so that I can run everything offline without cloud accounts.
2. As a developer, I want Compose healthchecks to gate startup, so that the app only talks to services that are actually ready.
3. As a developer, I want reserved, documented local ports (app 3000, GTM tagging 8080, GTM preview 8081, RudderStack 8082, mocks 8090), so that I can predict and inspect every hop.
4. As a developer, I want a documented reset command that removes only project volumes, so that I can restore a clean state without harming unrelated data.
5. As a developer, I want checked-in MDX articles and JSON/TypeScript product fixtures, so that no CMS or database seed is needed to get content.
6. As a developer, I want the taxonomy locked to exactly `travel`, `finance`, `health`, and `technology` with one category per item, so that audience-to-product mapping is unambiguous.
7. As a reader, I want to browse static/ISR articles quickly, so that content loads fast and is cacheable.
8. As a reader, I want articles to contain no personalized payload in their server response, so that nothing about me leaks before I consent.
9. As a reader, I want a "Recommended products" module to appear inline after the article introduction once the page hydrates, so that suggestions feel part of the article.
10. As a reader who has not consented, I want to see a truthful "Popular right now" fallback module, so that I still get useful suggestions without being tracked or personalized.
11. As a reader, I want the recommendation module to reserve its geometry across loading, success, and fallback states, so that the layout does not jump.
12. As a reader on a narrow screen, I want the three-product card grid to collapse to one column, so that it stays readable on mobile.
13. As a reader who qualifies for a segment, I want to see "Recommended for you" with minimal human-readable category context, so that I understand why I'm seeing these products without exposing internal rules.
14. As a reader, I want empty, expired, denied, unknown, timeout, and error states to fall back to the static list with a concise note, so that I never see a broken module.
15. As a reader, I want product cards to show an image, name, category, and a "View product" action, so that I can act on a recommendation.
16. As a privacy-conscious reader, I want segment rules and sensitive traits never exposed in the UI or payloads, so that my data is not revealed.
17. As an analyst, I want every user interaction captured as a well-defined event (`page_view`, `article_viewed`, `recommendation_clicked`, `experiment_exposed`, `signup_completed`, `consent_updated`, `segment_activated`), so that behavior is measurable.
18. As an analyst, I want each event to carry implementation-owned metadata (UUIDv4 `event_id`, `event_version`, UTC timestamp, environment, source), so that events are uniquely identifiable and traceable.
19. As an analyst, I want a consent snapshot on every event (`necessary`, `analytics`, `marketing`, `personalisation`, `policy_version`, `captured_at`) captured at dispatch time, so that I can audit whether each event was permitted.
20. As a developer, I want a typed `trackEvent()` that validates required fields, closed enums, and unknown properties at runtime in every environment, so that malformed events never enter the data layer.
21. As a developer, I want rejected events to never reach `dataLayer` and blocked events to return an explicit consent reason, so that failures are observable and safe.
22. As a developer, I want a `page_view` emitted once per committed normalized route key, so that SPA navigation does not double-count views.
23. As a developer, I want JSON Schema generated from the TypeScript/runtime schemas, so that downstream validation stays in sync with the source of truth.
24. As a developer, I want `event_id` preserved through forwarding and downstream deduplication by `(event_id, event_version)`, so that duplicates are collapsed.
25. As a developer, I want `correlation_id` propagated through derived browser/server events, so that related events can be joined.
26. As a first-time visitor, I want a cryptographically random host-only `anonymous_id` cookie minted before consent as Necessary storage, so that I can be counted without personal identifiers.
27. As a returning visitor, I want the `anonymous_id` cookie to be first-party, `Path=/`, `SameSite=Lax`, `Secure` under HTTPS, with a 13-month rolling lifetime, so that identity is stable and secure.
28. As a user who signs up or logs in, I want the server to own an opaque `userId` and record an idempotent `identity_aliases` edge, then send RudderStack `alias`/`identify`, so that my anonymous and known activity reconcile without trusting the client.
29. As an analyst, I want raw events to remain immutable while reporting resolves canonical identity through aliases, so that history is preserved and still joinable.
30. As an anonymous visitor, I want no activation endpoint ever called on my behalf, so that I am never personalized before authenticating and consenting.
31. As a known, consented reader, I want to become a member of `engaged_<category>` after viewing at least three distinct articles in that category within the trailing 30 days, so that segments reflect genuine engagement.
32. As an analyst, I want repeated views of a single article to not increase the qualifying count, so that membership reflects breadth of engagement.
33. As an analyst, I want only validated `article_viewed` events whose event-time consent had `personalisation=true` to qualify, so that non-consented or anonymous activity never creates membership.
34. As a developer, I want an audience worker/CLI that runs every five minutes and supports on-demand recomputation under a Postgres advisory lock, so that snapshots are consistent and re-runnable.
35. As a developer, I want the worker to compute a complete snapshot and atomically replace `audience_membership`, preserving the last complete snapshot on failure, so that activation never serves partial data.
36. As a developer, I want `audience_membership` to store segment version, computed/effective/expiry timestamps, and membership source, so that activations are explainable and expirable.
37. As a client, I want `GET /segments/:userId` to require an owned authenticated session, validate the opaque ID, require Personalisation consent, and rate-limit to 60 req/min per user/IP, so that activation is authorized and abuse-resistant.
38. As a client, I want `/segments/:userId` to return a documented segment response with an `activationId`, or `200` with an empty list for a valid user without memberships, so that success and no-membership are distinguishable.
39. As a client, I want `/segments/:userId` to respond with `401`, `403`, `404`, `200`, or `503` as defined, cache as `private, max-age=60`, and honor a one-second client timeout, so that behavior is predictable and bounded.
40. As an analyst, I want a `segment_activated` event emitted only on successful membership responses (never on denied, empty, timeout, unauthorized, or fallback paths), so that activation metrics are accurate.
41. As a product owner, I want a single `recommendations_layout` experiment (version 1) with fixed 50/50 `control`/`treatment` presentation variants that do not change eligibility, segments, products, or ranking, so that I measure presentation only.
42. As an analyst, I want bots, staff, and demo accounts excluded from the experiment, so that results are not polluted.
43. As a developer, I want lazy assignment via `SHA-256(experiment_id:experiment_version:identity_key)`, taking the first eight hex digits modulo 10,000 (`0..4999` control, `5000..9999` treatment), so that bucketing is deterministic and testable.
44. As a developer, I want the assignment persisted in a host-only first-party `experiment_assignment` cookie only after Analytics consent, and an anonymous assignment preserved through signup/login, so that assignment is stable and consent-respecting.
45. As an analyst, I want `experiment_exposed` emitted only after Personalisation consent, successful activation with recommendations, rendered assigned variant, and viewport visibility, so that exposure means the variant was actually seen.
46. As an analyst, I want exposure deduplicated by `(experiment_id, experiment_version, assignment_id, module_instance_id)` per page view, so that each viewing counts once.
47. As an analyst, I want the primary conversion to be the first valid deduplicated `signup_completed` per canonical user within a requested UTC window of at most 90 days, so that conversions are counted consistently.
48. As an analyst, I want `recommendation_clicked` treated as secondary engagement, so that clicks are measured without being conflated with conversion.
49. As an analyst, I want allowlisted first-touch UTM parameters (`source`, `medium`, `campaign`, `term`, `content`) captured, normalized, and retained as a 13-month Necessary-scoped attribution touch, so that acquisition is attributable.
50. As a privacy officer, I want UTM/attribution reported only with Analytics consent and never sent to Marketing without Marketing consent, with a direct/none bucket for conversions lacking valid UTM, so that reporting respects consent and remains complete.
51. As an analyst, I want shared Postgres views (`canonical_events`, `deduped_events`, `experiment_exposure_cohort`, `conversion_attribution`), so that reporting is derived from one consistent model.
52. As an admin, I want a protected `/admin/attribution` report with conversion-by-variant, conversion-by-UTM-source, a health panel, and JSON/CSV export, so that I can inspect and share results.
53. As a privacy officer, I want small cells suppressed, direct identifiers omitted, and explicit stale/unavailable states shown in reports, so that reporting is privacy-safe and honest.
54. As a visitor, I want Klaro to present Necessary, Analytics, Marketing, and Personalisation purposes with the latter three denied by default, so that nothing beyond necessary runs without my explicit action.
55. As a visitor, I want Analytics to gate behavioral events, Marketing to gate `signup_completed` and marketing tags, and Personalisation to gate activation and personalized rendering, so that each purpose controls exactly what it should.
56. As a visitor, I want `consent_updated` emitted only on an effective purpose-map transition, so that consent changes are recorded without noise.
57. As a developer, I want consent persisted in a versioned server-readable Klaro cookie, validated as untrusted input and failing closed on missing/malformed/unknown/future-schema values, so that consent handling is safe.
58. As a visitor, I want a policy-version change to require re-consent, so that I re-affirm when terms change.
59. As a developer, I want `/segments/:userId` to independently return `403 consent_required` when consent is denied or invalid, so that the API enforces consent regardless of client state.
60. As a developer, I want GTM initialized default-denied with explicit updates (Analytics→`analytics_storage`, Marketing→`ad_storage`+`ad_user_data`, Personalisation→`ad_personalization`), with both application and GTM checks applied, so that consent is enforced in two layers.
61. As a visitor who withdraws consent, I want collection and activation to stop, in-flight responses invalidated, purpose-owned state cleared, and fallback rendering restored, with no blocked event buffered or replayed, so that withdrawal takes immediate, complete effect.
62. As a security reviewer, I want a strict CSP (`default-src 'self'`, tightly allowlisted `connect-src`/`img-src`/`frame-src`) and a CORS policy allowing only the app origin, `GET, POST, OPTIONS`, and required headers, so that only intended origins and paths communicate.
63. As a security reviewer, I want unknown paths to return explicit 4xx responses and production to use exact HTTPS origins, `Secure` cookies, no mock origin, and no preview runtime dependency, so that production is locked down.
64. As a developer, I want RudderStack to run with a static mounted `workspaceConfig.json`, so that ingestion works offline without a control plane.
65. As a developer, I want mock Node/Express GA4/ads destinations that log payloads, so that I can inspect what would be sent without contacting real vendors.
66. As a developer, I want a bootstrap that initializes databases, migrations, fixtures, and configuration while keeping audience recomputation an explicit command, so that setup is reproducible and controlled.
67. As a developer, I want `.env.example`, per-environment GTM export JSON, and non-secret config checked in, with credentials/secrets/tokens never committed, so that configuration is shareable and safe.
68. As an honest maintainer, I want the docs to state clearly that GTM local is not truly air-gapped because the image fetches published configuration from Google, so that no one over-claims offline behavior.
69. As a QA engineer, I want CI to run lint, typecheck, unit tests, schema generation/diff checks, contract tests, fixture validation, and the production build on every change, so that correctness is enforced automatically.
70. As a QA engineer, I want pull requests to run targeted Playwright against an ephemeral Compose stack with mocks, and main/scheduled runs to perform heavier real-container preflight and local-stack audits, so that depth scales with risk.
71. As a QA engineer, I want a repeatable GTM Preview/Tag Assistant walkthrough with dated evidence, so that tag behavior is auditable over time.
72. As a QA engineer, I want preserved critical-path evidence (CI results, schema diffs, Playwright traces/screenshots, denial network logs, GTM walkthrough output), so that quality claims are backed by artifacts.

## Implementation Decisions

**Architecture and stack (locked).** Next.js App Router + TypeScript + React on the host via
`npm run dev`. The data path is: browser data layer → GTM web container → GTM server-side tagging
container → RudderStack OSS ingestion → Postgres warehouse → app-owned audience worker/SQL →
same-origin `/segments/:userId` → client recommendation module. Compose owns Postgres, RudderStack,
GTM tagging, GTM preview, and mock destinations. Audience compute and activation are
application-owned because the OSS distribution provides neither Audiences nor reverse ETL.

**Content and fixtures.** Checked-in MDX articles and JSON/TypeScript product fixtures; no CMS.
Taxonomy is exactly `travel`, `finance`, `health`, `technology`, one category per item. Fixture v1:
three articles and three products per category with stable namespaced IDs (e.g.
`article_travel_packing_light`), `content_version: 1` / `product_version: 1`, editorial ranks,
image references, and destination URLs. `engaged_<category>` maps only to that category's products,
sorted by editorial rank. The fixed fallback list, in order, is `compact_daypack`, `budget_planner`,
`focus_timer`.

**Recommendation module.** Card-grid design: three products on desktop, one column on narrow
screens, reserved geometry across all states. Articles stay cacheable with no personalized payload;
the module renders after hydration, inserted after the article introduction. Headings: `Popular
right now` (fallback) and `Recommended for you` (authorized membership) with minimal category
context. Empty/expired/denied/unknown/timeout/error render the static fallback with a concise note.
Cards show image, name, category, `View product`; clicks include product/recommendation identity,
module ID, position, impression ID, and personalized-vs-default flag. Segment rules and sensitive
traits are never exposed.

**Event schema and data layer.** v1 catalogue: `page_view`, `article_viewed`,
`recommendation_clicked`, `experiment_exposed`, `signup_completed`, `consent_updated`, and
server-side `segment_activated`. `trackEvent({ name, properties, correlation_id?, identity? }):
TrackResult` adds implementation-owned UUIDv4 `event_id`, `event_version`, UTC timestamp,
environment, source, and optional opaque identity. Strict runtime validation (required fields,
closed enums, unknown-property rejection) runs in every environment; rejects never enter
`dataLayer`; blocked events return an explicit consent reason. Every event carries a consent
snapshot (`necessary`, `analytics`, `marketing`, `personalisation`, `policy_version`, `captured_at`)
captured at dispatch. JSON Schema is generated from the TS/runtime schemas. `event_id` is preserved
through forwarding; downstream dedupe is by `(event_id, event_version)`; `correlation_id` propagates
to derived events. `page_view` emits once per committed normalized route key.

**Identity.** Host-only cryptographically random `anonymous_id` cookie minted pre-consent as
Necessary storage (first-party, `Path=/`, `SameSite=Lax`, `Secure` under HTTPS, 13-month rolling
lifetime), not merged before authentication. Server owns opaque `userId`; on signup/login it
atomically persists an idempotent `identity_aliases` edge, then sends RudderStack `alias` and
`identify`. Raw events stay immutable; reporting resolves canonical identity through aliases; no
client-supplied canonical ID is trusted.

**Audience compute.** `engaged_<category>` requires a canonical known user to have viewed ≥3
distinct articles in that category in the trailing 30 days; repeat views of one article do not
count; only validated `article_viewed` events with event-time `personalisation=true` qualify. A
Node worker/CLI runs every five minutes and supports on-demand recomputation under a Postgres
advisory lock, computes a complete snapshot, and atomically replaces `audience_membership` (segment
version, computed/effective/expiry timestamps, membership source), preserving the last complete
snapshot on failure.

**Activation API.** `GET /segments/:userId` requires an owned authenticated session, validates the
opaque ID, requires Personalisation consent, rate-limits 60 req/min per user/IP, returns the
documented segment response with `activationId` (or `200` empty list), caches `private,
max-age=60`, and honors a one-second client timeout. Status codes: `401`, `403`, `404`, `200`,
`503`. `segment_activated` is emitted only on successful membership responses.

**Experimentation.** Single experiment `recommendations_layout` v1, fixed 50/50 `control`/
`treatment` presentation variants that leave eligibility/segments/products/ranking unchanged; bots,
staff, and demo accounts excluded. Assignment is lazy:

```text
bucket = SHA-256(experiment_id:experiment_version:identity_key)
firstEightHexDigits % 10000  ->  0..4999 = control, 5000..9999 = treatment
```

Assignment persists in a host-only first-party `experiment_assignment` cookie only after Analytics
consent; anonymous assignment is preserved through signup/login. Assignment ≠ exposure:
`experiment_exposed` fires only after Personalisation consent, successful activation with
recommendations, rendered assigned variant, and viewport visibility, deduplicated by
`(experiment_id, experiment_version, assignment_id, module_instance_id)` per page view.

**Attribution and reporting.** Primary conversion = first valid deduplicated `signup_completed`
per canonical user in a requested UTC window ≤90 days; `recommendation_clicked` is secondary.
Allowlisted first-touch UTM (`source`, `medium`, `campaign`, `term`, `content`) is normalized and
retained as a 13-month Necessary-scoped touch, reported only with Analytics consent, never sent to
Marketing without Marketing consent, with a direct/none bucket preserved. Shared Postgres views:
`canonical_events`, `deduped_events`, `experiment_exposure_cohort`, `conversion_attribution`.
Protected `/admin/attribution` shows conversion-by-variant, conversion-by-UTM-source, a health
panel, and JSON/CSV export, with small-cell suppression, no direct identifiers, and explicit
stale/unavailable states.

**Consent and privacy gates.** Klaro purposes Necessary (always on), Analytics, Marketing,
Personalisation (denied by default). Analytics gates behavioral events; Marketing gates
`signup_completed` and marketing tags; Personalisation gates activation and personalized rendering.
`consent_updated` emits only on an effective purpose-map transition. Consent persists in a versioned
server-readable Klaro cookie, validated as untrusted input, failing closed on missing/malformed/
unknown-purpose/future-schema values; policy-version change requires re-consent. GTM initializes
default-denied and receives explicit updates (Analytics→`analytics_storage`, Marketing→`ad_storage`
+`ad_user_data`, Personalisation→`ad_personalization`); application and GTM checks both apply.
Withdrawal stops collection and activation, invalidates in-flight responses, clears purpose-owned
state, restores fallback rendering, and never buffers or replays blocked events.

**Local runtime and security.** Reserved ports: app 3000, GTM tagging 8080, GTM preview 8081,
RudderStack 8082, mocks 8090. Compose healthchecks gate startup; named project volumes preserve
Postgres/logs; a documented reset removes only those volumes. CSP `default-src 'self'` with tightly
allowlisted `connect-src`/`img-src`/`frame-src`; CORS allows only the app origin, `GET, POST,
OPTIONS`, and required `Content-Type`/`Authorization`/`X-Write-Key` headers; unknown paths return
explicit 4xx. Production uses exact HTTPS origins, `Secure` cookies, no mock origin, and no preview
runtime dependency.

**Compose services.** `postgres` (isolated RudderStack state + warehouse schemas), `rudderstack`
(static mounted `workspaceConfig.json`), `gtm-server` (pinned tagging role, 8080), `gtm-preview`
(pinned preview role, 8081), `mock-destinations` (Node/Express GA4/ads payload logger, 8090).
Next.js connects via env-driven localhost URLs. Bootstrap initializes DBs, migrations, fixtures,
and config; audience recomputation stays an explicit command. Check in `.env.example`,
per-environment GTM export JSON, and non-secret config; never commit secrets. Documentation must
state that GTM local is not truly air-gapped (the image fetches published configuration from
Google).

**Implementation order.** (1) Scaffold Next.js, typed events, runtime schemas, generated JSON
Schema, fixture validation. (2) MDX/article routes, product module, identity cookie, Klaro config.
(3) Compose Postgres/RudderStack/GTM/mocks, migrations, bootstrap healthchecks. (4) Data-layer
forwarding, consent gates, CSP/CORS, mock observability. (5) Aliasing, audience worker,
`/segments/:userId`, segment activation events. (6) Experiment assignment/exposure, UTM capture,
attribution views, admin report. (7) Unit/contract/Playwright suites, CI tiers, GTM walkthrough,
evidence collection.

## Testing Decisions

A good test asserts external, observable behavior — the events that reach (or are correctly kept
out of) the data layer, the HTTP contract of the activation API, and what the user sees rendered —
never internal implementation details. Tests must be deterministic; bucketing, dedupe keys, and
event counts are exact, not approximate. CI is the authoritative data-quality gate.

Three seams, from highest to lowest:

1. **Playwright end-to-end against the ephemeral Compose stack (outermost seam).** Drives the full
   consent → engagement → activation → exposure → conversion lifecycle through the real UI and mock
   destinations. Asserts exact route-lifecycle `page_view` counts with no duplicate SPA emissions,
   exactly-once experiment exposure, truthful fallback vs. personalized rendering across all module
   states, consent grant/denial/withdrawal effects (collection stops, in-flight responses
   invalidated, fallback restored, no replay), and CORS/CSP rejection of wildcard/unintended hosts
   and consent leakage. Evidence: traces/screenshots and consent-denial network logs.
2. **The `/segments/:userId` HTTP contract (API seam).** Contract tests assert authorization
   (owned session required), consent enforcement (`403 consent_required` independent of client
   state), opaque-ID validation, rate limiting, cache headers, the one-second timeout behavior, and
   the exact `401/403/404/200/503` responses including the empty-membership `200`.
3. **The typed `trackEvent()` data-layer boundary (unit seam).** Unit tests assert strict runtime
   validation (required fields, closed enums, unknown-property rejection), that rejects never enter
   `dataLayer`, that blocked events return an explicit consent reason with no buffering/replay, the
   consent-snapshot shape, deterministic experiment assignment from the SHA-256 rule, `event_id`
   preservation, and `(event_id, event_version)` dedupe.

Additional automated gates run in CI alongside these seams: generated-JSON-Schema diff checks and
event-catalogue drift detection, fixture validation (IDs, metadata, versions, ordering, mappings,
fallback contents), duplicate-ID rejection, and the production build. Prior art: the sibling idea-1
tracking project's event/consent test patterns are mirrored for event and consent-lifecycle
coverage (patterns only, not scope). A repeatable, dated GTM Preview/Tag Assistant walkthrough
provides manual audit evidence layered on top of the automated seams.

## Out of Scope

- No CMS, production content authoring, or database-sourced content.
- No personalized SSR, edge personalization, or personalized shared-cache responses.
- No RudderStack Cloud Audiences or reverse ETL; activation is application-owned.
- No raw email or direct identifiers in event properties, recommendations, or reports.
- No retroactive replay of consent-blocked events.
- No claim of a truly air-gapped GTM runtime (the image fetches published config from Google).
- No production ad/analytics destinations; local mocks are development/test infrastructure only.
- No code or scope shared with idea 1 (the travel-booking app); stack concepts are reused, code is not.
- More than one experiment, additional segments beyond `engaged_<category>`, or additional taxonomy categories.

## Further Notes

- This spec synthesizes the closed decision tickets referenced in [map.md](map.md); the assembled
  implementation contract in [FINAL-HANDOFF-SPEC.md](FINAL-HANDOFF-SPEC.md) remains the detailed
  companion. Where an implementation detail seems ambiguous, raise a decision against the relevant
  ticket in `issues/` rather than inventing behavior.
- Two constraints are load-bearing and easy to get wrong: (a) the OSS RudderStack distribution has
  no Audiences/reverse ETL, so audience compute and activation must be hand-rolled in the app; and
  (b) the GTM server-side image is not air-gapped — it fetches published container config from
  Google — which the docs must state plainly.
- The recommendation-module UX is backed by a graduated throwaway prototype
  ([prototype-recommendation-module.html](prototype-recommendation-module.html), variant A card
  grid); treat it as the encoded UX decision, not shippable code.
