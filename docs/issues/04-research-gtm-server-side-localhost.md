# RESEARCH: GTM server-side on localhost + multi-env config

Type: research
Status: resolved
Blocked by: —

## Question

How do we actually run and configure GTM server-side locally for first-party tagging? (external knowledge)

- How to run `gcr.io/cloud-tagging-10302018/gtm-cloud-image` in docker-compose on `localhost`:
  required environment (container config string / `CONTAINER_CONFIG`, preview server URL, ports),
  and whether a free GTM account is needed only to author config vs required at runtime.
- How the web container `dataLayer` pushes reach the server container as a first-party tagging
  endpoint (e.g. `localhost:8080/gtm`), and what a reverse-proxy/first-party subdomain setup needs.
- How multi-environment config (dev/staging/prod) is expressed via GTM workspaces/versions and
  **exported to a repo as JSON** for commit.
- How GTM Preview / Tag Assistant work against `localhost` for debugging.
- Any current (2026) caveats, deprecations, or gotchas for the cloud image running offline.

Resolve via a `/research` subagent; store findings under `research/` and cite sources here.

## Answer

Full findings: [research/04-gtm-server-side-findings.md](../research/04-gtm-server-side-findings.md).

Key decisions this unblocks:
- Same image `gcr.io/cloud-tagging-10302018/gtm-cloud-image:stable` runs two roles: **tagging
  server** (`CONTAINER_CONFIG` + `PREVIEW_SERVER_URL`) and a single **preview server**
  (`CONTAINER_CONFIG` + `RUN_AS_PREVIEW_SERVER=true`). Port 8080, health `/healthy`.
- Authoring needs a free Google/GTM server container; `CONTAINER_CONFIG` comes from GTM →
  container ID → "Manually provision tagging server". No GCP billing for the manual Docker path.
- Browser → server via GA4/gtag `server_container_url` pointed at the tagging server
  (`localhost:8080/<path>`); first-party cookies need a subdomain/reverse-proxy locally.
- Multi-env: commit the **container export JSON** (Admin → Export Container) to the repo; run
  either one server container per env or GTM Environments (Dev/QA/Live).
- **Important constraint:** NOT truly air-gapped — the running server fetches its published
  container from Google, and Preview/Tag Assistant run via tagmanager.google.com. "Local" =
  "own hardware, no GCP project," not "zero Google connectivity." Feeds ticket 11 (compose) and
  is a known limitation the final spec must state; ticket 09 consumes the CSP directives.
