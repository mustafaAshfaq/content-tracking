import { afterEach, describe, expect, it } from "vitest";
import { register } from "./instrumentation";

const ENV_KEYS = [
  "NODE_ENV",
  "NEXT_PHASE",
  "APP_ORIGIN",
  "NEXT_PUBLIC_GTM_TAGGING_ORIGIN",
  "NEXT_PUBLIC_RUDDERSTACK_DATAPLANE_URL",
] as const;

const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function assignEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

afterEach(() => {
  for (const key of ENV_KEYS) assignEnv(key, original[key]);
});

describe("production startup security check", () => {
  it("skips the https-origin requirement while the production build is compiling", async () => {
    assignEnv("NODE_ENV", "production");
    assignEnv("NEXT_PHASE", "phase-production-build");
    assignEnv("APP_ORIGIN", undefined);
    await expect(register()).resolves.toBeUndefined();
  });

  it("fails server startup when production origins are missing", async () => {
    assignEnv("NODE_ENV", "production");
    assignEnv("NEXT_PHASE", undefined);
    assignEnv("APP_ORIGIN", undefined);
    assignEnv("NEXT_PUBLIC_GTM_TAGGING_ORIGIN", undefined);
    assignEnv("NEXT_PUBLIC_RUDDERSTACK_DATAPLANE_URL", undefined);
    await expect(register()).rejects.toThrow(/APP_ORIGIN/);
  });
});
