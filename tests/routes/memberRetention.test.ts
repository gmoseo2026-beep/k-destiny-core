import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  order: { findFirst: vi.fn() },
  userDailyFortune: { findUnique: vi.fn(), create: vi.fn() },
  userSajuProfile: { findUnique: vi.fn() },
}));
const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; role?: string; tier?: string } } }));

vi.mock("@/lib/prisma", () => ({ default: db, prisma: db }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

import { GET as FIRST_PURCHASE } from "@/app/api/user/first-purchase/route";
import { POST as DAILY } from "@/app/api/fortune/daily/route";

const dailyReq = () =>
  new Request("http://localhost/api/fortune/daily", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: "ko", date: "2026-09-30" }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  session.current = null;
});

describe("회원 첫 결제 안내(/api/user/first-purchase)", () => {
  it("비회원은 401", async () => {
    expect((await FIRST_PURCHASE()).status).toBe(401);
  });
  it("결제한 적 없으면 eligible=true·4,900원, 주문 금액 판정과 같은 조건으로 조회", async () => {
    session.current = { user: { id: "u1" } };
    db.order.findFirst.mockResolvedValueOnce(null);
    const j = await (await FIRST_PURCHASE()).json();
    expect(j).toEqual({ eligible: true, price: 4900 });
    expect(db.order.findFirst.mock.calls[0][0].where).toEqual({
      userId: "u1", status: "PAID", provider: { not: "admin_manual" }, amount: { gt: 0 },
    });
  });
  it("결제한 적 있으면 eligible=false", async () => {
    session.current = { user: { id: "u1" } };
    db.order.findFirst.mockResolvedValueOnce({ id: "o1" });
    expect((await (await FIRST_PURCHASE()).json()).eligible).toBe(false);
  });
});

describe("오늘의 운세(/api/fortune/daily) 회원 개방", () => {
  it("비회원은 401", async () => {
    expect((await DAILY(dailyReq())).status).toBe(401);
  });
  it("패스 없는 일반 회원도 오늘의 운세를 받는다(예전엔 403)", async () => {
    session.current = { user: { id: "u1", tier: "FREE" } };
    db.userDailyFortune.findUnique.mockResolvedValueOnce({ content: { oneLine: "좋은 날", dayScore: 80 } });
    const res = await DAILY(dailyReq());
    expect(res.status).toBe(200);
    expect((await res.json()).data.oneLine).toBe("좋은 날");
  });
  it("사주 정보가 없으면 needProfile 로 저장 안내", async () => {
    session.current = { user: { id: "u2", tier: "FREE" } };
    db.userDailyFortune.findUnique.mockResolvedValueOnce(null);
    db.userSajuProfile.findUnique.mockResolvedValueOnce(null);
    const res = await DAILY(dailyReq());
    expect(res.status).toBe(400);
    expect((await res.json()).needProfile).toBe(true);
  });
});
