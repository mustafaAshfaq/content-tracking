---
status: accepted
---

# Dev Container joins the Compose network

Local development runs the Next.js app on the host and the martech stack in Compose, with the app reaching services through localhost. A Dev Container cannot use that contract, because `localhost` inside the container is the container itself. The Dev Container is therefore a Compose service on the same network as Postgres, RudderStack, GTM, and the mock destinations: the app process uses Compose service names, the browser stays on the host and uses published ports, and host `npm run dev` remains for anyone not in the container.

## Considered options

- A Node-only Dev Container, with Compose left on the host. Rejected because the app would not be on the Compose network.
- Docker-in-Docker, or mounting the host Docker socket so `npm run stack:up` runs inside the container. Rejected because this repo already depends on host-published ports and named volumes.
- Starting GTM whenever the stack starts. Rejected because startup must succeed with no Google container-config credential.

## Consequences

- The editor starts the Compose project and attaches to the app service. It does not run a nested Docker daemon and it does not mount the Docker socket. `npm run stack:up` stays a host command.
- Default stack startup does not create the GTM tagging or preview services. A Compose profile named `gtm`, a host command that enables it, and a second Dev Container configuration named "With GTM" are the opt-in. `GTM_CONTAINER_CONFIG` is the Container Config string from the user's own server container and is never committed.
- Server-side connection settings inside the Dev Container use Compose service names. Browser-facing origins stay on the published host ports in both the container and the host workflow, because the browser is always on the host.
- Opting into GTM still requires outbound access to Google. The image fetches its published container at runtime.
