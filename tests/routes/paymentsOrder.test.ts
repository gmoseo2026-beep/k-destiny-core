import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  order: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  compatibility: { findUnique: vi.fn() },
  productVisibility: { findMany: vi.fn(async () => [] as Array<{ catalogId: string; visible: boolean }>) },
}));
const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; email?: string; role?: string } } }));

vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

import { POST } from "@/app/api/payments/order/route";
import { invalidateVisibilityCache } from "@/lib/catalogVisibility";

const req = (body: unknown) =>
  new Request("http://localhost/api/payments/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  invalidateVisibilityCache();
  db.productVisibility.findMany.mockResolvedValue([]);
  session.current = null;
  delete process.env.PREVIEW_EMAILS;
});

describe("POST /api/payments/order route contract tests", () => {
  // 1. type: "PERIOD_PASS" → 410
  it("case 1: type PERIOD_PASS returns 410", async () => {
    const res = await POST(req({ type: "PERIOD_PASS" }));
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toContain("기간권 판매가 종료되었습니다");
  });

  // 2. 게스트가 wealth 주문 → 400(숨김). V2 미리보기 이메일 세션이면 성공하고 amount는 첫 결제 기준대로 나온다.
  it("case 2: hidden wealth order returns 400 for guest, succeeds with preview session", async () => {
    // 출시 후 코드 기본값은 전부 공개 → 어드민이 wealth 를 숨긴 상태를 만든다
    db.productVisibility.findMany.mockResolvedValue([{ catalogId: "wealth", visible: false }]);
    // 2a: Guest -> 400
    const resGuest = await POST(req({ productId: "wealth", email: "guest@example.com" }));
    expect(resGuest.status).toBe(400);

    // 2b: Preview session -> 200, member first purchase = 4900
    process.env.PREVIEW_EMAILS = "owner@kongdak.kr";
    session.current = { user: { id: "user_owner", email: "owner@kongdak.kr" } };
    db.order.findFirst.mockResolvedValueOnce(null); // 0 past paid
    db.order.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({ ...data, id: "ord_wealth_1" }));

    const resPreview = await POST(req({ productId: "wealth" }));
    expect(resPreview.status).toBe(200);
    const bodyPreview = await resPreview.json();
    expect(bodyPreview.amount).toBe(4900);
  });

  // 3. 회원이고 과거 PAID 0건 → amount 4,900. 1건 이상 → 6,900.
  it("case 3: member with 0 paid orders gets 4,900; with 1+ paid orders gets 6,900", async () => {
    session.current = { user: { id: "user_regular", email: "user@example.com" } };
    db.compatibility.findUnique.mockResolvedValue({ id: "c1" });

    // 3a: 0 paid orders -> 4900
    db.order.findFirst.mockResolvedValueOnce(null);
    db.order.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({ ...data, id: "ord_first" }));

    const resFirst = await POST(req({ productId: "compat_basic", compatId: "c1" }));
    expect(resFirst.status).toBe(200);
    const bodyFirst = await resFirst.json();
    expect(bodyFirst.amount).toBe(4900);

    // 3b: 1+ paid orders -> 6900
    db.order.findFirst.mockResolvedValueOnce({ id: "prev_paid" });
    db.order.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({ ...data, id: "ord_repeat" }));

    const resRepeat = await POST(req({ productId: "compat_basic", compatId: "c1" }));
    expect(resRepeat.status).toBe(200);
    const bodyRepeat = await resRepeat.json();
    expect(bodyRepeat.amount).toBe(6900);
  });

  // 4. 게스트는 항상 정가(6,900. 공개 상품 compat_basic 기준)
  it("case 4: guest is always charged full price (6,900 for compat_basic)", async () => {
    session.current = null;
    db.compatibility.findUnique.mockResolvedValueOnce({ id: "c1" });
    db.order.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({ ...data, id: "ord_guest" }));

    const res = await POST(
      req({
        productId: "compat_basic",
        compatId: "c1",
        email: "guest@example.com",
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.amount).toBe(6900);
  });

  // 5. requiresLogin 상품(annual_2026) 게스트 → 401 LOGIN_REQUIRED
  it("case 5: requiresLogin product (annual_2026) returns 401 LOGIN_REQUIRED for guest", async () => {
    session.current = null;

    const res = await POST(
      req({
        productId: "annual_2026",
        email: "guest@example.com",
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("LOGIN_REQUIRED");
  });

  // 6. 무료 상품 → 400, 없는 productId → 400
  it("case 6: free product or nonexistent productId returns 400", async () => {
    // Free product (free_personality)
    const resFree = await POST(req({ productId: "free_personality", email: "guest@example.com" }));
    expect(resFree.status).toBe(400);

    // Nonexistent productId
    const resNone = await POST(req({ productId: "does_not_exist", email: "guest@example.com" }));
    expect(resNone.status).toBe(400);
  });

  // 7. couple 상품인데 compatId 없음 → 400, 존재하지 않는 compatId → 404
  it("case 7: couple product requires valid compatId; returns 400 if missing, 404 if not found", async () => {
    // Missing compatId -> 400
    const resMissing = await POST(req({ productId: "compat_basic", email: "guest@example.com" }));
    expect(resMissing.status).toBe(400);

    // Nonexistent compatId -> 404
    db.compatibility.findUnique.mockResolvedValueOnce(null);
    const resNotFound = await POST(
      req({
        productId: "compat_basic",
        compatId: "nonexistent_compat_id",
        email: "guest@example.com",
      })
    );
    expect(resNotFound.status).toBe(404);
  });

  // 8. type을 생략해도 SINGLE로 처리된다.
  it("case 8: omitting type defaults to SINGLE order", async () => {
    session.current = { user: { id: "user_single", email: "user@example.com" } };
    db.compatibility.findUnique.mockResolvedValueOnce({ id: "c1" });
    db.order.findFirst.mockResolvedValueOnce(null);
    db.order.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({ ...data, id: "ord_single" }));

    const res = await POST(
      req({
        productId: "compat_basic",
        compatId: "c1",
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("SINGLE");
    expect(db.order.create).toHaveBeenCalled();
    const createArg = db.order.create.mock.calls[0][0];
    expect(createArg.data.type).toBe("SINGLE");
  });
});
