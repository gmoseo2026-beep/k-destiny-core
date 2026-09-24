import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  generatedReport: {
    findUnique: vi.fn(),
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

import { GET } from "@/app/api/admin/reports/[id]/route";

const req = () =>
  new Request("http://localhost/api/admin/reports/rep_1", {
    method: "GET",
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  session.current = {
    user: { id: "admin_1", email: "admin@kongdak.kr", name: "관리자", role: "ADMIN" },
  };
  db.generatedReport.findUnique.mockResolvedValue({
    id: "rep_1",
    cacheKey: "FULL:ord_123:annual_2026",
    kind: "FULL",
    status: "READY",
    attempts: 1,
    content: {
      version: 1,
      score: 88,
      data: {
        headline: "멋진 한 해",
        summary: "총운 요약입니다.",
      },
    },
    firstViewedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  db.adminAuditLog.create.mockResolvedValue({ id: "log_1" });
});

describe("GET /api/admin/reports/[id] route contract tests", () => {
  it("returns 403 if user is not admin", async () => {
    session.current = { user: { id: "u1", role: "USER" } };
    const res = await GET(req(), { params: Promise.resolve({ id: "rep_1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 404 if report is not found", async () => {
    db.generatedReport.findUnique.mockResolvedValueOnce(null);
    const res = await GET(req(), { params: Promise.resolve({ id: "non_existent" }) });
    expect(res.status).toBe(404);
  });

  it("successfully returns report envelope and logs admin action", async () => {
    const res = await GET(req(), { params: Promise.resolve({ id: "rep_1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.report.id).toBe("rep_1");
    expect(data.report.envelope.score).toBe(88);
    expect(data.report.envelope.data.headline).toBe("멋진 한 해");

    // 감사 로그 검증
    expect(db.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminUserId: "admin_1",
          action: "REPORT_VIEW",
          targetType: "REPORT",
          targetId: "rep_1",
        }),
      })
    );
  });
});
