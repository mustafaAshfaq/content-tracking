import type { ComponentType } from "react";
import type { ContentCategory } from "@/lib/tracking";

export interface ArticleMeta {
  /** Stable namespaced ID, e.g. `article_travel_packing_light`. */
  id: string;
  slug: string;
  category: ContentCategory;
  title: string;
  dek: string;
  content_version: 1;
  author_id: string;
  word_count: number;
}

/**
 * Fixture v1 — three checked-in MDX articles per category. This is the
 * versioned source of truth for the article site; there is no CMS or
 * database seed. CI validates this fixture via `npm run fixtures:validate`.
 */
export const ARTICLES: ArticleMeta[] = [
  // travel
  {
    id: "article_travel_packing_light",
    slug: "packing-light",
    category: "travel",
    title: "Packing Light: A Practical Carry-on System",
    dek: "A repeatable packing system that fits a single carry-on, any trip length.",
    content_version: 1,
    author_id: "author_demo_editorial",
    word_count: 420,
  },
  {
    id: "article_travel_rail_itineraries",
    slug: "rail-itineraries",
    category: "travel",
    title: "Building a Rail Itinerary That Actually Works",
    dek: "How to sequence train legs so connections stay realistic, not aspirational.",
    content_version: 1,
    author_id: "author_demo_editorial",
    word_count: 460,
  },
  {
    id: "article_travel_local_weekends",
    slug: "local-weekends",
    category: "travel",
    title: "The Case for Local Weekend Trips",
    dek: "You don't need a flight to reset — a two-hour radius is usually enough.",
    content_version: 1,
    author_id: "author_demo_editorial",
    word_count: 380,
  },
  // finance
  {
    id: "article_finance_building_an_emergency_fund",
    slug: "building-an-emergency-fund",
    category: "finance",
    title: "Building an Emergency Fund Without Overthinking It",
    dek: "A simple target, a simple account structure, and a simple pace.",
    content_version: 1,
    author_id: "author_demo_editorial",
    word_count: 440,
  },
  {
    id: "article_finance_index_funds_explained",
    slug: "index-funds-explained",
    category: "finance",
    title: "Index Funds, Explained Without the Jargon",
    dek: "What an index fund actually holds, and why the fee difference compounds.",
    content_version: 1,
    author_id: "author_demo_editorial",
    word_count: 510,
  },
  {
    id: "article_finance_understanding_credit",
    slug: "understanding-credit",
    category: "finance",
    title: "Understanding Credit Without the Anxiety",
    dek: "The handful of factors that actually move your credit score.",
    content_version: 1,
    author_id: "author_demo_editorial",
    word_count: 400,
  },
  // health
  {
    id: "article_health_sleep_routines",
    slug: "sleep-routines",
    category: "health",
    title: "Sleep Routines That Survive a Bad Week",
    dek: "A routine resilient enough to bend without collapsing entirely.",
    content_version: 1,
    author_id: "author_demo_editorial",
    word_count: 430,
  },
  {
    id: "article_health_strength_basics",
    slug: "strength-basics",
    category: "health",
    title: "Strength Training Basics for a Busy Schedule",
    dek: "Three lifts, twenty minutes, and a progression you can actually track.",
    content_version: 1,
    author_id: "author_demo_editorial",
    word_count: 470,
  },
  {
    id: "article_health_meal_prep",
    slug: "meal-prep",
    category: "health",
    title: "Meal Prep for People Who Get Bored Easily",
    dek: "A base-and-variant system so week three still feels like week one.",
    content_version: 1,
    author_id: "author_demo_editorial",
    word_count: 410,
  },
  // technology
  {
    id: "article_technology_privacy_by_design",
    slug: "privacy-by-design",
    category: "technology",
    title: "What 'Privacy by Design' Actually Means",
    dek: "It's a set of defaults, not a slogan — here's what changes in practice.",
    content_version: 1,
    author_id: "author_demo_editorial",
    word_count: 500,
  },
  {
    id: "article_technology_calmer_notifications",
    slug: "calmer-notifications",
    category: "technology",
    title: "Getting to Calmer Notifications",
    dek: "A short audit that removes most of the noise in under ten minutes.",
    content_version: 1,
    author_id: "author_demo_editorial",
    word_count: 360,
  },
  {
    id: "article_technology_local_first_tools",
    slug: "local-first-tools",
    category: "technology",
    title: "Local-first Tools Worth Trying",
    dek: "Software that keeps working, and keeps your data, without a network.",
    content_version: 1,
    author_id: "author_demo_editorial",
    word_count: 450,
  },
];

export function getArticleBySlug(slug: string): ArticleMeta | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}

export function getArticlesForCategory(category: ContentCategory): ArticleMeta[] {
  return ARTICLES.filter((article) => article.category === category);
}

/**
 * Explicit static map from slug to its MDX body module loader. Kept explicit
 * (rather than a templated dynamic import) so both Webpack and Turbopack can
 * statically analyze every article body at build time.
 */
export const ARTICLE_BODIES: Record<string, () => Promise<{ default: ComponentType }>> = {
  "packing-light": () => import("./articles/packing-light.mdx"),
  "rail-itineraries": () => import("./articles/rail-itineraries.mdx"),
  "local-weekends": () => import("./articles/local-weekends.mdx"),
  "building-an-emergency-fund": () => import("./articles/building-an-emergency-fund.mdx"),
  "index-funds-explained": () => import("./articles/index-funds-explained.mdx"),
  "understanding-credit": () => import("./articles/understanding-credit.mdx"),
  "sleep-routines": () => import("./articles/sleep-routines.mdx"),
  "strength-basics": () => import("./articles/strength-basics.mdx"),
  "meal-prep": () => import("./articles/meal-prep.mdx"),
  "privacy-by-design": () => import("./articles/privacy-by-design.mdx"),
  "calmer-notifications": () => import("./articles/calmer-notifications.mdx"),
  "local-first-tools": () => import("./articles/local-first-tools.mdx"),
};
