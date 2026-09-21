# 03 — Local Compose stack + mock destinations + CSP/CORS + bootstrap/healthchecks

**What to build:** A developer can run `docker-compose up` and get the entire local martech
infrastructure — Postgres, RudderStack OSS, GTM tagging, GTM preview, and mock destinations — coming
up in a predictable, inspectable, health-gated way on reserved ports, with the Next.js app connecting
via env-driven localhost URLs. Security headers and origin rules are in place from the start, and the
docs are honest about what "local" does and does not mean. No personalization or forwarding logic yet
— this is the stage everything else runs on.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] `docker-compose up` starts `postgres`, `rudderstack` (static mounted `workspaceConfig.json`),
      `gtm-server` (tagging role, 8080), `gtm-preview` (preview role, 8081), and `mock-destinations`
      (Node/Express GA4/ads payload logger, 8090); the app runs on the host on 3000.
- [ ] Compose healthchecks gate startup so the app only talks to services that are actually ready.
- [ ] Named project volumes preserve Postgres/logs; a documented reset command removes only those
      volumes without harming unrelated data.
- [ ] Bootstrap initializes databases, migrations, fixtures, and configuration; audience
      recomputation remains an explicit, separate command.
- [ ] `.env.example`, per-environment GTM export JSON, and non-secret config are checked in; no
      credentials, secrets, or tokens are committed.
- [ ] Strict CSP (`default-src 'self'`, tightly allowlisted `connect-src`/`img-src`/`frame-src`) and
      a CORS policy allowing only the app origin, `GET, POST, OPTIONS`, and required headers; unknown
      paths return explicit 4xx.
- [ ] Production config path uses exact HTTPS origins, `Secure` cookies, no mock origin, and no
      preview runtime dependency.
- [ ] Mock destinations log received payloads so a developer can inspect what would be sent without
      contacting real vendors.
- [ ] Documentation states plainly that the GTM local runtime is not truly air-gapped because the
      image fetches published container configuration from Google.
