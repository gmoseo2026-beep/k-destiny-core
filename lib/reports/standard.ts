import type { Prisma } from "@prisma/client";
import type { ProductPromptSpec } from "@/lib/prompts/productSpecs";
import { pickTeaser } from "@/lib/reports/teaser";

export interface StandardReport {
  headline: string;
  summary: string;
  sections: Array<{ key: string; title: string; body: string }>;
  advice: { do: string[]; dont: string[] };
  closing: string;
}

export interface StandardTeaser {
  headline: string;
  summary: string;
  /** clipped: 화면용으로 본문 뒷부분을 잘라 냈다(clipTeaserForView) */
  freeSection: { key: string; title: string; body: string; clipped?: boolean };
  hooks: string[];
  /** 답을 숨긴 질문 한 문장(2026-10-03). 전체 리포트가 이 질문에 답한다. 예전 저장본에는 없다. */
  unsaid?: string;
}

export interface ReportEnvelope { version: 1; score: number; data: unknown }

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isStrArr = (v: unknown, n: number): v is string[] => Array.isArray(v) && v.length === n && v.every(isStr);

export function makeStandardReportValidator(spec: ProductPromptSpec) {
  return (v: unknown): v is StandardReport => {
    if (!v || typeof v !== "object") return false;
    const r = v as Record<string, unknown>;
    if (!isStr(r.headline) || !isStr(r.summary) || !isStr(r.closing)) return false;
    if (!Array.isArray(r.sections) || r.sections.length !== spec.sections.length) return false;
    const sectionsOk = r.sections.every((s, i) => {
      if (!s || typeof s !== "object") return false;
      const x = s as Record<string, unknown>;
      return x.key === spec.sections[i].key && isStr(x.title) && isStr(x.body);
    });
    const a = r.advice as Record<string, unknown> | undefined;
    return sectionsOk && !!a && isStrArr(a.do, 3) && isStrArr(a.dont, 3);
  };
}

export function makeStandardTeaserValidator(spec: ProductPromptSpec) {
  return (v: unknown): v is StandardTeaser => {
    const t = pickTeaser(v);
    if (!t || t.freeSection.key !== spec.sections[0].key || !isStr(t.freeSection.body)) return false;
    if (t.hooks.length !== spec.sections.length - 1 || !t.hooks.every(isStr)) return false;
    // 잠긴 칸 문구가 무료로 보여 준 문장을 되풀이하면 다시 만든다(미리보기만으로 이야기가 끝나 버린다)
    const shown = `${t.headline} ${t.summary} ${t.freeSection.body}`.replace(/\s+/g, "");
    if (!isStr(t.unsaid) || shown.includes(t.unsaid.replace(/\s+/g, "").replace(/[.!?。…]+$/, ""))) return false;
    return t.hooks.every((h) => !shown.includes(h.replace(/\s+/g, "").replace(/[.!?。]+$/, "")));
  };
}

export function readEnvelope(content: Prisma.JsonValue): ReportEnvelope | null {
  if (!content || typeof content !== "object" || Array.isArray(content)) return null;
  const c = content as Record<string, unknown>;
  if (c.version !== 1 || typeof c.score !== "number" || c.data === undefined) return null;
  return { version: 1, score: c.score, data: c.data };
}
