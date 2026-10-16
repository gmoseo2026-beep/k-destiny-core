/**
 * 제휴 배너·광고 전용 주소(/ko/go/<코드>).
 *
 * 배너·광고 소재마다 주소를 따로 줘서 (1) 서버가 클릭 수를 세고 (2) GA4 가 유입(utm)을 구분하고
 * (3) 그 사람이 결제하면 주문에 유입 표시가 남게 한다. 도착지를 바꿔야 할 때도 제휴사에
 * 주소를 다시 줄 필요 없이 여기만 고치면 된다.
 *
 * 새 제휴·새 광고 소재가 생기면 CAMPAIGN_LINKS 에 줄을 추가한다(코드는 영문 소문자·숫자·하이픈).
 * 광고 플랫폼이 주소 뒤에 붙이는 클릭 표시(fbclid 등)는 도착 주소로 그대로 넘긴다 — 픽셀이 그 값으로 광고 클릭을 알아본다.
 */
import { CAMPAIGN_HANDOFF_CODE_PARAM, CAMPAIGN_HANDOFF_TIME_PARAM, formatCampaignRef } from "@/lib/campaignHandoff";

export interface CampaignLink {
  /** 주소에 쓰는 짧은 코드 */
  code: string;
  /** 제휴사·채널 구분 이름(예: "couplediary", "instagram", "google", "naver") */
  partner: string;
  /** 수익 배분 비율(예: 0.3 = 30%). 합의한 제휴사에만 둔다(커플다이어리는 2026년 말까지 무료 제휴라 없음) */
  rsRate?: number;
  /** 관리자 화면에 보이는 설명 */
  label: string;
  /** 도착 경로(로케일 뒤) */
  path: string;
  /** 도착 주소에 붙일 값(예: 어떤 상품의 입력 화면인지) */
  query?: Record<string, string>;
  utm: { source: string; medium: string; campaign: string; content: string };
}

export const CAMPAIGN_LINKS: readonly CampaignLink[] = [
  {
    code: "cd1",
    partner: "couplediary",
    label: "커플다이어리 · 배너 02 「우리 궁합, 몇 점일까?」",
    path: "/compat/new",
    utm: { source: "couplediary", medium: "app_banner", campaign: "couplediary_2026", content: "b02_score" },
  },
  {
    code: "cd2",
    partner: "couplediary",
    label: "커플다이어리 · 배너 06 「기념일엔 우리 궁합 리포트」",
    path: "/compat/new",
    utm: { source: "couplediary", medium: "app_banner", campaign: "couplediary_2026", content: "b06_anniversary" },
  },
  {
    code: "cd3",
    partner: "couplediary",
    label: "커플다이어리 · 배너 07 「티격태격도 케미라면?」",
    path: "/compat/new",
    utm: { source: "couplediary", medium: "app_banner", campaign: "couplediary_2026", content: "b07_fight" },
  },
  {
    code: "cd4",
    partner: "couplediary",
    label: "커플다이어리 · 배너 09 「30초, 생일 두 개면 궁합 끝!」",
    path: "/compat/new",
    utm: { source: "couplediary", medium: "app_banner", campaign: "couplediary_2026", content: "b09_30sec" },
  },
  // ── 인스타그램 영상 광고(2026-10): 영상마다 도입(첫 3초) 3종. 어느 소재가 가입·매출을 만드는지 본다.
  // 도착 화면은 상품 입력 화면이다. 10-09~10-11 사흘간 홈으로 보냈더니 인스타 클릭 대비 입력 완료가
  // 13.5%(192클릭 중 26) → 7.9%(593클릭 중 47)로 떨어지고, 대부분 무료 궁합으로만 가서 결제 시도가 0건이었다.
  // 홈으로 다시 바꾸려면 이 숫자부터 확인할 것(REVIEW_HANDOFF.md 2026-10-11).
  {
    code: "ig-b1",
    partner: "instagram",
    label: "인스타 광고 · B 속마음 · 도입1 「답장은 오는데, 마음은 모르겠을 때」",
    path: "/compat/new",
    query: { productId: "inner_mind" },
    utm: { source: "instagram", medium: "paid_social", campaign: "video_b_innermind", content: "vb_hook1" },
  },
  {
    code: "ig-b2",
    partner: "instagram",
    label: "인스타 광고 · B 속마음 · 도입2 「그 사람, 지금 나를 어떻게 생각할까?」",
    path: "/compat/new",
    query: { productId: "inner_mind" },
    utm: { source: "instagram", medium: "paid_social", campaign: "video_b_innermind", content: "vb_hook2" },
  },
  {
    code: "ig-b3",
    partner: "instagram",
    label: "인스타 광고 · B 속마음 · 도입3 「읽씹 3일째. 끝난 걸까, 바쁜 걸까」",
    path: "/compat/new",
    query: { productId: "inner_mind" },
    utm: { source: "instagram", medium: "paid_social", campaign: "video_b_innermind", content: "vb_hook3" },
  },
  {
    code: "ig-a1",
    partner: "instagram",
    label: "인스타 광고 · A 점수 내기 · 도입1 「우리 궁합, 몇 점 나올 것 같아?」",
    path: "/compat/new",
    utm: { source: "instagram", medium: "paid_social", campaign: "video_a_score", content: "va_hook1" },
  },
  {
    code: "ig-a2",
    partner: "instagram",
    label: "인스타 광고 · A 점수 내기 · 도입2 「남친은 90점이래. 나는 60점 봤는데…」",
    path: "/compat/new",
    utm: { source: "instagram", medium: "paid_social", campaign: "video_a_score", content: "va_hook2" },
  },
  {
    code: "ig-a3",
    partner: "instagram",
    label: "인스타 광고 · A 점수 내기 · 도입3 「궁합 점수 틀린 사람이 오늘 저녁 사기」",
    path: "/compat/new",
    utm: { source: "instagram", medium: "paid_social", campaign: "video_a_score", content: "va_hook3" },
  },
  // ── 인스타그램 프로필 링크(무료 릴스 업로드용). 릴스 설명글의 주소는 눌러지지 않아서 프로필 링크로 보낸다.
  {
    code: "ig-bio",
    partner: "instagram",
    label: "인스타 프로필 링크 · 릴스(무료 업로드)에서 들어온 사람",
    path: "/compat/new",
    query: { productId: "inner_mind" },
    utm: { source: "instagram", medium: "organic_social", campaign: "reels_organic", content: "bio_link" },
  },
  // ── 검색 광고(2026-10-14): 구글·네이버 광고그룹마다 하나. 도착 화면은 검색어의 뜻에 맞춘 입력 화면이다
  // (인스타 광고에서 홈보다 입력 화면이 입력 완료율이 높았다 — 위 주석). 브랜드 검색만 홈으로 보낸다.
  ...(["google", "naver"] as const).flatMap((src): CampaignLink[] => {
    const p = src === "google" ? "gg" : "nv";
    const name = src === "google" ? "구글 검색" : "네이버 검색";
    return [
      { code: `${p}-compat`, partner: src, label: `${name} · 궁합(무료 궁합 점수)`, path: "/compat/new", utm: { source: src, medium: "cpc", campaign: "search_compat", content: "compat" } },
      { code: `${p}-inner`, partner: src, label: `${name} · 그 사람 속마음·짝사랑·재회`, path: "/compat/new", query: { productId: "inner_mind" }, utm: { source: src, medium: "cpc", campaign: "search_innermind", content: "inner" } },
      { code: `${p}-saju`, partner: src, label: `${name} · 사주(저단가, 2026 총운으로)`, path: "/fortune/annual", utm: { source: src, medium: "cpc", campaign: "search_saju", content: "saju" } },
      { code: `${p}-2026`, partner: src, label: `${name} · 2026 총운(연말 특가)`, path: "/fortune/annual", utm: { source: src, medium: "cpc", campaign: "search_annual2026", content: "annual2026" } },
      { code: `${p}-2027`, partner: src, label: `${name} · 2027 대운(연말 특가)`, path: "/products/premium_2027_daeun", utm: { source: src, medium: "cpc", campaign: "search_daeun2027", content: "daeun2027" } },
      { code: `${p}-brand`, partner: src, label: `${name} · 콩닥(브랜드)`, path: "", utm: { source: src, medium: "cpc", campaign: "search_brand", content: "brand" } },
    ];
  }),
] as const;

export const findCampaignLink = (code: string): CampaignLink | undefined =>
  CAMPAIGN_LINKS.find((l) => l.code === code);

export const linksForPartner = (partner: string): CampaignLink[] =>
  CAMPAIGN_LINKS.filter((l) => l.partner === partner);

export const listPartners = (): string[] =>
  Array.from(new Set(CAMPAIGN_LINKS.map((l) => l.partner)));

export const partnerRsRate = (partner: string): number | undefined =>
  linksForPartner(partner).find((l) => typeof l.rsRate === "number")?.rsRate;

const PARTNER_NAMES: Record<string, string> = {
  couplediary: "커플다이어리",
  instagram: "인스타그램",
  google: "구글 검색",
  naver: "네이버 검색",
};

export const partnerDisplayName = (partner: string): string => PARTNER_NAMES[partner] ?? partner;

/** 광고 플랫폼이 붙이는 클릭 표시. 이것만 도착 주소로 넘긴다(다른 값은 버린다). */
export const CLICK_ID_KEYS = ["fbclid", "gclid", "gbraid", "wbraid", "ttclid", "msclkid"] as const;
const CLICK_ID_VALUE = /^[A-Za-z0-9_.\-]{1,600}$/;

/**
 * 도착 주소(경로 + 상품 등 + utm + 클릭 표시). GA4 는 utm 으로, 광고 픽셀은 클릭 표시로 유입을 구분한다.
 * @param incoming 전용 주소로 들어온 요청의 쿼리 — 정해진 클릭 표시만 꺼내 쓴다
 */
export function campaignTargetPath(link: CampaignLink, locale: string, incoming?: URLSearchParams): string {
  const q = new URLSearchParams({
    ...(link.query ?? {}),
    utm_source: link.utm.source,
    utm_medium: link.utm.medium,
    utm_campaign: link.utm.campaign,
    utm_content: link.utm.content,
  });
  if (incoming) {
    for (const key of CLICK_ID_KEYS) {
      const value = incoming.get(key);
      if (value && CLICK_ID_VALUE.test(value)) q.set(key, value);
    }
  }
  return `/${locale}${link.path}?${q.toString()}`;
}

/** 주문에 남기는 유입 표시("couplediary:b02_score") */
export const campaignTag = (link: CampaignLink): string => `${link.utm.source}:${link.utm.content}`;

/** 쿠키로 받은 유입 표시 검사 — 정해진 글자만 받는다(판정에는 쓰지 않고 집계에만 쓴다). */
export const CAMPAIGN_TAG_RE = /^[a-z0-9]{2,24}:[a-z0-9_]{2,32}$/;
export const CAMPAIGN_COOKIE = "kd_src";
export const CAMPAIGN_COOKIE_DAYS = 30;

/** 배너를 누른 시각(초). 가입이 그 뒤에 일어났는지 보려고 함께 심는다. */
export const CAMPAIGN_TIME_COOKIE = "kd_src_t";

function cookieValue(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0 || part.slice(0, i).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

// 외부 브라우저 전환용 쿠키·주소 값(브라우저에서도 쓰는 부분)은 lib/campaignHandoff.ts — 제휴 목록을 브라우저로 보내지 않으려고 나눴다.
export {
  CAMPAIGN_REF_COOKIE,
  CAMPAIGN_HANDOFF_CODE_PARAM,
  CAMPAIGN_HANDOFF_TIME_PARAM,
  formatCampaignRef,
  appendCampaignHandoffParams,
} from "@/lib/campaignHandoff";

export interface CampaignHandoffResolution {
  /** 기존 쿠키가 더 최근 클릭이면 false(덮어쓰지 않음) */
  shouldSetCookies: boolean;
  cookies: {
    src: string;
    srcT: string;
    ref: string;
    maxAge: number;
  };
  /** ksrc·ksrct 만 빼고 나머지 쿼리(paymentId 등)는 그대로 남긴 쿼리 문자열("?..." 또는 "") */
  cleanedSearch: string;
}

/**
 * middleware 에서 요청 주소의 ksrc·ksrct 를 검사해 쿠키 설정 값과 정리된 쿼리를 만든다.
 * - 등록된 코드만 받는다(없으면 null = 무시).
 * - ksrct 는 정수이고 now-30일 ≤ ksrct ≤ now 일 때만 쓰고, 아니면 지금 시각을 쓴다.
 * - 이미 kd_src_t 가 있고 그 시각이 ksrct 보다 늦으면(더 최근 클릭) 덮어쓰지 않는다.
 */
export function resolveCampaignHandoff(
  searchParams: URLSearchParams,
  cookieHeader: string | null | undefined,
  nowMs: number = Date.now()
): CampaignHandoffResolution | null {
  const rawCode = searchParams.get(CAMPAIGN_HANDOFF_CODE_PARAM);
  if (!rawCode) return null;
  const link = findCampaignLink(rawCode);
  if (!link) return null;

  const nowSec = Math.floor(nowMs / 1000);
  const windowSec = CAMPAIGN_COOKIE_DAYS * 24 * 60 * 60;
  const rawTime = searchParams.get(CAMPAIGN_HANDOFF_TIME_PARAM) ?? "";
  const parsedSec = /^[0-9]{9,11}$/.test(rawTime) ? Number(rawTime) : NaN;
  const clickSec =
    Number.isInteger(parsedSec) && parsedSec >= nowSec - windowSec && parsedSec <= nowSec ? parsedSec : nowSec;

  const existingTag = campaignFromCookieHeader(cookieHeader);
  const existingMs = campaignClickTimeFromCookieHeader(cookieHeader);
  const existingSec = existingMs !== null ? Math.floor(existingMs / 1000) : null;
  const shouldSetCookies = !(existingTag !== null && existingSec !== null && existingSec > clickSec);

  const maxAge = Math.max(1, clickSec + windowSec - nowSec);
  const cleaned = new URLSearchParams(searchParams);
  cleaned.delete(CAMPAIGN_HANDOFF_CODE_PARAM);
  cleaned.delete(CAMPAIGN_HANDOFF_TIME_PARAM);
  const qs = cleaned.toString();

  return {
    shouldSetCookies,
    cookies: {
      src: campaignTag(link),
      srcT: String(clickSec),
      ref: formatCampaignRef(link.code, clickSec),
      maxAge,
    },
    cleanedSearch: qs ? `?${qs}` : "",
  };
}

/** 요청의 Cookie 헤더에서 유입 표시를 꺼낸다. 없거나 형식이 다르면 null. */
export function campaignFromCookieHeader(header: string | null | undefined): string | null {
  const value = cookieValue(header, CAMPAIGN_COOKIE);
  return value && CAMPAIGN_TAG_RE.test(value) ? value : null;
}

/** 배너를 누른 시각(밀리초). 없거나 이상하면 null. */
export function campaignClickTimeFromCookieHeader(header: string | null | undefined): number | null {
  const value = cookieValue(header, CAMPAIGN_TIME_COOKIE);
  if (!value || !/^[0-9]{9,11}$/.test(value)) return null;
  return Number(value) * 1000;
}

const SIGNUP_SKEW_MS = 60 * 1000;
const SIGNUP_FALLBACK_MS = 24 * 60 * 60 * 1000;

/**
 * 이 가입을 배너 덕으로 칠 수 있는가: 배너를 누른 **뒤에** 만든 계정만 센다
 * (원래 회원이 배너를 눌러 들어온 것은 가입이 아니다).
 * 누른 시각을 모르면 방금(24시간 안) 만든 계정만 인정한다.
 */
export function isSignupAfterClick(createdAt: Date, clickAtMs: number | null, now: Date = new Date()): boolean {
  const created = createdAt.getTime();
  if (clickAtMs !== null) return created >= clickAtMs - SIGNUP_SKEW_MS && clickAtMs <= now.getTime() + SIGNUP_SKEW_MS;
  return now.getTime() - created <= SIGNUP_FALLBACK_MS;
}

/** 한국 날짜(YYYY-MM-DD). 클릭 수는 하루 단위로 센다. */
export function kstDateKey(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** SiteCounter 의 키: go:<코드>:<한국 날짜> */
export const campaignCounterKey = (code: string, dateKey: string): string => `go:${code}:${dateKey}`;
export const CAMPAIGN_COUNTER_PREFIX = "go:";

export function parseCampaignCounterKey(key: string): { code: string; date: string } | null {
  const m = /^go:([a-z0-9-]{2,20}):(\d{4}-\d{2}-\d{2})$/.exec(key);
  return m ? { code: m[1], date: m[2] } : null;
}
