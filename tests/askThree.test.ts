import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockCompatibilityFindUnique,
  mockOrderCreate,
  mockOrderFindUnique,
  mockOrderUpdateMany,
  mockUnlockDeleteMany,
  mockGeneratedReportFindUnique,
  mockGeneratedReportFindMany,
  mockGeneratedReportCreate,
  mockGeneratedReportUpdate,
  mockGeneratedReportUpdateMany,
  mockGenerateJson,
  mockCancelPayment,
} = vi.hoisted(() => ({
  mockCompatibilityFindUnique: vi.fn(),
  mockOrderCreate: vi.fn(),
  mockOrderFindUnique: vi.fn(),
  mockOrderUpdateMany: vi.fn(),
  mockUnlockDeleteMany: vi.fn(),
  mockGeneratedReportFindUnique: vi.fn(),
  mockGeneratedReportFindMany: vi.fn(),
  mockGeneratedReportCreate: vi.fn(),
  mockGeneratedReportUpdate: vi.fn(),
  mockGeneratedReportUpdateMany: vi.fn(),
  mockGenerateJson: vi.fn(),
  mockCancelPayment: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/i18n/routing", () => ({
  Link: () => null,
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: {},
}));

vi.mock("@/lib/gen/generateJson", () => ({
  generateJson: mockGenerateJson,
}));

vi.mock("@/lib/payments", () => ({
  payments: {
    cancelPayment: mockCancelPayment,
  },
}));

vi.mock("@/lib/prisma", () => {
  const tx = {
    order: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: mockOrderFindUnique,
      updateMany: mockOrderUpdateMany,
    },
    unlock: {
      deleteMany: mockUnlockDeleteMany,
    },
  };
  const db = {
    compatibility: {
      findUnique: mockCompatibilityFindUnique,
    },
    order: {
      create: mockOrderCreate,
      findUnique: mockOrderFindUnique,
      updateMany: mockOrderUpdateMany,
    },
    unlock: {
      deleteMany: mockUnlockDeleteMany,
    },
    coupon: {
      findFirst: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    productVisibility: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    generatedReport: {
      findUnique: mockGeneratedReportFindUnique,
      findMany: mockGeneratedReportFindMany,
      create: mockGeneratedReportCreate,
      update: mockGeneratedReportUpdate,
      updateMany: mockGeneratedReportUpdateMany,
    },
    $transaction: vi.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
  };
  return { default: db, prisma: db };
});

import {
  getAllProducts,
  getProduct,
  getProductsByTarget,
  isSellableFor,
} from "@/lib/catalog";
import {
  ASK_THREE_CHIPS,
  validateAskThreeQuestions,
  validateSingleAskQuestion,
} from "@/lib/askThreeSafety";
import AskThreeWidget from "@/components/report/AskThreeWidget";
import { buildAskThreePrompt } from "@/lib/prompts/askThree";
import { POST as createOrderPost } from "@/app/api/payments/order/route";
import { POST as generateReportPost } from "@/app/api/reports/generate/route";

const FIRST_THREE_CHIPS: [string, string, string] = [
  ASK_THREE_CHIPS[0],
  ASK_THREE_CHIPS[1],
  ASK_THREE_CHIPS[2],
];

describe("Argon 14 & 18 — 두근이에게 묻기 (ask_three & 추천 질문 칩 7종)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SUBJECT_HASH_SECRET", "test-subject-hash-secret-32chars-minimum!!");
    mockCompatibilityFindUnique.mockResolvedValue({
      id: "compat_ask_1",
      relation: "crush",
      score: 84,
      keywords: ["다정한 리듬", "천천히 깊어짐"],
      breakdown: { element: 82, dayMaster: 86 },
      summaryKo: "두 사람은 처음엔 조심스럽지만 대화가 쌓일수록 편안해지는 사이예요.",
      personA: { name: "민지", gender: "F", dayMaster: "乙", elementsScore: { wood: 2, fire: 2, earth: 1, metal: 1, water: 2 } },
      personB: { name: "준호", gender: "M", dayMaster: "丙", elementsScore: { wood: 1, fire: 3, earth: 2, metal: 1, water: 1 } },
    });
  });

  it("상품 스펙: ask_three는 4,900원 단건 커플 상품이며 일반 목록에서는 제외되고 판매는 허용된다", () => {
    const item = getProduct("ask_three");
    expect(item).toBeDefined();
    expect(item?.name).toBe("그 사람에 대해 묻고 싶은 3가지");
    expect(item?.price).toBe(4900);
    expect(item?.target).toBe("couple");
    expect(item?.placementOnly).toBe("couple_report_bottom");
    expect(isSellableFor(item, false)).toBe(true);
    expect(getProductsByTarget("couple").some((p) => p.id === "ask_three")).toBe(false);
    expect(getAllProducts().some((p) => p.id === "ask_three")).toBe(false);
  });

  it("추천 질문 칩 7종 모두가 개별 검증 및 모든 3개 조합(35가지)에서 validateAskThreeQuestions 안전 필터를 통과하고 가로 스크롤로 렌더링된다", () => {
    expect(ASK_THREE_CHIPS).toEqual([
      "내가 먼저 연락하면 어떨까?",
      "이번 달 안에 만나자고 해도 될까?",
      "그 사람이 원하는 연락 속도는?",
      "읽씹 3일째인데 먼저 연락해도 될까?",
      "이번 주말 약속 잡으려면 어떻게 말하면 좋을까?",
      "다툰 뒤에 먼저 사과하는 게 나을까?",
      "고백하기 좋은 분위기는 어떤 때일까?",
    ]);
    expect(ASK_THREE_CHIPS).toHaveLength(7);

    // 7개 각 칩 단독 검증
    for (const chip of ASK_THREE_CHIPS) {
      expect(validateSingleAskQuestion(chip, 0)).toBeNull();
    }

    // 7개 중 임의의 3개 조합 35가지 전수 validateAskThreeQuestions 통과 검증
    let comboCount = 0;
    for (let i = 0; i < ASK_THREE_CHIPS.length; i++) {
      for (let j = i + 1; j < ASK_THREE_CHIPS.length; j++) {
        for (let k = j + 1; k < ASK_THREE_CHIPS.length; k++) {
          const triple: [string, string, string] = [
            ASK_THREE_CHIPS[i],
            ASK_THREE_CHIPS[j],
            ASK_THREE_CHIPS[k],
          ];
          const res = validateAskThreeQuestions(triple);
          expect(res).toEqual({
            ok: true,
            questions: triple,
          });
          comboCount++;
        }
      }
    }
    expect(comboCount).toBe(35);

    const normalRes = validateAskThreeQuestions([
      "장거리 연애를 시작해도 서로 지치지 않을까?",
      "전남친한테 담담하게 안부 문자 보내도 괜찮을까?",
      "정성을 보이면 상대방도 조금씩 마음을 열어 줄까?",
    ]);
    expect(normalRes.ok).toBe(true);

    // 위젯 펼침 상태 렌더링: 7개 칩 모두 포함 + 가로 스크롤(overflow-x-auto) 및 줄바꿈 방지(whitespace-nowrap shrink-0)
    const html = renderToStaticMarkup(
      React.createElement(AskThreeWidget, {
        compatId: "compat_ask_1",
        locale: "ko",
        fromProductId: "inner_mind",
        defaultOpen: true,
      }),
    );
    for (const chip of ASK_THREE_CHIPS) {
      expect(html).toContain(chip);
    }
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("whitespace-nowrap");
  });

  it("결제 전 안전장치: 건강·법률·돈·임신·자해·폭력·제3자 실명·연락처 질문을 모두 차단한다", () => {
    const cases: Array<{ bad: string; expectedCategory: string }> = [
      { bad: "그 사람이 우울증 약 복용 중인데 건강 상태가 괜찮을까요?", expectedCategory: "health" },
      { bad: "헤어지면서 위자료 청구 소송을 걸면 이길까요?", expectedCategory: "legal" },
      { bad: "그 사람 말 믿고 코인 투자금 대출받아도 될까요?", expectedCategory: "money" },
      { bad: "올해 안에 임신 소식이 생길까요?", expectedCategory: "pregnancy" },
      { bad: "너무 힘들어서 죽고 싶은데 어떡하죠?", expectedCategory: "self_harm" },
      { bad: "그 사람 집 앞까지 몰래 미행하거나 위치 추적해도 될까요?", expectedCategory: "violence" },
      { bad: "직장 동료 김민수 씨가 우리 사이를 방해할까요?", expectedCategory: "third_party_real_name" },
      { bad: "아이돌 차은우랑 사귈 수 있을까요?", expectedCategory: "third_party_real_name" },
      { bad: "제 번호 010-1234-5678로 연락이 올까요?", expectedCategory: "contact_pii" },
      { bad: "인스타 @minji_love99 계정을 팔로우해도 될까요?", expectedCategory: "contact_pii" },
    ];

    for (const c of cases) {
      const res = validateAskThreeQuestions([
        ASK_THREE_CHIPS[0],
        c.bad,
        ASK_THREE_CHIPS[2],
      ]);
      expect(res.ok, `Expected block for: ${c.bad}`).toBe(false);
      if (!res.ok) {
        expect(res.index).toBe(1);
        expect(res.category).toBe(c.expectedCategory);
        expect(res.message.length).toBeGreaterThan(10);
      }
    }

    // 중복 질문 및 개수 부족/초과 거부
    expect(validateAskThreeQuestions([ASK_THREE_CHIPS[0], ASK_THREE_CHIPS[1]]).ok).toBe(false);
    expect(validateAskThreeQuestions([...ASK_THREE_CHIPS]).ok).toBe(false);
    expect(
      validateAskThreeQuestions([ASK_THREE_CHIPS[0], ASK_THREE_CHIPS[0], ASK_THREE_CHIPS[2]]).ok,
    ).toBe(false);
  });

  it("POST /api/payments/order: 금지 질문이면 결제 주문을 만들지 않고 400으로 거절하며, 통과 시 4,900원 주문을 만든다", async () => {
    const unsafeReq = new NextRequest("http://localhost/api/payments/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: "ask_three",
        compatId: "compat_ask_1",
        askQuestions: [
          ASK_THREE_CHIPS[0],
          "주식 투자금 빌려줘도 될까요?",
          ASK_THREE_CHIPS[2],
        ],
      }),
    });
    const unsafeRes = await createOrderPost(unsafeReq);
    expect(unsafeRes.status).toBe(400);
    const unsafeJson = await unsafeRes.json();
    expect(unsafeJson.code).toBe("UNSAFE_QUESTION");
    expect(unsafeJson.category).toBe("money");
    expect(mockOrderCreate).not.toHaveBeenCalled();

    mockOrderCreate.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "db_ord_ask_1",
      ...data,
    }));

    const validReq = new NextRequest("http://localhost/api/payments/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: "ask_three",
        compatId: "compat_ask_1",
        askQuestions: FIRST_THREE_CHIPS,
      }),
    });
    const validRes = await createOrderPost(validReq);
    expect(validRes.status).toBe(200);
    const validJson = await validRes.json();
    expect(validJson.amount).toBe(4900);
    expect(validJson.orderName).toBe("그 사람에 대해 묻고 싶은 3가지");
    expect(mockOrderCreate).toHaveBeenCalledTimes(1);
    expect(mockOrderCreate.mock.calls[0][0].data.askQuestions).toEqual(FIRST_THREE_CHIPS);
  });

  it("프롬프트 근거: 같은 compatId의 결정론 컨텍스트·기본 궁합 요약·기존 커플 리포트 요약·질문 3개·단정 금지/오락 고지를 포함한다", () => {
    const prompt = buildAskThreePrompt({
      contextBlock: "DETERMINISTIC COMPATIBILITY RESULT: Overall Score: 84 / 100",
      score: 84,
      toneGuide: "다정한 한국어 존댓말",
      questions: FIRST_THREE_CHIPS,
      compatSummaryKo: "서로 조심스럽게 다가가는 따뜻한 흐름이에요.",
      priorReports: [
        {
          productName: "그 사람의 속마음",
          headline: "먼저 다가오고 싶지만 망설이는 마음",
          summary: "호감은 분명하지만 거절당할까 봐 속도를 조절하고 있어요.",
        },
      ],
    });

    expect(prompt).toContain("DETERMINISTIC COMPATIBILITY RESULT");
    expect(prompt).toContain("서로 조심스럽게 다가가는 따뜻한 흐름이에요.");
    expect(prompt).toContain("[그 사람의 속마음] 먼저 다가오고 싶지만 망설이는 마음");
    expect(prompt).toContain(FIRST_THREE_CHIPS[0]);
    expect(prompt).toContain(FIRST_THREE_CHIPS[1]);
    expect(prompt).toContain(FIRST_THREE_CHIPS[2]);
    expect(prompt).toContain("단정적으로 예언하지 않는다");
    expect(prompt).toContain("오락");
  });

  it("생성 실패 시 1회 재생성하고, 재생성도 실패하면 PG 취소 + 권한 회수 자동 환불 경로를 탄다", async () => {
    const validOrderRow = {
      id: "db_ord_ask_paid",
      orderId: "kd_ord_ask_paid_1",
      userId: null,
      compatId: "compat_ask_1",
      productType: "COMPAT",
      productKey: "ask_three",
      type: "SINGLE",
      amount: 4900,
      status: "PAID",
      provider: "portone",
      askQuestions: FIRST_THREE_CHIPS,
      unlocks: [
        {
          id: "u_ask_1",
          orderId: "db_ord_ask_paid",
          productType: "COMPAT",
          productKey: "ask_three",
          compatId: "compat_ask_1",
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      ],
    };

    const sampleReport = {
      headline: "조급함만 내려놓으면 대화가 자연스럽게 이어져요",
      summary: "두 사람의 기운은 천천히 온도를 맞출 때 가장 편안해요. 가벼운 안부부터 시작해 보세요.",
      sections: [
        { key: "answer_1", title: `Q1. ${FIRST_THREE_CHIPS[0]}`, body: "가벼운 근황 한 줄로 먼저 말을 건네면 반갑게 받아 줄 흐름이에요." },
        { key: "answer_2", title: `Q2. ${FIRST_THREE_CHIPS[1]}`, body: "부담 없는 짧은 식사나 커피 약속으로 제안하면 좋겠어요." },
        { key: "answer_3", title: `Q3. ${FIRST_THREE_CHIPS[2]}`, body: "즉답을 재촉하기보다 하루 두세 번 여유 있는 템포를 편안해해요." },
        { key: "closing_advice", title: "세 가지 답을 잇는 지금의 방향", body: "상대의 속도를 존중하면서도 내 호감을 숨기지 않는 균형이 도움이 돼요." },
      ],
      advice: {
        do: ["짧고 밝은 안부 건네기", "구체적인 날짜 두 개 중 고르게 하기", "답장 간격에 여유 두기"],
        dont: ["밤늦게 긴 감정 문자 보내기", "답장 속도로 마음 단정하기", "약속을 급하게 몰아붙이기"],
      },
      closing: "이 답장은 오락과 자기이해를 돕는 다정한 참고 풀이이니, 두 분만의 대화를 편안하게 이어가 보세요.",
    };

    // 1) 1차 실패 -> 2차 재생성 성공 시 환불하지 않고 200 반환
    mockOrderFindUnique.mockResolvedValue(validOrderRow);
    mockGeneratedReportFindUnique.mockResolvedValue(null);
    mockGeneratedReportFindMany.mockResolvedValue([]);
    mockGeneratedReportCreate.mockResolvedValue({ id: "rep_ask_1" });
    mockGeneratedReportUpdate.mockResolvedValue({});
    mockGeneratedReportUpdateMany.mockResolvedValue({ count: 1 });
    mockGenerateJson
      .mockRejectedValueOnce(new Error("AI timeout 1"))
      .mockResolvedValueOnce({ data: sampleReport, model: "gemini-2.5-flash" });

    const reqRetryOk = new NextRequest("http://localhost/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catalogId: "ask_three",
        kind: "FULL",
        compatId: "compat_ask_1",
        orderId: "kd_ord_ask_paid_1",
      }),
    });
    const resRetryOk = await generateReportPost(reqRetryOk);
    expect(resRetryOk.status).toBe(200);
    expect(mockGenerateJson).toHaveBeenCalledTimes(2);
    expect(mockCancelPayment).not.toHaveBeenCalled();

    // 2) 1차 실패 + 2차 재생성도 실패 시 PG 취소 및 revokePaidOrder 자동 환불
    vi.clearAllMocks();
    mockCompatibilityFindUnique.mockResolvedValue({
      id: "compat_ask_1",
      relation: "crush",
      score: 84,
      keywords: ["다정한 리듬"],
      breakdown: { element: 82 },
      summaryKo: "따뜻한 흐름",
      personA: { name: "민지", gender: "F", dayMaster: "乙", elementsScore: { wood: 2 } },
      personB: { name: "준호", gender: "M", dayMaster: "丙", elementsScore: { fire: 3 } },
    });
    mockOrderFindUnique.mockResolvedValue(validOrderRow);
    mockOrderUpdateMany.mockResolvedValue({ count: 1 });
    mockUnlockDeleteMany.mockResolvedValue({ count: 1 });
    mockGeneratedReportFindUnique.mockResolvedValue(null);
    mockGeneratedReportFindMany.mockResolvedValue([]);
    mockGeneratedReportCreate.mockResolvedValue({ id: "rep_ask_fail" });
    mockGeneratedReportUpdate.mockResolvedValue({});
    mockCancelPayment.mockResolvedValue({ status: "CANCELLED" });
    mockGenerateJson
      .mockRejectedValueOnce(new Error("AI fail 1"))
      .mockRejectedValueOnce(new Error("AI fail 2"));

    const reqAutoRefund = new NextRequest("http://localhost/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catalogId: "ask_three",
        kind: "FULL",
        compatId: "compat_ask_1",
        orderId: "kd_ord_ask_paid_1",
      }),
    });
    const resAutoRefund = await generateReportPost(reqAutoRefund);
    expect(resAutoRefund.status).toBe(503);
    const refundJson = await resAutoRefund.json();
    expect(refundJson.autoRefunded).toBe(true);
    expect(mockGenerateJson).toHaveBeenCalledTimes(2);
    expect(mockCancelPayment).toHaveBeenCalledTimes(1);
    expect(mockCancelPayment).toHaveBeenCalledWith(
      "kd_ord_ask_paid_1",
      expect.stringContaining("자동 환불"),
    );
    expect(mockOrderUpdateMany).toHaveBeenCalledWith({
      where: { orderId: "kd_ord_ask_paid_1", status: { not: "CANCELED" } },
      data: { status: "CANCELED" },
    });
    expect(mockUnlockDeleteMany).toHaveBeenCalledWith({
      where: { orderId: "db_ord_ask_paid" },
    });
  });
});
