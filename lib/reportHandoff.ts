// lib/reportHandoff.ts
// 결제 전에 입력값을 sessionStorage에 보관한다. 모바일 리다이렉트 결제 대응이고, 서버에는 저장하지 않는다(PII).

const KEY = (catalogId: string) => `kongdak_pending_input_${catalogId}`;

export function savePendingInput(catalogId: string, input: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY(catalogId), JSON.stringify(input));
  } catch {}
}

export function loadPendingInput(catalogId: string): unknown | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(KEY(catalogId));
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export function clearPendingInput(catalogId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY(catalogId));
  } catch {}
}

// ─────────────────────────────────────────────────────────────
// 방금 입력한 정보 이어 쓰기 (2026-10-02)
// 상품을 바꿀 때마다 생년월일을 처음부터 다시 넣어야 했다(한 사람이 궁합을 4~6번 새로 만듦).
// 같은 탭 안에서만(sessionStorage) 기억하고, 탭을 닫으면 사라진다. 서버에는 저장하지 않는다(PII).
// ─────────────────────────────────────────────────────────────

export interface LastPerson {
  name: string;
  dob: string; // YYYY-MM-DD
  time: string | null; // HH:MM
  gender: "F" | "M";
}

export interface LastCouple {
  compatId: string;
  relation: "love" | "crush" | "friend";
  a: LastPerson;
  b: LastPerson;
}

const LAST_PERSON = "kongdak_last_person";
const LAST_COUPLE = "kongdak_last_couple";

function save(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function load<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

const isPerson = (p: unknown): p is LastPerson =>
  !!p && typeof p === "object" && /^\d{4}-\d{2}-\d{2}$/.test(String((p as LastPerson).dob));

export const saveLastPerson = (p: LastPerson): void => save(LAST_PERSON, p);
export function loadLastPerson(): LastPerson | null {
  const p = load<LastPerson>(LAST_PERSON);
  return isPerson(p) ? p : null;
}

export const saveLastCouple = (c: LastCouple): void => save(LAST_COUPLE, c);
export function loadLastCouple(): LastCouple | null {
  const c = load<LastCouple>(LAST_COUPLE);
  return c && typeof c.compatId === "string" && isPerson(c.a) && isPerson(c.b) ? c : null;
}
