import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  productVisibility: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  adminAuditLog: {
    create: vi.fn(),
  },
}));

const session = vi.hoisted(() => ({
  current: null as null | { user: { id: string; email?: string; name?: string; role?: string } },
}));

vi.mock("@/lib/prisma", () => ({ default: db, prisma: db }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

import { POST } from "@/app/api/admin/products/visibility/route";
import { invalidateVisibilityCache } from "@/lib/catalogVisibility";

const req = (body: unknown) =>
  new Request("http://localhost/api/admin/products/visibility", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  session.current = {
    user: { id: "admin_1", email: "admin@kongdak.kr", name: "관리자", role: "ADMIN" },
  };
  invalidateVisibilityCache();
  db.productVisibility.findMany.mockResolvedValue([]);
  db.productVisibility.upsert.mockResolvedValue({ id: "pv_1" });
  db.productVisibility.deleteMany.mockResolvedValue({ count: 1 });
  db.adminAuditLog.create.mockResolvedValue({ id: "log_1" });
});

describe("POST /api/admin/products/visibility route contract tests", () => {
  // 1. 관리자 아님 -> 401/403
  it("returns 403 when session is not ADMIN", async () => {
    session.current = {
      user: { id: "user_normal", email: "user@example.com", role: "USER" },
    };
    const res = await POST(req({ catalogId: "compat_basic", action: "show", reason: "테스트" }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("관리자 권한이 없습니다");
  });

  it("returns 401 when session is null", async () => {
    session.current = null;
    const res = await POST(req({ catalogId: "compat_basic", action: "show", reason: "테스트" }));
    expect(res.status).toBe(401);
  });

  // 2. reason 없음 -> 400
  it("returns 400 when reason is missing or empty", async () => {
    const res = await POST(req({ catalogId: "compat_basic", action: "show" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("사유");
  });

  // 3. 없는 catalogId -> 400
  it("returns 400 when catalogId does not exist", async () => {
    const res = await POST(req({ catalogId: "non_existent_id", action: "show", reason: "사유" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("존재하지 않는 상품");
  });

  // 4. 구성품이 숨김인 SET 공개 -> 409
  it("returns 409 when showing a SET whose components are hidden", async () => {
    // set_this_person 의 구성품: compat_basic(기본 visible), inner_mind(기본 hidden), marriage(기본 hidden)
    // 오버라이드가 없으면 inner_mind, marriage 가 숨김 상태이므로 SET 공개 불가
    db.productVisibility.findMany.mockResolvedValueOnce([]);

    const res = await POST(
      req({ catalogId: "set_this_person", action: "show", reason: "세트 오픈" })
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("구성 상품");
    expect(data.error).toContain("먼저 공개하세요");
  });

  // 5. 공개 SET에 포함된 상품 숨김 -> 409
  it("returns 409 when hiding a product that is part of a visible SET", async () => {
    // set_this_person 및 모든 구성품이 공개 상태로 오버라이드되어 있다고 가정
    db.productVisibility.findMany.mockResolvedValue([
      { catalogId: "set_this_person", visible: true },
      { catalogId: "compat_basic", visible: true },
      { catalogId: "inner_mind", visible: true },
      { catalogId: "marriage", visible: true },
    ]);

    // set_this_person 이 공개된 상태에서 compat_basic 을 숨기려 하면 409
    const res = await POST(
      req({ catalogId: "compat_basic", action: "hide", reason: "단품 일시 중단" })
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("이 상품이 들어 있는 공개 세트");
    expect(data.error).toContain("먼저 숨기세요");
  });

  // 6. 정상 공개가 감사 로그를 남긴다
  it("successfully shows a product and creates an audit log", async () => {
    db.productVisibility.findMany.mockResolvedValueOnce([]);

    const res = await POST(
      req({ catalogId: "wealth", action: "show", reason: "테스트 통과 후 출시" })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.visible).toBe(true);
    expect(data.message).toContain("최대 30초");

    expect(db.productVisibility.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { catalogId: "wealth" },
        update: expect.objectContaining({ visible: true, updatedBy: "admin_1" }),
      })
    );

    expect(db.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminUserId: "admin_1",
          action: "product_visibility",
          targetType: "PRODUCT",
          targetId: "wealth",
          detail: expect.objectContaining({
            action: "show",
            reason: "테스트 통과 후 출시",
          }),
        }),
      })
    );
  });

  // 7. 정상 숨김이 감사 로그를 남긴다
  it("successfully hides a product and creates an audit log", async () => {
    db.productVisibility.findMany.mockResolvedValueOnce([]);

    const res = await POST(
      req({ catalogId: "free_personality", action: "hide", reason: "잠시 점검" })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.visible).toBe(false);

    expect(db.productVisibility.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { catalogId: "free_personality" },
        update: expect.objectContaining({ visible: false }),
      })
    );
  });

  // 8. 정상 reset이 오버라이드를 삭제하고 감사 로그를 남긴다
  it("successfully resets a product visibility override and creates an audit log", async () => {
    db.productVisibility.findMany.mockResolvedValueOnce([
      { catalogId: "wealth", visible: true },
    ]);

    const res = await POST(
      req({ catalogId: "wealth", action: "reset", reason: "코드 기본값으로 복귀" })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    // wealth 의 코드 기본값은 isHidden: true 이므로 visible 은 false
    expect(data.visible).toBe(false);

    expect(db.productVisibility.deleteMany).toHaveBeenCalledWith({
      where: { catalogId: "wealth" },
    });
    expect(db.adminAuditLog.create).toHaveBeenCalled();
  });

  it("returns 500 and writes nothing when current overrides cannot be read", async () => {
    db.productVisibility.findMany.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(req({ catalogId: "compat_basic", action: "hide", reason: "테스트" }));
    expect(res.status).toBe(500);
    expect(db.productVisibility.upsert).not.toHaveBeenCalled();
    expect(db.productVisibility.deleteMany).not.toHaveBeenCalled();
    expect(db.adminAuditLog.create).not.toHaveBeenCalled();
  });
});
