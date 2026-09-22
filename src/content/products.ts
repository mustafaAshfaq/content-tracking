import type { ContentCategory } from "@/lib/tracking";

export interface Product {
  /** Stable, bare fixture ID (e.g. `compact_daypack`) — no CMS/DB seed. */
  id: string;
  name: string;
  category: ContentCategory;
  /** 1 = top editorial pick within its category. */
  editorial_rank: number;
  product_version: 1;
  image: string;
  destination_url: string;
}

/**
 * Fixture v1 — three checked-in products per category. This file (plus
 * `src/content/article-manifest.ts`) is the versioned source of truth for
 * the demo content; there is no CMS or database seed. CI validates this
 * fixture via `npm run fixtures:validate`.
 */
export const PRODUCTS: Product[] = [
  // travel
  {
    id: "carry_on_organizer",
    name: "Carry-on Organizer",
    category: "travel",
    editorial_rank: 1,
    product_version: 1,
    image: "/products/carry_on_organizer.svg",
    destination_url: "https://shop.example.test/products/carry-on-organizer",
  },
  {
    id: "city_guide_notebook",
    name: "City Guide Notebook",
    category: "travel",
    editorial_rank: 2,
    product_version: 1,
    image: "/products/city_guide_notebook.svg",
    destination_url: "https://shop.example.test/products/city-guide-notebook",
  },
  {
    id: "compact_daypack",
    name: "Compact Daypack",
    category: "travel",
    editorial_rank: 3,
    product_version: 1,
    image: "/products/compact_daypack.svg",
    destination_url: "https://shop.example.test/products/compact-daypack",
  },
  // finance
  {
    id: "budget_planner",
    name: "Budget Planner",
    category: "finance",
    editorial_rank: 1,
    product_version: 1,
    image: "/products/budget_planner.svg",
    destination_url: "https://shop.example.test/products/budget-planner",
  },
  {
    id: "index_fund_fieldbook",
    name: "Index Fund Fieldbook",
    category: "finance",
    editorial_rank: 2,
    product_version: 1,
    image: "/products/index_fund_fieldbook.svg",
    destination_url: "https://shop.example.test/products/index-fund-fieldbook",
  },
  {
    id: "credit_tracker",
    name: "Credit Tracker",
    category: "finance",
    editorial_rank: 3,
    product_version: 1,
    image: "/products/credit_tracker.svg",
    destination_url: "https://shop.example.test/products/credit-tracker",
  },
  // health
  {
    id: "sleep_mask",
    name: "Sleep Mask",
    category: "health",
    editorial_rank: 1,
    product_version: 1,
    image: "/products/sleep_mask.svg",
    destination_url: "https://shop.example.test/products/sleep-mask",
  },
  {
    id: "mobility_band",
    name: "Mobility Band",
    category: "health",
    editorial_rank: 2,
    product_version: 1,
    image: "/products/mobility_band.svg",
    destination_url: "https://shop.example.test/products/mobility-band",
  },
  {
    id: "meal_prep_kit",
    name: "Meal Prep Kit",
    category: "health",
    editorial_rank: 3,
    product_version: 1,
    image: "/products/meal_prep_kit.svg",
    destination_url: "https://shop.example.test/products/meal-prep-kit",
  },
  // technology
  {
    id: "focus_timer",
    name: "Focus Timer",
    category: "technology",
    editorial_rank: 1,
    product_version: 1,
    image: "/products/focus_timer.svg",
    destination_url: "https://shop.example.test/products/focus-timer",
  },
  {
    id: "notification_lamp",
    name: "Notification Lamp",
    category: "technology",
    editorial_rank: 2,
    product_version: 1,
    image: "/products/notification_lamp.svg",
    destination_url: "https://shop.example.test/products/notification-lamp",
  },
  {
    id: "local_backup_drive",
    name: "Local Backup Drive",
    category: "technology",
    editorial_rank: 3,
    product_version: 1,
    image: "/products/local_backup_drive.svg",
    destination_url: "https://shop.example.test/products/local-backup-drive",
  },
];

/** `engaged_<category>` products, sorted by editorial rank (best first). */
export function getProductsForCategory(category: ContentCategory): Product[] {
  return PRODUCTS.filter((product) => product.category === category).sort(
    (a, b) => a.editorial_rank - b.editorial_rank,
  );
}

/**
 * The fixed "Popular right now" fallback, in this exact order, used for
 * every non-success recommendation-module state (denied, empty, expired,
 * unknown, timeout, error) and whenever personalisation consent is absent.
 */
export const FALLBACK_PRODUCT_IDS = [
  "compact_daypack",
  "budget_planner",
  "focus_timer",
] as const;

export function getFallbackProducts(): Product[] {
  return FALLBACK_PRODUCT_IDS.map((id) => {
    const product = PRODUCTS.find((candidate) => candidate.id === id);
    if (!product) {
      throw new Error(`Fallback product fixture is missing: ${id}`);
    }
    return product;
  });
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}
