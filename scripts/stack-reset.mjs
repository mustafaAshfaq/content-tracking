import { spawnSync } from "node:child_process";

/**
 * Removes only this project's named volumes (`cpp_postgres_data`,
 * `cpp_rudderstack_logs`) — never unrelated Docker state. Safe to re-run;
 * next `npm run stack:bootstrap` recreates a clean stack.
 */
function run(command, args) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  return spawnSync(command, args, { stdio: "inherit", shell: true });
}

run("docker", ["compose", "down"]);

const volumes = ["cpp_postgres_data", "cpp_rudderstack_logs"];
for (const volume of volumes) {
  const result = run("docker", ["volume", "rm", volume]);
  if (result.status !== 0) {
    console.warn(`Volume "${volume}" was not removed (it may not exist yet).`);
  }
}

console.log("\nStack reset. Run `npm run stack:bootstrap` to start fresh.");
