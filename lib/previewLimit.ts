// lib/previewLimit.ts — 유료 상품 무료 미리보기(TEASER) 하루 한도 (2026-10-02 사장님 결정)
//
// 미리보기마다 점수·요약·본문 한 꼭지가 무료라, 상품을 바꿔 가며 보면 유료 리포트보다 많이 읽을 수 있었다
// (하루에 한 기기가 미리보기 10개). 기기(서명된 쿠키) 기준으로 하루 3개까지만 새 미리보기를 만든다.
// - 같은 미리보기를 다시 여는 것은 세지 않는다.
// - 무료 상품(FREE)·기본 궁합 점수 화면은 대상이 아니다.
// - 쿠키에는 날짜와 짧은 해시만 담는다(개인정보 없음). 쿠키를 지우면 초기화되지만, IP 기준 상한(rateLimiter)이 따로 있다.
// - 결과 카드 공유 시트를 열면 그 기기(kd_vid)에 한해 오늘 한도를 하루 1번 +3 한다.
import { createHmac, createHash, randomUUID, timingSafeEqual } from "crypto";
import { todayKST } from "@/lib/validation/inputs";

export const PREVIEW_DAILY_LIMIT = 3;
// 회원은 하루 6개(2026-10-04 사장님 결정). 한도에 닿은 비회원에게 "가입하면 3개 더"를 제안한다 —
// 9/29 이후 결제한 사람은 전부 가입 후 1~5분 안에 결제한 회원이었고, 한도에 닿은 비회원은 그냥 나갔다.
export const MEMBER_PREVIEW_DAILY_LIMIT = 6;
export const PREVIEW_SHARE_BONUS = 3;
export const previewLimitFor = (isMember: boolean) => (isMember ? MEMBER_PREVIEW_DAILY_LIMIT : PREVIEW_DAILY_LIMIT);

const COOKIE_NAME = "kd_pv";
const BONUS_COOKIE_NAME = "kd_pvb";
const VID_COOKIE_NAME = "kd_vid";

// 서버 메모리 원장: kd_vid 해시 기준으로 오늘 보너스를 이미 받은 기기를 기억한다(보너스 쿠키만 지우고 재요청해도 하루 1번만 허용).
const grantedVidByDay = new Map<string, Set<string>>();

const secret = () => process.env.NEXTAUTH_SECRET || "kongdak-preview-limit";
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("hex").slice(0, 32);
const shortHash = (key: string) => createHash("sha256").update(key).digest("hex").slice(0, 10);

function safeVerifySig(actualSig: string, expectedPayload: string): boolean {
  const expected = sign(expectedPayload);
  return actualSig.length === expected.length && timingSafeEqual(Buffer.from(actualSig), Buffer.from(expected));
}

function readNamedCookie(req: Request, targetName: string): string | null {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === targetName) {
      try {
        return decodeURIComponent(v.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function recordDayBonusInMemory(day: string, vidHash: string) {
  if (grantedVidByDay.size > 7 && !grantedVidByDay.has(day)) {
    const oldestKey = grantedVidByDay.keys().next().value;
    if (oldestKey) grantedVidByDay.delete(oldestKey);
  }
  let set = grantedVidByDay.get(day);
  if (!set) {
    set = new Set<string>();
    grantedVidByDay.set(day, set);
  }
  set.add(vidHash);
}

/** 오늘 이 기기가 이미 본 미리보기 해시 목록(쿠키가 없거나 위조·날짜가 지났으면 빈 목록). */
function seenToday(req: Request, day: string): string[] {
  const raw = readNamedCookie(req, COOKIE_NAME);
  if (!raw) return [];
  const [d, list, sig] = raw.split("|");
  if (!d || sig === undefined || d !== day) return [];
  if (!safeVerifySig(sig, `${d}|${list}`)) return [];
  return list ? list.split(",").filter(Boolean) : [];
}

/** 오늘 이 기기(kd_vid)에 공유 보너스(+3)가 부여되어 있는지 서버에서 검증한다. */
export function hasPreviewShareBonus(req: Request, day: string = todayKST()): boolean {
  const vid = readNamedCookie(req, VID_COOKIE_NAME)?.trim();
  if (!vid) return false;
  const vidHash = shortHash(vid);

  if (grantedVidByDay.get(day)?.has(vidHash)) {
    return true;
  }

  const rawBonus = readNamedCookie(req, BONUS_COOKIE_NAME);
  if (!rawBonus) return false;
  const [d, cookieVidHash, sig] = rawBonus.split("|");
  if (!d || !cookieVidHash || !sig || d !== day || cookieVidHash !== vidHash) {
    return false;
  }
  if (!safeVerifySig(sig, `bonus|${d}|${vidHash}`)) {
    return false;
  }

  recordDayBonusInMemory(day, vidHash);
  return true;
}

export interface PreviewShareBonusGrant {
  granted: boolean;
  alreadyGranted: boolean;
  bonus: number;
  setCookies: string[];
}

/**
 * 공유 시트가 열렸을 때 그 기기(kd_vid)의 오늘 미리보기 한도를 하루 1번만 +3 한다.
 */
export function grantPreviewShareBonus(req: Request, day: string = todayKST()): PreviewShareBonusGrant {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const setCookies: string[] = [];

  let vid = readNamedCookie(req, VID_COOKIE_NAME)?.trim() || "";
  if (!vid) {
    vid = randomUUID();
    setCookies.push(
      `${VID_COOKIE_NAME}=${encodeURIComponent(vid)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`,
    );
  }

  const vidHash = shortHash(vid);
  const alreadyInMemory = Boolean(grantedVidByDay.get(day)?.has(vidHash));
  const alreadyFromCookie = hasPreviewShareBonus(req, day);

  if (alreadyInMemory || alreadyFromCookie) {
    return {
      granted: false,
      alreadyGranted: true,
      bonus: PREVIEW_SHARE_BONUS,
      setCookies,
    };
  }

  recordDayBonusInMemory(day, vidHash);
  const bonusSig = sign(`bonus|${day}|${vidHash}`);
  const bonusVal = encodeURIComponent(`${day}|${vidHash}|${bonusSig}`);
  setCookies.push(
    `${BONUS_COOKIE_NAME}=${bonusVal}; Path=/; Max-Age=172800; HttpOnly; SameSite=Lax${secure}`,
  );

  return {
    granted: true,
    alreadyGranted: false,
    bonus: PREVIEW_SHARE_BONUS,
    setCookies,
  };
}

export function resetPreviewBonusLedgerForTests(): void {
  grantedVidByDay.clear();
}

export interface PreviewQuota {
  allowed: boolean;
  /** 허용된 경우 응답에 붙일 Set-Cookie 값 */
  setCookie?: string;
  used: number;
  /** 오늘 이 기기에 적용된 실제 한도(공유 보너스 +3 반영) */
  effectiveLimit: number;
  /** 오늘 공유 보너스(+3)를 이미 받았는지 */
  shareBonusUsed: boolean;
}

/**
 * @param key 미리보기를 구분하는 값(상품 + 대상). 같은 key 는 다시 봐도 세지 않는다.
 * @param limit 기본 하루 한도. 기기(쿠키) 기준으로 세므로, 비회원으로 3개 본 뒤 가입하면 3개가 더 열리고 공유 보너스(+3)도 하루 1회 합산된다.
 */
export function checkPreviewQuota(
  req: Request,
  key: string,
  limit: number = PREVIEW_DAILY_LIMIT,
  day: string = todayKST(),
): PreviewQuota {
  const seen = seenToday(req, day);
  const shareBonusUsed = hasPreviewShareBonus(req, day);
  const effectiveLimit = limit + (shareBonusUsed ? PREVIEW_SHARE_BONUS : 0);
  const h = shortHash(key);

  if (seen.includes(h)) {
    return { allowed: true, used: seen.length, effectiveLimit, shareBonusUsed };
  }
  if (seen.length >= effectiveLimit) {
    return { allowed: false, used: seen.length, effectiveLimit, shareBonusUsed };
  }

  const list = [...seen, h].join(",");
  const value = encodeURIComponent(`${day}|${list}|${sign(`${day}|${list}`)}`);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return {
    allowed: true,
    used: seen.length + 1,
    effectiveLimit,
    shareBonusUsed,
    setCookie: `${COOKIE_NAME}=${value}; Path=/; Max-Age=172800; HttpOnly; SameSite=Lax${secure}`,
  };
}
