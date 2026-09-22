# A/B experimentation design

Type: grilling
Status: closed
Blocked by: 01, 02

## Question

How does the local A/B experiment work end to end?

- Assignment mechanism: cookie-based split (per the doc). Deterministic bucketing (hashed
  anonymousId → variant) so assignment is stable and SSR/client render agree — no flicker.
- What is being experimented on (e.g. two "recommended for you" layouts or copy variants), how many
  variants, and the traffic split.
- The `experiment_exposed` event: when it fires (on exposure, not assignment), its properties
  (experiment key, variant, correlation to the viewed content), and dedup rules.
- How variant assignment coexists with personalization/segments (independent axes? interaction?).
- How assignment is persisted and read on the server (SSR consistency) and respects consent.
- What the experiment produces downstream so attribution (08) can join conversion-by-variant.

## Decision

### Experiment and assignment

V1 ships one experiment:

```text
experiment_id: recommendations_layout
experiment_version: 1
```

It changes only the presentation of the personalized Recommended-products module:

- `control`: compact horizontal product cards
- `treatment`: larger editorial cards with explanatory copy

Recommendation eligibility, segment rules, product ranking, and product selection are unchanged.
Eligible visitors receive a fixed 50/50 allocation. Bots, staff accounts, and demo accounts are
excluded.

Assignment is lazy: it is created when the recommendations module is eligible to render. The
bucket is deterministic:

```text
SHA-256(experiment_id:experiment_version:identity_key)
```

The first eight hexadecimal digits are interpreted as an unsigned integer modulo 10,000. Buckets
`0..4999` are control and `5000..9999` are treatment. The assignment record contains
`assignment_id`, experiment/version, variant, allocation, identity basis, and assigned timestamp.

For the active experiment version, an anonymous assignment is preserved through signup/login and
is not re-bucketed mid-experiment. Future experiment versions may use the known `userId` as their
identity key. This keeps conversion cohorts stable while allowing later experiments to be
user-based.

### Persistence and consent

The assignment is persisted in a host-only, first-party `experiment_assignment` cookie with
`Path=/`, `SameSite=Lax`, `Secure` on HTTPS, no PII, and an expiry at experiment end (or sooner if
the experiment ends). It is server-readable for consistent request metadata even though the
module is client-rendered. The cookie is not written until Analytics consent is granted.

Assignment is independent from personalization eligibility, but personalized data and exposure
measurement require Personalisation consent. Before the required consent exists, the module uses
Popular products and no personalized-module exposure is emitted. Consent withdrawal immediately
stops new assignment/exposure processing, clears client assignment and personalized-module state,
and restores Popular products. Existing warehouse events remain available for audit unless a
separate deletion request applies.

### Exposure event

Assignment is not exposure. `experiment_exposed` fires only after:

1. Personalisation consent is granted.
2. The activation request succeeds with personalized recommendations.
3. The assigned variant has rendered and the module is actually visible in the viewport.

The event retains the existing required `experiment_id`, `experiment_version`, `variant_id`, and
`assignment_id` fields. Its contract also includes stable `module_id` and route/content context
needed to identify the placement in downstream analysis. Identity remains in the envelope, not
event properties.

Emit at most one exposure per
`(experiment_id, experiment_version, assignment_id, module_instance_id)` per page view. The
event's idempotency key and a downstream uniqueness constraint protect against retries,
IntersectionObserver repeats, and React remounts. The Popular fallback, empty memberships,
activation timeout, activation failure, denied consent, and unauthorized responses never produce
an exposure.

### Lifecycle and analysis

An experiment has explicit start and end timestamps. Once active, its variants and allocation are
immutable. Any rule, allocation, or identity-key change creates a new `experiment_version`.
Conversions are attributed within 30 days after exposure.

`signup_completed` is the primary conversion and `recommendation_clicked` is a secondary
engagement metric. Conversion-by-variant includes only users with a valid exposure before the
conversion, joined by canonical identity and assignment metadata. Reports include exposure count,
conversion count, and conversion rate for each variant.

### Integrity checks

The experiment report flags duplicate exposures, conversions without prior exposure,
assignment/exposure ratio drift from 50/50, cross-version assignments, and identity changes.
Invalid rows are excluded from rate denominators but retained in an audit/error report; anomalies
are never silently corrected.
