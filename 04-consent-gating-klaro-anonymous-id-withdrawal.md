# 04 — Consent gating: Klaro + `anonymous_id` + gated dispatch + GTM consent mode + withdrawal

**What to build:** A visitor is counted from the first visit via a privacy-safe anonymous cookie, is
shown a Klaro banner where everything beyond Necessary is off by default, and sees the site behave
correctly with respect to their choices: behavioral events only flow once Analytics is granted, the
personalized path stays closed until Personalisation is granted, and withdrawing consent immediately
stops collection and restores the fallback with nothing buffered for replay. Consent is enforced in
two layers — the application data layer and GTM — and consent state is treated as untrusted input
that fails closed.

**Blocked by:** 02, 03.

**Status:** ready-for-agent

- [ ] A cryptographically random, host-only `anonymous_id` cookie is minted before consent as
      Necessary storage: first-party, `Path=/`, `SameSite=Lax`, `Secure` under HTTPS, 13-month rolling
      lifetime; not merged before authentication.
- [ ] Klaro presents Necessary (always on), Analytics, Marketing, and Personalisation, with the latter
      three denied by default.
- [ ] The consent snapshot is captured at dispatch time on every event; Analytics gates behavioral
      events, Marketing gates `signup_completed`/marketing tags, Personalisation gates activation and
      personalized rendering.
- [ ] Blocked events return an explicit consent reason and never enter `dataLayer`; nothing is
      buffered or replayed when consent is later granted.
- [ ] `consent_updated` is emitted only on an effective purpose-map transition (no noise on no-op
      re-saves).
- [ ] Consent is persisted in a versioned, server-readable Klaro cookie, validated as untrusted input,
      failing closed on missing/malformed/unknown/future-schema values; a policy-version change forces
      re-consent.
- [ ] GTM is initialized default-denied with explicit updates (Analytics→`analytics_storage`,
      Marketing→`ad_storage`+`ad_user_data`, Personalisation→`ad_personalization`); both application and
      GTM checks apply.
- [ ] Withdrawing consent stops collection and activation, invalidates in-flight responses, clears
      purpose-owned state, and restores fallback rendering, with no blocked event buffered or replayed.
