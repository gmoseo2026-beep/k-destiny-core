import { describe, it, expect } from "vitest";
import { checkPreviewQuota, PREVIEW_DAILY_LIMIT } from "@/lib/previewLimit";

const reqWith = (cookie?: string) => new Request("https://kongdak.kr/api/reports/generate", { headers: cookie ? { cookie } : {} });
const cookiePair = (setCookie: string) => setCookie.split(";")[0];

describe("무료 미리보기 하루 한도", () => {
  it(`서로 다른 미리보기는 ${PREVIEW_DAILY_LIMIT}개까지 허용하고 그다음은 막는다`, () => {
    let cookie: string | undefined;
    for (let i = 1; i <= PREVIEW_DAILY_LIMIT; i++) {
      const q = checkPreviewQuota(reqWith(cookie), `TEASER:product${i}:subject`);
      expect(q.allowed).toBe(true);
      expect(q.used).toBe(i);
      cookie = cookiePair(q.setCookie!);
    }
    const over = checkPreviewQuota(reqWith(cookie), "TEASER:another:subject");
    expect(over.allowed).toBe(false);
    expect(over.setCookie).toBeUndefined();
  });

  it("같은 미리보기를 다시 여는 것은 세지 않는다(한도를 넘긴 뒤에도 열린다)", () => {
    let cookie: string | undefined;
    for (let i = 1; i <= PREVIEW_DAILY_LIMIT; i++) {
      cookie = cookiePair(checkPreviewQuota(reqWith(cookie), `TEASER:p${i}`).setCookie!);
    }
    const again = checkPreviewQuota(reqWith(cookie), "TEASER:p1");
    expect(again.allowed).toBe(true);
    expect(again.setCookie).toBeUndefined();
    expect(again.used).toBe(PREVIEW_DAILY_LIMIT);
  });

  it("손댄 쿠키·지난 날짜 쿠키는 무시하고 새로 센다", () => {
    const first = cookiePair(checkPreviewQuota(reqWith(), "TEASER:p1").setCookie!);
    const tampered = first.replace(/.$/, (c) => (c === "0" ? "1" : "0"));
    expect(checkPreviewQuota(reqWith(tampered), "TEASER:p2").used).toBe(1);

    const [name, value] = first.split("=");
    const [, list, sig] = decodeURIComponent(value).split("|");
    const stale = `${name}=${encodeURIComponent(`2020-01-01|${list}|${sig}`)}`;
    expect(checkPreviewQuota(reqWith(stale), "TEASER:p2").used).toBe(1);
  });

  it("쿠키에는 날짜와 해시만 담긴다(상품·입력값 원문 없음)", () => {
    const set = checkPreviewQuota(reqWith(), "TEASER:secret_love:1990-01-01").setCookie!;
    expect(set).toContain("HttpOnly");
    expect(decodeURIComponent(set)).not.toContain("secret_love");
    expect(decodeURIComponent(set)).not.toContain("1990");
  });
});
