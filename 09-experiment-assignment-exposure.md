# 09 — Experiment assignment + exposure

**What to build:** A single controlled experiment measures only the *presentation* of the
recommendation module, without touching who is eligible, what segment they're in, or which products
and ranking they get. Assignment is deterministic and consent-respecting; exposure is recorded only
when the assigned variant was actually rendered and seen, and each viewing counts exactly once.

**Blocked by:** 08.

**Status:** ready-for-agent

- [ ] There is exactly one experiment, `recommendations_layout` version 1, with fixed 50/50
      `control`/`treatment` presentation variants that leave eligibility, segments, products, and ranking
      unchanged; bots, staff, and demo accounts are excluded.
- [ ] Assignment is lazy and deterministic from the SHA-256 rule (encoded decision from planning):

      ```text
      bucket = SHA-256(experiment_id:experiment_version:identity_key)
      firstEightHexDigits % 10000  ->  0..4999 = control, 5000..9999 = treatment
      ```

- [ ] Assignment persists in a host-only, first-party `experiment_assignment` cookie only after
      Analytics consent; an anonymous assignment is preserved through signup/login.
- [ ] Assignment is not exposure: `experiment_exposed` fires only after Personalisation consent,
      successful activation with recommendations, the rendered assigned variant, and viewport visibility.
- [ ] Exposure is deduplicated by `(experiment_id, experiment_version, assignment_id, module_instance_id)`
      per page view, so each viewing counts once.
- [ ] Unit tests assert deterministic bucketing from the SHA-256 rule and exactly-once exposure dedupe.
