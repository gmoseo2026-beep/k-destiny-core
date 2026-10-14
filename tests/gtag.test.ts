import { describe, it, expect } from "vitest";
import { cleanPageLocation, GA_SENSITIVE_QUERY_KEYS } from "@/lib/gtag";

describe("cleanPageLocation (P-001a)", () => {
  it("strips all 4 sensitive query keys (paymentId, orderId, claimToken, token)", () => {
    expect(GA_SENSITIVE_QUERY_KEYS).toEqual(["paymentId", "orderId", "claimToken", "token"]);
    const raw =
      "https://kongdak.kr/ko/pay/complete?paymentId=kd_ord_secret_123&orderId=ord_456&claimToken=ct_789&token=tk_000&catalog=inner_mind&compat=cmp_1";
    const cleaned = cleanPageLocation(raw);
    expect(cleaned).toBe("https://kongdak.kr/ko/pay/complete?catalog=inner_mind&compat=cmp_1");
    expect(cleaned).not.toContain("kd_ord_secret_123");
    expect(cleaned).not.toContain("ord_456");
    expect(cleaned).not.toContain("ct_789");
    expect(cleaned).not.toContain("tk_000");
  });

  it("preserves non-sensitive query params (productId, from, utm_*, code, message)", () => {
    const raw =
      "https://kongdak.kr/ko/compat/new?productId=inner_mind&from=cmv7cd5if&utm_source=instagram&utm_campaign=vb_hook1#top";
    expect(cleanPageLocation(raw)).toBe(raw);

    const failReturn =
      "https://kongdak.kr/ko/pay/complete?paymentId=kd_ord_secret_999&code=FAILURE_TYPE_PG&message=USER_CANCEL&catalog=inner_mind";
    const cleanedFail = cleanPageLocation(failReturn);
    expect(cleanedFail).toBe(
      "https://kongdak.kr/ko/pay/complete?code=FAILURE_TYPE_PG&message=USER_CANCEL&catalog=inner_mind",
    );
    expect(cleanedFail).not.toContain("kd_ord_secret_999");
  });

  it("handles empty or malformed strings safely without throwing", () => {
    expect(cleanPageLocation("")).toBe("");
    expect(cleanPageLocation("not-a-valid-url")).toBe("not-a-valid-url");
  });
});
