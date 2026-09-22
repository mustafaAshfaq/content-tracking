import { describe, it, expect } from "vitest";
import { getProductsForCategory } from "../products";
import { CONTENT_CATEGORIES } from "@/lib/tracking";

describe("getProductsForCategory", () => {
  it("returns only products in the requested category, sorted by editorial rank", () => {
    for (const category of CONTENT_CATEGORIES) {
      const products = getProductsForCategory(category);
      expect(products).toHaveLength(3);
      expect(products.every((p) => p.category === category)).toBe(true);
      expect(products.map((p) => p.editorial_rank)).toEqual([1, 2, 3]);
    }
  });
});
