/**
 * Audience recomputation is intentionally NOT part of `npm run stack:bootstrap`
 * — the platform decision is that it stays an explicit, separate command so
 * a developer (or a scheduled job, later) chooses when to recompute.
 *
 * This is a placeholder: audience compute (the `engaged_<category>` rule,
 * the Postgres materialization, and this command's real implementation)
 * lands in a later build slice, not this one. Running it today fails loudly
 * rather than silently pretending to do work.
 */
console.error(
  "Audience recomputation is not implemented yet in this build slice. " +
    "See .scratch/content-personalization-platform/issues/06-audience-compute-and-activation.md " +
    "for the design this command will eventually implement.",
);
process.exit(1);
