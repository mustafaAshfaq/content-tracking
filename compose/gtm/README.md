# GTM per-environment container exports

`{development,staging,production}/container-export.json` are GTM **container
exports** — the authoring content of a server-side container (tags, triggers,
variables) as produced by *GTM UI → Admin → Export Container*. They are
non-secret and checked in so each environment's tagging config is versioned
alongside the code.

These are **placeholders** for this build slice: the server-side container has
no tags/triggers/variables yet, so each export is an empty container that only
records its name, `server` usage context, and a placeholder public ID. Real
authoring content is added in later slices.

## Not the same as `GTM_CONTAINER_CONFIG`

Do not confuse these files with the `GTM_CONTAINER_CONFIG` value in `.env`:

| | container-export.json | `GTM_CONTAINER_CONFIG` |
| --- | --- | --- |
| What | Authoring content (tags/triggers/variables) | Opaque runtime provisioning string |
| Source | GTM UI → Export Container | GTM → "Manually provision tagging server" |
| Secret? | No — checked in | **Yes** — never committed |
| Consumed by | Humans / future automation | The `gtm-server` + `gtm-preview` containers at runtime |

The runtime containers are provisioned from `GTM_CONTAINER_CONFIG`, which fetches
the published container from Google — which is why the local GTM stack is **not
truly air-gapped** (see the repo `README.md` and
`docs/research/04-gtm-server-side-findings.md`).
