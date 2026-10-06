/**
 * 연락할 수 있는 회원(마케팅 DB) 집계 — 순수 함수. 관리자 > 회원·설치 화면이 쓴다.
 *
 * 홍보 소식은 (1) 수신에 동의했고 (2) 받을 이메일이 있는 회원에게만 보낼 수 있다.
 * 2026-10-06 기준 동의 0명, 이메일은 25명 중 12명(카카오 가입자는 0명)이라 둘 다 쌓이는지 봐야 한다.
 */
export interface AudienceMember {
  /** 가입 경로(kakao · naver · google · email) */
  provider: string;
  hasAccountEmail: boolean;
  hasContactEmail: boolean;
  consent: boolean;
  /** 수신 여부를 한 번이라도 정했는가(동의했거나 거절했거나) */
  decided: boolean;
  pwaInstalled: boolean;
}

export interface AudienceTotals {
  members: number;
  /** 이메일을 아는 회원(계정 이메일 또는 소식 받을 이메일) */
  withEmail: number;
  consent: number;
  /** 지금 홍보 소식을 보낼 수 있는 회원 = 동의 + 이메일 */
  reachable: number;
  /** 물어봤지만 거절 */
  declined: number;
  /** 아직 정하지 않음(물어볼 수 있는 사람) */
  undecided: number;
  pwaInstalled: number;
}

export interface AudienceReport {
  total: AudienceTotals;
  byProvider: Array<{ provider: string } & AudienceTotals>;
}

const empty = (): AudienceTotals => ({
  members: 0,
  withEmail: 0,
  consent: 0,
  reachable: 0,
  declined: 0,
  undecided: 0,
  pwaInstalled: 0,
});

function add(t: AudienceTotals, m: AudienceMember): void {
  const hasEmail = m.hasAccountEmail || m.hasContactEmail;
  t.members += 1;
  if (hasEmail) t.withEmail += 1;
  if (m.consent) t.consent += 1;
  if (m.consent && hasEmail) t.reachable += 1;
  if (m.decided && !m.consent) t.declined += 1;
  if (!m.decided) t.undecided += 1;
  if (m.pwaInstalled) t.pwaInstalled += 1;
}

export function buildAudienceReport(members: AudienceMember[]): AudienceReport {
  const total = empty();
  const groups = new Map<string, AudienceTotals>();
  for (const m of members) {
    add(total, m);
    if (!groups.has(m.provider)) groups.set(m.provider, empty());
    add(groups.get(m.provider)!, m);
  }
  const byProvider = [...groups.entries()]
    .map(([provider, t]) => ({ provider, ...t }))
    .sort((a, b) => b.members - a.members || a.provider.localeCompare(b.provider));
  return { total, byProvider };
}

/** 소식 받을 이메일 검사(형식만). 통과하면 소문자로 다듬은 값을, 아니면 null. */
export function normalizeContactEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (v.length < 6 || v.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? v : null;
}
