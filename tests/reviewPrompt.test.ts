import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  order: { findMany: vi.fn(), findUnique: vi.fn() },
  generatedReport: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
  deepReport: { findMany: vi.fn(), findUnique: vi.fn() },
  review: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  coupon: { create: vi.fn() },
  $transaction: vi.fn(),
}));
const session = vi.hoisted(() => ({
  current: null as null | { user: { id: string; email?: string } },
}));

vi.mock("@/lib/prisma", () => ({ default: db, prisma: db }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

import {
  dismissReviewPrompt,
  hasReached80PercentScroll,
  isReviewPromptDismissed,
} from "@/lib/reviewPromptStorage";
import { GET as GET_MINE } from "@/app/api/reports/mine/route";
import { POST as CREATE_REVIEW } from "@/app/api/reviews/route";
import { COUPON_AMOUNT } from "@/lib/reviews";

const post = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;

describe("Argon-04 후기 요청 강화 단위 테스트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.current = null;
    db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  });

  it("쿠폰 금액은 1,000원 그대로 유지된다", () => {
    expect(COUPON_AMOUNT).toBe(1000);
  });

  it("80% 스크롤 도달 판정: 79%는 false, 정확히 80% 이상은 true, 높이 0은 false", () => {
    expect(
      hasReached80PercentScroll({ scrollY: 390, innerHeight: 400, scrollHeight: 1000 }),
    ).toBe(false);
    expect(
      hasReached80PercentScroll({ scrollY: 400, innerHeight: 400, scrollHeight: 1000 }),
    ).toBe(true);
    expect(
      hasReached80PercentScroll({ scrollY: 600, innerHeight: 400, scrollHeight: 1000 }),
    ).toBe(true);
    expect(
      hasReached80PercentScroll({ scrollY: 0, innerHeight: 800, scrollHeight: 0 }),
    ).toBe(false);
  });

  it("주문별 하단 후기 프롬프트 닫기 상태는 localStorage에 주문 단위로 기록되고, 예외 환경에서도 안전하다", () => {
    const store = new Map<string, string>();
    const origWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => store.set(k, v),
        },
      },
      configurable: true,
    });

    try {
      expect(isReviewPromptDismissed("ord_1")).toBe(false);
      dismissReviewPrompt("ord_1");
      expect(isReviewPromptDismissed("ord_1")).toBe(true);
      expect(isReviewPromptDismissed("ord_2")).toBe(false);
    } finally {
      Object.defineProperty(globalThis, "window", { value: origWindow, configurable: true });
    }

    // 사파리 프라이빗 모드 등 localStorage 접근 예외 시에도 크래시 없이 false 반환
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: () => {
            throw new Error("SecurityError");
          },
          setItem: () => {
            throw new Error("QuotaExceededError");
          },
        },
      },
      configurable: true,
    });

    try {
      expect(() => dismissReviewPrompt("ord_err")).not.toThrow();
      expect(isReviewPromptDismissed("ord_err")).toBe(false);
    } finally {
      Object.defineProperty(globalThis, "window", { value: origWindow, configurable: true });
    }
  });

  it("GET /api/reports/mine: 후기 미작성 주문과 작성 완료 주문의 hasReviewed·canReviewNow를 구분해 반환한다", async () => {
    session.current = { user: { id: "user_me_1" } };
    const now = new Date("2026-10-29T10:00:00Z");

    db.order.findMany.mockResolvedValue([
      {
        id: "db_ord_unreviewed",
        orderId: "kd_ord_unreviewed",
        userId: "user_me_1",
        status: "PAID",
        productType: "STANDARD",
        productKey: "inner_mind",
        compatId: "cmp_1",
        createdAt: now,
        unlocks: [
          {
            productType: "STANDARD",
            productKey: "inner_mind",
            compatId: "cmp_1",
            expiresAt: new Date(now.getTime() + 86400000),
          },
        ],
      },
      {
        id: "db_ord_reviewed",
        orderId: "kd_ord_reviewed",
        userId: "user_me_1",
        status: "PAID",
        productType: "ANNUAL",
        productKey: "2027",
        compatId: null,
        createdAt: now,
        unlocks: [
          {
            productType: "ANNUAL",
            productKey: "2027",
            compatId: null,
            expiresAt: new Date(now.getTime() + 86400000),
          },
        ],
      },
    ]);

    db.generatedReport.findMany.mockResolvedValue([
      {
        id: "rep_inner_1",
        cacheKey: "FULL:db_ord_unreviewed:inner_mind",
        catalogId: "inner_mind",
        status: "READY",
        firstViewedAt: now,
        createdAt: now,
      },
      {
        id: "rep_annual_1",
        cacheKey: "FULL:db_ord_reviewed:annual_2027",
        catalogId: "annual_2027",
        status: "READY",
        firstViewedAt: now,
        createdAt: now,
      },
    ]);
    db.review.findMany.mockResolvedValue([{ orderId: "db_ord_reviewed" }]);
    db.deepReport.findMany.mockResolvedValue([]);

    const res = await GET_MINE();
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list).toHaveLength(2);

    expect(list[0].orderId).toBe("kd_ord_unreviewed");
    expect(list[0].hasReviewed).toBe(false);
    expect(list[0].canReviewNow).toBe(true);
    expect(list[0].reviewReportId).toBe("rep_inner_1");

    expect(list[1].orderId).toBe("kd_ord_reviewed");
    expect(list[1].hasReviewed).toBe(true);
    expect(list[1].canReviewNow).toBe(false);
  });

  it("POST /api/reviews (보관함 orderId 기반): 열람한 정통 궁합(compat_basic) 주문은 1,000원 쿠폰을 받고 미열람 주문은 403 거부된다", async () => {
    session.current = { user: { id: "user_me_2" } };
    db.order.findUnique.mockResolvedValue({
      id: "db_ord_compat",
      orderId: "kd_ord_compat",
      userId: "user_me_2",
      status: "PAID",
      productType: "COMPAT",
      productKey: "compat_basic",
      compatId: "cmp_deep_1",
      unlocks: [],
    });
    db.generatedReport.findFirst.mockResolvedValue(null);

    // 1) 미열람(DeepReport 없음) → 403
    db.deepReport.findUnique.mockResolvedValueOnce(null);
    const denied = await CREATE_REVIEW(
      post("/api/reviews", {
        orderId: "kd_ord_compat",
        rating: 5,
        text: "아직 안 읽은 궁합 후기 시도",
      }),
    );
    expect(denied.status).toBe(403);

    // 2) 열람 완료(DeepReport 존재) → 200 + 1,000원 쿠폰 발급
    db.deepReport.findUnique.mockResolvedValueOnce({ id: "deep_1" });
    db.review.findUnique.mockResolvedValueOnce(null);
    db.review.create.mockResolvedValueOnce({ id: "rev_compat_1" });
    db.coupon.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "cp_compat_1",
        ...data,
      }),
    );

    const okRes = await CREATE_REVIEW(
      post("/api/reviews", {
        orderId: "kd_ord_compat",
        rating: 5,
        text: "정통 궁합 리포트가 정말 세심했어요!",
      }),
    );
    expect(okRes.status).toBe(200);
    const body = await okRes.json();
    expect(body.ok).toBe(true);
    expect(body.coupon.amount).toBe(1000);
  });
});
