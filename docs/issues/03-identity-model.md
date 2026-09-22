# Identity model: anonymous → known

Type: grilling
Status: closed
Blocked by: —

## Question

How is visitor identity established, persisted, and resolved anonymous → known?

- The `anonymousId` strategy (cookie/localStorage, first-party, lifetime) and how it is minted
  before consent (necessary-category only) vs enriched after.
- What `signup_completed` does to identity — the identify/alias transition from anonymous to a
  known `userId`, and how prior anonymous activity is stitched to the known profile.
- How the identifier threads through the pipeline: browser data-layer → GTM web → GTM server-side
  → RudderStack → Postgres warehouse, so audience compute and attribution can join events per person.
- Interaction with consent: which identifiers are permitted under Necessary vs Analytics/Marketing,
  and what the identity looks like when non-essential consent is denied.
- What the `/segments/:userId` activation endpoint keys on (anonymousId vs userId).

## Decision

### Anonymous identity

- Mint a cryptographically random UUID in a host-only, first-party `anonymous_id` cookie.
- The cookie uses `Path=/`, `SameSite=Lax`, and `Secure` in HTTPS deployments (localhost HTTP
  remains supported). It is not `HttpOnly` because the browser data layer and GTM must read it.
- The cookie has a 13-month rolling lifetime and remains stable until an explicit reset or
  compromise response. There is no `Domain` attribute.
- Mint it before the consent choice because it is Necessary storage. A Necessary-only identity is
  retained if non-essential consent is denied; no non-essential enrichment or processing is implied.
- Each browser profile has its own anonymous ID. Anonymous IDs are not merged before
  authentication.

### Consent and identity processing

The four purposes are independent:

| Purpose | Permitted identity use |
| --- | --- |
| Necessary | The anonymous cookie and strictly operational events |
| Analytics | Behavioral measurement |
| Personalisation | Audience computation, `/segments/:userId`, and personalized rendering |
| Marketing | Marketing and advertising destinations |

Granting one non-essential purpose does not grant another. On mid-session withdrawal, newly
disallowed dispatches and activation calls stop immediately, client personalization/segment
caches are cleared, rendering returns to the static fallback, and enrichment stops. The Necessary
cookie remains. Existing warehouse rows are retained unless a separate deletion workflow is
invoked.

### Anonymous → known transition

- The server creates a stable, opaque UUID/ULID `userId`; identifiers contain no email or other
  readable PII. Client-presented IDs are syntax-validated and ownership-checked by the backend.
- On `signup_completed` or a later authenticated login, the server atomically links the current
  browser's `anonymousId` to the existing or newly created `userId`.
- The link is represented by an idempotent `identity_aliases` edge with a uniqueness constraint on
  `(anonymous_id, user_id)`. A stable event ID/idempotency key prevents duplicate signup effects.
- Downstream ordering is: durable alias link, then `alias` from anonymous to known, then `identify`.
  Subsequent events carry both `anonymousId` and `userId`. Repeated callbacks cannot create a new
  user or duplicate the relationship.
- Authenticated logins can link additional browser-specific anonymous IDs to the same user.

Raw events remain immutable. Audience and attribution queries use a server-derived canonical
person view that resolves `identity_aliases`; historical event rows are not rewritten.

### Pipeline contract

The event envelope carries `anonymousId` when the Necessary identity exists and an optional
`userId` after authentication. The browser data layer emits both fields, GTM web forwards them
unchanged, GTM server-side validates and preserves them, RudderStack receives them in its standard
`anonymousId`/`userId` fields, and Postgres stores both. No client-supplied canonical person ID is
accepted.

### Activation endpoint

`/segments/:userId` accepts only a server-issued known `userId`. Anonymous visitors never call an
anonymous equivalent and receive the static fallback. The endpoint resolves linked anonymous
history through the server-side alias view and is callable only when Personalisation consent is
granted.

### Retention and failure behavior

- Unlinked anonymous IDs and alias edges expire after 13 months of inactivity.
- Linked edges remain while the user exists. User deletion removes the user, alias edges,
  activation rows, and associated identity fields; immutable event facts may be irreversibly
  anonymized when aggregate retention requires them.
- If RudderStack or Postgres is unavailable, personalization and activation fail closed to the
  static fallback. Signup/alias work uses a bounded durable server-side retry/outbox; the system
  never fabricates a user ID or silently relinks identities, and exposes an explicit health/error
  signal.
