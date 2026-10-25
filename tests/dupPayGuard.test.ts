import { describe, it, expect, beforeEach, vi } from "vitest";

// 결제창은 띄우지 않고 "손님이 닫았다"로 돌아오게 한다
vi.mock("@portone/browser-sdk/v2", () => ({
  requestPayment: vi.fn(async () => ({ code: "FAILURE_TYPE_CANCELLED", message: "사용자가 결제를 취소" })),
}));

import { requestPortOnePayment } from "@/lib/payments/client";
import { checkoutOptionsFor, getProduct, separatePrice, CATALOG } from "@/lib/catalog";
import { getNextReadings } from "@/lib/recommendations/nextReadings";

function storage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  };
}

type Call = { url: string; body: Record<string, unknown> };
let calls: Call[] = [];
let completeStatus = 402;
let orderSeq = 0;

beforeEach(() => {
  calls = [];
  completeStatus = 402;
  process.env.NEXT_PUBLIC_PORTONE_STORE_ID = "store-test";
  process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY = "channel-test";
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: storage(),
      sessionStorage: storage(),
      location: { origin: "https://kongdak.test", pathname: "/ko/compat/new", search: "", href: "https://kongdak.test/ko/compat/new" },
      navigator: { userAgent: "test" },
      dispatchEvent: () => true,
    },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "alert", { value: vi.fn(), configurable: true, writable: true });
  globalThis.fetch = vi.fn(async (url: string, init?: { body?: string }) => {
    const body = init?.body ? JSON.parse(init.body) : {};
    calls.push({ url, body });
    if (url === "/api/payments/order") {
      orderSeq += 1;
      return new Response(JSON.stringify({ orderId: `kd_ord_test${orderSeq}`, amount: 4900, orderName: "속마음" }), { status: 200 });
    }
    if (url === "/api/payments/complete") {
      return completeStatus === 200
        ? new Response(JSON.stringify({ orderId: body.paymentId, catalogId: "inner_mind", compatId: "cmp1", amount: 4900, receiptId: "r1" }), { status: 200 })
        : new Response(JSON.stringify({ error: "Payment not completed" }), { status: 402 });
    }
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
});

const buyer = { fullName: "테스트", email: "", phoneNumber: "" };

describe("같은 리포트 두 번 결제 막기 (10-25)", () => {
  it("이 기기에서 열었던 같은 두 사람·같은 리포트 결제가 실제로 끝났으면 새 주문 없이 그 결제로 연다", async () => {
    await requestPortOnePayment({ productId: "inner_mind", compatId: "cmp1", buyer });
    expect(calls.filter((c) => c.url === "/api/payments/order")).toHaveLength(1);

    completeStatus = 200; // 결제는 됐는데 완료 화면으로 못 돌아온 상황
    calls = [];
    const res = await requestPortOnePayment({ productId: "inner_mind", compatId: "cmp1", buyer });
    expect(res.ok).toBe(true);
    expect(calls.some((c) => c.url === "/api/payments/order")).toBe(false);
    expect(calls[0]).toEqual({ url: "/api/payments/complete", body: { paymentId: "kd_ord_test1" } });
  });

  it("앞선 결제가 끝나지 않았으면(402) 평소처럼 새 주문을 만든다", async () => {
    await requestPortOnePayment({ productId: "inner_mind", compatId: "cmp1", buyer });
    calls = [];
    await requestPortOnePayment({ productId: "inner_mind", compatId: "cmp1", buyer });
    expect(calls.filter((c) => c.url === "/api/payments/order")).toHaveLength(1);
  });

  it("다른 두 사람이면 앞선 결제를 묻지 않는다", async () => {
    await requestPortOnePayment({ productId: "inner_mind", compatId: "cmp1", buyer });
    calls = [];
    completeStatus = 200;
    await requestPortOnePayment({ productId: "inner_mind", compatId: "cmp2", buyer });
    expect(calls.some((c) => c.url === "/api/payments/complete")).toBe(false);
  });

  it("한 사람 상품(두 사람 정보 없음)은 친구 것을 또 살 수 있게 묻지 않는다", async () => {
    await requestPortOnePayment({ productId: "annual_2027", buyer });
    calls = [];
    completeStatus = 200;
    await requestPortOnePayment({ productId: "annual_2027", buyer });
    expect(calls.some((c) => c.url === "/api/payments/complete")).toBe(false);
    expect(calls.filter((c) => c.url === "/api/payments/order")).toHaveLength(1);
  });
});

describe("속마음·속궁합 세트 (10-25)", () => {
  const allIds = CATALOG.map((c) => c.id);
  it("2종 세트 규칙대로 7,900원(따로 사면 9,800원)", () => {
    const s = getProduct("set_heart")!;
    expect(s.items).toEqual(["inner_mind", "secret_love"]);
    expect(s.price).toBe(7900);
    expect(separatePrice(s)).toBe(9800);
  });
  it("속마음 결제 창은 4,900 / 7,900 / 19,900 사다리", () => {
    expect(checkoutOptionsFor(getProduct("inner_mind"), allIds).map((o) => o.price)).toEqual([4900, 7900, 19900]);
  });
  it("정통 궁합 결제 창은 그대로(이 사람 세트·확신 패키지)", () => {
    expect(checkoutOptionsFor(getProduct("compat_basic"), allIds).map((o) => o.id)).toEqual(["compat_basic", "set_this_person", "set_sure"]);
  });
  it("속마음을 읽은 뒤 이어 보기는 속궁합이 먼저", () => {
    expect(getNextReadings({ currentCatalogId: "inner_mind" }).singles.map((s) => s.id)).toEqual(["secret_love", "compat_basic"]);
  });
});
