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
  freeSection: { key: string; title: string; body: string };
  hooks: string[];
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
    return !!t && t.freeSection.key === spec.sections[0].key && isStr(t.freeSection.body)
      && t.hooks.length === spec.sections.length - 1 && t.hooks.every(isStr);
  };
}

export function readEnvelope(content: Prisma.JsonValue): ReportEnvelope | null {
  if (!content || typeof content !== "object" || Array.isArray(content)) return null;
  const c = content as Record<string, unknown>;
  if (c.version !== 1 || typeof c.score !== "number" || c.data === undefined) return null;
  return { version: 1, score: c.score, data: c.data };
}
