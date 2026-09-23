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

  // 10. annual_2026 → 400, SET → 400
  it("case 10: annual_2026 and set return 400", async () => {
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
  });

  // 11. 프리미엄 FULL도 compat 주문으로는 403 (B1과 같은 원리)
  it("case 11: premium FULL with compat order returns 403 with 0 AI calls", async () => {
    process.env.PREVIEW_EMAILS = "preview@kongdak.kr";
    session.current = { user: { id: "user_1", email: "preview@kongdak.kr" } };

    db.order.findUnique.mockResolvedValueOnce({
      id: "order_compat",
      orderId: "ord_compat_prem",
      status: "PAID",
      type: "SINGLE",
      productType: "COMPAT",
      productKey: "compat_basic",
      compatId: "comp_123",
      userId: null,
      unlocks: [{ id: "u1", productType: "COMPAT", productKey: "compat_basic", compatId: "comp_123", expiresAt: future }],
    });

    const res = await POST(
      req({
        catalogId: "premium_2027_daeun",
        kind: "FULL",
        orderId: "ord_compat_prem",
        compatId: "comp_123",
        input: person,
      })
    );

    expect(res.status).toBe(403);
    expect(gen.generateJson).toHaveBeenCalledTimes(0);
  });

  // 12. 프리미엄 TEASER 응답에 이름·날짜·한자·점수 목록 등 유료 필드가 없음 (teasers.ts 화이트리스트, AI 호출 0회)
  it("case 12: premium TEASER returns whitelist teaser without calling AI", async () => {
    process.env.PREVIEW_EMAILS = "preview@kongdak.kr";
    session.current = { user: { id: "user_1", email: "preview@kongdak.kr" } };

    const res = await POST(
      req({
        catalogId: "premium_2027_daeun",
        kind: "TEASER",
        input: person,
      })
    );

    expect(res.status).toBe(200);
    expect(gen.generateJson).toHaveBeenCalledTimes(0);
    const body = await res.json();
    expect(body.kind).toBe("TEASER");
    expect(body.data.yearScore).toBeDefined();
    expect(body.data.cycleLabel).toBeDefined();
    expect(body.data.bestMonthMasked).toContain("●월");
    // Ensure paid full-report fields are not present
    expect(body.data.cycleStory).toBeUndefined();
    expect(body.data.yearSummary).toBeUndefined();
    expect(body.data.domains).toBeUndefined();
    expect(body.data.months).toBeUndefined();
    expect(body.data.letter).toBeUndefined();
  });

  // 13. 프리미엄 FULL은 gen.generateJson이 섹션 수(2027은 4개)만큼 호출되고 성공 시 200 반환
  it("case 13: premium FULL calls generateJson for each section and succeeds", async () => {
    process.env.PREVIEW_EMAILS = "preview@kongdak.kr";
    session.current = { user: { id: "user_1", email: "preview@kongdak.kr" } };

    db.order.findUnique.mockResolvedValueOnce({
      id: "ord_db_p1",
      orderId: "ord_prem_paid",
      status: "PAID",
      type: "SINGLE",
      productType: "FORTUNE",
      productKey: "premium_2027_daeun",
      compatId: null,
      userId: "user_1",
      unlocks: [{ id: "u_p1", productType: "FORTUNE", productKey: "premium_2027_daeun", compatId: null, expiresAt: future }],
    });

    db.generatedReport.create.mockResolvedValueOnce({ id: "rep_prem_1" });

    // Mock 4 parallel responses
    gen.generateJson.mockResolvedValueOnce({
      data: {
        headline: "2027 대운 개요",
        keywords: ["도약", "안정", "성취"],
        cycleStory: "10년 주기 이야기입니다.",
        position: "2027년의 위치입니다.",
        yearSummary: "2027년 한 해 총평입니다.",
      },
      model: "gemini-2.5-pro",
    });
    gen.generateJson.mockResolvedValueOnce({
      data: {
        domains: [
          { key: "love", body: "애정운 풀이", do: ["표현하기", "대화하기"], dont: ["의심하기", "서운해하기"] },
          { key: "money", body: "재물운 풀이", do: ["저축하기", "기록하기"], dont: ["충동구매", "무리한투자"] },
          { key: "career", body: "직업운 풀이", do: ["도전하기", "학습하기"], dont: ["방심하기", "미루기"] },
          { key: "health", body: "건강운 풀이", do: ["운동하기", "수면챙기기"], dont: ["과로하기", "야식먹기"] },
          { key: "relationships", body: "인간관계 풀이", do: ["경청하기", "존중하기"], dont: ["편견갖기", "비판하기"] },
          { key: "family", body: "가정운 풀이", do: ["안부묻기", "함께식사"], dont: ["소홀하기", "짜증내기"] },
        ],
      },
      model: "gemini-2.5-pro",
    });
    gen.generateJson.mockResolvedValueOnce({
      data: {
        months: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          theme: `${i + 1}월 테마`,
          body: `${i + 1}월 운세 풀이입니다.`,
          do: "실천",
          dont: "주의",
        })),
      },
      model: "gemini-2.5-pro",
    });
    gen.generateJson.mockResolvedValueOnce({
      data: {
        quarterPlan: [
          { quarter: 1, focus: "1분기 목표", actions: ["행동1", "행동2", "행동3"] },
          { quarter: 2, focus: "2분기 목표", actions: ["행동1", "행동2", "행동3"] },
          { quarter: 3, focus: "3분기 목표", actions: ["행동1", "행동2", "행동3"] },
          { quarter: 4, focus: "4분기 목표", actions: ["행동1", "행동2", "행동3"] },
        ],
        letter: "두근이의 편지입니다.",
      },
      model: "gemini-2.5-pro",
    });

    const res = await POST(
      req({
        catalogId: "premium_2027_daeun",
        kind: "FULL",
        orderId: "ord_prem_paid",
        input: person,
      })
    );

    expect(res.status).toBe(200);
    expect(gen.generateJson).toHaveBeenCalledTimes(4);
    const body = await res.json();
    expect(body.kind).toBe("FULL");
    expect(body.data.sections.overview.headline).toBe("2027 대운 개요");
    expect(body.data.sections.domains.domains).toHaveLength(6);
    expect(body.data.sections.months.months).toHaveLength(12);
  });

  // 14. 프리미엄 FULL에서 섹션 생성 중 하나라도 실패하면 500 에러 및 failGeneration (FAILED 처리)
  it("case 14: premium FULL fails with 500 and updates report status to FAILED if any section fails", async () => {
    process.env.PREVIEW_EMAILS = "preview@kongdak.kr";
    session.current = { user: { id: "user_1", email: "preview@kongdak.kr" } };

    db.order.findUnique.mockResolvedValueOnce({
      id: "ord_db_p2",
      orderId: "ord_prem_fail",
      status: "PAID",
      type: "SINGLE",
      productType: "FORTUNE",
      productKey: "premium_2027_daeun",
      compatId: null,
      userId: "user_1",
      unlocks: [{ id: "u_p2", productType: "FORTUNE", productKey: "premium_2027_daeun", compatId: null, expiresAt: future }],
    });

    db.generatedReport.create.mockResolvedValueOnce({ id: "rep_prem_fail" });

    // Mock 1st succeeds, 2nd rejects
    gen.generateJson.mockResolvedValueOnce({
      data: {
        headline: "2027 대운 개요",
        keywords: ["도약", "안정", "성취"],
        cycleStory: "10년 이야기",
        position: "2027 위치",
        yearSummary: "요약",
      },
      model: "gemini-2.5-pro",
    });
    gen.generateJson.mockRejectedValueOnce(new Error("AI section failed"));

    const res = await POST(
      req({
        catalogId: "premium_2027_daeun",
        kind: "FULL",
        orderId: "ord_prem_fail",
        input: person,
      })
    );

    expect(res.status).toBe(500);
    expect(db.generatedReport.update).toHaveBeenCalledWith({
      where: { id: "rep_prem_fail" },
      data: { status: "FAILED" },
    });
  });
});
