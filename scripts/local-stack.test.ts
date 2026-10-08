import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Observes the local stack through its public configuration: the Compose
 * file, the host npm scripts, and the Dev Container definitions.
 */
function serviceBlocks(yaml: string): Map<string, string> {
  const blocks = new Map<string, string[]>();
  let inServices = false;
  let current: string | null = null;

  for (const line of yaml.split(/\r?\n/)) {
    if (line === "services:") {
      inServices = true;
      continue;
    }
    if (inServices && /^[a-z]/.test(line)) break;
    if (!inServices) continue;

    const header = line.match(/^  ([a-z0-9-]+):$/);
    if (header) {
      current = header[1];
      blocks.set(current, []);
      continue;
    }
    if (current) blocks.get(current)?.push(line);
  }

  return new Map([...blocks].map(([name, lines]) => [name, lines.join("\n")]));
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const compose = serviceBlocks(read("docker-compose.yml"));
const appCompose = serviceBlocks(read(".devcontainer/docker-compose.yml"));

describe("default Compose stack", () => {
  it("leaves GTM off unless the gtm profile is enabled, and still parses with an empty credential", () => {
    expect([...compose.keys()]).toEqual([
      "postgres",
      "rudderstack",
      "gtm-preview",
      "gtm-server",
      "mock-destinations",
    ]);

    for (const name of ["postgres", "rudderstack", "mock-destinations"]) {
      expect(compose.get(name)).not.toContain("profiles:");
    }

    for (const name of ["gtm-preview", "gtm-server"]) {
      const block = compose.get(name) ?? "";
      expect(block).toContain("profiles:");
      expect(block).toContain("- gtm");
      expect(block).toContain("${GTM_CONTAINER_CONFIG:-}");
      expect(block).not.toContain("${GTM_CONTAINER_CONFIG:?");
    }
  });

  it("keeps the published host ports", () => {
    expect(compose.get("postgres")).toContain('"5432:5432"');
    expect(compose.get("rudderstack")).toContain('"8082:8080"');
    expect(compose.get("gtm-server")).toContain('"8080:8080"');
    expect(compose.get("gtm-preview")).toContain('"8081:8080"');
    expect(compose.get("mock-destinations")).toContain('"8090:8090"');
  });
});

describe("Dev Container", () => {
  const devcontainer = JSON.parse(read(".devcontainer/devcontainer.json"));
  const withGtm = JSON.parse(read(".devcontainer/gtm/devcontainer.json"));
  const devcontainerFiles = [
    ".devcontainer/devcontainer.json",
    ".devcontainer/gtm/devcontainer.json",
    ".devcontainer/docker-compose.yml",
    ".devcontainer/Dockerfile",
    ".devcontainer/start-app.mjs",
  ];

  it("attaches to an app service on the Compose network without Docker-in-Docker or a Docker socket", () => {
    expect(devcontainer.service).toBe("app");
    expect(devcontainer.runServices).toEqual([
      "postgres",
      "rudderstack",
      "mock-destinations",
      "app",
    ]);
    expect(devcontainer.forwardPorts).toEqual([3000, 5432, 8080, 8081, 8082, 8090]);

    const app = appCompose.get("app") ?? "";
    expect(app).toContain("POSTGRES_HOST: postgres");
    expect(app).toContain('"3000:3000"');
    expect(app).not.toContain("NEXT_PUBLIC_");
    expect(app).not.toContain("network_mode:");
    expect(app).not.toMatch(/gtm-preview|gtm-server/);

    for (const file of devcontainerFiles) {
      const text = read(file).toLowerCase();
      expect(text).not.toContain("docker.sock");
      expect(text).not.toContain("docker-in-docker");
      expect(text).not.toContain("docker-outside-of-docker");
    }

    expect(read(".devcontainer/Dockerfile")).toMatch(/^FROM node:22/m);
  });

  it("offers a With GTM configuration that starts the GTM services", () => {
    expect(withGtm.name).toBe("With GTM");
    expect(withGtm.service).toBe("app");
    expect(withGtm.runServices).toEqual([
      "postgres",
      "rudderstack",
      "mock-destinations",
      "gtm-preview",
      "gtm-server",
      "app",
    ]);
  });
});

describe("host commands", () => {
  const pkg = JSON.parse(read("package.json")) as {
    scripts: Record<string, string>;
  };

  it("starts the stack without GTM, and opts in with stack:up:gtm", () => {
    expect(pkg.scripts["stack:up"]).toBe("docker compose up -d --wait");
    expect(pkg.scripts["stack:up:gtm"]).toBe(
      "docker compose --profile gtm up -d --wait",
    );
    expect(read("scripts/stack-bootstrap.mjs")).toContain(
      '["compose", "up", "-d", "--wait"]',
    );
    expect(read("scripts/stack-bootstrap.mjs")).not.toContain("--profile");
  });

  it("resets only the Postgres and RudderStack volumes", () => {
    const reset = read("scripts/stack-reset.mjs");
    expect(reset).toContain('"cpp_postgres_data"');
    expect(reset).toContain('"cpp_rudderstack_logs"');
    expect(reset).toContain('"--profile", "gtm"');
    expect(reset).not.toContain("volume rm -");
  });
});

describe("local docs", () => {
  const readme = read("docs/README.md");

  it("explains default startup, the GTM opt-in, and both Dev Container configurations", () => {
    expect(readme).toContain("npm run stack:up:gtm");
    expect(readme).toContain("With GTM");
    expect(readme).toContain("Manually provision tagging server");
    expect(readme).toContain("container-export.json");
    expect(readme).toMatch(/not the runtime credential|not that value|not `GTM_CONTAINER_CONFIG`/i);
  });
});

describe("docker compose config", () => {
  const docker = spawnSync("docker", ["compose", "version"], { encoding: "utf8" });
  const hasDocker = docker.status === 0;

  it.skipIf(!hasDocker)(
    "renders the default project when GTM_CONTAINER_CONFIG is empty and includes GTM only under the gtm profile",
    () => {
      const env = { ...process.env, GTM_CONTAINER_CONFIG: "" };
      const base = spawnSync(
        "docker",
        ["compose", "config", "--format", "json"],
        { encoding: "utf8", env },
      );
      expect(base.status).toBe(0);
      const baseServices = Object.keys(JSON.parse(base.stdout).services);
      expect(baseServices).toEqual(
        expect.arrayContaining(["postgres", "rudderstack", "mock-destinations"]),
      );
      expect(baseServices).not.toContain("gtm-preview");
      expect(baseServices).not.toContain("gtm-server");

      const optedIn = spawnSync(
        "docker",
        ["compose", "--profile", "gtm", "config", "--format", "json"],
        { encoding: "utf8", env },
      );
      expect(optedIn.status).toBe(0);
      const optedServices = JSON.parse(optedIn.stdout).services;
      expect(optedServices["gtm-preview"].environment.CONTAINER_CONFIG).toBe("");
      expect(optedServices["gtm-server"].environment.CONTAINER_CONFIG).toBe("");
    },
  );
});
