/**
 * 60갑자 일주 연애 성향 · 속마음 · 재회 · 잘 맞는 일주 정적 데이터 (갑자일주 ~ 계해일주, 총 60장).
 * - 요청 시점에 AI를 호출하지 않고 data/seo/ilju-60.json + lib/seo/iljuMeta.ts 정적 데이터만 사용한다.
 * - 화면에 노출되는 모든 문자열에는 한자·사주 전문용어(일주 예외)·단정적 예언을 쓰지 않는다.
 */
import { calculateFourPillars } from "@/lib/saju";
import type { SeoFaq } from "@/lib/seo/content";
import { DAY_PILLAR_TO_SLUG, ILJU_FACTS } from "@/lib/seo/iljuMeta";
import iljuJson from "@/data/seo/ilju-60.json";

export interface IljuSubSection {
  title: string;
  body: string;
}

export interface IljuTextSection {
  id: "love-style" | "inner-mind" | "breakup-reunion";
  heading: string;
  subheadings: readonly IljuSubSection[];
}

export interface IljuBestMatch {
  slug: string;
  name: string;
  metaphor: string;
  tag: string;
  reason: string;
}

export interface IljuBestMatchesSection {
  id: "best-matches";
  heading: string;
  intro: string;
  matches: readonly IljuBestMatch[];
}

export interface IljuPageData {
  index: number;
  slug: string;
  koPair: string;
  name: string;
  title: string;
  metaphor: string;
  animal: string;
  keywords: readonly string[];
  headline: string;
  summary: string;
  sections: {
    loveStyle: IljuTextSection;
    innerMind: IljuTextSection;
    breakupReunion: IljuTextSection;
    bestMatches: IljuBestMatchesSection;
  };
  faq: readonly SeoFaq[];
}

interface RawIljuJsonEntry {
  headline: string;
  summary: string;
  loveStyle: {
    styleAndAttraction: string;
    tempoAndLongevity: string;
    threeSituations: string;
  };
  innerMind: {
    femaleInner: string;
    maleInner: string;
    goodAndAvoidWords: string;
  };
  breakupReunion: {
    breakupSignals: string;
    reunionTiming: string;
  };
  bestMatches: {
    intro: string;
    reasons: readonly [string, string, string];
  };
  faq: readonly SeoFaq[];
}

const RAW_STORE = iljuJson as unknown as Readonly<Record<string, RawIljuJsonEntry>>;

export const ILJU_LIST: readonly IljuPageData[] = ILJU_FACTS.map((fact) => {
  const prose = RAW_STORE[fact.slug];
  if (!prose) {
    throw new Error(`[lib/seo/ilju] missing static prose for ${fact.slug}`);
  }

  const matches: IljuBestMatch[] = fact.matchSpecs.map((spec, idx) => {
    const partner = ILJU_FACTS[spec.index];
    return {
      slug: partner.slug,
      name: partner.name,
      metaphor: `${partner.metaphor} (${partner.animal})`,
      tag: spec.tag,
      reason: prose.bestMatches.reasons[idx],
    };
  });

  return {
    index: fact.index,
    slug: fact.slug,
    koPair: fact.koPair,
    name: fact.name,
    title: fact.title,
    metaphor: fact.metaphor,
    animal: fact.animal,
    keywords: fact.keywords,
    headline: prose.headline,
    summary: prose.summary,
    sections: {
      loveStyle: {
        id: "love-style",
        heading: `${fact.name} 연애 성향`,
        subheadings: [
          {
            title: `${fact.name} 연애 스타일과 끌리는 순간`,
            body: prose.loveStyle.styleAndAttraction,
          },
          {
            title: `${fact.name} 연애 온도와 오래가는 비결`,
            body: prose.loveStyle.tempoAndLongevity,
          },
          {
            title: `${fact.name} 연애에서 자주 생기는 상황 3가지`,
            body: prose.loveStyle.threeSituations,
          },
        ],
      },
      innerMind: {
        id: "inner-mind",
        heading: `${fact.name} 속마음 표현 방식`,
        subheadings: [
          {
            title: `${fact.name} 여자 속마음과 호감 신호`,
            body: prose.innerMind.femaleInner,
          },
          {
            title: `${fact.name} 남자 속마음과 서운할 때 반응`,
            body: prose.innerMind.maleInner,
          },
          {
            title: `${fact.name}에게 하면 좋은 말 / 피할 말`,
            body: prose.innerMind.goodAndAvoidWords,
          },
        ],
      },
      breakupReunion: {
        id: "breakup-reunion",
        heading: `${fact.name} 이별·재회 패턴`,
        subheadings: [
          {
            title: `${fact.name} 이별 결심 이유와 멀어지는 신호`,
            body: prose.breakupReunion.breakupSignals,
          },
          {
            title: `${fact.name} 재회 연락 타이밍과 대화법`,
            body: prose.breakupReunion.reunionTiming,
          },
        ],
      },
      bestMatches: {
        id: "best-matches",
        heading: `${fact.name}와 잘 맞는 일주 3개`,
        intro: prose.bestMatches.intro,
        matches,
      },
    },
    faq: prose.faq,
  };
});

const BY_SLUG = new Map<string, IljuPageData>(ILJU_LIST.map((item) => [item.slug, item]));
const BY_KO = new Map<string, IljuPageData>(
  ILJU_LIST.flatMap((item) => [
    [item.name, item],
    [item.koPair, item],
  ])
);

export function allIljuSlugs(): string[] {
  return ILJU_LIST.map((item) => item.slug);
}

export function getIljuBySlug(slug: string): IljuPageData | undefined {
  return BY_SLUG.get(slug);
}

/**
 * 영문 정본 슬러그("gapja"), 하이픈 변형("gap-ja"), 한글("갑자일주", "갑자")을 모두 해석한다.
 */
export function resolveIljuParam(raw: string): { entry: IljuPageData; canonical: string } | null {
  if (!raw || typeof raw !== "string") return null;
  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded).trim();
  } catch {
    // 잘못된 퍼센트 인코딩은 원문 그대로 처리
  }
  const lower = decoded.toLowerCase().replace(/-/g, "");
  const direct = BY_SLUG.get(lower) ?? BY_KO.get(decoded);
  if (!direct) return null;
  return { entry: direct, canonical: direct.slug };
}

/**
 * 생년월일("YYYY-MM-DD")로 lib/saju.ts(읽기 전용)를 호출해 해당 일주 정적 데이터를 찾는다.
 */
export function findIljuByBirthDate(dob: string): IljuPageData | null {
  if (typeof dob !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split("-").map(Number);
  const currentYear = new Date().getFullYear();
  if (y < 1900 || y > currentYear || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }

  const saju = calculateFourPillars(dob, null, "F", "Seoul, KR");
  const slug = DAY_PILLAR_TO_SLUG[saju.fourPillars.day];
  if (!slug) return null;
  return BY_SLUG.get(slug) ?? null;
}
