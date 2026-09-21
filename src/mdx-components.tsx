import type { MDXComponents } from "mdx/types";
import { RecommendationModule } from "@/components/recommendations/recommendation-module";

/**
 * Global MDX component registry (Next.js App Router convention). Article
 * bodies opt into the "Recommended products" module by placing
 * `<Recommendations />` after their introduction — see src/content/articles.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Recommendations: RecommendationModule,
    ...components,
  };
}
