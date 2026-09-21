# Event schema & typed data-layer design

Type: grilling
Status: closed
Blocked by: —

## Decision

The v1 catalogue is:

- `page_view`
- `article_viewed`
- `recommendation_clicked`
- `experiment_exposed`
- `signup_completed`
- `consent_updated`
- `segment_activated` (server-side canonical event)

### Event properties

- `page_view`: require `page_url` (normalized canonical URL), `page_type`, and `route_id`.
  Optional: `referrer`, `title`, `content_id`, and `previous_route_id`.
- `article_viewed`: require `content_id`, `content_version`, `content_type`, and `view_method`
  (`loaded` or `engaged`). Optional: `author_id`, `category_ids`, `word_count`, `dwell_ms`, and
  `position`.
- `recommendation_clicked`: require `recommendation_id`, `content_id`, `module_id`, `position`,
  and `impression_id`. Optional: `algorithm_version`, `experiment_id`, and `destination_url`.
- `experiment_exposed`: require `experiment_id`, `experiment_version`, `variant_id`, and
  `assignment_id`. Optional: `allocation`, `reason`, and `context`.
- `signup_completed`: require an opaque `account_id` or `lead_id`, `signup_method`, and `plan_id`.
  Optional: `campaign_id`, `experiment_id`, `value`, and `currency`; raw email and other direct
  identifiers are excluded.
- `consent_updated`: require the resulting purpose map, `policy_version`, and `source`
  (`banner`, `settings`, `api`, or `import`). Optional: `previous` and `reason`.
- `segment_activated`: require `segment_id`, `segment_version`, `activation_id`, and
  `activation_reason`. Optional: `membership_source`, `effective_at`, and `expires_at`.
  Raw rule inputs and sensitive traits are excluded.

### Envelope and consent

Every event has implementation-owned `event_id`, `event_version`, `timestamp`, `environment`, and
`source` fields. `event_id` is a UUIDv4 generated at the origin, preserved across forwarding, and
deduplicated downstream using `(event_id, event_version)`. `correlation_id` is a UUID generated per
browser action or workflow and propagated unchanged through client/server-derived events; it is
optional for autonomous events.

`timestamp` is ISO-8601 UTC. `environment` is the closed enum `development | staging | production`.
`source` is the closed enum `browser | server`. The optional `identity` object may contain only
opaque `anonymous_id` and `user_id` values, subject to consent.

The consent snapshot contains `necessary`, `analytics`, `marketing`, and `personalisation`
booleans, plus `policy_version` and `captured_at`; `necessary` is always true. `consent_updated`
is always dispatchable. Other events are purpose-gated, with non-essential events withheld until
consent and never replayed retroactively.

### Typed data-layer contract

Callers use:

```ts
trackEvent({
  name: EventName,
  properties: EventPropertiesByName[EventName],
  correlation_id?: string,
  identity?: Identity,
}): TrackResult
```

The implementation adds the common envelope, validates required fields and enums before dispatch,
and rejects unknown properties in every environment. `TrackResult` is discriminated and reports
`dispatched`, `blocked` (with a consent reason), or `rejected` (with structured validation or
infrastructure errors). Rejected events are never pushed.

The validated envelope is pushed directly to `window.dataLayer` with an `event` discriminator.
The data layer is initialized when absent; unavailable infrastructure produces an explicit
rejection rather than a silent drop.

TypeScript types and runtime schemas are authoritative. JSON Schema is generated from them for
server and analytics consumers; it is not maintained separately.

For SPA navigation, emit one `page_view` after each committed navigation for the normalized
`(route_id, canonical_path, query allowlist)` key. Suppress repeated framework callbacks for that
key until a different route commits. A full reload or explicit remount may emit again. No
payload-based client deduplication applies to other event types; downstream idempotency uses
`event_id`.
