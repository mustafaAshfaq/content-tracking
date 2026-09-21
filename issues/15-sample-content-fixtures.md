# Sample content and category fixtures

Type: grilling
Status: closed
Blocked by: 01, 06, 13

## Question

What concrete sample articles and products ship in the offline demo fixture set?

- Confirm the exact four categories: `travel`, `finance`, `health`, and `technology`.
- Choose the article titles/slugs/content IDs and ensure at least three distinct articles per
  category for audience computation.
- Choose product IDs, names, category tags, editorial ranks, and the static Popular products list.
- Define the fixture versions and the deterministic mapping from `engaged_<category>` segments to
  products.
- Ensure the fixture set supports the recommendation module, attribution, and experiment tests
  without requiring a CMS or database seed.

## Decision

- The taxonomy is exactly `travel`, `finance`, `health`, and `technology`. Every article and
  product belongs to exactly one category.
- Fixture version 1 ships twelve MDX articles, three per category:
  - Travel: `packing-light`, `rail-itineraries`, `local-weekends`
  - Finance: `building-an-emergency-fund`, `index-funds-explained`, `understanding-credit`
  - Health: `sleep-routines`, `strength-basics`, `meal-prep`
  - Technology: `privacy-by-design`, `calmer-notifications`, `local-first-tools`
- Article IDs are stable namespaced values such as `article_travel_packing_light`. Each article
  carries `content_version: 1`, its single category, stable slug/title metadata, and checked-in
  MDX content.
- Fixture version 1 also ships twelve checked-in products, three per category:
  - Travel: `carry_on_organizer`, `city_guide_notebook`, `compact_daypack`
  - Finance: `budget_planner`, `index_fund_fieldbook`, `credit_tracker`
  - Health: `sleep_mask`, `mobility_band`, `meal_prep_kit`
  - Technology: `focus_timer`, `notification_lamp`, `local_backup_drive`
- Products carry stable IDs, names, `product_version: 1`, exactly one category, image references,
  destination URLs, and deterministic editorial ranks. `engaged_<category>` maps only to products
  in that category, sorted by editorial rank.
- The static `Popular right now` fallback is always, in order, `compact_daypack`,
  `budget_planner`, and `focus_timer`. It is used for denied, unknown, empty, expired, timeout,
  and error states.
- Segment records use `segment_version: 1`. No CMS or database seed is required; MDX and
  JSON/TypeScript fixtures are the checked-in sources of truth.
- CI validates unique IDs, allowed single categories, complete metadata, stable versions,
  deterministic editorial ordering, exact segment mappings, and the fallback list.
