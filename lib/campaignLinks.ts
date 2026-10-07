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
export interface CampaignLink {
  /** 주소에 쓰는 짧은 코드 */
  code: string;
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
    label: "커플다이어리 · 배너 02 「우리 궁합, 몇 점일까?」",
    path: "/compat/new",
    utm: { source: "couplediary", medium: "app_banner", campaign: "couplediary_2026", content: "b02_score" },
  },
  {
    code: "cd2",
    label: "커플다이어리 · 배너 06 「기념일엔 우리 궁합 리포트」",
    path: "/compat/new",
    utm: { source: "couplediary", medium: "app_banner", campaign: "couplediary_2026", content: "b06_anniversary" },
  },
  {
    code: "cd3",
    label: "커플다이어리 · 배너 07 「티격태격도 케미라면?」",
    path: "/compat/new",
    utm: { source: "couplediary", medium: "app_banner", campaign: "couplediary_2026", content: "b07_fight" },
  },
  {
    code: "cd4",
    label: "커플다이어리 · 배너 09 「30초, 생일 두 개면 궁합 끝!」",
    path: "/compat/new",
    utm: { source: "couplediary", medium: "app_banner", campaign: "couplediary_2026", content: "b09_30sec" },
  },
  // ── 인스타그램 영상 광고(2026-10): 영상마다 도입(첫 3초) 3종. 어느 소재가 가입·매출을 만드는지 본다.
  {
    code: "ig-b1",
    label: "인스타 광고 · B 속마음 · 도입1 「답장은 오는데, 마음은 모르겠을 때」",
    path: "/compat/new",
    query: { productId: "inner_mind" },
    utm: { source: "instagram", medium: "paid_social", campaign: "video_b_innermind", content: "vb_hook1" },
  },
  {
    code: "ig-b2",
    label: "인스타 광고 · B 속마음 · 도입2 「그 사람, 지금 나를 어떻게 생각할까?」",
    path: "/compat/new",
    query: { productId: "inner_mind" },
    utm: { source: "instagram", medium: "paid_social", campaign: "video_b_innermind", content: "vb_hook2" },
  },
  {
    code: "ig-b3",
    label: "인스타 광고 · B 속마음 · 도입3 「읽씹 3일째. 끝난 걸까, 바쁜 걸까」",
    path: "/compat/new",
    query: { productId: "inner_mind" },
    utm: { source: "instagram", medium: "paid_social", campaign: "video_b_innermind", content: "vb_hook3" },
  },
  {
    code: "ig-a1",
    label: "인스타 광고 · A 점수 내기 · 도입1 「우리 궁합, 몇 점 나올 것 같아?」",
    path: "/compat/new",
    utm: { source: "instagram", medium: "paid_social", campaign: "video_a_score", content: "va_hook1" },
  },
  {
    code: "ig-a2",
    label: "인스타 광고 · A 점수 내기 · 도입2 「남친은 90점이래. 나는 60점 봤는데…」",
    path: "/compat/new",
    utm: { source: "instagram", medium: "paid_social", campaign: "video_a_score", content: "va_hook2" },
  },
  {
    code: "ig-a3",
    label: "인스타 광고 · A 점수 내기 · 도입3 「궁합 점수 틀린 사람이 오늘 저녁 사기」",
    path: "/compat/new",
    utm: { source: "instagram", medium: "paid_social", campaign: "video_a_score", content: "va_hook3" },
  },
] as const;

export const findCampaignLink = (code: string): CampaignLink | undefined =>
  CAMPAIGN_LINKS.find((l) => l.code === code);

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
