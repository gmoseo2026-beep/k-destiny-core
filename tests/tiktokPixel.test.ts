import { describe, it, expect } from "vitest";
import { tiktokEventFor } from "@/lib/tiktokPixel";

describe("틱톡 픽셀 — 이벤트 연결", () => {
  it("상품을 보면 ViewContent", () => {
    expect(tiktokEventFor("view_item", { productId: "inner_mind", tier: "standard" })).toEqual({
      name: "ViewContent",
      params: { contents: [{ content_id: "inner_mind", content_type: "product" }] },
    });
  });

  it("생년월일을 넣고 결과를 보면 SubmitForm(궁합·미리보기)", () => {
    expect(tiktokEventFor("compat_created", { relation: "love" })?.name).toBe("SubmitForm");
    expect(tiktokEventFor("teaser_created", { productId: "inner_mind" })?.params.description).toBe("teaser");
  });

  it("결제창 → 결제 수단 → 결제 완료(금액·영수증 번호)", () => {
    expect(tiktokEventFor("checkout_open", { productId: "inner_mind" })?.name).toBe("InitiateCheckout");
    expect(tiktokEventFor("begin_checkout", { productId: "inner_mind", value: 4900 })?.params).toMatchObject({ value: 4900, currency: "KRW" });
    expect(tiktokEventFor("purchase", { transaction_id: "ord_1", value: 4900, productId: "inner_mind" })).toEqual({
      name: "CompletePayment",
      params: { contents: [{ content_id: "inner_mind", content_type: "product" }], value: 4900, currency: "KRW" },
      eventId: "ord_1",
    });
  });

  it("금액이나 영수증 번호가 없는 결제 신호, 관계없는 이벤트는 보내지 않는다", () => {
    expect(tiktokEventFor("purchase", { value: 4900 })).toBeNull();
    expect(tiktokEventFor("purchase", { transaction_id: "ord_1" })).toBeNull();
    for (const name of ["purchase_confirmed", "checkout_close", "home_card_click", "page_view"]) {
      expect(tiktokEventFor(name, { productId: "wealth" })).toBeNull();
    }
  });

  it("입력값(생년월일·이름·이메일)은 어떤 이벤트에도 실리지 않는다", () => {
    const leaky = { productId: "inner_mind", birth: "1998-04-17", name: "지우", email: "a@b.c", value: 4900, transaction_id: "ord_1" };
    for (const n of ["view_item", "compat_created", "teaser_created", "checkout_open", "begin_checkout", "purchase"]) {
      const s = JSON.stringify(tiktokEventFor(n, leaky));
      expect(s).not.toMatch(/1998|지우|a@b\.c/);
    }
  });
});
