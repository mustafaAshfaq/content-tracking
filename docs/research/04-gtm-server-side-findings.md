# Findings: GTM server-side on localhost + multi-env config (ticket 04)

Resolved by `/research` subagent. Full answers below; sources at the bottom.

## Summary

The official image `gcr.io/cloud-tagging-10302018/gtm-cloud-image:stable` runs the **same
binary in two roles** selected by env vars: a **tagging server** (request entry point) and a
single **preview server** (debug). Runs locally via docker-compose with `docker run`-derived
config. **Key caveat for "fully offline":** authoring the container needs a free Google/GTM
account (web UI), and the running server is designed to fetch its *published* container version
from Google at runtime — so a truly air-gapped "zero Google contact at runtime" is **not a
supported mode**. Treat "local" as "runs on your own hardware without a GCP project/billing,"
not "no Google connectivity." No GCP project or billing is needed for the manual Docker path.

## 1. Running locally (env vars, roles, ports)

- **Preview server:** `CONTAINER_CONFIG` + `RUN_AS_PREVIEW_SERVER=true`. Deploy exactly ONE
  (no autoscaling); fronting proxy/CDN timeout must be **> 20s** or preview breaks.
- **Tagging server (SST):** `CONTAINER_CONFIG` + `PREVIEW_SERVER_URL` (HTTPS URL of the preview
  server). Entry point for all requests; proxies preview-flagged traffic to the preview server.
  Recommend ≤ 1 vCPU per instance.
- Default port **8080**, health at **`/healthy`** (returns 200). `PORT` overrides. Enumerate all
  settings via `docker run ...:stable server_bin.js --help`.

## 2. Google account & CONTAINER_CONFIG (author-time vs runtime)

- Authoring requires a free Google account + a **server-type** GTM container (Create Container →
  Server → "Manually provision tagging server").
- `CONTAINER_CONFIG` = the "Container Config" string from GTM → container ID → *Manually provision
  tagging server*. It's an opaque provisioning credential tying the running server to the container.
- GCP billing NOT required for the manual Docker path. Service-account creds only needed if tags
  use BigQuery/Firestore sandbox APIs (skip for this project).

## 3. Web container → server container transport (first-party)

- The server container receives **HTTP requests** (not JS); a **Client** inside it claims each
  request → event data → tags fire.
- Browser transport: set the GA4/gtag tag's `server_container_url` (transport_url) to the tagging
  server URL (locally e.g. `http://localhost:8080/<path>`); also set it in GTM Admin → Container
  Settings → Server container URL.
- First-party cookies need same-origin or subdomain; emulate locally with a reverse proxy
  (nginx/Caddy) or a `metrics.localhost` hosts entry in front of the compose service.
- **CSP:** allow the server container URL in `img-src`, `connect-src`, `frame-src` (feeds ticket 09
  / the fog "concrete CSP/CORS policy").

## 4. Multi-environment config + JSON export

- Two distinct concepts: the runtime `CONTAINER_CONFIG` string vs the **container export JSON**
  (full tags/triggers/variables) which is the artifact you **commit to version control**
  (Admin → Export Container → JSON; re-import via Admin → Import Container).
- Dev/staging/prod either as **one server container per environment** (own `CONTAINER_CONFIG`), or
  **one container + GTM Environments** (Admin → Environments) publishing versions to Dev/QA/Live.
- Note: the stock server loads the *published* version referenced by `CONTAINER_CONFIG`, NOT a
  local JSON file — the JSON export is authoring content, not a runtime loader.

## 5. Preview / Tag Assistant against localhost

- Set Server container URL to the local tagging URL, click Preview. Debugger shows incoming HTTP
  requests, which Client claimed them, tags fired/not-fired, variables, event data, console.
- Preview UI runs from tagmanager.google.com in the browser and reaches the preview server via the
  tagging-server proxy — works against localhost because the browser reaches both; needs the >20s
  timeout and an HTTPS `PREVIEW_SERVER_URL` (front the preview server with a local TLS proxy).

## 6. Offline caveats (2026)

Not air-gapped (see Summary); keep image updated (major bumps); exactly one preview server, ≤1
vCPU, >20s proxy timeout; BigQuery/Firestore tags won't work offline; proprietary image (Google
ToS, not FOSS). **Implication for the spec:** the GTM server-side piece demonstrates first-party
server tagging concepts but is not strictly offline — call this out as a known constraint, and
consider whether the mock-destinations + data-layer already prove the "server-side gateway"
concept if a reviewer requires zero external calls.

## Minimal compose snippet (derived from official `docker run`, not an official compose file)

```yaml
services:
  sgtm-preview:
    image: gcr.io/cloud-tagging-10302018/gtm-cloud-image:stable
    environment:
      CONTAINER_CONFIG: "<CONTAINER_CONFIG_STRING>"
      RUN_AS_PREVIEW_SERVER: "true"
      PORT: "8080"
    ports: ["8081:8080"]
  sgtm-server:
    image: gcr.io/cloud-tagging-10302018/gtm-cloud-image:stable
    environment:
      CONTAINER_CONFIG: "<CONTAINER_CONFIG_STRING>"
      PREVIEW_SERVER_URL: "http://sgtm-preview:8080"  # docs expect HTTPS; front with TLS proxy for real preview
      PORT: "8080"
    ports: ["8080:8080"]
    depends_on: ["sgtm-preview"]
```

## Open follow-ups (not blocking)

- Empirically verify runtime "phone-home" by running with egress blocked (only matters if strict
  offline is mandated).
- Confirm GTM ToS specifics for local/self-host use.

## Sources

1. Manually set up a tagging server (Docker) — https://developers.google.com/tag-platform/tag-manager/server-side/manual-setup-guide
2. Server-side tagging on App Engine — https://developers.google.com/tag-platform/tag-manager/server-side/app-engine-setup
3. Intro to server-side tagging — https://developers.google.com/tag-platform/tag-manager/server-side/intro
4. Send data to a server container — https://developers.google.com/tag-platform/tag-manager/server-side/send-data
5. Custom domain (first-party) — https://developers.google.com/tag-platform/tag-manager/server-side/custom-domain
6. Environments — https://support.google.com/tagmanager/answer/6311518
7. Container export/import — https://support.google.com/tagmanager/answer/6106997
8. Preview & debug server containers — https://developers.google.com/tag-platform/tag-manager/server-side/debug
9. Simo Ahava, server-side tagging overview — https://www.simoahava.com/analytics/server-side-tagging-google-tag-manager/
