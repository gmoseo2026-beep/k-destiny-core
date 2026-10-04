import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  order: { findMany: vi.fn() },
  generatedReport: { findMany: vi.fn() },
}));
const session = vi.hoisted(() => ({ current: null as null | { user: { id: string } } }));
vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

import { GET } from "@/app/api/reports/mine/route";

const future = new Date(Date.now() + 86400000);

beforeEach(() => {
  vi.clearAllMocks();
  session.current = { user: { id: "user_1" } };
});

// 2026-10-04: "이 사람 세트"를 산 회원이 보관함에서 정통 궁합의 [리포트 만들기]를 눌러 500 오류를 6번 봤다.
// 정통 궁합의 심층 리포트는 궁합 결과 화면이 여는 것이라, 보관함은 그 화면으로 보내야 한다.
describe("GET /api/reports/mine — 보관함 목록", () => {
  it("세트 안의 정통 궁합은 COMPAT_ROUTE(궁합 화면으로), 나머지는 리포트 상태", async () => {
    db.order.findMany.mockResolvedValueOnce([
      {
        id: "o1", orderId: "kd_ord_1", productType: "SET", productKey: "set_this_person", compatId: "c1", createdAt: new Date(),
        unlocks: [{ productType: "SET", productKey: "set_this_person", compatId: "c1", expiresAt: future }],
      },
    ]);
    db.generatedReport.findMany.mockResolvedValueOnce([
      { id: "r_inner", cacheKey: "FULL:o1:inner_mind", catalogId: "inner_mind", status: "READY", createdAt: new Date() },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const [order] = await res.json();
    const byId = Object.fromEntries(order.reports.map((r: { catalogId: string }) => [r.catalogId, r]));
    expect(byId.compat_basic).toMatchObject({ status: "COMPAT_ROUTE", compatId: "c1", reportId: null });
    expect(byId.inner_mind).toMatchObject({ status: "READY", reportId: "r_inner" });
    expect(byId.marriage).toMatchObject({ status: "NOT_STARTED" });
    // 정통 궁합은 GeneratedReport 에서 찾지 않는다
    expect(db.generatedReport.findMany.mock.calls[0][0].where.cacheKey.in).toEqual(["FULL:o1:inner_mind", "FULL:o1:marriage"]);
  });

  it("비로그인은 401", async () => {
    session.current = null;
    expect((await GET()).status).toBe(401);
  });
});
