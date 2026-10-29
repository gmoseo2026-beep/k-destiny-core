import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { linkPaidGuestOrder } from "@/lib/payments/linkGuestOrder";

/**
 * 로그인한 회원이 "이 기기에서 비회원으로 결제한 주문"을 자기 계정으로 옮긴다(2026-10-29).
 *
 * 10-29 실제 사례: 틱톡 안에서 비회원으로 세트를 결제한 손님이 바로 카카오로 가입했지만, 연동은 대시보드의
 * [이 계정에 저장하기] 버튼 + kd_claim 쿠키로만 됐다. 손님은 버튼을 몰랐고(틱톡 안 카카오 로그인도 실패),
 * 다른 화면에서 로그인한 뒤 "결제한 게 하나도 안 보인다"고 항의했다.
 *
 * 증명: 결제 완료 시 이 기기 localStorage 에 남는 orderId. 비회원이 리포트를 여는 데 쓰는 바로 그 증명이다
 * (추측 불가 — PortOne 결제 id). 공용 기기에서 다음 로그인 사용자가 남의 결제를 가져가는 창을 줄이려고
 * kd_claim 쿠키와 같은 7일 안의 주문만 옮긴다.
 */
const MAX_TOKENS = 30;
const CLAIM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const ORDER_ID = /^kd_ord_[0-9a-f]{32}$/;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let tokens: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.orderIds)) {
      tokens = [...new Set(body.orderIds.filter((v: unknown): v is string => typeof v === "string" && ORDER_ID.test(v)))].slice(0, MAX_TOKENS) as string[];
    }
  } catch {
    // 본문 없음 → 옮길 것 없음
  }
  if (tokens.length === 0) return NextResponse.json({ linked: 0 });

  try {
    const candidates = await prisma.order.findMany({
      where: {
        orderId: { in: tokens },
        status: "PAID",
        userId: null,
        createdAt: { gt: new Date(Date.now() - CLAIM_WINDOW_MS) },
      },
      select: { id: true, compatId: true },
    });

    let linked = 0;
    for (const order of candidates) {
      const ok = await prisma.$transaction((tx) => linkPaidGuestOrder(tx, order, userId));
      if (ok) linked++;
    }
    return NextResponse.json({ linked }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Prisma 예외 원문은 서버 로그에만 남긴다
    console.error("[claim-device-orders]", error);
    return NextResponse.json({ error: "계정 연동 중 오류가 발생했습니다." }, { status: 500 });
  }
}
