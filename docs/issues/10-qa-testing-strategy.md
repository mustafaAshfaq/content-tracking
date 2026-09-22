# QA / testing strategy & tracking audit

Type: grilling
Status: closed
Blocked by: 02, 06, 07, 09

## Question

What is the automated-test and tracking-audit strategy that proves data quality?

- Unit tests: typed data-layer validation, event-schema conformance, deterministic experiment
  bucketing, consent-gating logic.
- Integration/E2E (Playwright): assert exact event counts (no duplicate `page_view` on SPA nav),
  `experiment_exposed` on exposure, activation call fires only with consent, denial paths behave.
- The **tracking audit checklist** the doc calls for: missing required properties, duplicate
  event IDs, CORS misconfig between `localhost:3000` and the local GTM server container, CSP
  `connect-src` entries, consent leakage.
- Documented **GTM Preview / Tag Assistant** walkthrough steps against localhost.
- What is asserted in CI as a quality gate vs run manually.
- Optional intentional-defect log (introduce & fix bugs with before/after evidence) — decide if in.

## Decision

- CI is the authoritative automated correctness gate. Unit tests cover strict runtime validation,
  required and unknown properties, consent snapshots, closed enums, schema conformance, and the
  guarantee that rejected events never enter `dataLayer`.
- Experiment tests lock hash inputs, bucket boundaries, allocation, persistence, and stable
  reassignment across repeated calls and identity transitions.
- Playwright asserts exact route-lifecycle `page_view` counts, no duplicate SPA emissions,
  exactly-once `experiment_exposed`, complete recommendation attribution fields, and absence of
  raw email or other direct identifiers from `signup_completed`.
- The E2E consent matrix covers default denial, individual opt-ins, accept-all, reject-all,
  withdrawal, stale or malformed consent, and reload persistence. It asserts explicit blocked
  results, no `dataLayer` or network activity for denied paths, `403 consent_required` defense in
  depth, invalidated in-flight personalization, and no replay after opt-in.
- Integration tests exercise the local browser-to-GTM/RudderStack/mock-destination path, using
  deterministic contract doubles where container behavior is nondeterministic.
- CI hard-fails on duplicate event IDs, invalid schemas, missing properties, wrong event versions,
  unexpected PII, and event-catalogue count drift. CORS, CSP `connect-src`, and consent-leakage
  checks are automated.
- A repeatable manual GTM Preview/Tag Assistant walkthrough verifies default-denied consent,
  Klaro-to-GTM updates, tag firing and suppression, payloads, variables, destinations, and
  withdrawal behavior.
- Fast unit, type-check, lint, schema-diff, contract, and targeted Playwright gates run on every
  change; the full local-stack audit runs on pull requests or scheduled runs.
- An intentional-defect log is optional, non-blocking evidence documenting injected defects,
  catching tests, and before/after proof. Critical-path evidence includes CI results, schema diffs,
  Playwright traces or screenshots, consent-denial network logs, and a dated GTM walkthrough.
