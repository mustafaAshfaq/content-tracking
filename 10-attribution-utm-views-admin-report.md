# 10 — Attribution: first-touch UTM + Postgres views + `/admin/attribution`

**What to build:** An admin can open a protected report and see, for the local stack, which variant
and which acquisition source produced sign-ups — derived from one consistent warehouse model and
presented in a privacy-safe way. First-touch UTM is captured and retained honestly, conversions are
counted consistently, and the report respects consent, suppresses small cells, and never leaks direct
identifiers.

**Blocked by:** 09.

**Status:** ready-for-agent

- [ ] Allowlisted first-touch UTM parameters (`source`, `medium`, `campaign`, `term`, `content`) are
      captured, normalized, and retained as a 13-month Necessary-scoped attribution touch; conversions
      lacking valid UTM fall into a preserved direct/none bucket.
- [ ] UTM/attribution is reported only with Analytics consent and never sent to Marketing without
      Marketing consent.
- [ ] The primary conversion is the first valid deduplicated `signup_completed` per canonical user
      within a requested UTC window of at most 90 days; `recommendation_clicked` is treated as secondary
      engagement, not conversion.
- [ ] Shared Postgres views exist and back the report: `canonical_events`, `deduped_events`,
      `experiment_exposure_cohort`, and `conversion_attribution`.
- [ ] Protected `/admin/attribution` shows conversion-by-variant, conversion-by-UTM-source, a health
      panel, and JSON/CSV export.
- [ ] Reporting suppresses small cells, omits direct identifiers, and shows explicit stale/unavailable
      states.
