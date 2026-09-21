# 02 — Article site + fixtures + fallback recommendation module

**What to build:** A reader can browse a fast, cacheable article site built entirely from
checked-in content, and see an inline "Recommended products" module that — with no consent and no
personalization yet — always shows a truthful `Popular right now` fallback. The article response
carries no personalized payload; the module renders client-side after hydration and never leaks
anything about the visitor. Reading an article and clicking a product emit their events through the
`trackEvent()` boundary from ticket 01.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] Articles are checked-in MDX; products are a checked-in JSON/TypeScript fixture — no CMS or DB
      seed. Taxonomy is exactly `travel`, `finance`, `health`, `technology`, with exactly one
      category per item.
- [ ] Fixture v1 has three articles and three products per category with stable namespaced IDs
      (e.g. `article_travel_packing_light`), `content_version: 1` / `product_version: 1`, editorial
      ranks, image references, and destination URLs.
- [ ] `engaged_<category>` maps only to that category's products sorted by editorial rank; the fixed
      fallback list, in order, is `compact_daypack`, `budget_planner`, `focus_timer`.
- [ ] CI validates fixtures: IDs, metadata, versions, ordering, category→product mappings, fallback
      contents, and duplicate-ID rejection.
- [ ] Article routes are static/ISR, cacheable, and contain no personalized payload in the server
      response.
- [ ] The recommendation module renders after hydration, inserted after the article introduction, as
      a card grid: three products on desktop, one column on narrow screens, with reserved geometry
      across loading/success/fallback so the layout never jumps.
- [ ] With no consent/segment, the module shows the `Popular right now` fallback; every non-success
      state (empty, expired, denied, unknown, timeout, error) renders the static fallback list with a
      concise note.
- [ ] Cards show image, name, category, and a `View product` action.
- [ ] `article_viewed` (carrying the article's single category) and `recommendation_clicked`
      (carrying product/recommendation identity, module ID, position, impression ID, and a
      personalized-vs-default flag) are emitted via `trackEvent()`.
- [ ] Segment rules and sensitive traits are never present in the UI or payloads.
