import crypto from "crypto";
import { calculateFourPillars, type SajuResult } from "@/lib/saju";

export * from "@/lib/compatInviteClient";

/** 손님 입력이 잘못됐을 때만 쓰는 오류(문구를 그대로 보여 줘도 되는 것) */
export class InviteInputError extends Error {}

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

// app/api/compat/route.ts 와 같은 해시(비밀 pepper 필수 — 미설정 시 fail-closed)
function createBirthHash(dob: string, time: string | null | undefined, gender: string): string {
  const pepper = process.env.BIRTH_HASH_PEPPER;
  if (!pepper) {
    throw new Error("BIRTH_HASH_PEPPER 미설정 — PII 단방향 해시를 안전하게 생성할 수 없습니다.");
  }
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
    throw new InviteInputError("올바른 생년월일(1900년 이후 및 현재 이전의 유효한 날짜)을 입력해주세요.");
  }
  if (!isValidTime(input.time)) {
    throw new InviteInputError("출생 시간은 HH:mm 형식이어야 합니다.");
  }
  if (!isValidGender(input.gender)) {
    throw new InviteInputError("성별은 'M' 또는 'F'여야 합니다.");
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
