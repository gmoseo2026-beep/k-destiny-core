import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  subscription: { findFirst: vi.fn() },
  order: { findUnique: vi.fn() },
  unlock: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: db }));

import { resolveCompatPageEntitlement } from "@/lib/entitlement";

const future = new Date(Date.now() + 86400000);

beforeEach(() => {
  vi.clearAllMocks();
  db.user.findUnique.mockResolvedValue({ tier: "FREE", role: "USER", premiumEndDate: null });
  db.subscription.findFirst.mockResolvedValue(null);
});

describe("P-007 §3-1 궁합 결과 페이지 회원 열람 권한 판정 (resolveCompatPageEntitlement)", () => {
  it("1) 산 회원(정통 궁합 단품 또는 이 사람 세트 보유) → 열림(true)", async () => {
    db.unlock.findMany.mockResolvedValueOnce([
      { productType: "SET", productKey: "set_this_person", compatId: "cmp_target", expiresAt: future },
    ]);

    const entitled = await resolveCompatPageEntitlement("user_buyer", "cmp_target");
    expect(entitled).toBe(true);
  });

  it("2) 안 산 회원 → 잠김(false)", async () => {
    db.unlock.findMany.mockResolvedValueOnce([]);

    const entitled = await resolveCompatPageEntitlement("user_nonbuyer", "cmp_target");
    expect(entitled).toBe(false);
  });

  it("3) 비회원(!userId) → 잠김(false) 및 DB 조회를 더하지 않는다", async () => {
    const entitled = await resolveCompatPageEntitlement(undefined, "cmp_target");
    expect(entitled).toBe(false);
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.unlock.findMany).not.toHaveBeenCalled();
  });

  it("4) 다른 궁합(다른 compatId)을 산 회원 → 잠김(false)", async () => {
    db.unlock.findMany.mockResolvedValueOnce([
      { productType: "COMPAT", productKey: "compat_basic", compatId: "cmp_other", expiresAt: future },
      { productType: "SET", productKey: "set_this_person", compatId: "cmp_other", expiresAt: future },
    ]);

    const entitled = await resolveCompatPageEntitlement("user_other_compat", "cmp_target");
    expect(entitled).toBe(false);
  });
});
