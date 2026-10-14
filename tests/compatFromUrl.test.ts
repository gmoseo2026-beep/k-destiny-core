import { describe, expect, it } from "vitest";
import { withCompatFromParam } from "@/lib/compatFromUrl";

describe("withCompatFromParam", () => {
  it("주소에 from이 없을 때 productId·utm_* 등 다른 값을 보존하고 from을 추가한다", () => {
    const raw =
      "https://kongdak.kr/ko/compat/new?productId=compat_contact&utm_source=instagram&utm_medium=story#top";
    expect(withCompatFromParam(raw, "compat_123")).toBe(
      "/ko/compat/new?productId=compat_contact&utm_source=instagram&utm_medium=story&from=compat_123#top"
    );
  });

  it("주소에 이미 같은 from이 있으면 순서나 값을 바꾸지 않고 그대로 돌려준다", () => {
    const raw =
      "https://kongdak.kr/ko/compat/new?from=compat_123&productId=compat_contact&utm_source=threads";
    expect(withCompatFromParam(raw, "compat_123")).toBe(
      "/ko/compat/new?from=compat_123&productId=compat_contact&utm_source=threads"
    );
  });

  it("빈 궁합 id가 넘어오면 기존 주소를 그대로 유지한다", () => {
    const raw = "https://kongdak.kr/ko/compat/new?productId=compat_regret";
    expect(withCompatFromParam(raw, "   ")).toBe("/ko/compat/new?productId=compat_regret");
  });
});
