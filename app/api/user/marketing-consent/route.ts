import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * 혜택·새 소식(광고성 정보) 수신 동의 — 선택 항목.
 * GET  → { consent }            현재 상태(보관함의 스위치)
 * POST { agree: boolean } → { consent }  동의 또는 철회. 본인 계정만 바꾼다.
 *
 * 동의한 회원에게만 홍보 메일 등을 보낼 수 있다(정보통신망법 제50조). 여기서는 동의 여부와 시각만 기록한다.
 */
export async function GET() {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ consent: false }, { status: 401, headers: NO_STORE });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { marketingConsent: true } });
  return NextResponse.json({ consent: Boolean(user?.marketingConsent) }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers: NO_STORE });

  const body = (await req.json().catch(() => null)) as { agree?: unknown } | null;
  if (typeof body?.agree !== "boolean") {
    return NextResponse.json({ error: "agree 값이 필요합니다." }, { status: 400, headers: NO_STORE });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { marketingConsent: body.agree, marketingConsentAt: new Date() },
    select: { marketingConsent: true },
  });
  return NextResponse.json({ consent: user.marketingConsent }, { headers: NO_STORE });
}
