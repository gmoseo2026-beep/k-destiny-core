import { describe, it, expect } from "vitest";
import { isAdminPath, isLocalHost, metaEventFor, safePathFor } from "@/lib/metaPixel";

describe("메타 픽셀 — 이벤트 연결", () => {
  it("상품을 보면 ViewContent", () => {
    expect(metaEventFor("view_item", { productId: "wealth", tier: "standard" })).toEqual({
      name: "ViewContent",
      params: { content_ids: ["wealth"], content_type: "product" },
    });
  });

  it("생년월일을 넣고 결과를 보면 Lead(궁합·미리보기)", () => {
    expect(metaEventFor("compat_created", { relation: "love", has_ref: false })?.name).toBe("Lead");
    const t = metaEventFor("teaser_created", { productId: "inner_mind", tier: "standard" });
    expect(t).toEqual({ name: "Lead", params: { content_name: "inner_mind", content_category: "teaser" } });
  });

  it("결제창 → 결제 수단 → 결제 완료", () => {
    expect(metaEventFor("checkout_open", { productId: "wealth", guest: true })?.name).toBe("InitiateCheckout");
    expect(metaEventFor("begin_checkout", { productId: "wealth", value: 4900, currency: "KRW" })).toEqual({
      name: "AddPaymentInfo",
      params: { content_ids: ["wealth"], content_type: "product", value: 4900, currency: "KRW" },
    });
    expect(metaEventFor("purchase", { transaction_id: "ord_1", value: 4900, currency: "KRW", productId: "wealth" })).toEqual({
      name: "Purchase",
      params: { content_ids: ["wealth"], content_type: "product", value: 4900, currency: "KRW" },
      eventId: "ord_1",
    });
  });

  it("금액이나 영수증 번호가 없는 결제 신호는 보내지 않는다", () => {
    expect(metaEventFor("purchase", { value: 4900, productId: "wealth" })).toBeNull();
    expect(metaEventFor("purchase", { transaction_id: "ord_1", productId: "wealth" })).toBeNull();
  });

  it("관계없는 이벤트는 보내지 않는다(결제 확인 중복 포함)", () => {
    for (const name of ["purchase_confirmed", "checkout_close", "home_card_click", "report_generated", "marketing_optin", "page_view"]) {
      expect(metaEventFor(name, { productId: "wealth" })).toBeNull();
    }
  });

  it("입력값(생년월일·이름·이메일 등)은 어떤 이벤트에도 실리지 않는다", () => {
    const leaky = { productId: "wealth", name: "홍길동", birth: "1990-01-01", email: "a@b.com", compatId: "c123", app: "threads:m", value: 4900, transaction_id: "ord_1" };
    for (const name of ["view_item", "compat_created", "teaser_created", "checkout_open", "begin_checkout", "purchase"]) {
      const ev = metaEventFor(name, leaky)!;
      const text = JSON.stringify(ev.params);
      for (const bad of ["홍길동", "1990-01-01", "a@b.com", "c123", "threads"]) expect(text).not.toContain(bad);
    }
  });
});

describe("메타 픽셀 — 주소 가리기와 제외", () => {
  it("주문번호 같은 민감한 값만 주소에서 뺀다", () => {
    expect(safePathFor("https://kongdak.kr/ko/pay/complete?paymentId=kd_ord_abc&utm_source=ig")).toBe("/ko/pay/complete?utm_source=ig");
    expect(safePathFor("https://kongdak.kr/ko/report/new?c=wealth&orderId=kd_ord_abc")).toBe("/ko/report/new?c=wealth");
    expect(safePathFor("https://kongdak.kr/ko/x?token=t&claimToken=c#top")).toBe("/ko/x#top");
  });

  it("가릴 것이 없으면 손대지 않는다", () => {
    expect(safePathFor("https://kongdak.kr/ko/compat/new?productId=inner_mind&utm_source=ig")).toBeNull();
    expect(safePathFor("https://kongdak.kr/ko")).toBeNull();
    expect(safePathFor("not a url")).toBeNull();
  });

  it("개발 PC 와 관리자 화면을 구분한다", () => {
    expect(isLocalHost("localhost")).toBe(true);
    expect(isLocalHost("127.0.0.1")).toBe(true);
    expect(isLocalHost("kongdak.kr")).toBe(false);
    expect(isAdminPath("/ko/admin")).toBe(true);
    expect(isAdminPath("/ko/admin/campaigns")).toBe(true);
    expect(isAdminPath("/ko/compat/new")).toBe(false);
  });
});
