import { describe, it, expect } from "vitest";
import { clipHalf, clipTeaserForView } from "@/lib/reports/teaser";

const BODY =
  "첫 문장은 차분하게 시작해요. 두 번째 문장은 조금 더 깊이 들어가요. 세 번째 문장에서 분위기가 바뀌어요.\n\n" +
  "네 번째 문장은 다른 이야기를 꺼내요. 다섯 번째 문장은 장면을 그려요. 마지막 문장은 물음으로 끝나요?";

describe("미리보기 무료 본문 절반 자르기", () => {
  it("문장 단위로 앞 절반쯤만 남기고, 뒷부분은 결과에 들어 있지 않다", () => {
    const { text, clipped } = clipHalf(BODY);
    expect(clipped).toBe(true);
    expect(BODY.startsWith(text)).toBe(true);
    expect(text.length).toBeGreaterThanOrEqual(BODY.length * 0.4);
    expect(text.length).toBeLessThan(BODY.length * 0.8);
    expect(/[.!?…]$/.test(text)).toBe(true);
    expect(text).not.toContain("마지막 문장");
  });

  it("짧은 글(문장 4개 미만)은 자르지 않는다", () => {
    const short = "한 문장이에요. 두 문장이에요. 세 문장이에요.";
    expect(clipHalf(short)).toEqual({ text: short, clipped: false });
  });

  it("화면용 미리보기는 본문만 줄이고 나머지 필드는 그대로 둔다", () => {
    const t = { headline: "제목", summary: "요약", freeSection: { key: "k", title: "꼭지", body: BODY }, hooks: ["a", "b", "c"] };
    const v = clipTeaserForView(t);
    expect(v.freeSection.clipped).toBe(true);
    expect(v.freeSection.body.length).toBeLessThan(BODY.length);
    expect(v.hooks).toEqual(t.hooks);
    expect(t.freeSection.body).toBe(BODY); // 원본(저장본)은 바뀌지 않는다
  });
});
