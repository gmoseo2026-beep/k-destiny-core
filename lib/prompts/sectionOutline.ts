import { PRODUCT_SPECS } from "@/lib/prompts/productSpecs";

/**
 * 화면에 보여도 되는 섹션 정보(key·title·guide)만 뽑는다 — 서버에서만 부른다.
 *
 * 클라이언트 컴포넌트가 PRODUCT_SPECS 를 직접 import 하면 angle·voice·brief·guardrails 같은
 * AI 지시문 원문이 브라우저 JS 에 그대로 실려 나간다(2026-10-03 확인). 서버 페이지가 이 함수로
 * 필요한 것만 만들어 props 로 넘긴다. 회귀 방지: tests/clientPromptLeak.test.ts
 */
export interface SectionOutline {
  key: string;
  title: string;
  /** 상품 상세 "이런 내용" 소개 문구(원래 화면에 보이는 글) */
  guide: string;
}

export type SectionOutlineMap = Record<string, SectionOutline[]>;

export function sectionOutlineFor(promptKey: string): SectionOutline[] | undefined {
  const spec = PRODUCT_SPECS[promptKey];
  return spec?.sections.map((s) => ({ key: s.key, title: s.title, guide: s.guide }));
}

/** promptKey → 섹션 목록. 입력 화면처럼 여러 상품을 오가는 곳에 넘긴다(제목은 원래 공개 정보). */
export function sectionOutlines(): SectionOutlineMap {
  const out: SectionOutlineMap = {};
  for (const key of Object.keys(PRODUCT_SPECS)) {
    const outline = sectionOutlineFor(key);
    if (outline) out[key] = outline;
  }
  return out;
}
