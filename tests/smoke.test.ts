import { describe, it, expect } from "vitest";
import { getProduct } from "@/lib/catalog";

describe("smoke", () => {
  it("catalog 로드", () => {
    expect(getProduct("compat_basic")?.type).toBe("COMPAT");
  });
});
