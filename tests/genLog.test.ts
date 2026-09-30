import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ reportGenLog: { create: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ default: db, prisma: db }));

import { logGeneration, errorCode, teaserCatalogFromCacheKey } from "@/lib/reports/genLog";

beforeEach(() => vi.clearAllMocks());

describe("생성 기록(어드민 지표)", () => {
  it("상품·종류·성공 여부·시간만 저장한다(개인정보 필드 없음)", async () => {
    await logGeneration({ catalogId: "wealth", kind: "TEASER", ok: true, ms: 1234.6 });
    const data = db.reportGenLog.create.mock.calls[0][0].data;
    expect(data).toEqual({ catalogId: "wealth", kind: "TEASER", ok: true, cached: false, ms: 1235, error: null });
  });
  it("기록이 실패해도 예외를 던지지 않는다(고객 요청에 영향 없음)", async () => {
    db.reportGenLog.create.mockRejectedValueOnce(new Error("db down"));
    await expect(logGeneration({ catalogId: "wealth", kind: "FULL", ok: false })).resolves.toBeUndefined();
  });
  it("오류는 짧은 이름만 남긴다", () => {
    const e = new Error("Failed to parse AI response: 홍길동 1990-01-01");
    expect(errorCode(e)).toBe("Failed to parse AI response");
    class PrismaClientValidationError extends Error { name = "PrismaClientValidationError"; }
    expect(errorCode(new PrismaClientValidationError("data: { name: '홍길동' }"))).toBe("PrismaClientValidationError");
  });
  it("미리보기 저장 키에서 상품을 두 번째 칸으로 읽는다(예전 버그: 세 번째 칸)", () => {
    expect(teaserCatalogFromCacheKey("TEASER:inner_mind:abc123hash:compat_1")).toBe("inner_mind");
    expect(teaserCatalogFromCacheKey("FREE:free_personality:abc123hash")).toBe("free_personality");
    expect(teaserCatalogFromCacheKey("FULL:order_db:wealth")).toBeNull();
  });
});
