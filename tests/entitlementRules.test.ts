import { describe, it, expect } from "vitest";
import { unlockGrants, orderGrants, type UnlockRow } from "@/lib/entitlementRules";

const now = new Date("2026-10-01T00:00:00Z");
const future = new Date("2026-12-31T00:00:00Z");
const past = new Date("2026-09-01T00:00:00Z");
const u = (productType: string | null, productKey: string | null, compatId: string | null, expiresAt: Date | null = future): UnlockRow =>
  ({ productType, productKey, compatId, expiresAt });

describe("unlockGrants — B1 회귀(궁합 1건으로 전체 열람 금지)", () => {
  const compatX = u("COMPAT", "compat_basic", "X");
  it("정통궁합 X 로 재물운을 열 수 없다", () => {
    expect(unlockGrants(compatX, { catalogId: "wealth", compatId: "X", now })).toBe(false);
  });
  it("정통궁합 X 로 속마음 X 를 열 수 없다", () => {
    expect(unlockGrants(compatX, { catalogId: "inner_mind", compatId: "X", now })).toBe(false);
  });
  it("속마음 X 로 정통궁합 X 를 열 수 없다", () => {
    expect(unlockGrants(u("COMPAT", "inner_mind", "X"), { catalogId: "compat_basic", compatId: "X", now })).toBe(false);
  });
  it("정통궁합 X 는 정통궁합 X 만 연다", () => {
    expect(unlockGrants(compatX, { catalogId: "compat_basic", compatId: "X", now })).toBe(true);
    expect(unlockGrants(compatX, { catalogId: "compat_basic", compatId: "Y", now })).toBe(false);
    expect(unlockGrants(compatX, { catalogId: "compat_basic", compatId: null, now })).toBe(false);
  });
  it("초기 레거시 궁합 행(productType null)은 compat_basic 만", () => {
    const legacy = u(null, null, "X");
    expect(unlockGrants(legacy, { catalogId: "compat_basic", compatId: "X", now })).toBe(true);
    expect(unlockGrants(legacy, { catalogId: "reunion", compatId: "X", now })).toBe(false);
  });
});

describe("unlockGrants — 세트", () => {
  it("이 사람 세트 X 는 구성품만, 같은 X 에서만", () => {
    const set = u("SET", "set_this_person", "X");
    expect(unlockGrants(set, { catalogId: "inner_mind", compatId: "X", now })).toBe(true);
    expect(unlockGrants(set, { catalogId: "marriage", compatId: "X", now })).toBe(true);
    expect(unlockGrants(set, { catalogId: "compat_basic", compatId: "X", now })).toBe(true);
    expect(unlockGrants(set, { catalogId: "reunion", compatId: "X", now })).toBe(false);
    expect(unlockGrants(set, { catalogId: "inner_mind", compatId: "Y", now })).toBe(false);
  });
  it("나 종합 세트는 2026 총운을 연다 (H1)", () => {
    expect(unlockGrants(u("SET", "set_me", null), { catalogId: "annual_2026", compatId: null, now })).toBe(true);
  });
  it("2026 총운 단품은 2027 을 못 연다", () => {
    expect(unlockGrants(u("ANNUAL", "2026", null), { catalogId: "annual_2027", compatId: null, now })).toBe(false);
  });
});

describe("unlockGrants — 만료", () => {
  it("만료된 행은 거부", () => {
    expect(unlockGrants(u("FORTUNE", "wealth", null, past), { catalogId: "wealth", compatId: null, now })).toBe(false);
  });
  it("expiresAt null(레거시)은 허용", () => {
    expect(unlockGrants(u("FORTUNE", "wealth", null, null), { catalogId: "wealth", compatId: null, now })).toBe(true);
  });
});

describe("orderGrants — 소유 증명(H-2 베어러 모델)", () => {
  const base = { orderId: "kd_ord_a", userId: null as string | null, status: "PAID", unlocks: [u("FORTUNE", "wealth", null)] };
  const req = { catalogId: "wealth", compatId: null, now, sessionUserId: null as string | null, presentedOrderId: "kd_ord_a" as string | null };
  it("게스트 주문 + orderId 제시 → 허용", () => {
    expect(orderGrants(base, req).ok).toBe(true);
  });
  it("orderId 미제시 → FORBIDDEN", () => {
    expect(orderGrants(base, { ...req, presentedOrderId: null })).toEqual({ ok: false, reason: "FORBIDDEN" });
  });
  it("회원 주문은 세션 일치로도 허용", () => {
    expect(orderGrants({ ...base, userId: "u1" }, { ...req, presentedOrderId: null, sessionUserId: "u1" }).ok).toBe(true);
  });
  it("타인 세션 + orderId 미제시 → FORBIDDEN", () => {
    expect(orderGrants({ ...base, userId: "u1" }, { ...req, presentedOrderId: null, sessionUserId: "u2" }).ok).toBe(false);
  });
  it("미결제 → NOT_PAID", () => {
    expect(orderGrants({ ...base, status: "PENDING" }, req)).toEqual({ ok: false, reason: "NOT_PAID" });
  });
  it("다른 상품 요청 → NO_GRANT", () => {
    expect(orderGrants(base, { ...req, catalogId: "career" })).toEqual({ ok: false, reason: "NO_GRANT" });
  });
});
