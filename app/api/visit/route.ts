import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getClientIp } from "@/lib/rateLimiter";

// Bot User-Agent pattern
export const BOT_UA_REGEX =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|kakaotalk-scrap|Yeti|Daum|headless|lighthouse|curl|wget|python/i;

// In-memory IP daily increment counter (IP is never persisted to DB)
const ipDailyIncrements = new Map<string, number[]>();
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_IP_INCREMENTS_PER_DAY = 5;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || ua.trim() === "") return true;
  return BOT_UA_REGEX.test(ua);
}

export function checkIpDailyLimit(ip: string, now: number = Date.now()): boolean {
  let timestamps = ipDailyIncrements.get(ip) || [];
  timestamps = timestamps.filter((t) => now - t < DAY_MS);

  if (timestamps.length >= MAX_IP_INCREMENTS_PER_DAY) {
    ipDailyIncrements.set(ip, timestamps);
    return false; // limit exceeded
  }

  timestamps.push(now);
  ipDailyIncrements.set(ip, timestamps);
  return true; // allowed
}

// For unit testing: clear rate limits
export function resetVisitRateLimiter() {
  ipDailyIncrements.clear();
}

export async function POST(req: NextRequest) {
  try {
    const existingVid = req.cookies.get("kd_vid")?.value;
    if (existingVid) {
      // 이미 방문 식별 쿠키가 있으면 아무 작업 없이 204
      return new NextResponse(null, { status: 204 });
    }

    const ua = req.headers.get("user-agent") || "";
    const ip = getClientIp(req);
    const isBot = isBotUserAgent(ua);
    const ipAllowed = checkIpDailyLimit(ip);

    // 봇이 아니고 IP 일일 한도(5회) 이내일 때만 DB 방문자 수 1 증가
    if (!isBot && ipAllowed) {
      await prisma.siteCounter.upsert({
        where: { key: "visitors" },
        create: { key: "visitors", value: 1 },
        update: { value: { increment: 1 } },
      });
    }

    // 신규 방문자 쿠키 발급 (1년, httpOnly, sameSite=lax)
    const newVid = crypto.randomUUID();
    const res = new NextResponse(null, { status: 200 });
    res.cookies.set("kd_vid", newVid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("[POST /api/visit] Error recording visit:", error);
    // 에러 발생 시 사용자 화면에 영향 없도록 204 반환
    return new NextResponse(null, { status: 204 });
  }
}
