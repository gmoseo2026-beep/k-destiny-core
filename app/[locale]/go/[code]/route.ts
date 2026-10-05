import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isBotUserAgent } from "@/app/api/visit/route";
import {
  CAMPAIGN_COOKIE,
  CAMPAIGN_COOKIE_DAYS,
  campaignCounterKey,
  campaignTag,
  campaignTargetPath,
  findCampaignLink,
  kstDateKey,
} from "@/lib/campaignLinks";

/**
 * GET /ko/go/<코드> — 제휴 배너 전용 주소.
 * 클릭을 하루 단위로 세고(봇 제외), 유입 표시 쿠키를 심은 뒤 utm 이 붙은 도착 주소로 보낸다.
 * 개인정보를 받거나 남기지 않는다(IP·기기 정보 저장 없음, 숫자만 올린다).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale, code } = await params;
  const link = findCampaignLink(code);

  // 상대 주소로 돌려보낸다 — 서버는 프록시 뒤에 있어 요청의 호스트가 바깥 주소와 다를 수 있다
  const redirectTo = (path: string) =>
    // 중간 캐시가 이 응답을 붙잡으면 클릭이 세어지지 않는다
    new NextResponse(null, { status: 302, headers: { Location: path, "Cache-Control": "no-store" } });

  // 모르는 코드는 홈으로(주소를 잘못 넣어도 빈 화면이 나오지 않게)
  if (!link) return redirectTo(`/${locale}`);

  if (!isBotUserAgent(req.headers.get("user-agent"))) {
    // 기다리지 않는다 — DB 가 멀어서(약 1초) 손님을 붙잡아 두지 않으려고. 실패해도 도착지로는 보낸다.
    const key = campaignCounterKey(link.code, kstDateKey());
    void prisma.siteCounter
      .upsert({ where: { key }, create: { key, value: 1 }, update: { value: { increment: 1 } } })
      .catch((e: unknown) => console.error("[go] count failed", e instanceof Error ? e.message : e));
  }

  const res = redirectTo(campaignTargetPath(link, locale));
  res.cookies.set(CAMPAIGN_COOKIE, campaignTag(link), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CAMPAIGN_COOKIE_DAYS * 24 * 60 * 60,
    path: "/",
  });
  return res;
}
