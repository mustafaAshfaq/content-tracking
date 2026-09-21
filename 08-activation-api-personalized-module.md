# 08 — Activation API + personalized module + `segment_activated`

**What to build:** The core value proposition goes live: a known, consented reader who qualifies for
a segment now sees `Recommended for you` with same-category products instead of the fallback. The
personalized products are delivered by a same-origin activation API with a strict, well-defined HTTP
contract that enforces authorization and consent independently of the client, and a `segment_activated`
event is recorded only when activation genuinely succeeds.

**Blocked by:** 02, 07.

**Status:** ready-for-agent

- [ ] `GET /segments/:userId` requires an owned authenticated session, validates the opaque ID,
      requires Personalisation consent, and rate-limits to 60 requests/min per user/IP.
- [ ] It returns the documented segment response with an `activationId`, or `200` with an empty list for
      a valid user without memberships (success and no-membership are distinguishable).
- [ ] Status codes are exactly `401`, `403` (including `403 consent_required` independent of client
      state), `404`, `200`, and `503`; responses cache `private, max-age=60`; the client honors a
      one-second timeout.
- [ ] The client module calls the API only after Personalisation consent; on success it renders
      `Recommended for you` with minimal human-readable category context and same-category products
      sorted by editorial rank.
- [ ] Every non-success path (denied, empty, timeout, unauthorized, error) renders the static fallback
      with a concise note; segment rules and sensitive traits are never exposed.
- [ ] `segment_activated` is emitted only on a successful membership response — never on denied, empty,
      timeout, unauthorized, or fallback paths.
- [ ] Contract tests assert authorization, consent enforcement, opaque-ID validation, rate limiting,
      cache headers, the one-second timeout, and the exact `401/403/404/200/503` responses including the
      empty-membership `200`.
