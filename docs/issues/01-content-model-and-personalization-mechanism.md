# Content model & personalization mechanism

Type: grilling
Status: resolved
Blocked by: —

## Question

What is the content and how/where is personalization applied?

- What content does the site serve — articles only, or articles **and** product recommendations?
  How are they sourced (in-repo MDX/JSON mock vs a local headless CMS)? Note the doc implies mock.
- What is the content/category taxonomy shape (categories, tags) that audience rules will key off?
- **Where does personalization happen** — server-rendered (SSR/RSC using a cookie-carried
  segment), client-side after hydration, or edge middleware? This is the pivotal decision: it
  dictates how the `/segments/:userId` activation result reaches the render, cache/ISR behaviour,
  and whether personalized content can leak before consent.
- What is the fallback (default) experience for an unsegmented / consent-denied visitor?

Resolving this graduates the "recommended for you" module UX prototype from the map's fog.

## Answer

**Content model — articles + product recommendations, in-repo mock:**
- **Articles** are the site's content: authored as **MDX/Markdown files in the repo**. They are the
  browsing surface that generates `article_viewed` signals.
- **Products** are the **personalized surface**: a **"Recommended products for you"** module. Products
  are an **in-repo JSON/TS fixture** (no CMS, no DB seed) — simplest and fully offline.
- No headless CMS and no DB-sourced content — keeps the stack offline and the demo focused on
  tracking/personalization, not content authoring.

**Taxonomy — shared, small, single-category:**
- A **fixed set of ~4–6 top-level categories** (e.g. keep it to a handful like `travel`, `food`,
  `tech`, `lifestyle` — exact names finalized with the sample content set, see fog below).
- **Each article belongs to exactly one category.** **Products are tagged with the same categories.**
- This makes the audience rule "**visited 3+ articles in category X**" trivial to compute (ticket 06)
  and gives a direct category→product mapping for the recommendation module.

**Personalization mechanism — HYBRID (the pivotal decision):**
- **Articles are static / ISR** (cacheable, not personalized) — clean cache story, no per-user SSR.
- **The "Recommended products" module is CLIENT-SIDE**, rendered after hydration, and only calls the
  `/segments/:userId` (or `/segments/:anonymousId`) activation API **after Personalisation consent is
  granted**. No personalized data ever touches SSR, so nothing personalized can leak before consent.
- Rationale over full-SSR: simplest consent gating, no per-segment cache keys, keeps static/ISR
  articles. Rationale over edge-middleware: fewer moving parts (segment/variant cookie assignment can
  still be decided in tickets 03/07 without requiring edge middleware).

**Fallback (unsegmented / consent-denied):**
- Show a **non-personalized default module in the same slot** — "**Popular products**" / editor's picks
  (a static curated list). The `/segments` API is **never called** without Personalisation consent.
- So the slot is always filled (no empty/CLS gap); personalization is a progressive enhancement layered
  on top of the default when consent + segment are present.

**Consequences carried forward:**
- Ticket 02 (events): `article_viewed` must carry the article's single `category`;
  `recommendation_clicked` must carry product id + the category/segment that surfaced it, and whether
  the shown module was `personalized` vs `default` (for attribution).
- Ticket 06 (audience/activation): activation is a **client fetch to `/segments/...`**, gated by consent;
  audience rule keys on `article_viewed.category`. Response maps segment → product category(ies).
- Ticket 09 (consent): the client-side `/segments` call and the personalized module are gated behind
  **Personalisation**; default module is the always-allowed fallback.
- Ticket 07 (A/B): variant assignment is an independent axis; the experiment can vary the module
  (personalized layout/copy) but assignment itself doesn't require SSR.
- **Fog graduated:** the "recommended for you" module UX prototype is now specifiable (see new ticket 13).
- **Fog updated:** the "sample content set & category taxonomy" fog is now half-decided (single-category,
  4–6 categories) — remaining open part is the *concrete* category names + sample articles/products,
  which finalizes alongside ticket 06's audience rule.
