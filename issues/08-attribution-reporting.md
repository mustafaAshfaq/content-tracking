# Attribution reporting design

Type: grilling
Status: closed
Blocked by: 02, 03, 07

## Question

What attribution does the platform prove, and how is it derived from trustworthy data?

- The two reports the doc calls for: **conversion-by-variant** (ties to experiment 07) and
  **conversion-by-UTM-source**. Define "conversion" (e.g. `signup_completed`).
- UTM capture: how `utm_*` params are captured, persisted (first-touch vs last-touch), and attached
  to the identity/session so conversions can be attributed to source.
- The warehouse query/model shape (Postgres SQL/views) producing each report, joining events by
  identity (03) and deduping by `event_id`.
- What makes the data **trustworthy** for attribution — the explicit checks proving it: no duplicate
  events, correlation between browser and server events, consistent identity stitching. This is the
  "proves the tracking data is trustworthy for downstream attribution" claim.
- How the report is surfaced (a page/route, a SQL doc, a small dashboard?) — decide the deliverable.

## Decision

### Conversion definition and report windows

The primary conversion is the first valid, deduplicated `signup_completed` event for each canonical
user in the requested UTC reporting window. `recommendation_clicked` remains a secondary engagement
metric and is not mixed into conversion rates.

Report requests accept UTC `start` and `end` timestamps with a maximum 90-day window. Warehouse
filtering uses event time in UTC; the dashboard localizes timestamps only for display.

### Conversion by experiment variant

The report covers `recommendations_layout` and uses its existing lifecycle rules:

- Include only users with a valid, visible `experiment_exposed` event before their first qualifying
  signup.
- Use the earliest valid exposure for the experiment version.
- Attribute a signup only within 30 days after that exposure.
- Exclude assignment-only users, Popular fallback views, denied-consent sessions, invalid duplicate
  exposures, conversions outside the window, and cross-version assignment anomalies.

Each variant row reports eligible exposures, conversions, and conversion rate. The first valid
conversion per canonical user is counted once.

### UTM capture and consent

Capture only the allowlisted parameters `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, and
`utm_content` from the first landing page containing valid values. Normalize values before storage.
Persist a first-touch `attribution_touch` record containing campaign metadata, landing timestamp,
and the anonymous identity/session key; later URLs do not overwrite it.

The touch record is Necessary-scoped metadata. It may be used for reporting only when Analytics
consent permits reporting, and UTM values must not be sent to Marketing destinations without
Marketing consent. Unlinked touches age out after 13 months.

At anonymous → known aliasing, atomically copy the touch to the canonical `userId`. Across linked
browser IDs, retain the earliest valid first touch. Conflicts are flagged for audit rather than
silently overwritten.

Conversions without a valid UTM touch are retained in an explicit `direct / none` bucket. They are
never dropped or merged with malformed values.

### Warehouse attribution model

Reports use shared layered Postgres views/materialized views rather than independent dashboard
queries:

1. `canonical_events` resolves identity aliases to canonical users.
2. `deduped_events` keeps the earliest accepted ingestion copy for each
   `(event_id, event_version)`.
3. `experiment_exposure_cohort` selects the earliest valid exposure per canonical user and
   experiment version.
4. `conversion_attribution` joins the first qualifying signup and the first-touch UTM record.

The canonical identity join is the only user join key. `correlation_id` is preserved across
browser/server-derived event chains and used for diagnostics, not as a substitute for identity.

### Trust and report health

Every report includes a health section counting:

- duplicate event IDs;
- malformed or missing identity links;
- conversions before exposure;
- cross-version assignments;
- missing consent eligibility;
- conflicting first-touch records;
- missing, duplicated, or mismatched browser/server correlation chains.

Rates are marked **qualified** only when the configured integrity thresholds pass. Invalid rows are
excluded from rate denominators but retained in an audit/error report. Anomalies are never silently
corrected or presented as trustworthy.

Server-derived events such as `signup_completed` and `segment_activated` preserve the originating
`correlation_id` when applicable. Timestamp proximity is never treated as proof of linkage.

### Reporting surface and privacy

The demo delivers a protected local Next.js route:

```text
/admin/attribution
```

It contains summary cards, a conversion-by-variant table, a conversion-by-UTM-source table, a
report-health panel, and JSON/CSV export backed by the shared warehouse models.

Access is local-admin-only. The UI and exports contain no raw email or direct identifiers and
suppress aggregation cells with fewer than five conversions where applicable. Report access is
audit-logged without recording report contents.

Each report displays its last successful compute timestamp and data watermark. If Postgres or a
view refresh is unavailable, the page shows an explicit stale/unavailable state; it never presents
partial data or unlabeled stale data as current.
