# RESEARCH: RudderStack OSS transformations, warehouse & activation

Type: research
Status: resolved
Blocked by: —

## Question

What can RudderStack OSS actually do for audience compute and activation, and how? (external knowledge)

- How to self-host RudderStack OSS via docker-compose (`rudderstack/rudder-server` + Postgres,
  optionally ClickHouse): services, config, and the Segment-compatible `analytics.js`/HTTP source.
- How events land in the Postgres warehouse (schema/tables), so we can build an audience table
  (e.g. "visited 3+ articles in category X") with SQL/a transformation.
- RudderStack **Transformations** capabilities in OSS, and whether OSS supports any
  reverse-ETL / audience-activation back out (vs us hand-rolling a `/segments/:userId` API that
  queries Postgres directly). Confirm what is and isn't available in the open-source tier.
- Tracking-plan / event-schema validation features available in OSS.
- Any current (2026) status/licensing/deprecation caveats for the OSS server offline.

Resolve via a `/research` subagent; store findings under `research/` and cite sources here.

## Answer

Full findings: [research/05-rudderstack-oss-findings.md](../research/05-rudderstack-oss-findings.md).

Key decisions this unblocks:
- RudderStack OSS = `rudderlabs/rudder-server`, **Elastic License 2.0** (source-available, not OSI;
  self-host OK, no reselling). Actively maintained; **data plane self-hosts**, but **Control Plane
  Lite is deprecated** — config comes from a hosted control plane or a mounted static
  `workspaceConfig.json` (the offline path; the RudderStack analogue of sGTM's "not air-gapped" caveat).
- **Reverse-ETL, Audiences/activation, Tracking Plans, Data Governance are Cloud-only — NOT in OSS.**
  So RudderStack OSS does **ingestion → Postgres warehouse** only; **audience compute + activation
  must be hand-rolled** (our SQL over the warehouse + our own `/segments/:userId` API). This locks
  ticket 06's architecture.
- Warehouse schema: auto-created flattened tables — `tracks`, one table per named event
  (`article_viewed`, `recommendation_clicked`…), `identifies`, `users`, `pages`. This is the SQL
  surface for ticket 06 (audiences) and ticket 08 (attribution).
- OSS transformations: JS-only, cloud-mode, ~5 cap — light enrichment/PII filtering only.
- **Event-schema validation is OURS** (typed data-layer ticket 02 + tests ticket 10), not RudderStack.

> Note: resolving this made ticket 06's "hand-rolled activation vs RudderStack Audiences" question
> no longer open — OSS forces the hand-rolled path. Recorded in 06's context via this decision.
