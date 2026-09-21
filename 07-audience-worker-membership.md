# 07 — Audience worker + `audience_membership`

**What to build:** The warehouse of `article_viewed` events turns into explainable audience
memberships, computed by a re-runnable worker rather than any cloud feature. A canonical known user
who has genuinely engaged with a category becomes a member of `engaged_<category>`, and a developer
can run the worker on demand and inspect the resulting snapshot in Postgres. This is the audience
brain; the activation API and personalized rendering (ticket 08) read what it writes.

**Blocked by:** 05, 06.

**Status:** ready-for-agent

- [ ] `engaged_<category>` membership requires a canonical known user to have viewed at least three
      **distinct** articles in that category within the trailing 30 days; repeated views of one article
      do not increase the count.
- [ ] Only validated `article_viewed` events whose event-time consent snapshot has
      `personalisation=true` qualify; anonymous-only activity never creates membership.
- [ ] Alias edges are resolved so a user's anonymous and known activity count toward the same canonical
      identity.
- [ ] A Node worker/CLI runs every five minutes and also supports on-demand recomputation; it takes a
      Postgres advisory lock, computes a complete snapshot, and atomically replaces `audience_membership`.
- [ ] `audience_membership` stores segment version, computed/effective/expiry timestamps, and membership
      source so activations are explainable and expirable.
- [ ] On failure the worker preserves the last complete snapshot and exposes health/error state.
- [ ] Tests assert the ≥3-distinct-article / 30-day / `personalisation=true` rule and the atomic
      snapshot replacement against fixture data.
