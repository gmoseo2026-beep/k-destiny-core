// lib/previewLimit.ts — 유료 상품 무료 미리보기(TEASER) 하루 한도 (2026-10-02 사장님 결정)
//
// 미리보기마다 점수·요약·본문 한 꼭지가 무료라, 상품을 바꿔 가며 보면 유료 리포트보다 많이 읽을 수 있었다
// (하루에 한 기기가 미리보기 10개). 기기(서명된 쿠키) 기준으로 하루 3개까지만 새 미리보기를 만든다.
// - 같은 미리보기를 다시 여는 것은 세지 않는다.
// - 무료 상품(FREE)·기본 궁합 점수 화면은 대상이 아니다.
// - 쿠키에는 날짜와 짧은 해시만 담는다(개인정보 없음). 쿠키를 지우면 초기화되지만, IP 기준 상한(rateLimiter)이 따로 있다.
import { createHmac, createHash, timingSafeEqual } from "crypto";
import { todayKST } from "@/lib/validation/inputs";

export const PREVIEW_DAILY_LIMIT = 3;
const COOKIE_NAME = "kd_pv";

const secret = () => process.env.NEXTAUTH_SECRET || "kongdak-preview-limit";
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("hex").slice(0, 32);
const shortHash = (key: string) => createHash("sha256").update(key).digest("hex").slice(0, 10);

function readCookie(req: Request): string | null {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE_NAME) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** 오늘 이 기기가 이미 본 미리보기 해시 목록(쿠키가 없거나 위조·날짜가 지났으면 빈 목록). */
function seenToday(req: Request, day: string): string[] {
  const raw = readCookie(req);
  if (!raw) return [];
  const [d, list, sig] = raw.split("|");
  if (!d || sig === undefined || d !== day) return [];
  const expected = sign(`${d}|${list}`);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return [];
  return list ? list.split(",").filter(Boolean) : [];
}

export interface PreviewQuota {
  allowed: boolean;
  /** 허용된 경우 응답에 붙일 Set-Cookie 값 */
  setCookie?: string;
  used: number;
}

/**
 * @param key 미리보기를 구분하는 값(상품 + 대상). 같은 key 는 다시 봐도 세지 않는다.
 */
export function checkPreviewQuota(req: Request, key: string): PreviewQuota {
  const day = todayKST();
  const seen = seenToday(req, day);
  const h = shortHash(key);
  if (seen.includes(h)) return { allowed: true, used: seen.length };
  if (seen.length >= PREVIEW_DAILY_LIMIT) return { allowed: false, used: seen.length };
  const list = [...seen, h].join(",");
  const value = encodeURIComponent(`${day}|${list}|${sign(`${day}|${list}`)}`);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return {
    allowed: true,
    used: seen.length + 1,
    setCookie: `${COOKIE_NAME}=${value}; Path=/; Max-Age=172800; HttpOnly; SameSite=Lax${secure}`,
  };
}
