import { describe, it, expect } from "vitest";
import { containsHanjaDeep } from "../lib/gen/hanjaGuard";

describe("hanjaGuard", () => {
  it("should return false for objects without hanja", () => {
    expect(containsHanjaDeep({ a: ["좋아요"] })).toBe(false);
    expect(containsHanjaDeep("안녕하세요")).toBe(false);
    expect(containsHanjaDeep({ num: 123, bool: true })).toBe(false);
  });

  it("should return true for objects with hanja", () => {
    expect(containsHanjaDeep({ a: { b: "甲木" } })).toBe(true);
    expect(containsHanjaDeep(["한글", "漢字"])).toBe(true);
    expect(containsHanjaDeep("運")).toBe(true);
  });
});
