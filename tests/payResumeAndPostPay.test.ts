import { describe, it, expect, beforeEach } from "vitest";
import {
  rememberPendingPayment,
  recallPendingPayment,
  clearPendingPayment,
} from "@/lib/payments/client";
import { rememberOptIn, takeOptIn } from "@/lib/marketingConsent";
import { getNextReadings, nextReadingHref } from "@/lib/recommendations/nextReadings";

function createStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe("P-016-1 & P-016-3 — 결제 중단 복귀 안내 + 결제 후 이어보기 · 선택 동의", () => {
  beforeEach(() => {
    const sessionMock = createStorageMock();
    const localMock = createStorageMock();
    Object.defineProperty(globalThis, "window", {
      value: {
        sessionStorage: sessionMock,
        localStorage: localMock,
      },
      configurable: true,
      writable: true,
    });
  });

  it("P-016-1: 포트원 결제창 직전 저장한 { orderId, productId, at }를 10분 안에는 복원하고 만료 후에는 지운다", () => {
    const now = 1_760_000_000_000;
    rememberPendingPayment({ orderId: "ord_123", productId: "inner_mind", at: now });

    // 5분 뒤: 유효
    const within10m = recallPendingPayment(now + 5 * 60 * 1000);
    expect(within10m).toEqual({
      orderId: "ord_123",
      productId: "inner_mind",
      at: now,
    });

    // 10분 초과(10분 1초 뒤): null 반환 및 sessionStorage 에서 삭제
    const expired = recallPendingPayment(now + 10 * 60 * 1000 + 1000);
    expect(expired).toBeNull();
    expect(recallPendingPayment(now + 5 * 60 * 1000)).toBeNull();
  });

  it("P-016-1: clearPendingPayment 호출 시 저장된 결제 중단 복귀 값을 즉시 삭제한다", () => {
    const now = 1_760_000_000_000;
    rememberPendingPayment({ orderId: "ord_456", productId: "compat_basic", at: now });
    expect(recallPendingPayment(now + 1000)?.orderId).toBe("ord_456");

    clearPendingPayment();
    expect(recallPendingPayment(now + 1000)).toBeNull();
  });

  it("P-016-3: 마케팅 수신 동의는 체크하지 않으면 저장되지 않고, 체크했을 때만 1회 꺼낼 수 있다", () => {
    expect(takeOptIn()).toBe(false);
    rememberOptIn(false);
    expect(takeOptIn()).toBe(false);

    rememberOptIn(true);
    expect(takeOptIn()).toBe(true);
    // 한 번 꺼낸 뒤에는 비워진다
    expect(takeOptIn()).toBe(false);
  });

  it("P-016-3: 같은 두 사람으로 이어서 보기 — 이미 산 단품은 제외하고 같은 생년월일 미리보기 주소를 만든다", () => {
    const rec = getNextReadings({
      currentCatalogId: "secret_love",
      ownedCatalogIds: ["secret_love"],
    });
    expect(rec.singles).toHaveLength(2);
    expect(rec.singles.map((s) => s.id)).toEqual(["inner_mind", "compat_basic"]);
    expect(rec.set?.id).toBe("set_this_person");

    expect(nextReadingHref("inner_mind", "cmp_999", "ko", "next")).toBe(
      "/ko/compat/new?productId=inner_mind&from=cmp_999&via=next",
    );
  });
});
