import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  siteCounter: {
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: db }));

import { POST, resetVisitRateLimiter } from "@/app/api/visit/route";
import { NextRequest } from "next/server";

function createVisitRequest(options: {
  cookies?: Record<string, string>;
  userAgent?: string;
  ip?: string;
}) {
  const headers = new Headers();
  if (options.userAgent !== undefined) {
    headers.set("user-agent", options.userAgent);
  }
  if (options.ip) {
    headers.set("x-forwarded-for", options.ip);
  }

  const req = new NextRequest("http://localhost:3000/api/visit", {
    method: "POST",
    headers,
  });

  if (options.cookies) {
    for (const [k, v] of Object.entries(options.cookies)) {
      req.cookies.set(k, v);
    }
  }

  return req;
}

describe("POST /api/visit contract tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetVisitRateLimiter();
  });

  it("새 방문자는 카운터가 증가하고 Set-Cookie(kd_vid)가 있다", async () => {
    db.siteCounter.upsert.mockResolvedValueOnce({
      key: "visitors",
      value: BigInt(1),
      startedAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createVisitRequest({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
      ip: "123.45.67.89",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // DB 증가 호출 확인
    expect(db.siteCounter.upsert).toHaveBeenCalledTimes(1);
    expect(db.siteCounter.upsert).toHaveBeenCalledWith({
      where: { key: "visitors" },
      create: { key: "visitors", value: 1 },
      update: { value: { increment: 1 } },
    });

    // kd_vid 쿠키 발급 확인
    const cookie = res.cookies.get("kd_vid");
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
  });

  it("이미 kd_vid 쿠키가 있으면 카운터가 증가하지 않고 204를 반환한다", async () => {
    const req = createVisitRequest({
      cookies: { kd_vid: "existing-uuid-1234" },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
      ip: "123.45.67.89",
    });

    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(db.siteCounter.upsert).not.toHaveBeenCalled();
  });

  it("봇 User-Agent(Googlebot, curl, python 등)는 카운터를 증가시키지 않는다", async () => {
    const botUserAgents = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "curl/7.68.0",
      "python-requests/2.28.1",
      "facebookexternalhit/1.1",
      "",
    ];

    for (const ua of botUserAgents) {
      vi.clearAllMocks();
      const req = createVisitRequest({
        userAgent: ua,
        ip: "203.0.113.1",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(db.siteCounter.upsert).not.toHaveBeenCalled();
      expect(res.cookies.get("kd_vid")).toBeDefined();
    }
  });

  it("같은 IP의 6번째 요청은 카운터를 증가시키지 않는다 (하루 최대 5회)", async () => {
    db.siteCounter.upsert.mockResolvedValue({
      key: "visitors",
      value: BigInt(1),
      startedAt: new Date(),
      updatedAt: new Date(),
    });

    const ip = "198.51.100.25";

    // 1~5회차: 증가함
    for (let i = 1; i <= 5; i++) {
      const req = createVisitRequest({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        ip,
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    }
    expect(db.siteCounter.upsert).toHaveBeenCalledTimes(5);

    // 6회차: 증가하지 않음
    vi.clearAllMocks();
    const req6 = createVisitRequest({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      ip,
    });
    const res6 = await POST(req6);
    expect(res6.status).toBe(200);
    expect(db.siteCounter.upsert).not.toHaveBeenCalled();
  });
});
