# 05 — Event-forwarding pipeline into the warehouse, observable in mocks

**What to build:** A consent-granted interaction now travels the full data path end to end and lands
in the Postgres warehouse, with every hop inspectable. An event dispatched through `trackEvent()`
flows browser data layer → GTM web container → GTM server-side tagging container → RudderStack OSS
ingestion → Postgres, arriving exactly once even if forwarded more than once, and the mock
destinations show what would have been sent to GA4/ads. This proves the collection backbone works
before any audience or attribution logic reads from the warehouse.

**Blocked by:** 04.

**Status:** ready-for-agent

- [ ] A consented behavioral event dispatched in the browser is forwarded through the GTM web
      container, the GTM server-side tagging container, and RudderStack, and is persisted in the
      Postgres warehouse.
- [ ] `event_id` is preserved through every forwarding hop; downstream storage deduplicates by
      `(event_id, event_version)` so re-forwarded events collapse to one row.
- [ ] `correlation_id` is propagated to derived browser/server events so related events can be joined.
- [ ] Consent gating from ticket 04 holds across the pipeline: events blocked at dispatch never appear
      downstream, and no consent-blocked event is replayed later.
- [ ] The mock destinations log the outbound GA4/ads payloads for the forwarded event so a developer
      can inspect them without contacting real vendors.
- [ ] Contract/integration tests assert the warehouse landing and the `(event_id, event_version)`
      dedupe behavior against the local stack.
