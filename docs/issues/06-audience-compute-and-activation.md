# Audience compute + activation loop design

Type: grilling
Status: closed
Blocked by: 01, 02, 03, 05

## Question

How is an audience computed in the warehouse and activated back into the frontend?

- The audience definition(s) to ship — e.g. "visited 3+ articles in category X" — expressed as a
  concrete rule over warehouse events. What categories/thresholds, and how many audiences?
- Where compute runs: a scheduled SQL/transformation over the Postgres warehouse table producing
  a `segments`/`audience_membership` table keyed by identity. Batch cadence vs on-demand.
- The **activation contract**: the `/segments/:userId` (or `/segments/:anonymousId`) API the Next.js
  app calls — request shape, response shape (segment list + attributes), latency/caching, and how
  the frontend uses it to choose personalized content (ties to the mechanism decided in 01).
- The full **identify → compute audience → activate** loop written out end to end, proving the
  Segment-equivalent CDP flow.
- Failure/empty states: unknown user, no segments, warehouse unavailable.

## Decision

### Audience rules

The demo taxonomy is exactly four categories: `travel`, `finance`, `health`, and `technology`.
V1 ships one segment per category:

```text
engaged_<category>
```

A canonical known user belongs to `engaged_<category>` when they have viewed at least three
distinct articles in that category during the trailing 30 days. Distinctness is by `content_id`;
repeat views of the same article do not increase the count. There is no recency weighting.

Only validated `article_viewed` events whose event-time consent snapshot has
`personalisation=true` contribute. Anonymous-only activity does not create a membership.

### Warehouse compute

RudderStack remains the ingestion and Postgres-loading layer. A dedicated Node worker/CLI runs
every five minutes and exposes the same command for on-demand demo and test recomputation. Each
run acquires a Postgres advisory lock, resolves `identity_aliases` to canonical known users, and
aggregates the trailing-window events.

The current snapshot is stored in `audience_membership` with one row per `(user_id, segment_id)`,
including:

- `segment_version`
- `computed_at`
- `effective_at`
- `expires_at`
- `membership_source` (for example, `warehouse_sql`)

Rule versions are monotonically increasing, starting at 1. A published row expires 30 days after
its `effective_at`; expired rows are excluded from activation. Recompute writes a complete new
snapshot and atomically replaces the previous one, so partial batches are never visible.

If a run fails or overlaps another run, the lock prevents concurrent publication and the last
complete snapshot remains available. The failed run and error health state are recorded; the
system never clears memberships or publishes partial results.

### Activation API

The frontend calls:

```http
GET /segments/:userId
```

The request has no body. The backend requires an authenticated session that owns the opaque
server-issued `userId`, validates the identifier, checks Personalisation consent, and applies a
per-user/IP rate limit of 60 requests per minute. The endpoint is same-origin and never returns
another user's memberships.

The successful response is:

```json
{
  "userId": "opaque-server-issued-id",
  "computedAt": "2026-09-18T17:00:00.000Z",
  "activationId": "uuid",
  "segments": [
    {
      "segmentId": "engaged_travel",
      "segmentVersion": 1,
      "attributes": { "categories": ["travel"] },
      "effectiveAt": "2026-09-18T17:00:00.000Z",
      "expiresAt": "2026-10-18T17:00:00.000Z"
    }
  ]
}
```

A valid known user with no current memberships receives `200` with an empty `segments` list.
Responses use `Cache-Control: private, max-age=60`; the client request timeout is one second and
the indexed membership query targets under 100 ms. Client cache is keyed by user and segment
version and is cleared on consent withdrawal or logout.

Status contract:

- `401` — missing or invalid authentication
- `403` — Personalisation consent missing, or the user is not owned by the session
- `404` — the authorized user record does not exist
- `200` with empty `segments` — valid user with no current memberships
- `503` — warehouse or activation dependency unavailable

All non-`200` responses use the Popular products fallback. Logs record outcomes and
`activationId`, but never PII or raw rule inputs.

### Frontend activation behavior

Each `engaged_<category>` segment authorizes products in that same category. Products are
deduplicated and sorted by stable editorial rank from the in-repo fixture. The module shows the
static Popular products list when Personalisation consent is denied, the visitor is unknown, the
user has no memberships, a membership is expired, or activation times out/fails.

The server emits `segment_activated` only after a successful authorized response containing one or
more memberships. It emits one event per activation response with a UUID `activation_id`, segment
and version metadata, and no raw rule inputs; downstream deduplication uses
`(activation_id, segment_id)`. No event is emitted for denied, unauthorized, empty, timeout, or
fallback responses.

### End-to-end loop

1. The browser creates the Necessary `anonymous_id` and emits consent-eligible
   `article_viewed` events through the agreed data-layer → GTM web → GTM server-side →
   RudderStack → Postgres pipeline.
2. On signup or login, the server atomically persists the `anonymous_id` → `userId` alias, then
   sends the RudderStack `alias` and `identify`; subsequent events carry both identifiers.
3. The five-minute worker resolves aliases, counts distinct qualifying articles per category, and
   atomically publishes the current `audience_membership` snapshot.
4. After hydration, and only with Personalisation consent, the client requests
   `/segments/:userId`.
5. The authorized API returns current memberships, the client maps them to same-category products,
   and the server records `segment_activated`.
6. The recommendation click carries the selected product, content, module, impression, and
   segment context for attribution.

Anonymous visitors never call an anonymous activation endpoint. Unknown users, denied consent,
empty memberships, expired data, and dependency failures all fail closed to Popular products.
