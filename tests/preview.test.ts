import { describe, it, expect, beforeEach } from "vitest";
import { canPreview } from "@/lib/preview";
import { getProduct, isViewableFor, isSellableFor } from "@/lib/catalog";

describe("운영 미리보기 권한 (PREVIEW_EMAILS)", () => {
  beforeEach(() => {
    delete process.env.PREVIEW_EMAILS;
  });

  it("목록에 있으면 true이고 대소문자·공백을 무시한다", () => {
    process.env.PREVIEW_EMAILS = " boss@kongdak.kr , Admin@Example.Com ";
    expect(canPreview("boss@kongdak.kr")).toBe(true);
    expect(canPreview("BOSS@KONGDAK.KR")).toBe(true);
    expect(canPreview("  admin@example.com  ")).toBe(true);
  });

  it("목록에 없거나, 이메일이 null이거나, 환경변수가 없으면 false다", () => {
    expect(canPreview("boss@kongdak.kr")).toBe(false);
    expect(canPreview(null)).toBe(false);
    expect(canPreview(undefined)).toBe(false);
    expect(canPreview("")).toBe(false);

    process.env.PREVIEW_EMAILS = "boss@kongdak.kr";
    expect(canPreview("user@kongdak.kr")).toBe(false);
    expect(canPreview(null)).toBe(false);
  });

  it("isViewableFor(hidden, false)는 false, (hidden, true)는 true다", () => {
    const hiddenProduct = getProduct("wealth"); // hidden standard product
    expect(hiddenProduct).toBeDefined();
    expect(isViewableFor(hiddenProduct, false)).toBe(false);
    expect(isViewableFor(hiddenProduct, true)).toBe(true);
  });

  it("isSellableFor(free, true)는 false다 (무료는 미리보기여도 판매 불가)", () => {
    const freeProduct = getProduct("free_personality");
    expect(freeProduct).toBeDefined();
    expect(isSellableFor(freeProduct, true)).toBe(false);

    const hiddenSellable = getProduct("wealth");
    expect(isSellableFor(hiddenSellable, true)).toBe(true);
    expect(isSellableFor(hiddenSellable, false)).toBe(false);
  });
});
