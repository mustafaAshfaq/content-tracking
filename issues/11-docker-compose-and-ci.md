# Docker Compose topology + CI

Type: grilling
Status: closed
Blocked by: 04, 05

## Question

What is the local runtime topology and the CI pipeline?

- The `docker-compose.yml` service set and wiring: `gtm-server` (gtm-cloud-image), `rudderstack`
  (rudder-server), `postgres` (warehouse + RudderStack config DB), `mock-destinations`
  (Node/Express logging GA4/ads payloads), and how the Next.js app (`npm run dev`) connects to them.
- Ports, networks, env/config files, and startup ordering/health so `docker-compose up` +
  `npm run dev` yields a fully-offline working stack (informed by research 04 + 05).
- Where the audience-compute job / `/segments` API lives (Next.js route handler vs separate service).
- The **CI pipeline**: lint, typecheck, unit tests, Playwright E2E, build; what runs on PR vs main,
  and how the compose stack is (or isn't) exercised in CI.
- Environment/config strategy for dev vs the exported GTM dev/staging/prod containers.

## Decision

- Docker Compose owns `postgres`, `rudderstack`, `gtm-server`, a separate GTM preview-server
  role, and `mock-destinations`. Next.js runs on the host with `npm run dev` and connects through
  stable localhost ports and environment-driven URLs on the dedicated Compose network.
- One Postgres instance serves RudderStack state and the warehouse using isolated databases or
  schemas with explicit initialization and migrations. App-owned, idempotent SQL recomputation
  produces audience data, and `/segments/:userId` is a Next.js route handler that independently
  enforces consent.
- RudderStack uses committed static `workspaceConfig.json` and mounted configuration rather than
  deprecated Control Plane Lite. The spec explicitly states that the stack is local but not truly
  air-gapped because the GTM image fetches published configuration from Google.
- GTM tagging and preview roles use a pinned image version, with environment-specific
  `CONTAINER_CONFIG`, `PREVIEW_SERVER_URL`, and preview-role settings. Stable ports include
  Next.js `3000`, GTM tagging `8080`, a separate preview port, RudderStack's documented API port,
  Postgres `5432`, and a dedicated mock-destination port.
- Healthchecks gate startup in dependency order with bounded retries and visible failures.
  Bootstrap initializes databases, applies migrations, loads fixtures/config, and starts healthy
  services; audience recomputation remains an explicit repeatable command.
- Checked-in `.env.example` templates and per-environment GTM export/config directories define
  development, staging, and production. Secrets, credentials, container configs, and sensitive
  tokens remain excluded from source control.
- Pull requests run lint, typecheck, unit tests, schema generation/diff checks, the production
  build, and Playwright against an ephemeral Compose stack with mock destinations. Main or
  scheduled runs exercise heavier real-container checks and perform an explicit GTM/RudderStack
  configuration preflight; deterministic contract tests cover unavailable external services.
- Project-scoped named volumes persist Postgres and logs locally, with a documented clean-reset
  command. Structured service logs, health endpoints, surfaced startup failures, and inspectable
  mock payloads provide QA evidence.
