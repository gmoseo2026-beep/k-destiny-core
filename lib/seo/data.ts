/**
 * 검색용 페이지 본문 읽기. 본문은 scripts/seo/generateContent.ts 가 만든 정적 파일이다(런타임 AI 호출 없음).
 * 서버 컴포넌트에서만 쓴다(본문 전체가 번들에 들어가지 않게).
 */
import pairsJson from "@/data/seo/zodiac-pairs.json";
import yearsJson from "@/data/seo/fortune-2027.json";
import type { PairContent, YearContent } from "@/lib/seo/content";

const PAIRS = pairsJson as Record<string, PairContent>;
const YEARS = yearsJson as Record<string, YearContent>;

export const getPairContent = (slug: string): PairContent | undefined => PAIRS[slug];
export const getYearContent = (birthYear: number): YearContent | undefined => YEARS[String(birthYear)];
export const pairSlugsWithContent = (): string[] => Object.keys(PAIRS);
export const birthYearsWithContent = (): number[] => Object.keys(YEARS).map(Number);

/** 본문 문자열을 문단으로 나눈다(AI 가 줄바꿈으로 문단을 구분한다) */
export const paragraphs = (text: string): string[] =>
  text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
