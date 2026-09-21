"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent, generateUuid, getConsentSnapshot } from "@/lib/tracking";
import type { ContentCategory } from "@/lib/tracking";
import type { Product } from "@/content/products";
import {
  resolveRecommendationOutcome,
  FALLBACK_NOTES,
  type RecommendationOutcome,
} from "./resolve-outcome";
import { ProductCard, ProductCardSkeleton } from "./product-card";

export interface RecommendationModuleProps {
  articleId: string;
  category: ContentCategory;
  moduleId?: string;
}

const DEFAULT_MODULE_ID = "recommended_products";

/**
 * The inline "Recommended products" module. Renders after hydration (it is
 * a client component with no server-rendered personalized payload), reserves
 * stable three-card grid geometry across loading/success/fallback so the
 * layout never shifts, and always fills the slot — a non-success outcome
 * still renders the static "Popular right now" list with a concise note.
 */
export function RecommendationModule({
  articleId,
  category,
  moduleId = DEFAULT_MODULE_ID,
}: RecommendationModuleProps) {
  const [outcome, setOutcome] = useState<RecommendationOutcome | null>(null);
  const impressionIdRef = useRef<string>(generateUuid());

  useEffect(() => {
    // Deliberately resolves after mount, not during render: the server
    // response must never carry a personalized payload, so the module
    // starts in the loading state on both server and initial client render,
    // then this effect resolves the real outcome once the component has
    // hydrated. This is the standard exception to "don't setState in an
    // effect" for SSR/CSR-divergent, consent-gated content.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOutcome(resolveRecommendationOutcome(getConsentSnapshot()));
  }, [category]);

  const isPersonalized = outcome?.kind === "success";
  const heading = isPersonalized ? "Recommended for you" : "Popular right now";
  const products: Product[] = outcome?.products ?? [];

  function handleView(product: Product, position: number) {
    trackEvent({
      name: "recommendation_clicked",
      properties: {
        recommendation_id: product.id,
        content_id: articleId,
        module_id: moduleId,
        position,
        impression_id: impressionIdRef.current,
        is_personalized: isPersonalized,
        destination_url: product.destination_url,
      },
    });
  }

  return (
    <section
      aria-label="Recommended products"
      className="not-prose my-8 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <div className="mb-3 flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {heading}
        </h2>
        {isPersonalized && outcome?.kind === "success" && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Based on your interest in {outcome.category}.
          </p>
        )}
        {!isPersonalized && outcome && outcome.kind === "fallback" && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {FALLBACK_NOTES[outcome.reason]}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {outcome === null
          ? Array.from({ length: 3 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))
          : products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={() => handleView(product, index)}
              />
            ))}
      </div>
    </section>
  );
}
