import { spawn } from "node:child_process";

// Detach so the Dev Container finish step is not blocked on the dev server.
const child = spawn(
  "npm",
  ["run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"],
  {
    cwd: "/workspace",
    detached: true,
    stdio: "ignore",
  },
);
child.unref();
