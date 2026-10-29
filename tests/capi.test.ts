import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { metaEventFor } from "@/lib/metaPixel";
import { tiktokEventFor } from "@/lib/tiktokPixel";
import {
  buildMetaPurchasePayload,
  buildTikTokCompletePaymentPayload,
  extractOrderAdSignals,
  sendServerPurchaseConversions,
} from "@/lib/adConversions";

const mockOrderStore = new Map<string, Record<string, unknown>>();
const mockUnlocks: Record<string, unknown>[] = [];

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => null),
}));

vi.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: {},
}));

vi.mock("@/lib/telegram", () => ({
  sendTelegramMessage: vi.fn(async () => undefined),
}));

vi.mock("@/lib/prisma", () => {
  const client = {
    compatibility: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === "compat_capi_1" ? { id: "compat_capi_1" } : null
      ),
    },
    coupon: {
      findFirst: vi.fn(async () => null),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    productVisibility: {
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
    },
    order: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: "ord_cuid_receipt_001",
          createdAt: new Date("2026-10-29T12:00:00Z"),
          ...data,
        };
        mockOrderStore.set(String(data.orderId), row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: { where: { orderId: string } }) => {
        return mockOrderStore.get(where.orderId) ?? null;
      }),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { orderId: string; status?: { not: string } };
          data: Record<string, unknown>;
        }) => {
          const row = mockOrderStore.get(where.orderId);
          if (!row) return { count: 0 };
          if (where.status?.not && row.status === where.status.not) {
            return { count: 0 };
          }
          Object.assign(row, data);
          return { count: 1 };
        }
      ),
    },
    unlock: {
      findFirst: vi.fn(async ({ where }: { where: { orderId: string } }) => {
        return mockUnlocks.find((u) => u.orderId === where.orderId) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        mockUnlocks.push(data);
        return { id: `unlock_${mockUnlocks.length}`, ...data };
      }),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(client)),
  };
  return { default: client };
});

describe("Argon 15 — 메타 CAPI · 틱톡 Events API 서버 구매 전환", () => {
  beforeEach(() => {
    mockOrderStore.clear();
    mockUnlocks.length = 0;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("1) 브라우저 purchase event_id(= receiptId = Order.id)와 서버 event_id가 완전히 일치하고 열람 토큰(orderId)은 노출하지 않는다", () => {
    const receiptId = "ord_cuid_receipt_001";
    const browserMeta = metaEventFor("purchase", {
      transaction_id: receiptId,
      value: 4900,
      currency: "KRW",
      productId: "inner_mind",
    });
    const browserTikTok = tiktokEventFor("purchase", {
      transaction_id: receiptId,
      value: 4900,
      productId: "inner_mind",
    });

    const serverMeta = buildMetaPurchasePayload({
      eventId: receiptId,
      value: 4900,
      catalogId: "inner_mind",
    });
    const serverTikTok = buildTikTokCompletePaymentPayload(
      {
        eventId: receiptId,
        value: 4900,
        catalogId: "inner_mind",
      },
      "DBCV7Q3C77UCF2HDIVGG"
    );

    expect(browserMeta?.eventId).toBe(receiptId);
    expect(browserTikTok?.eventId).toBe(receiptId);
    expect(serverMeta.data[0].event_id).toBe(browserMeta?.eventId);
    expect(serverTikTok.data[0].event_id).toBe(browserTikTok?.eventId);
    expect(JSON.stringify(serverMeta)).not.toContain("kd_ord_");
    expect(JSON.stringify(serverTikTok)).not.toContain("kd_ord_");
  });

  it("2) 허용된 광고 신호(IP, UA, _fbp, _fbc, _ttp, ttclid)만 추출하고 이름·전화·이메일(해시 포함)·생년월일은 절대 보내지 않는다", () => {
    const req = new NextRequest("https://kongdak.kr/api/payments/order", {
      method: "POST",
      headers: {
        "x-forwarded-for": "203.0.113.42, 10.0.0.1",
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        cookie:
          "_fbp=fb.1.1700000000.123456; _fbc=fb.1.1700000000.AbCdEf; _ttp=2abcDEF_ttp; ttclid=EAlS_ttclid_99; kd_claim=secret_claim; email=leak@example.com",
      },
    });

    const signals = extractOrderAdSignals(req);
    expect(signals).toEqual({
      ip: "203.0.113.42",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      fbp: "fb.1.1700000000.123456",
      fbc: "fb.1.1700000000.AbCdEf",
      ttp: "2abcDEF_ttp",
      ttclid: "EAlS_ttclid_99",
    });

    // 설령 DB JSON에 민감 필드가 섞여 들어오더라도 페이로드 빌더가 모두 버리는지 검증
    const pollutedSignals = {
      ...signals,
      email: "user@example.com",
      em: "6a9759bffd590ac3a842583d2a58b082536993554e760afd283fb2e3e3b7b8a5",
      phone: "010-1234-5678",
      ph: "f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a",
      name: "김콩닥",
      birth: "1997-05-21",
    };

    const metaPayload = buildMetaPurchasePayload({
      eventId: "ord_cuid_1",
      value: 4900,
      catalogId: "inner_mind",
      adSignals: pollutedSignals,
    });
    const tiktokPayload = buildTikTokCompletePaymentPayload(
      {
        eventId: "ord_cuid_1",
        value: 4900,
        catalogId: "inner_mind",
        adSignals: pollutedSignals,
      },
      "DBCV7Q3C77UCF2HDIVGG"
    );

    const combined = JSON.stringify({ metaPayload, tiktokPayload });
    for (const forbidden of [
      "user@example.com",
      "6a9759bffd590ac3a842583d2a58b082536993554e760afd283fb2e3e3b7b8a5",
      "010-1234-5678",
      "f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a",
      "김콩닥",
      "1997-05-21",
      "secret_claim",
    ]) {
      expect(combined).not.toContain(forbidden);
    }
  });

  it("3) META_CAPI_TOKEN·TIKTOK_EVENTS_TOKEN이 없으면 fetch를 호출하지 않고 조용히 건너뛴다", async () => {
    vi.stubEnv("META_CAPI_TOKEN", "");
    vi.stubEnv("TIKTOK_EVENTS_TOKEN", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await sendServerPurchaseConversions({
      eventId: "ord_cuid_skip",
      value: 4900,
      catalogId: "wealth",
    });

    expect(res).toEqual({ meta: "skipped", tiktok: "skipped" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("4) 토큰이 설정되면 메타 Purchase와 틱톡 CompletePayment를 헤더 인증으로 전송한다(URL에 토큰 미노출)", async () => {
    const fakeMetaAuth = "meta_test_token_value";
    const fakeTikTokAuth = "tiktok_test_token_value";
    vi.stubEnv("META_CAPI_TOKEN", fakeMetaAuth);
    vi.stubEnv("TIKTOK_EVENTS_TOKEN", fakeTikTokAuth);

    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const res = await sendServerPurchaseConversions({
      eventId: "ord_cuid_paid_77",
      value: 7900,
      catalogId: "set_flutter",
      adSignals: {
        ip: "198.51.100.7",
        userAgent: "KongdakTestUA/1.0",
        fbp: "fb.1.1.2",
        ttp: "ttp_cookie_1",
      },
      eventTime: new Date("2026-10-29T12:00:00Z"),
    });

    expect(res).toEqual({ meta: "sent", tiktok: "sent" });
    expect(calls).toHaveLength(2);

    const metaCall = calls.find((c) => c.url.includes("graph.facebook.com"))!;
    const tiktokCall = calls.find((c) => c.url.includes("business-api.tiktok.com"))!;

    expect(metaCall.url).not.toContain(fakeMetaAuth);
    expect(tiktokCall.url).not.toContain(fakeTikTokAuth);

    const metaHeaders = metaCall.init?.headers as Record<string, string>;
    const tiktokHeaders = tiktokCall.init?.headers as Record<string, string>;
    expect(metaHeaders.Authorization).toBe(`Bearer ${fakeMetaAuth}`);
    expect(tiktokHeaders["Access-Token"]).toBe(fakeTikTokAuth);

    const metaBody = JSON.parse(String(metaCall.init?.body));
    expect(metaBody.data[0]).toMatchObject({
      event_name: "Purchase",
      event_id: "ord_cuid_paid_77",
      action_source: "website",
      user_data: {
        client_ip_address: "198.51.100.7",
        client_user_agent: "KongdakTestUA/1.0",
        fbp: "fb.1.1.2",
      },
      custom_data: {
        value: 7900,
        currency: "KRW",
        content_ids: ["set_flutter"],
        content_type: "product",
      },
    });

    const tiktokBody = JSON.parse(String(tiktokCall.init?.body));
    expect(tiktokBody).toMatchObject({
      event_source: "web",
      data: [
        {
          event: "CompletePayment",
          event_id: "ord_cuid_paid_77",
          user: {
            ip: "198.51.100.7",
            user_agent: "KongdakTestUA/1.0",
            ttp: "ttp_cookie_1",
          },
          properties: {
            value: 7900,
            currency: "KRW",
            content_type: "product",
            contents: [{ content_id: "set_flutter", content_type: "product" }],
          },
        },
      ],
    });
  });

  it("5) 타임아웃(AbortController)이나 외부 API 장애가 발생해도 예외를 던지지 않고 주문→PAID 결제 처리를 절대 막지 않는다", async () => {
    const fakeMetaAuth = "meta_timeout_token";
    const fakeTikTokAuth = "tiktok_error_token";
    vi.stubEnv("META_CAPI_TOKEN", fakeMetaAuth);
    vi.stubEnv("TIKTOK_EVENTS_TOKEN", fakeTikTokAuth);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // 1. 타임아웃 강제 테스트 (40ms 타임아웃 안에 응답하지 않는 느린 서버)
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const abortErr = new Error("Aborted");
            abortErr.name = "AbortError";
            reject(abortErr);
          });
        })
    );

    const timeoutRes = await sendServerPurchaseConversions(
      {
        eventId: "ord_cuid_timeout",
        value: 4900,
        catalogId: "inner_mind",
      },
      { timeoutMs: 40 }
    );
    expect(timeoutRes).toEqual({ meta: "failed", tiktok: "failed" });
    // 경고 로그에도 토큰이 절대 찍히지 않아야 한다
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain(fakeMetaAuth);
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain(fakeTikTokAuth);

    // 2. 주문 생성(/api/payments/order) → applyPaidOrder 통합 검증 (외부 CAPI 500 오류 상황)
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("Upstream Failure", { status: 500 }));
    fetchMock.mockClear();

    const { POST: createOrder } = await import("@/app/api/payments/order/route");
    const { applyPaidOrder } = await import("@/lib/payments/grant");

    const orderReq = new NextRequest("https://kongdak.kr/api/payments/order", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.88",
        "user-agent": "Mozilla/5.0 KongdakMobile",
        cookie: "_fbp=fb.1.99.88; _ttp=ttp_88",
      },
      body: JSON.stringify({
        productId: "inner_mind",
        compatId: "compat_capi_1",
        email: "buyer@example.com",
      }),
    });

    const orderRes = await createOrder(orderReq);
    expect(orderRes.status).toBe(200);
    const orderJson = await orderRes.json();
    const createdRow = mockOrderStore.get(orderJson.orderId)!;
    expect(createdRow.adSignals).toEqual({
      ip: "203.0.113.88",
      userAgent: "Mozilla/5.0 KongdakMobile",
      fbp: "fb.1.99.88",
      ttp: "ttp_88",
    });

    const grantRes = await applyPaidOrder(orderJson.orderId, "tx_portone_1");
    expect(grantRes).toEqual({ ok: true });
    expect(mockUnlocks).toHaveLength(1);

    // 비동기 전송 완료 대기 후 호출 횟수 확인
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    // 이미 PAID인 주문에 applyPaidOrder가 중복 호출되면 서버 전환을 다시 보내지 않는다
    const duplicateRes = await applyPaidOrder(orderJson.orderId, "tx_portone_1");
    expect(duplicateRes).toEqual({ ok: true, already: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
