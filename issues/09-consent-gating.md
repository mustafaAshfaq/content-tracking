# Consent gating design

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

How does Klaro-based consent gate personalization, activation, and tags?

- The consent categories (Necessary, Analytics, Marketing, Personalisation) and their defaults
  (non-essential denied by default).
- Exactly **what each category gates**: which GTM tags, which events, and critically the
  **audience-activation call itself** (`/segments/:userId`) and personalized rendering — the doc
  requires these gated. What is the experience when Personalisation is denied?
- The `consent_updated` event and how consent state is embedded in every event envelope.
- **Denial code paths** that must be explicitly tested: activation call suppressed, personalization
  falls back to default, marketing/analytics tags withheld.
- How consent state is stored (Klaro config in-repo as JSON), read on the server for SSR gating,
  and reconciled with GTM's built-in consent checks.
- Consent withdrawal behaviour (revoke mid-session).

## Decision

- `Necessary` is always enabled and limited to consent UI/state management, security, session
  integrity, and core application delivery. `Analytics`, `Marketing`, and `Personalisation` are
  denied by default.
- `page_view`, `article_viewed`, `recommendation_clicked`, and `experiment_exposed` require
  Analytics consent. `signup_completed` and all marketing GTM tags require Marketing consent.
  Blocked events are discarded, never buffered or replayed. `consent_updated` remains dispatchable
  so consent transitions can be recorded.
- Personalisation consent gates both `/segments/:userId` activation and personalized rendering.
  When denied, the client renders the static Popular products/editor's-picks fallback and makes no
  activation request. Activation uses `userId` for authenticated users or a purpose-scoped
  anonymous identifier otherwise; raw direct identifiers are never sent.
- The activation endpoint independently validates consent and returns `403` with the stable
  `consent_required` reason for denied, malformed, stale, or otherwise invalid consent.
- Consent is persisted in a versioned, server-readable Klaro cookie. The server treats it as
  untrusted input and fails closed for missing, malformed, unknown-purpose, or future-schema
  values. A policy-version change invalidates existing consent and requires explicit re-consent.
- `consent_updated` is emitted only for effective purpose-map transitions, including withdrawal or
  policy reset. Every dispatched event carries an immutable consent snapshot captured at dispatch
  time; blocked events return an explicit `blocked` result and never reach `dataLayer` or the
  network.
- GTM initializes with default-denied consent before tags load, then receives explicit Klaro
  updates. The mapping is Analytics to `analytics_storage`, Marketing to `ad_storage` and
  `ad_user_data`, and Personalisation to `ad_personalization`; application and GTM checks both
  apply.
- Withdrawal immediately stops future collection and activation, invalidates in-flight
  personalization responses, clears purpose-owned client state, and restores the static fallback.
  Consent-aware responses use private or no-store caching; static content remains shared-cacheable.
- QA is table-driven across purposes and allow/deny/withdraw states, asserting visible outcomes,
  blocked results, absence of network requests, and absence of replay. The Klaro UI requires an
  explicit Accept all, Reject all, or granular settings action; dismissal, scrolling, and
  inactivity are not consent.
