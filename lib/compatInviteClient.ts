// 반쪽 궁합 초대장 — 브라우저에서도 쓰는 부분(상수·관계 이름·토큰 형식·보낸 초대장 저장).
// 사주 계산·해시(lib/compatInvite.ts)는 서버 전용이라 여기서 가져오지 않는다.

export const INVITE_TTL_MS = 72 * 60 * 60 * 1000; // 72시간
export const SENT_INVITES_STORAGE_KEY = "kongdak_sent_invites";
const MAX_SENT_INVITES = 5;

export type CompatRelation = "love" | "crush" | "friend";

export interface StoredSentInvite {
  token: string;
  createdAt: number;
}

const VALID_RELATIONS: ReadonlySet<string> = new Set(["love", "crush", "friend"]);

export function normalizeRelation(rel: unknown): CompatRelation {
  if (typeof rel === "string" && VALID_RELATIONS.has(rel)) {
    return rel as CompatRelation;
  }
  return "love";
}

export function relationLabel(rel: string): string {
  if (rel === "crush") return "썸 · 호감";
  if (rel === "friend") return "친구 · 지인";
  return "연인 · 커플";
}

export function isValidInviteToken(token: unknown): token is string {
  return typeof token === "string" && /^[a-f0-9]{24}$/.test(token);
}

/**
 * 보낸 사람의 브라우저(localStorage)에는 { token, createdAt }만 저장한다.
 * 이름·생년월일 등 개인정보는 저장하지 않는다.
 */
export function loadSentInvites(now = Date.now()): StoredSentInvite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SENT_INVITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed
      .filter((item): item is StoredSentInvite => {
        if (!item || typeof item !== "object") return false;
        const rec = item as Record<string, unknown>;
        return (
          isValidInviteToken(rec.token) &&
          typeof rec.createdAt === "number" &&
          Number.isFinite(rec.createdAt) &&
          now - rec.createdAt < INVITE_TTL_MS
        );
      })
      .map((item) => ({ token: item.token, createdAt: item.createdAt }))
      .slice(0, MAX_SENT_INVITES);
    return valid;
  } catch {
    return [];
  }
}

export function saveSentInvite(token: string, createdAt = Date.now()): void {
  if (typeof window === "undefined" || !isValidInviteToken(token)) return;
  try {
    const existing = loadSentInvites(createdAt).filter((item) => item.token !== token);
    const next: StoredSentInvite[] = [{ token, createdAt }, ...existing].slice(0, MAX_SENT_INVITES);
    window.localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage 접근 불가 환경 무시
  }
}

export function removeSentInvite(token: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = loadSentInvites().filter((item) => item.token !== token);
    if (next.length === 0) {
      window.localStorage.removeItem(SENT_INVITES_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // localStorage 접근 불가 환경 무시
  }
}
