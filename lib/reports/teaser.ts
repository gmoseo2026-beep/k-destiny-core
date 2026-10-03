import type { StandardTeaser } from "@/lib/reports/standard";

/** AI 원본에서 티저 허용 필드만 복사한다. 유료 키는 존재 자체가 불가능하다. */
export function pickTeaser(raw: unknown): StandardTeaser | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const fs = r.freeSection as Record<string, unknown> | undefined;
  if (typeof r.headline !== "string" || typeof r.summary !== "string" || !fs || !Array.isArray(r.hooks)) return null;
  if (typeof fs.key !== "string" || typeof fs.title !== "string" || typeof fs.body !== "string") return null;
  return {
    headline: r.headline,
    summary: r.summary,
    freeSection: { key: fs.key, title: fs.title, body: fs.body },
    hooks: r.hooks.filter((h): h is string => typeof h === "string").slice(0, 4),
    ...(typeof r.unsaid === "string" && r.unsaid.trim() ? { unsaid: r.unsaid.trim() } : {}),
  };
}

/**
 * 무료 본문을 앞 절반만 남긴다(문장 단위로 자름).
 * 미리보기 한 꼭지를 통째로 주면 읽고 끝나 버려서(2026-10-02 사장님 결정), 화면에는 앞부분만 보여 주고
 * 나머지는 흐린 자리 표시로 대신한다. 뒷부분은 응답에서 아예 빼므로 화면 소스에도 없다.
 */
export function clipHalf(body: string): { text: string; clipped: boolean } {
  const full = body.trim();
  // 문장 끝(. ! ? …) 뒤에서 나눈다. 따옴표 안의 물음표처럼 붙어 있는 경우는 그대로 둔다.
  const sentences = full.split(/(?<=[.!?…])\s+/).filter(Boolean);
  if (sentences.length < 4) return { text: full, clipped: false };
  const target = full.length * 0.5;
  let text = "";
  let used = 0;
  for (const sentence of sentences) {
    // 절반을 넘겼고 최소 두 문장은 보여 줬으면 멈춘다
    if (used >= 2 && text.length >= target) break;
    // 문단 구분은 원문 그대로 유지한다
    const at = full.indexOf(sentence, text.length);
    text = full.slice(0, at + sentence.length);
    used++;
  }
  if (used >= sentences.length) return { text: full, clipped: false };
  return { text: text.trimEnd(), clipped: true };
}

/** 화면으로 내보낼 미리보기: 무료 본문을 절반으로 자르고 잘렸다는 표시를 붙인다. 저장본은 그대로 둔다. */
export function clipTeaserForView(t: StandardTeaser): StandardTeaser {
  const { text, clipped } = clipHalf(t.freeSection.body);
  return { ...t, freeSection: { ...t.freeSection, body: text, clipped } };
}
