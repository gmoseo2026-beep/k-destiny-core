import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import {
  campaignClickTimeFromCookieHeader,
  campaignFromCookieHeader,
  isSignupAfterClick,
} from "@/lib/campaignLinks";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * POST /api/user/attribution — 제휴 배너를 누른 뒤 가입한 회원에게 유입 표시를 한 번 남긴다.
 * 로그인 직후 components/CampaignSignupSync 가 부른다. 값은 서버가 쿠키에서만 읽는다(요청 본문은 받지 않는다).
 * 배너 쿠키가 없으면 DB 를 건드리지 않고 끝난다. 이미 표시가 있거나, 배너를 누르기 전에 만든 계정이면 남기지 않는다.
 */
export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  const campaign = campaignFromCookieHeader(cookieHeader);
  if (!campaign) return NextResponse.json({ attributed: false }, { headers: NO_STORE });

  const session = await getServerSession(authOptions).catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ attributed: false }, { status: 401, headers: NO_STORE });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { campaign: true, createdAt: true } });
    if (!user || user.campaign) return NextResponse.json({ attributed: false }, { headers: NO_STORE });
    if (!isSignupAfterClick(user.createdAt, campaignClickTimeFromCookieHeader(cookieHeader))) {
      return NextResponse.json({ attributed: false }, { headers: NO_STORE });
    }
    // 동시에 두 번 불려도 한 번만 남는다
    const res = await prisma.user.updateMany({ where: { id: userId, campaign: null }, data: { campaign } });
    return NextResponse.json({ attributed: res.count === 1 }, { headers: NO_STORE });
  } catch (e) {
    console.error("[user/attribution]", e instanceof Error ? e.message : e);
    return NextResponse.json({ attributed: false }, { headers: NO_STORE });
  }
}
