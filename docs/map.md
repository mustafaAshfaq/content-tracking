<!-- wayfinder:map -->

# Map: Local Content Personalization & A/B Attribution Platform (idea 2)

## Destination

A handoff-ready build spec/PRD for **project idea 2** — a standalone Next.js/TypeScript/React
content site (articles + product recommendations) that personalizes content per visitor
segment and proves attribution/audience activation, fully local. Every architecture decision
is locked so a separate build effort can execute the spec without making further decisions.
This map produces **decisions**, not the build itself (plan-only).

## Notes

- **Domain:** local martech/tracking stack. Content personalization + CDP audience activation
  + A/B experimentation + attribution, all runnable offline via `docker-compose up` + `npm run dev`.
- **Stack is LOCKED** (per user decision while charting) — the map decides *how* to use these,
  never *whether*: Next.js App Router + TS + React; GTM web container + server-side
  (`gcr.io/cloud-tagging-10302018/gtm-cloud-image` Docker); RudderStack OSS (Segment-equivalent
  CDP); Klaro CMP; Postgres warehouse; small Node/Express mock GA4/ads destinations.
- **Standalone repo** — reuses stack concepts only; shares no code with idea 1 (the travel-booking app).
- **Plan-only** — resolve at most one ticket per session (research tickets excepted). Produce
  decisions, not deliverables, until every ticket is closed and the spec can be assembled.
- **All 10 decision areas are in scope, equal priority** — do not bias frontier ordering.
- **Skills per ticket:** `/grilling` + `/domain-modeling` for decisions; `/research` subagent for
  external-knowledge (how to use the locked tools); `/prototype` for "how should it look/behave".
- **Reference docs:** `docs/project_ideas_local_stack.md` (idea 2 source), `docs/fe_role.txt`
  (role gaps this project answers), `docs/frontend_tracking_project_prd.md` +
  `docs/frontend_tracking_project_assignment.md` (idea 1 — sibling docs for event/consent style
  patterns to mirror, not to copy scope from).

## Decisions so far

<!-- one line per closed ticket: gist of the answer + link -->

- [RESEARCH: GTM server-side on localhost + multi-env config](issues/04-research-gtm-server-side-localhost.md) — sGTM image runs tagging + preview roles via `CONTAINER_CONFIG`; commit container-export JSON per env; **not truly air-gapped** (server fetches published container from Google) — a known constraint the spec must state. [findings](research/04-gtm-server-side-findings.md)
- [RESEARCH: RudderStack OSS capabilities](issues/05-research-rudderstack-oss-capabilities.md) — Elastic License, **data-plane self-host only** (Control Plane Lite deprecated → mount static `workspaceConfig.json` for offline); **reverse-ETL/Audiences/Tracking-Plans are Cloud-only**, so RudderStack does ingestion→Postgres warehouse and **audience compute + activation must be hand-rolled** (our SQL + `/segments/:userId` API); schema validation is ours. [findings](research/05-rudderstack-oss-findings.md)
- [Content model & personalization mechanism](issues/01-content-model-and-personalization-mechanism.md) — MDX articles + in-repo JSON product fixture; **4–6 single-category taxonomy shared by articles & products**; **HYBRID** mechanism = static/ISR articles + **client-side, consent-gated "Recommended products" module** (no personalized data in SSR, no leak before consent); fallback = static "Popular products" default, `/segments` never called without Personalisation consent. Graduated the module-UX prototype (ticket 13).
- [Event schema & typed data layer](issues/02-event-schema-and-data-layer.md) — v1 has seven events; implementation-owned UUID/envelope metadata; four-purpose consent snapshot with purpose-gated dispatch and no replay; typed `trackEvent()` with strict runtime validation, generated JSON Schema, and route-lifecycle-only SPA `page_view` suppression.
- [QA / testing strategy & tracking audit](issues/10-qa-testing-strategy.md) — CI is the authoritative data-quality gate with strict schema/event assertions, deterministic bucketing, exact Playwright counts, full consent denial/withdrawal coverage, automated CORS/CSP/leakage checks, local-stack integration, and a repeatable GTM Preview audit with explicit evidence.
- [Docker Compose topology + CI](issues/11-docker-compose-and-ci.md) — Compose runs Postgres, RudderStack, separate GTM tagging/preview roles, and inspectable mock destinations while Next.js runs on the host; app-owned audience compute, health-gated bootstrap, safe per-environment config, and tiered PR/main CI are locked.
- [PROTOTYPE: "Recommended products for you" module UX & behaviour](issues/13-prototype-recommendation-module-ux.md) — Variant A card grid wins: inline three-product module with responsive one-column layout, stable geometry, truthful fallback/personalized headings, fallback content for all non-success states, and complete click attribution context. [prototype](prototype-recommendation-module.html)
- [CSP/CORS policy for local tagging](issues/14-csp-cors-policy.md) — fixed local ports and explicit allowlists; narrow CSP/CORS with path restrictions, development-only preview, stricter HTTPS production policy, and automated rejection/leakage tests.
- [Sample content and category fixtures](issues/15-sample-content-fixtures.md) — fixture v1 locks four single-category domains, twelve stable articles, twelve stable products, same-category segment mapping, and a deterministic three-product fallback, all validated in CI.
- [Assemble the handoff spec/PRD](issues/12-assemble-handoff-spec.md) — the complete implementation contract is assembled in [FINAL-HANDOFF-SPEC.md](FINAL-HANDOFF-SPEC.md), with every section linked to its source decision and no open decision tickets remaining.

## Not yet specified

<!-- in-scope fog too dim to ticket yet; graduates as the frontier advances -->

No remaining fog; all decision tickets are closed and the implementation handoff is assembled.

## Out of scope

<!-- work ruled beyond the destination; closed, never graduates -->
