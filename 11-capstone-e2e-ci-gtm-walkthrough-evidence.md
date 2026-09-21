# 11 — Capstone: e2e Playwright lifecycle + CI tiers + GTM walkthrough + evidence

**What to build:** The whole platform is locked down as a trustworthy, auditable artifact. A single
Playwright suite drives the entire lifecycle through the real UI against the ephemeral Compose stack
and asserts the exact, consent-correct behavior the spec promises; CI runs the right depth of checks
for the risk of each change; and a repeatable, dated manual GTM walkthrough plus preserved evidence
back the quality claims.

**Blocked by:** 10.

**Status:** ready-for-agent

- [ ] Playwright end-to-end runs against the ephemeral Compose stack with mocks and drives the full
      consent → engagement → activation → exposure → conversion lifecycle through the real UI.
- [ ] The suite asserts exact route-lifecycle `page_view` counts with no duplicate SPA emissions,
      exactly-once experiment exposure, and truthful fallback-vs-personalized rendering across all module
      states.
- [ ] It asserts consent grant/denial/withdrawal effects (collection stops, in-flight responses
      invalidated, fallback restored, no replay) and CORS/CSP rejection of wildcard/unintended hosts and
      consent leakage.
- [ ] CI is tiered: every change runs lint, typecheck, unit tests, schema generation/diff checks,
      contract tests, fixture validation, and the production build; pull requests run targeted Playwright
      against an ephemeral Compose stack with mocks; main/scheduled runs perform heavier real-container
      preflight and local-stack audits.
- [ ] A repeatable GTM Preview / Tag Assistant walkthrough with dated evidence is documented and
      followed.
- [ ] Critical-path evidence is preserved: CI results, schema diffs, Playwright traces/screenshots,
      consent-denial network logs, and GTM walkthrough output.
