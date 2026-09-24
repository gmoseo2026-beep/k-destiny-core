import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  generatedReport: {
    findUnique: vi.fn(),
    update: vi.fn(),
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

import { POST } from "@/app/api/admin/reports/reset/route";

const req = (body: unknown) =>
  new Request("http://localhost/api/admin/reports/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  session.current = {
    user: { id: "admin_1", email: "admin@kongdak.kr", name: "관리자", role: "ADMIN" },
  };
  db.generatedReport.findUnique.mockResolvedValue({
    id: "rep_1",
    status: "FAILED",
    attempts: 3,
    content: { some: "content" },
  });
  db.generatedReport.update.mockResolvedValue({
    id: "rep_1",
    status: "FAILED",
    attempts: 0,
  });
  db.adminAuditLog.create.mockResolvedValue({ id: "log_1" });
});

describe("POST /api/admin/reports/reset route contract tests", () => {
  it("returns 403 if not admin", async () => {
    session.current = { user: { id: "u1", role: "USER" } };
    const res = await POST(req({ reportId: "rep_1" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 if reportId is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 if report does not exist", async () => {
    db.generatedReport.findUnique.mockResolvedValueOnce(null);
    const res = await POST(req({ reportId: "non_existent" }));
    expect(res.status).toBe(404);
  });

  it("successfully resets status to FAILED and attempts to 0, logs admin action", async () => {
    const res = await POST(req({ reportId: "rep_1", reason: "고객 문의로 재시도 허용" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.attempts).toBe(0);

    // update 호출 검증: content 는 덮어쓰지 않고 status, attempts 만
    expect(db.generatedReport.update).toHaveBeenCalledWith({
      where: { id: "rep_1" },
      data: {
        status: "FAILED",
        attempts: 0,
      },
    });

    // 감사 로그 검증
    expect(db.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminUserId: "admin_1",
          action: "REPORT_RESET",
          targetType: "REPORT",
          targetId: "rep_1",
          detail: expect.objectContaining({
            previousAttempts: 3,
            reason: "고객 문의로 재시도 허용",
          }),
        }),
      })
    );
  });

  it("refuses to reset a READY report (409) so a delivered report is never regenerated", async () => {
    db.generatedReport.findUnique.mockResolvedValueOnce({
      id: "rep_ok", status: "READY", attempts: 1, content: { version: 1 }, updatedAt: new Date(),
    });
    const res = await POST(req({ reportId: "rep_ok" }));
    expect(res.status).toBe(409);
    expect(db.generatedReport.update).not.toHaveBeenCalled();
  });

  it("refuses to reset a GENERATING report younger than 10 minutes (409), allows a stale one", async () => {
    db.generatedReport.findUnique.mockResolvedValueOnce({
      id: "rep_busy", status: "GENERATING", attempts: 1, content: null, updatedAt: new Date(),
    });
    expect((await POST(req({ reportId: "rep_busy" }))).status).toBe(409);

    db.generatedReport.findUnique.mockResolvedValueOnce({
      id: "rep_stuck", status: "GENERATING", attempts: 1, content: null,
      updatedAt: new Date(Date.now() - 11 * 60 * 1000),
    });
    expect((await POST(req({ reportId: "rep_stuck" }))).status).toBe(200);
  });
});
