# PROTOTYPE: "Recommended products for you" module UX & behaviour

Type: prototype
Status: closed
Blocked by: —

## Question

What does the personalized recommendation module look like and how does it behave?

Graduated from ticket 01 (mechanism decided: client-side module, consent-gated, default-fallback).
Make a cheap concrete artifact (outline/stub/UI code via `/prototype`) to react to. Pin down:

- **Layout** of the "Recommended products for you" module (card grid? carousel? how many items?)
  and where it sits relative to the article content.
- **States**: (a) default/fallback "Popular products" (no consent/segment), (b) loading while
  `/segments` resolves, (c) personalized result, (d) empty (segment known but no products),
  (e) error. Avoid layout shift (CLS) between states — the slot is always filled per ticket 01.
- **Click affordances**: what a product card shows and what `recommendation_clicked` captures on
  click (ties to ticket 02) — including whether the shown module was `personalized` vs `default`.
- **Personalized vs default distinction** visible to the user? (e.g. a "Recommended for you" vs
  "Popular right now" heading) — decide, since it affects perceived personalization.

References (not blockers): ticket 06 for the activation response shape, ticket 07 if an A/B
experiment varies this module. Link the prototype artifact from this ticket.

Prototype: [prototype-recommendation-module.html](../prototype-recommendation-module.html)

## Decision

- Use the **A — Card grid** structure. The module is inline in the article flow after the
  introduction, not a sidebar.
- Show three products on desktop and collapse to one column on narrow screens. Reserve stable
  module geometry across fallback, loading, personalized, empty, and error states to prevent CLS.
- Loading uses the final three-card geometry with skeleton or reserved placeholders. Empty, expired,
  timeout, and error outcomes show the static Popular products list with a concise explanatory
  note; the slot is never empty.
- The fallback heading is `Popular right now`. Only a successful authorized activation with at
  least one current membership changes the heading to `Recommended for you` and exposes the
  human-readable category context. Denied, unknown, empty, expired, timeout, and error outcomes
  remain truthful fallback states.
- Each card shows an image, product name, category, and `View product` affordance. A click emits
  `recommendation_clicked` with recommendation/product identity, module ID, position, impression
  ID, and personalized-versus-default context.
- The UI exposes minimal human-readable recommendation context only; it does not reveal segment
  rules or sensitive audience traits.
