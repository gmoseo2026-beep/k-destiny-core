/**
 * 검색용 고정 페이지(띠 궁합·출생연도별 운세)를 Cloudflare 가 보관했다가 바로 내줄 수 있게 하는 응답 헤더.
 *
 * 왜: 서버가 페이지를 만드는 데는 0.03~0.07초인데, 원본 서버가 프랑스에 있어 한국에서는
 *     왕복만으로 0.5~1초가 든다(2026-10-08 실측). 이 페이지들은 누가 봐도 같은 화면이라
 *     한국 쪽 중계 서버가 들고 있다가 내주면 그 왕복이 사라진다.
 *
 * 지켜야 하는 것
 * - 브라우저에는 지금처럼 "매번 서버에 확인"만 알린다(휴대폰이 옛 화면을 붙잡지 않게).
 *   보관 시간은 Cloudflare 만 읽는 헤더로 따로 알린다(이 헤더는 브라우저로 전달되지 않는다).
 * - 화면 전환용 데이터 요청(같은 주소에 rsc 헤더만 다른 요청)에는 붙이지 않는다.
 *   붙이면 그 응답이 페이지 주소로 보관돼 다음 방문자가 깨진 화면을 본다.
 * - 이 헤더만으로는 아무 일도 일어나지 않는다. Cloudflare 는 HTML 을 기본으로 보관하지 않으므로
 *   대시보드의 캐시 규칙이 있어야 실제로 보관된다(REVIEW_HANDOFF.md 참고).
 *
 * next.config.ts 가 상대 경로로 읽으므로 "@/" 별칭 import 를 쓰지 않는다.
 */

/** 보관 대상 경로(next.config headers 의 source 문법). ko 만 — 다른 로케일은 동면 중이다. */
export const EDGE_CACHE_SOURCES = [
  "/ko/zodiac",
  "/ko/zodiac/:pair",
  "/ko/fortune/2027",
  "/ko/fortune/2027/:birthYear",
] as const;

/** 하루 동안은 그대로 내주고, 그 뒤 7일은 일단 보관본을 내주면서 뒤에서 새로 받아 온다. */
export const EDGE_MAX_AGE_SECONDS = 60 * 60 * 24;
export const EDGE_STALE_SECONDS = 60 * 60 * 24 * 7;

/** 브라우저용: 저장은 하되 쓸 때마다 서버에 확인한다. */
export const BROWSER_CACHE_CONTROL = "public, max-age=0, must-revalidate";

/** Cloudflare 전용. s-maxage 는 "만료되면 반드시 재확인"을 뜻해 stale 구간을 막으므로 max-age 를 쓴다. */
export const EDGE_CACHE_CONTROL = `max-age=${EDGE_MAX_AGE_SECONDS}, stale-while-revalidate=${EDGE_STALE_SECONDS}`;

/**
 * 이 요청 헤더가 하나라도 있으면 보관용 헤더를 붙이지 않는다(기본값 no-store 가 그대로 남는다).
 * Next 가 화면 전환 때 같은 주소로 보내는 데이터 요청에 붙는 헤더들이다.
 */
export const EDGE_CACHE_SKIP_REQUEST_HEADERS = [
  "rsc",
  "next-router-state-tree",
  "next-router-prefetch",
  "next-router-segment-prefetch",
] as const;

type HeaderRule = {
  source: string;
  missing: { type: "header"; key: string }[];
  headers: { key: string; value: string }[];
};

/** next.config.ts 의 headers() 맨 뒤에 붙인다 — 같은 헤더는 뒤에 온 규칙이 이긴다. */
export function edgeCacheHeaderRules(): HeaderRule[] {
  return EDGE_CACHE_SOURCES.map((source) => ({
    source,
    missing: EDGE_CACHE_SKIP_REQUEST_HEADERS.map((key) => ({ type: "header" as const, key })),
    headers: [
      { key: "Cache-Control", value: BROWSER_CACHE_CONTROL },
      { key: "Cloudflare-CDN-Cache-Control", value: EDGE_CACHE_CONTROL },
    ],
  }));
}
