import { describe, it, expect } from "vitest";
import { PRODUCT_SPECS } from "@/lib/prompts/productSpecs";
import { CATALOG } from "@/lib/catalog";

describe("Product Specs Validation", () => {
  it("All valid person/couple standard products (except annual_*, compat_basic, SET) must have a spec", () => {
    for (const product of CATALOG) {
      const catalogId = product.id;
      if (product.tier !== "standard" || catalogId.startsWith("annual_") || catalogId === "compat_basic" || product.type === "SET") {
        continue;
      }
      
      const spec = PRODUCT_SPECS[product.promptKey];
      expect(spec, `Missing spec for ${catalogId} (promptKey: ${product.promptKey})`).toBeDefined();
      expect(spec.promptKey).toBe(product.promptKey);
      expect(spec.sections).toHaveLength(4);
      
      const keys = spec.sections.map(s => s.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size, `Duplicate section keys in ${catalogId}`).toBe(4);
    }
  });
});
