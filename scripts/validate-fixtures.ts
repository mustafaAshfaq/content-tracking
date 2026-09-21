import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONTENT_CATEGORIES } from "../src/lib/tracking/constants";
import { ARTICLES, ARTICLE_BODIES } from "../src/content/article-manifest";
import { PRODUCTS, FALLBACK_PRODUCT_IDS } from "../src/content/products";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, "..", "src", "content", "articles");

const errors: string[] = [];

function fail(message: string) {
  errors.push(message);
}

// --- Taxonomy -------------------------------------------------------------

const EXPECTED_CATEGORIES = ["travel", "finance", "health", "technology"] as const;
if (
  CONTENT_CATEGORIES.length !== EXPECTED_CATEGORIES.length ||
  !EXPECTED_CATEGORIES.every((category) => (CONTENT_CATEGORIES as readonly string[]).includes(category))
) {
  fail(
    `Taxonomy must be exactly ${JSON.stringify(EXPECTED_CATEGORIES)}, got ${JSON.stringify(CONTENT_CATEGORIES)}`,
  );
}

// --- Articles ---------------------------------------------------------------

const articleIds = new Set<string>();
const articleSlugs = new Set<string>();
const articlesPerCategory = new Map<string, number>();

for (const article of ARTICLES) {
  if (articleIds.has(article.id)) {
    fail(`Duplicate article ID: ${article.id}`);
  }
  articleIds.add(article.id);

  if (articleSlugs.has(article.slug)) {
    fail(`Duplicate article slug: ${article.slug}`);
  }
  articleSlugs.add(article.slug);

  if (!article.id.startsWith(`article_${article.category}_`)) {
    fail(`Article ID "${article.id}" is not namespaced under its category "${article.category}"`);
  }

  if (article.content_version !== 1) {
    fail(`Article "${article.id}" must have content_version 1, got ${article.content_version}`);
  }

  if (!(CONTENT_CATEGORIES as readonly string[]).includes(article.category)) {
    fail(`Article "${article.id}" has an unknown category "${article.category}"`);
  }

  if (!ARTICLE_BODIES[article.slug]) {
    fail(`Article "${article.id}" (slug "${article.slug}") has no registered MDX body loader`);
  }

  const mdxPath = join(ARTICLES_DIR, `${article.slug}.mdx`);
  if (!existsSync(mdxPath)) {
    fail(`Article "${article.id}" is missing its MDX file at ${mdxPath}`);
  }

  articlesPerCategory.set(article.category, (articlesPerCategory.get(article.category) ?? 0) + 1);
}

for (const category of CONTENT_CATEGORIES) {
  const count = articlesPerCategory.get(category) ?? 0;
  if (count !== 3) {
    fail(`Category "${category}" must have exactly 3 articles, found ${count}`);
  }
}

// --- Products -----------------------------------------------------------

const productIds = new Set<string>();
const productsPerCategory = new Map<string, typeof PRODUCTS>();

for (const product of PRODUCTS) {
  if (productIds.has(product.id)) {
    fail(`Duplicate product ID: ${product.id}`);
  }
  productIds.add(product.id);

  if (product.product_version !== 1) {
    fail(`Product "${product.id}" must have product_version 1, got ${product.product_version}`);
  }

  if (!(CONTENT_CATEGORIES as readonly string[]).includes(product.category)) {
    fail(`Product "${product.id}" has an unknown category "${product.category}"`);
  }

  if (!product.image) fail(`Product "${product.id}" is missing an image reference`);
  if (!product.destination_url) fail(`Product "${product.id}" is missing a destination_url`);

  const bucket = productsPerCategory.get(product.category) ?? [];
  bucket.push(product);
  productsPerCategory.set(product.category, bucket);
}

for (const category of CONTENT_CATEGORIES) {
  const bucket = productsPerCategory.get(category) ?? [];
  if (bucket.length !== 3) {
    fail(`Category "${category}" must have exactly 3 products, found ${bucket.length}`);
  }

  const ranks = bucket.map((p) => p.editorial_rank).sort((a, b) => a - b);
  const expectedRanks = [1, 2, 3];
  if (JSON.stringify(ranks) !== JSON.stringify(expectedRanks)) {
    fail(
      `Category "${category}" editorial ranks must be exactly ${JSON.stringify(expectedRanks)}, found ${JSON.stringify(ranks)}`,
    );
  }
}

// --- Fallback list --------------------------------------------------------

const EXPECTED_FALLBACK = ["compact_daypack", "budget_planner", "focus_timer"];
if (JSON.stringify(FALLBACK_PRODUCT_IDS) !== JSON.stringify(EXPECTED_FALLBACK)) {
  fail(
    `Fallback product list must be exactly ${JSON.stringify(EXPECTED_FALLBACK)} in order, found ${JSON.stringify(FALLBACK_PRODUCT_IDS)}`,
  );
}
for (const id of FALLBACK_PRODUCT_IDS) {
  if (!productIds.has(id)) {
    fail(`Fallback product "${id}" does not exist in the product fixture`);
  }
}

// --- Report -----------------------------------------------------------------

if (errors.length > 0) {
  console.error(`Fixture validation failed with ${errors.length} error(s):\n`);
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(
  `Fixtures OK: ${ARTICLES.length} articles and ${PRODUCTS.length} products across ${CONTENT_CATEGORIES.length} categories.`,
);
