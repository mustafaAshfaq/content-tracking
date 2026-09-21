# Content Personalization Platform (local)

A local article site (Next.js App Router + TypeScript + React) with a typed,
schema-validated `trackEvent()` data-layer boundary, checked-in MDX
articles/product fixtures, and a client-rendered "Recommended products"
module. See `.scratch/content-personalization-platform/FINAL-HANDOFF-SPEC.md`
for the full implementation contract this repo is building toward; this
README covers what's implemented so far and how to run it.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No local stack is
required just to browse the article site — the data-layer boundary works
standalone; the Compose stack below is for the martech infrastructure
(Postgres/RudderStack/GTM/mocks) that later slices forward events into.

## Scripts

| Script                         | What it does                                                        |
| ------------------------------ | --------------------------------------------------------------------- |
| `npm run dev`                  | Next.js dev server on `:3000`                                         |
| `npm run build` / `start`      | Production build / serve                                              |
| `npm run lint`                 | ESLint                                                                 |
| `npm run typecheck`            | `tsc --noEmit`                                                        |
| `npm run test`                 | Vitest unit tests                                                      |
| `npm run schema:generate`      | Regenerates `schemas/event-catalogue.schema.json` from the zod schemas |
| `npm run schema:check`         | Fails if the generated schema is out of date (CI drift check)         |
| `npm run fixtures:validate`    | Validates the article/product fixtures (IDs, versions, mappings, fallback list) |
| `npm run stack:up` / `down`    | `docker compose up -d --wait` / `down`                                 |
| `npm run stack:bootstrap`      | Brings the stack up, applies Postgres migrations, validates fixtures  |
| `npm run stack:migrate`        | Re-applies `compose/postgres/init/*.sql` against an existing volume   |
| `npm run stack:reset`          | Removes only this project's named Docker volumes                      |
| `npm run stack:recompute-audiences` | Placeholder — audience compute is a later build slice            |

## The typed data-layer boundary

`src/lib/tracking/` is the only way an event reaches `window.dataLayer`.
`trackEvent({ name, properties, correlation_id?, identity? })`:

1. Validates `properties` against that event's zod schema — required fields,
   closed enums, and **no unknown properties** — for every event in the v1
   catalogue (`page_view`, `article_viewed`, `recommendation_clicked`,
   `experiment_exposed`, `signup_completed`, `consent_updated`,
   `segment_activated`).
2. Stamps implementation-owned envelope metadata: a UUIDv4 `event_id`,
   `event_version`, an ISO-8601 UTC `timestamp`, `environment`, and `source`.
3. Attaches a consent snapshot (`necessary`, `analytics`, `marketing`,
   `personalisation`, `policy_version`, `captured_at`).
4. Purpose-gates the event against that snapshot; anything blocked or
   invalid returns an explicit `{ status: "blocked" | "rejected", ... }`
   result and **never** reaches `dataLayer`.

The JSON Schema in `schemas/event-catalogue.schema.json` is generated from
these same zod schemas (`npm run schema:generate`); CI fails if it drifts
from the source (`npm run schema:check`).

`page_view` is emitted once per committed, normalized route
(`(route_id, canonical_path, allowlisted query)`), not once per framework
navigation callback — see `src/lib/tracking/page-view-tracker.tsx`.

## Content and the recommendation module

Articles (`src/content/articles/*.mdx`) and products
(`src/content/products.ts`) are checked-in fixtures — no CMS, no database
seed. The taxonomy is exactly `travel`, `finance`, `health`, `technology`;
every article/product has exactly one category. Article routes
(`/articles/[slug]`) are static/ISR (`revalidate = 3600`) and never carry a
personalized payload in the server response.

The inline "Recommended products" module (`src/components/recommendations/`)
renders after hydration as a three-card grid (one column on narrow screens)
with reserved geometry across loading/fallback/success states. With no
consent (the only reachable state in this build slice, since there's no
consent UI or audience-activation backend yet), it always shows the truthful
static **"Popular right now"** fallback: `compact_daypack`, `budget_planner`,
`focus_timer`, in that order. `npm run fixtures:validate` enforces the
fixture's IDs, versions, per-category counts, editorial-rank ordering, and
fallback list in CI.

## Local martech stack (Docker Compose)

```bash
cp .env.example .env   # then fill in real local values
npm run stack:bootstrap
```

`docker-compose.yml` runs:

| Service             | Port   | Purpose                                                |
| -------------------- | ------ | ------------------------------------------------------- |
| `postgres`            | 5432   | RudderStack state + app warehouse (isolated schemas)     |
| `rudderstack`         | 8082   | RudderStack OSS ingestion (static `workspaceConfig.json`) |
| `gtm-server`          | 8080   | GTM server-side tagging role                             |
| `gtm-preview`         | 8081   | GTM server-side preview role (dev-only dependency)       |
| `mock-destinations`   | 8090   | Node/Express logger standing in for GA4/ads (dev-only)   |

The Next.js app itself runs on the host (`npm run dev`, port `3000`) and
talks to these services through the env-driven localhost URLs in `.env`.
Compose healthchecks gate startup so nothing depends on a service before
it's actually ready. `cpp_postgres_data` and `cpp_rudderstack_logs` are named
project volumes; `npm run stack:reset` removes exactly those two and nothing
else on your machine.

**This local stack is not truly air-gapped.** The GTM server-side image
fetches its published container configuration from Google at runtime, and
authoring a container at all requires a (free) Google account — see
`.scratch/content-personalization-platform/research/04-gtm-server-side-findings.md`.
Treat "local" as "runs on your own hardware, no GCP project/billing needed,"
not "zero external network contact."

### Configuration

- `.env.example` documents every variable; `.env` is git-ignored. Nothing in
  source control is a real credential/token/container-config secret.
- `compose/rudderstack/workspaceConfig.json` is the static, checked-in
  RudderStack workspace (source + write key placeholder; RudderStack OSS's
  self-hosted control plane, "Control Plane Lite," is deprecated).
- `compose/gtm/{development,staging,production}/container-export.json` are
  per-environment **container exports** (authoring content — tags/triggers/
  variables) — checked in and non-secret. This is distinct from
  `GTM_CONTAINER_CONFIG` in `.env`, which is an opaque runtime provisioning
  string tied to a real container and must never be committed.

### Production differences

Production uses exact HTTPS origins (`APP_ORIGIN` etc.), `Secure` cookies,
no `mock-destinations` origin, and no runtime dependency on GTM Preview or
Tag Assistant — see `src/lib/security/csp.ts`, which computes a stricter
policy whenever `NODE_ENV=production`.

## CSP / CORS

`src/proxy.ts` (Next.js 16's renamed `middleware.ts`) applies:

- A `Content-Security-Policy` header to every response
  (`src/lib/security/csp.ts`): `default-src 'self'`; `connect-src` allows
  only the app, GTM tagging, and RudderStack origins (plus
  `mock-destinations` outside production); `frame-src` allows only `'self'`
  (plus GTM Preview and `https://tagassistant.google.com` outside
  production).
- CORS on every `/api/*` route (`src/lib/security/cors.ts`): only
  `http://localhost:3000` (or the configured `APP_ORIGIN`) is allowed, with
  `GET, POST, OPTIONS` and `Content-Type, Authorization, X-Write-Key`
  headers. Preflight (`OPTIONS`) requests are answered directly.

Any `/api/*` path that isn't explicitly defined returns a `404` from the
catch-all route handler (`src/app/api/[...catchAll]/route.ts`) — the app is
never an open proxy. `services/mock-destinations` enforces the same origin
allowlist and 404s any path other than its documented
`/health`, `/ga4/collect`, and `/ads/conversion` endpoints.

## CI

`.github/workflows/ci.yml` runs lint, typecheck, unit tests, fixture
validation, the JSON-Schema drift check, and the production build on every
pull request and on `main`.
