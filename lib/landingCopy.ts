import type { CatalogItem } from "@/lib/catalog";

/**
 * 상품 입력 화면(/compat/new?productId=…) 맨 위에 보여 줄 문구.
 *
 * 왜: 광고·공유 링크로 처음 온 사람은 이 화면이 곧 첫 화면이다. 2026-10-08 인스타 광고 164클릭 중
 *     입력을 끝낸 사람이 약 15%였는데, 당시 머리말은 상품과 무관한 "우리, 얼마나 잘 맞을까?" 한 줄이었고
 *     무료라는 말도, 무엇을 보게 되는지도 없었다. 들어오게 만든 약속을 그대로 다시 보여 준다.
 *
 * 규칙(AGENTS.md §1-4): 쉬운 한국어, 한자·전문용어 금지, 단정적 예언 금지 — 질문형·안내형으로만 쓴다.
 */
export interface LandingCopy {
  /** 큰 제목 — 방문자가 이미 품고 온 질문 */
  headline: string;
  /** 무엇을 알려 주는지(최대 3줄) */
  points: string[];
}

/** 광고 소재와 문구를 맞춘 상품만 따로 적는다. 나머지는 카탈로그의 hook·pointDesc 를 쓴다. */
const OVERRIDES: Record<string, LandingCopy> = {
  // 인스타 영상 B("그 사람, 지금 나를 어떻게 생각할까?")가 이 화면으로 온다 — SNS/광고영상_2026-10/제작가이드.md
  inner_mind: {
    headline: "그 사람, 지금 나를 어떻게 생각할까?",
    points: [
      "그 사람이 나에게 끌리는 점과 부담스러워하는 점",
      "겉으로 하는 말과 속으로 하는 생각이 갈리는 지점",
      "그 사람이 아직 말하지 않은 것 하나",
    ],
  },
};

export const LANDING_POINT_LIMIT = 3;

export function landingCopyFor(product: CatalogItem): LandingCopy {
  const override = OVERRIDES[product.id];
  if (override) return override;
  const points = Object.values(product.pointDesc ?? {}).slice(0, LANDING_POINT_LIMIT);
  return {
    headline: product.hook || product.subtitle || product.name,
    points: points.length > 0 ? points : product.recommendFor.slice(0, LANDING_POINT_LIMIT),
  };
}
