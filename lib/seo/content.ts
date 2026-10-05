/**
 * 검색용 페이지 본문의 형식과 검사(생성 스크립트와 페이지·테스트가 함께 쓴다).
 * 본문은 scripts/seo/generateContent.ts 가 한 번 만들어 data/seo/*.json 에 저장한다.
 */
export interface SeoFaq {
  q: string;
  a: string;
}

export interface PairContent {
  headline: string;
  summary: string;
  attraction: string;
  friction: string;
  love: string;
  marriage: string;
  tips: string[];
  faq: SeoFaq[];
}

export interface YearContent {
  headline: string;
  summary: string;
  love: string;
  work: string;
  money: string;
  caution: string;
  tips: string[];
  faq: SeoFaq[];
}

const HANJA = /[\u3400-\u4DBF\u4E00-\u9FFF]/;
// 사주 전문용어(화면 노출 금지). "삼재"는 흔히 쓰는 말이라 출생연도 글의 caution 에서만 허용한다.
// "지지(하다)"·"일주일"처럼 일상어와 겹치는 말은 뺐다(일주는 "일주일"이 아닐 때만 잡는다).
const JARGON = /오행|천간|삼합|육합|원진|상극|일주(?!일)|월주|대운|용신|지장간|십성|육해|형살/;
// 단정적 예언
const CERTAIN = /반드시|틀림없이|무조건|확실히 (오|생|일어)/;

const str = (v: unknown, min: number, max: number): v is string =>
  typeof v === "string" && v.trim().length >= min && v.trim().length <= max;

/** 글 한 덩이가 규칙을 지키는지: 한자·전문용어·단정적 예언 없음 */
export function isCleanText(text: string, opts: { allowSamjae?: boolean } = {}): boolean {
  if (HANJA.test(text) || JARGON.test(text) || CERTAIN.test(text)) return false;
  if (!opts.allowSamjae && text.includes("삼재")) return false;
  return true;
}

function faqOk(v: unknown): v is SeoFaq[] {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    v.every((f) => !!f && typeof f === "object" && str((f as SeoFaq).q, 8, 80) && str((f as SeoFaq).a, 40, 260))
  );
}

function tipsOk(v: unknown): v is string[] {
  return Array.isArray(v) && v.length === 3 && v.every((t) => str(t, 12, 110));
}

export function isPairContent(v: unknown): v is PairContent {
  if (!v || typeof v !== "object") return false;
  const c = v as PairContent;
  const ok =
    str(c.headline, 12, 70) &&
    str(c.summary, 40, 320) &&
    str(c.attraction, 180, 700) &&
    str(c.friction, 160, 700) &&
    str(c.love, 90, 420) &&
    str(c.marriage, 90, 420) &&
    tipsOk(c.tips) &&
    faqOk(c.faq);
  if (!ok) return false;
  const all = [c.headline, c.summary, c.attraction, c.friction, c.love, c.marriage, ...c.tips, ...c.faq.flatMap((f) => [f.q, f.a])];
  return all.every((t) => isCleanText(t));
}

/** @param allowSamjae 그 해 삼재에 해당하는 띠일 때만 true — caution·FAQ 답에서 "삼재"를 쓸 수 있다 */
export function isYearContent(v: unknown, allowSamjae: boolean = true): v is YearContent {
  if (!v || typeof v !== "object") return false;
  const c = v as YearContent;
  const ok =
    str(c.headline, 12, 70) &&
    str(c.summary, 40, 320) &&
    str(c.love, 110, 480) &&
    str(c.work, 110, 480) &&
    str(c.money, 90, 420) &&
    str(c.caution, 90, 420) &&
    tipsOk(c.tips) &&
    faqOk(c.faq);
  if (!ok) return false;
  // "삼재"는 caution 과 FAQ 답에서만(해당 띠인 경우) 쓴다
  const strict = [c.headline, c.summary, c.love, c.work, c.money, ...c.tips, ...c.faq.map((f) => f.q)];
  const lenient = [c.caution, ...c.faq.map((f) => f.a)];
  return strict.every((t) => isCleanText(t)) && lenient.every((t) => isCleanText(t, { allowSamjae }));
}
