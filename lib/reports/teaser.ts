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
  };
}
