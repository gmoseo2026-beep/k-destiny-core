import { describe, it, expect } from "vitest";
import { parseCompatFreeText, COMPAT_FREE_MARKS } from "@/lib/compatFreeText";

describe("무료 궁합 해석 형식 (2026-10-03 무료=질문, 유료=답)", () => {
  it("새 형식: 장면 2개와 답을 숨긴 질문 1개로 나눈다", () => {
    const raw = `${COMPAT_FREE_MARKS.scenes}\n민지 님이 먼저 연락하고, 준호 님은 답을 늦게 길게 보내요.\n- 약속은 준호 님이 잡지만 장소는 늘 민지 님이 바꿔요.\n${COMPAT_FREE_MARKS.unsaid}\n둘 중 한 사람이 먼저 지치는 때가 있는데, 아직 둘 다 몰라요.`;
    const v = parseCompatFreeText(raw);
    expect(v).toEqual({
      kind: "scenes",
      scenes: [
        "민지 님이 먼저 연락하고, 준호 님은 답을 늦게 길게 보내요.",
        "약속은 준호 님이 잡지만 장소는 늘 민지 님이 바꿔요.",
      ],
      unsaid: "둘 중 한 사람이 먼저 지치는 때가 있는데, 아직 둘 다 몰라요.",
    });
  });

  it("장면이 3개 넘게 와도 2개만 보여 준다", () => {
    const raw = `${COMPAT_FREE_MARKS.scenes}\n하나.\n둘.\n셋.\n${COMPAT_FREE_MARKS.unsaid}\n질문.`;
    const v = parseCompatFreeText(raw);
    expect(v?.kind === "scenes" && v.scenes).toEqual(["하나.", "둘."]);
  });

  it("예전 저장본: 갈등·팁(답)은 무료로 보여 주지 않고 첫 문단만", () => {
    const raw = `케미 문단이에요. 아직 풀리지 않은 게 있어요.\n\n${COMPAT_FREE_MARKS.legacyClash}\n연락 속도로 부딪혀요.\n이럴 땐 먼저 물어보세요.`;
    expect(parseCompatFreeText(raw)).toEqual({ kind: "legacy", text: "케미 문단이에요. 아직 풀리지 않은 게 있어요." });
  });

  it("표시가 없는 짧은 글은 그대로, 빈 값은 null", () => {
    expect(parseCompatFreeText("두 분은 따뜻한 시너지가 있어요.")).toEqual({ kind: "legacy", text: "두 분은 따뜻한 시너지가 있어요." });
    expect(parseCompatFreeText("")).toBeNull();
    expect(parseCompatFreeText(null)).toBeNull();
  });
});
