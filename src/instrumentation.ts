/**
 * Production server startup fails closed when the security config is missing
 * exact https origins. `next build` sets `NEXT_PHASE=phase-production-build`
 * and must still compile without those runtime origins present.
 */
export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NODE_ENV !== "production") return;

  const { resolveSecurityConfig } = await import("./lib/security/config");
  resolveSecurityConfig(process.env, true);
}
