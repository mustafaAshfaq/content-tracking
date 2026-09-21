# 06 — Server identity, auth, aliasing + `signup_completed`

**What to build:** A visitor can sign up / log in as a demo user, and from that point their anonymous
history and known identity reconcile without the client ever being trusted to assert who they are.
The server owns an opaque `userId`, records an idempotent alias edge from the anonymous cookie, and
notifies RudderStack. Conversions are captured as `signup_completed` (Marketing-gated), raw events
stay immutable, and reporting can later resolve everything to a canonical identity through the alias
edges.

**Blocked by:** 04, 05.

**Status:** ready-for-agent

- [ ] Demo signup/login establishes a server-owned session; the server mints and owns opaque `userId`
      values and never trusts a client-supplied canonical ID.
- [ ] On signup/login, the server atomically persists an idempotent `identity_aliases` edge linking the
      pre-auth `anonymous_id` to the `userId`, then sends RudderStack `alias` and `identify`.
- [ ] `signup_completed` is emitted through `trackEvent()` and is gated by Marketing consent.
- [ ] Subsequent events may carry both anonymous and known IDs; raw events remain immutable.
- [ ] Canonical identity is resolvable through the alias edges (verified by a query/test), so anonymous
      and known activity join correctly for later audience/attribution use.
- [ ] The anonymous cookie is not merged before authentication; an anonymous visitor never triggers any
      activation endpoint on their behalf.
