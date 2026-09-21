# Findings: RudderStack OSS capabilities (ticket 05)

Resolved by direct web research (the research subagent hung on a slow fetch; completed manually).
Sources at the bottom.

## Summary

RudderStack OSS (`rudderlabs/rudder-server`) is **source-available, not OSI open source** — it
relicensed from AGPL-3.0 to the **Elastic License 2.0** (you may self-host for internal use; you
may NOT offer it as a managed service to third parties). It is actively maintained. **Only the
data plane is self-hostable**; the fully self-hosted **"Control Plane Lite" is deprecated** and the
config/control plane is now RudderStack-cloud-managed. Crucially for this project: **Reverse-ETL,
Audiences/audience activation, Tracking Plans, and Data Governance are Cloud/paid-only** — OSS has
none of them. **Implication:** the audience-compute + activation loop must be **hand-rolled** — our
own SQL over the Postgres warehouse to build an audience table, exposed via our own
`/segments/:userId` API. RudderStack OSS's role is the **Segment-compatible ingestion + warehouse
loading** part of the pipeline, not the activation part. This is exactly the pattern the project
idea already sketched, and the research confirms it's the *only* viable pattern in OSS.

## 1. Self-hosting via docker-compose

- Official `docker-compose.yml` lives in the repo:
  `github.com/rudderlabs/rudder-server/blob/master/docker-compose.yml`. Typical services:
  `rudder-server` (event router/API), `rudder-transformer` (shapes events for destinations),
  Postgres (internal jobsdb queue), plus your warehouse Postgres, optional MinIO (staging batched
  events for warehouse loads).
- Segment-compatible ingestion: analytics.js / the HTTP API (`/v1/track`, `/v1/identify`, etc.)
  authenticated with a write key. **Caveat:** you need a workspace config (sources/destinations).
  Because Control Plane Lite is deprecated, config comes from the RudderStack-hosted control plane
  UI exported/loaded as a `workspaceConfig.json`, OR a manually authored config file mounted into
  rudder-server. For a *fully offline* build this is the friction point — flag it (see §5).

## 2. Postgres warehouse schema (what SQL joins against)

When Postgres is configured as a **warehouse destination**, RudderStack auto-creates and populates
tables (default schema often `rudder_events` or a configured name), flattening event properties to
columns and adding columns dynamically as new properties arrive:
- `tracks` — all track events (generic columns: `id`/`event_id`, `event` (name), `user_id`,
  `anonymous_id`, `received_at`, `timestamp`, context columns…).
- `<event_name>` — one table per named track event (e.g. `article_viewed`,
  `recommendation_clicked`) with that event's properties flattened to columns.
- `identifies` and `users` — identity + traits.
- `pages`, `groups` — if used.

This is the surface ticket 06 (audience compute) and ticket 08 (attribution) write SQL against:
e.g. "visited 3+ articles in category X" = a query/materialized view over `article_viewed`
grouped by `user_id`/`anonymous_id` filtered on the category column.

## 3. Transformations & reverse-ETL/activation in OSS

- **User Transformations:** OSS supports **JavaScript transformations, cloud-mode only**, capped at
  **~5**. Enough for light event enrichment/PII filtering at the server boundary. No Python.
- **Reverse-ETL / Audiences / Real-Time Activation API / Audience Builder:** **Cloud/paid only —
  NOT in OSS.** So audience activation OUT of the warehouse is *not* a RudderStack OSS feature.
- **Decision this locks:** build a **self-hosted `/segments/:userId` API** (a Next.js route handler
  or small service) that queries the Postgres warehouse audience table directly. RudderStack OSS
  does ingestion → warehouse; *we* do compute + activation. This is the correct and only OSS pattern.

## 4. Tracking-plan / schema validation in OSS

- **Tracking Plans / Data Governance / violation management are Cloud-only.** OSS gives basic event
  metrics only — no schema enforcement.
- **Decision this informs:** event-schema validation for this project must be **owned by our typed
  data-layer** (ticket 02) and our tests/tracking-audit (ticket 10), NOT delegated to RudderStack.
  We can still ship a JSON "tracking plan" doc as the contract, enforced in TS + tests.

## 5. 2026 status / licensing / offline viability

- **License:** Elastic License 2.0 (source-available). Fine for a self-hosted portfolio/internal
  demo; can't be resold as a service. Not "open source" in the OSI sense — state this accurately.
- **Maintained:** yes, active on GitHub.
- **Offline viability:** the **data plane self-hosts fine offline**, but the **deprecation of
  Control Plane Lite** means the intended config path is the hosted control plane. For a strictly
  offline build, plan to mount a **static `workspaceConfig.json`** into rudder-server
  (`RSERVER_BACKEND_CONFIG_CONFIG_FROM_FILE=true` + a config file) rather than relying on the hosted
  control plane. **This is the RudderStack analogue of the sGTM "not truly air-gapped" caveat** and
  the final spec must call it out. Ticket 11 (compose) owns pinning the exact env/config file mechanism.

### Practical implications carried forward
- Ticket 06: audience compute = our SQL/materialized view + `/segments/:userId` API (not RudderStack Audiences).
- Ticket 02/10: schema validation is ours (typed data-layer + tests), not RudderStack Tracking Plans.
- Ticket 11: mount static `workspaceConfig.json` for offline; document the control-plane caveat.
- Spec-wide: describe RudderStack OSS honestly — Elastic License, data-plane-only, ingestion+warehouse role.

## Sources

1. RudderStack Open Source FAQ — https://www.rudderstack.com/docs/get-started/rudderstack-open-source/faq/
2. Managed vs Open Source (feature comparison) — https://www.rudderstack.com/docs/deployment/managed-vs-open-source/
3. Plan comparison — https://www.rudderstack.com/docs/billing-plans/plan-comparison/
4. Open-Source RudderStack feature list (GitHub discussion #2392) — https://github.com/rudderlabs/rudder-server/discussions/2392
5. rudder-server repo + docker-compose.yml — https://github.com/rudderlabs/rudder-server / .../blob/master/docker-compose.yml
6. RudderStack Docker setup (data plane) — https://www.rudderstack.com/docs/get-started/rudderstack-open-source/data-plane-setup/docker/
7. Transformations overview — https://www.rudderstack.com/docs/transformations/overview/
