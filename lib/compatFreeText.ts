/**
 * 무료 궁합 해석(compat.summaryKo) 형식 — 서버 프롬프트와 화면이 함께 쓴다(서버 SDK 를 끌어오지 않는 작은 모듈).
 *
 * 2026-10-03 무료/유료 경계 재설계: 무료는 "질문을 만들어 주는 것", 유료는 "답".
 *   [맞히는 장면]          ← 두 사람의 일상 장면 2문장("어떻게 알았지?")
 *   [아직 말하지 않은 것]   ← 답을 숨긴 질문 1문장 → 심층 궁합으로 연결
 *
 * 예전 저장본은 "케미 한 문단 + [부딪히기 쉬운 순간] + 갈등·팁" 형식이었다.
 * 예전 저장본도 갈등·팁(답)은 무료로 보여 주지 않고 첫 문단만 보여 준다.
 */
export const COMPAT_FREE_MARKS = {
  scenes: "[맞히는 장면]",
  unsaid: "[아직 말하지 않은 것]",
  legacyClash: "[부딪히기 쉬운 순간]",
} as const;

export type CompatFreeView =
  | { kind: "scenes"; scenes: string[]; unsaid: string }
  | { kind: "legacy"; text: string };

const lines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.replace(/^[\s\-•·*]+/, "").trim())
    .filter(Boolean);

export function parseCompatFreeText(raw: string | null | undefined): CompatFreeView | null {
  const text = (raw ?? "").trim();
  if (!text) return null;

  const sceneAt = text.indexOf(COMPAT_FREE_MARKS.scenes);
  if (sceneAt >= 0) {
    const unsaidAt = text.indexOf(COMPAT_FREE_MARKS.unsaid, sceneAt);
    const sceneBody = text.slice(sceneAt + COMPAT_FREE_MARKS.scenes.length, unsaidAt >= 0 ? unsaidAt : undefined);
    const unsaidBody = unsaidAt >= 0 ? text.slice(unsaidAt + COMPAT_FREE_MARKS.unsaid.length) : "";
    const scenes = lines(sceneBody).slice(0, 2);
    if (scenes.length > 0) return { kind: "scenes", scenes, unsaid: lines(unsaidBody).join(" ") };
  }

  const clashAt = text.indexOf(COMPAT_FREE_MARKS.legacyClash);
  const head = (clashAt >= 0 ? text.slice(0, clashAt) : text).trim();
  return head ? { kind: "legacy", text: head } : null;
}
