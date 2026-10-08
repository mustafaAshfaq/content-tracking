import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * Brings up the compose stack without the GTM profile, waits for every
 * healthcheck to pass, applies Postgres migrations, and validates the
 * checked-in content fixtures.
 * Audience recomputation is deliberately NOT run here — see
 * `scripts/recompute-audiences.ts`.
 */
function run(command, args) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`Command failed: ${command} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

const requiredFiles = [
  ".env",
  "compose/postgres/init/001_schemas.sql",
  "compose/rudderstack/workspaceConfig.json",
  "compose/gtm/development/container-export.json",
  "compose/gtm/staging/container-export.json",
  "compose/gtm/production/container-export.json",
];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    console.error(
      `Missing ${file}. Copy .env.example to .env before bootstrap, and keep the checked-in compose config in place.`,
    );
    process.exit(1);
  }
}

run("docker", ["compose", "up", "-d", "--wait"]);
run("npx", ["tsx", "scripts/stack-migrate.ts"]);
run("npm", ["run", "fixtures:validate"]);

console.log(
  "\nStack is up and bootstrapped without GTM. Run `npm run dev` to start the Next.js app. To opt into GTM, paste your Container Config into .env and run `npm run stack:up:gtm`.",
);
