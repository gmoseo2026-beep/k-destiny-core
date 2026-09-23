import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const db = vi.hoisted(() => ({
  order: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  compatibility: { findUnique: vi.fn() },
  sajuContentDictionary: { findFirst: vi.fn(async () => null) },
  generatedReport: {
    create: vi.fn(), findUnique: vi.fn(), update: vi.fn(),
    updateMany: vi.fn(async () => ({ count: 1 })),
  },
}));
const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; email?: string; role?: string } } }));
const gen = vi.hoisted(() => ({ generateJson: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
vi.mock("@/lib/gen/generateJson", () => gen);
vi.mock("@/lib/rateLimiter", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
  checkGlobalAiCap: vi.fn(async () => true),
  getClientIp: () => "1.1.1.1",
}));

import { POST } from "@/app/api/reports/generate/route";

const req = (body: unknown) =>
  new Request("http://localhost/api/reports/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
const future = new Date(Date.now() + 86400000);
const person = { name: "테스트", dob: "1995-03-15", time: "10:30", gender: "F" };

beforeEach(() => {
  vi.clearAllMocks();
  session.current = null;
  process.env.SUBJECT_HASH_SECRET = "x".repeat(32);
  delete process.env.PREVIEW_EMAILS;
});

describe("POST /api/reports/generate route contract tests", () => {
  // 1. B1 회귀: compat_basic(compatId X) PAID 주문의 orderId로 {catalogId:"wealth", kind:"FULL", orderId, compatId:"X", input: person} → 403, gen.generateJson 호출 0회.
  it("case 1: B1 regression - compat_basic order trying to generate wealth returns 403 with 0 AI calls", async () => {
    process.env.PREVIEW_EMAILS = "preview@kongdak.kr";
    session.current = { user: { id: "user_1", email: "preview@kongdak.kr" } };

    db.order.findUnique.mockResolvedValueOnce({
      id: "order_1",
      orderId: "ord_compat_x",
      status: "PAID",
      type: "SINGLE",
      productType: "COMPAT",
      productKey: "compat_basic",
      compatId: "X",
      userId: null,
      unlocks: [{ id: "u1", productType: "COMPAT", productKey: "compat_basic", compatId: "X", expiresAt: future }],
    });

    const res = await POST(
      req({
        catalogId: "wealth",
        kind: "FULL",
        orderId: "ord_compat_x",
        compatId: "X",
        input: person,
      })
    );

    expect(res.status).toBe(403);
    expect(gen.generateJson).toHaveBeenCalledTimes(0);
  });

  // 2. PENDING 주문으로 FULL → 402, AI 호출 0회.
  it("case 2: PENDING order for FULL returns 402 with 0 AI calls", async () => {
    process.env.PREVIEW_EMAILS = "preview@kongdak.kr";
    session.current = { user: { id: "user_1", email: "preview@kongdak.kr" } };

    db.order.findUnique.mockResolvedValueOnce({
      id: "order_2",
      orderId: "ord_pending",
      status: "PENDING",
      type: "SINGLE",
      productType: "FORTUNE",
      productKey: "wealth",
      compatId: null,
      userId: "user_1",
      unlocks: [],
    });

    const res = await POST(
      req({
        catalogId: "wealth",
        kind: "FULL",
        orderId: "ord_pending",
        input: person,
      })
    );

    expect(res.status).toBe(402);
    expect(gen.generateJson).toHaveBeenCalledTimes(0);
  });

  // 3. 존재하지 않는 orderId → 403(404 아님).
  it("case 3: nonexistent orderId returns 403 (not 404)", async () => {
    process.env.PREVIEW_EMAILS = "preview@kongdak.kr";
    session.current = { user: { id: "user_1", email: "preview@kongdak.kr" } };

    db.order.findUnique.mockResolvedValueOnce(null);

    const res = await POST(
      req({
        catalogId: "wealth",
        kind: "FULL",
        orderId: "ord_nonexistent",
        input: person,
      })
    );

    expect(res.status).toBe(403);
  });

  // 4. wealth PAID 주문 + FULL, generatedReport.create가 {id:"r1"} 반환, generateJson이 정상 FULL 객체 반환 → 200
  // completeGeneration으로 저장된 content가 { version: 1, score, data } 형식이다.
  // create 호출 인자의 cacheKey가 FULL:<order.id>:wealth다.
  it("case 4: valid wealth PAID order generates full report successfully", async () => {
    process.env.PREVIEW_EMAILS = "preview@kongdak.kr";
    session.current = { user: { id: "user_1", email: "preview@kongdak.kr" } };

    db.order.findUnique.mockResolvedValueOnce({
      id: "order_db_wealth",
      orderId: "ord_wealth_paid",
      status: "PAID",
      type: "SINGLE",
      productType: "FORTUNE",
      productKey: "wealth",
      compatId: null,
      userId: "user_1",
      unlocks: [{ id: "u1", productType: "FORTUNE", productKey: "wealth", compatId: null, expiresAt: future }],
    });

    db.generatedReport.create.mockResolvedValueOnce({ id: "r1" });
    const fullMockData = {
      headline: "재물운이 활짝 열리는 시기",
      summary: "올해는 뜻밖의 기회가 찾아옵니다.",
      sections: [
        { title: "흐름", content: "상반기 흐름이 좋습니다." },
        { title: "주의", content: "지출 관리에 신경 쓰세요." },
      ],
      advice: { do: ["계획 세우기"], dont: ["충동 구매"] },
      closing: "현명한 선택이 결실을 맺습니다.",
    };
    gen.generateJson.mockResolvedValueOnce({ data: fullMockData, model: "gemini-2.5" });

    const res = await POST(
      req({
        catalogId: "wealth",
        kind: "FULL",
        orderId: "ord_wealth_paid",
        input: person,
      })
    );

    expect(res.status).toBe(200);
    expect(db.generatedReport.create).toHaveBeenCalled();
    const createArg = db.generatedReport.create.mock.calls[0][0];
    expect(createArg.data.cacheKey).toBe("FULL:order_db_wealth:wealth");

    expect(db.generatedReport.update).toHaveBeenCalled();
    const updateArg = db.generatedReport.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: "r1" });
    expect(updateArg.data.status).toBe("READY");
    expect(updateArg.data.content).toMatchObject({
      version: 1,
      score: expect.any(Number),
      data: fullMockData,
    });
  });

  // 5. H2: 같은 주문으로 input만 바꿔 FULL 재요청. create는 P2002를 throw하고 findUnique는 READY envelope를 반환. 결과: 저장본이 그대로 반환되고 AI 호출 0회.
  it("case 5: H2 - repeated FULL request with different input returns cached envelope with 0 AI calls", async () => {
    process.env.PREVIEW_EMAILS = "preview@kongdak.kr";
    session.current = { user: { id: "user_1", email: "preview@kongdak.kr" } };

    db.order.findUnique.mockResolvedValueOnce({
      id: "order_db_h2",
      orderId: "ord_h2",
      status: "PAID",
      type: "SINGLE",
      productType: "FORTUNE",
      productKey: "wealth",
      compatId: null,
      userId: "user_1",
      unlocks: [{ id: "u1", productType: "FORTUNE", productKey: "wealth", compatId: null, expiresAt: future }],
    });

    const p2002Error = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "7.0.0",
    });
    db.generatedReport.create.mockRejectedValueOnce(p2002Error);

    const cachedData = {
      headline: "기존 생성된 헤드라인",
      summary: "기존 요약",
      sections: [],
      advice: { do: [], dont: [] },
      closing: "기존 맺음말",
    };
    db.generatedReport.findUnique.mockResolvedValueOnce({
      id: "r1",
      status: "READY",
      content: { version: 1, score: 92, data: cachedData },
      updatedAt: new Date(),
    });

    const res = await POST(
      req({
        catalogId: "wealth",
        kind: "FULL",
        orderId: "ord_h2",
        input: { name: "다른사람", dob: "1990-01-01", time: "12:00", gender: "M" },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(cachedData);
    expect(gen.generateJson).toHaveBeenCalledTimes(0);
  });

  // 6. READY인데 content가 {headline:"Test"}(envelope 아님) → 503, generatedReport.update가 status:"FAILED"로 호출된다.
  it("case 6: READY row without envelope returns 503 and marks status FAILED", async () => {
    process.env.PREVIEW_EMAILS = "preview@kongdak.kr";
    session.current = { user: { id: "user_1", email: "preview@kongdak.kr" } };

    db.order.findUnique.mockResolvedValueOnce({
      id: "order_corrupt",
      orderId: "ord_corrupt",
      status: "PAID",
      type: "SINGLE",
      productType: "FORTUNE",
      productKey: "wealth",
      compatId: null,
      userId: "user_1",
      unlocks: [{ id: "u1", productType: "FORTUNE", productKey: "wealth", compatId: null, expiresAt: future }],
    });

    const p2002Error = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "7.0.0",
    });
    db.generatedReport.create.mockRejectedValueOnce(p2002Error);

    db.generatedReport.findUnique.mockResolvedValueOnce({
      id: "r_corrupt",
      status: "READY",
      content: { headline: "Test" }, // corrupted / not envelope
      updatedAt: new Date(),
    });

    const res = await POST(
      req({
        catalogId: "wealth",
        kind: "FULL",
        orderId: "ord_corrupt",
        input: person,
      })
    );

    expect(res.status).toBe(503);
    expect(db.generatedReport.update).toHaveBeenCalledWith({
      where: { id: "r_corrupt" },
      data: { status: "FAILED" },
    });
  });

  // 7. 불변식 5: TEASER 요청에서 generateJson이 sections·advice·closing을 포함한 객체를 반환하게 한다. 응답 JSON 문자열에 "sections", "advice", "closing"이 없어야 한다.
  it("case 7: invariant 5 - TEASER strips sections, advice, and closing from response", async () => {
    process.env.PREVIEW_EMAILS = "preview@kongdak.kr";
    session.current = { user: { id: "user_1", email: "preview@kongdak.kr" } };

    db.generatedReport.create.mockResolvedValueOnce({ id: "r_teaser" });
    gen.generateJson.mockResolvedValueOnce({
      data: {
        headline: "티저 헤드라인",
        summary: "티저 요약",
        freeSection: { key: "free", title: "맛보기", body: "맛보기 내용" },
        hooks: ["훅1", "훅2"],
        sections: [{ title: "유료 섹션", content: "0바이트여야 함" }],
        advice: { do: ["비밀"], dont: ["금지"] },
        closing: "유료 맺음말",
      },
      model: "gemini-2.5",
    });

    const res = await POST(
      req({
        catalogId: "wealth",
        kind: "TEASER",
        input: person,
      })
    );

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain('"sections"');
    expect(text).not.toContain('"advice"');
    expect(text).not.toContain('"closing"');
    expect(text).toContain('"headline"');
    expect(text).toContain('"freeSection"');
  });

  // 8. PII: 임의 요청 후 generatedReport.create의 인자 전체를 JSON.stringify한 문자열에 1995-03-15와 테스트가 포함되지 않는다.
  it("case 8: PII check - generatedReport.create does not contain raw DOB or name", async () => {
    process.env.PREVIEW_EMAILS = "preview@kongdak.kr";
    session.current = { user: { id: "user_1", email: "preview@kongdak.kr" } };

    db.generatedReport.create.mockResolvedValueOnce({ id: "r_pii" });
    gen.generateJson.mockResolvedValueOnce({
      data: {
        headline: "헤드라인",
        summary: "요약",
        freeSection: { key: "free", title: "소제목", body: "내용" },
        hooks: ["훅1"],
      },
      model: "gemini-2.5",
    });

    await POST(
      req({
        catalogId: "wealth",
        kind: "TEASER",
        input: person,
      })
    );

    expect(db.generatedReport.create).toHaveBeenCalled();
    const dumpedCalls = JSON.stringify(db.generatedReport.create.mock.calls);
    expect(dumpedCalls).not.toContain("1995-03-15");
    expect(dumpedCalls).not.toContain("테스트");
  });

  // 9. 숨김 상품(wealth) TEASER → 404. V2 적용 후, 세션 이메일이 PREVIEW_EMAILS에 있으면 200.
  it("case 9: hidden product returns 404 without preview, but 200 with PREVIEW_EMAILS session", async () => {
    // 9a: No preview session -> 404
    session.current = null;
    delete process.env.PREVIEW_EMAILS;

    const resNoPreview = await POST(
      req({
        catalogId: "wealth",
        kind: "TEASER",
        input: person,
      })
    );
    expect(resNoPreview.status).toBe(404);

    // 9b: With preview session -> 200
    process.env.PREVIEW_EMAILS = "owner@kongdak.kr";
    session.current = { user: { id: "owner_1", email: "owner@kongdak.kr" } };

    db.generatedReport.create.mockResolvedValueOnce({ id: "r_prev" });
    gen.generateJson.mockResolvedValueOnce({
      data: {
        headline: "미리보기 헤드라인",
        summary: "요약",
        freeSection: { key: "free", title: "무료", body: "내용" },
        hooks: ["훅1"],
      },
      model: "gemini-2.5",
    });

    const resWithPreview = await POST(
      req({
        catalogId: "wealth",
        kind: "TEASER",
        input: person,
      })
    );
    expect(resWithPreview.status).toBe(200);
  });

  // 10. annual_2026 → 400, SET → 400, 프리미엄 → 400(Phase 4 전까지).
  it("case 10: annual_2026, set, and premium return 400", async () => {
    process.env.PREVIEW_EMAILS = "preview@kongdak.kr";
    session.current = { user: { id: "preview_1", email: "preview@kongdak.kr" } };

    // annual_2026 -> 400
    const resAnnual = await POST(req({ catalogId: "annual_2026", kind: "TEASER", input: person }));
    expect(resAnnual.status).toBe(400);
    const bodyAnnual = await resAnnual.json();
    expect(bodyAnnual.error).toContain("총운은 /api/fortune/annual");

    // set_me -> 400
    const resSet = await POST(req({ catalogId: "set_me", kind: "TEASER", input: person }));
    expect(resSet.status).toBe(400);
    const bodySet = await resSet.json();
    expect(bodySet.error).toContain("세트는 구성 상품별로");

    // premium (premium_2027_daeun) -> 400
    const resPremium = await POST(req({ catalogId: "premium_2027_daeun", kind: "TEASER", input: person }));
    expect(resPremium.status).toBe(400);
    const bodyPremium = await resPremium.json();
    expect(bodyPremium.error).toContain("지원하지 않는 상품입니다");
  });
});
