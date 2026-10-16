import crypto from "crypto";
import { calculateFourPillars, type SajuResult } from "@/lib/saju";

export const INVITE_TTL_MS = 72 * 60 * 60 * 1000; // 72시간
export const SENT_INVITES_STORAGE_KEY = "kongdak_sent_invites";
const MAX_SENT_INVITES = 5;

export type CompatRelation = "love" | "crush" | "friend";

export interface InvitePersonInput {
  name?: string;
  dob?: string;
  time?: string | null;
  gender?: string;
  location?: string;
}

export interface SafeInvitePerson {
  name: string;
  gender: "M" | "F";
  birthHash: string;
  dayMaster: SajuResult["dayMaster"];
  elementsScore: SajuResult["elementsScore"];
  fourPillars: SajuResult["fourPillars"];
}

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

export function isValidDob(dob: unknown): dob is string {
  if (typeof dob !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const [y, m, d] = dob.split("-").map(Number);
  const currentYear = new Date().getFullYear();
  if (y < 1900 || y > currentYear || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return false;
  }
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (dt > todayUTC) return false;
  return true;
}

export function isValidTime(time: unknown): time is string | null | undefined {
  if (time === null || time === undefined || time === "") return true;
  if (typeof time !== "string") return false;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export function isValidGender(g: unknown): g is "M" | "F" {
  return g === "M" || g === "F";
}

function createBirthHash(dob: string, time: string | null | undefined, gender: string): string {
  const pepper = process.env.BIRTH_HASH_PEPPER || "kongdak-invite-fallback-pepper";
  return crypto
    .createHash("sha256")
    .update(`${dob}_${time || "none"}_${gender}_${pepper}`)
    .digest("hex");
}

/**
 * 생년월일·출생시간 원문(dob, time)은 계산 직후 버리고,
 * 궁합 계산에 필요한 사주 결과값과 복원 불가능한 해시만 반환한다.
 */
export function buildSafeInvitePerson(
  input: InvitePersonInput,
  fallbackName: string
): SafeInvitePerson {
  if (!isValidDob(input.dob)) {
    throw new Error("올바른 생년월일(1900년 이후 및 현재 이전의 유효한 날짜)을 입력해주세요.");
  }
  if (!isValidTime(input.time)) {
    throw new Error("출생 시간은 HH:mm 형식이어야 합니다.");
  }
  if (!isValidGender(input.gender)) {
    throw new Error("성별은 'M' 또는 'F'여야 합니다.");
  }

  const saju = calculateFourPillars(
    input.dob,
    input.time || null,
    input.gender,
    input.location || "Seoul, KR"
  );

  const birthHash = createBirthHash(input.dob, input.time, input.gender);
  const safeName = (input.name ? String(input.name).trim() : fallbackName).slice(0, 20) || fallbackName;

  return {
    name: safeName,
    gender: input.gender,
    birthHash,
    dayMaster: saju.dayMaster,
    elementsScore: saju.elementsScore,
    fourPillars: saju.fourPillars,
  };
}

export function isValidStoredSafePerson(value: unknown): value is SafeInvitePerson {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.name === "string" &&
    (obj.gender === "M" || obj.gender === "F") &&
    typeof obj.birthHash === "string" &&
    Boolean(obj.dayMaster) &&
    Boolean(obj.elementsScore && typeof obj.elementsScore === "object") &&
    Boolean(obj.fourPillars && typeof obj.fourPillars === "object")
  );
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
