/**
 * 제휴·배너 전용 주소(/ko/go/<코드>).
 *
 * 배너마다 주소를 따로 줘서 (1) 서버가 클릭 수를 세고 (2) GA4 가 유입(utm)을 구분하고
 * (3) 그 사람이 결제하면 주문에 유입 표시가 남게 한다. 도착지를 바꿔야 할 때도 제휴사에
 * 주소를 다시 줄 필요 없이 여기만 고치면 된다.
 *
 * 새 제휴가 생기면 CAMPAIGN_LINKS 에 줄을 추가한다(코드는 영문 소문자·숫자·하이픈).
 */
export interface CampaignLink {
  /** 주소에 쓰는 짧은 코드 */
  code: string;
  /** 관리자 화면에 보이는 설명 */
  label: string;
  /** 도착 경로(로케일 뒤) */
  path: string;
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
] as const;

export const findCampaignLink = (code: string): CampaignLink | undefined =>
  CAMPAIGN_LINKS.find((l) => l.code === code);

/** 도착 주소(경로 + utm). GA4 가 이 주소의 utm 으로 유입을 구분한다. */
export function campaignTargetPath(link: CampaignLink, locale: string): string {
  const q = new URLSearchParams({
    utm_source: link.utm.source,
    utm_medium: link.utm.medium,
    utm_campaign: link.utm.campaign,
    utm_content: link.utm.content,
  });
  return `/${locale}${link.path}?${q.toString()}`;
}

/** 주문에 남기는 유입 표시("couplediary:b02_score") */
export const campaignTag = (link: CampaignLink): string => `${link.utm.source}:${link.utm.content}`;

/** 쿠키로 받은 유입 표시 검사 — 정해진 글자만 받는다(판정에는 쓰지 않고 집계에만 쓴다). */
export const CAMPAIGN_TAG_RE = /^[a-z0-9]{2,24}:[a-z0-9_]{2,32}$/;
export const CAMPAIGN_COOKIE = "kd_src";
export const CAMPAIGN_COOKIE_DAYS = 30;

/** 요청의 Cookie 헤더에서 유입 표시를 꺼낸다. 없거나 형식이 다르면 null. */
export function campaignFromCookieHeader(header: string | null | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0 || part.slice(0, i).trim() !== CAMPAIGN_COOKIE) continue;
    let value = part.slice(i + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      return null;
    }
    return CAMPAIGN_TAG_RE.test(value) ? value : null;
  }
  return null;
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
