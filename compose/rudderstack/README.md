# RudderStack local workspace config

`workspaceConfig.json` is the **static, checked-in** RudderStack workspace this
project mounts into `rudder-server`. It is loaded by the `rudderstack` service in
[`docker-compose.yml`](../../docker-compose.yml) via:

```yaml
RSERVER_BACKEND_CONFIG_CONFIG_FROM_FILE: "true"
RSERVER_BACKEND_CONFIG_CONFIG_JSONPATH: /etc/rudderstack/workspaceConfig.json
```

## Why a static file

RudderStack OSS is **data-plane only**. Its self-hosted control plane
("Control Plane Lite") is deprecated, and Reverse-ETL / Audiences / Tracking
Plans are Cloud-only. For a fully local, offline-friendly build we therefore
mount a hand-authored workspace config instead of fetching one from the hosted
control plane. This is the RudderStack analogue of the GTM "not truly
air-gapped" caveat — see
[`docs/research/05-rudderstack-oss-findings.md`](../../docs/research/05-rudderstack-oss-findings.md).

## What's in it

- **One HTTP source** with a placeholder `writeKey`
  (`LOCAL_DEV_WRITE_KEY_PLACEHOLDER`). It must match `RUDDERSTACK_WRITE_KEY` in
  your `.env` (copied from [`.env.example`](../../.env.example)).
- **No destinations.** This build slice is ingestion-only — RudderStack accepts
  events but forwards nothing yet. A warehouse/mock destination is wired up in a
  later slice, at which point `rudder-transformer` is added to the stack.

## Not a secret

The write key here is a non-secret local placeholder. Never replace it with a
real Cloud write key or commit any real credential — see the repo `.gitignore`
and `.env.example`.
