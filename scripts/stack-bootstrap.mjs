import { spawnSync } from "node:child_process";

/**
 * Brings up the compose stack, waits for every healthcheck to pass, applies
 * Postgres migrations, and validates the checked-in content fixtures.
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

run("docker", ["compose", "up", "-d", "--wait"]);
run("npx", ["tsx", "scripts/stack-migrate.ts"]);
run("npm", ["run", "fixtures:validate"]);

console.log(
  "\nStack is up and bootstrapped. Run `npm run dev` to start the Next.js app.",
);
