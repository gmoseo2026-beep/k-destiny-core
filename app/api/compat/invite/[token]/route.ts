import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { calculateCompatibility } from "@/lib/compatibility";
import type { SajuResult } from "@/lib/saju";
import { getClientIp, checkChatRateLimit } from "@/lib/rateLimiter";
import { logGeneration } from "@/lib/reports/genLog";
import {
  InviteInputError,
  buildSafeInvitePerson,
  isValidInviteToken,
  isValidStoredSafePerson,
  type InvitePersonInput,
} from "@/lib/compatInvite";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!isValidInviteToken(token)) {
      return NextResponse.json(
        { status: "not_found", error: "초대장을 찾을 수 없어요." },
        { status: 404 }
      );
    }

    const now = new Date();
    const invite = await prisma.compatInvite.findUnique({
      where: { token },
    });

    // 만료된 미완성 초대장 일괄 정리
    await prisma.compatInvite.deleteMany({
      where: { completedAt: null, expiresAt: { lt: now } },
    });

    if (!invite) {
      return NextResponse.json(
        { status: "not_found", error: "초대장을 찾을 수 없어요." },
        { status: 404 }
      );
    }

    if (invite.completedAt && invite.completedShareToken) {
      return NextResponse.json({
        status: "completed",
        shareToken: invite.completedShareToken,
        relation: invite.relation,
      });
    }

    if (invite.expiresAt.getTime() <= now.getTime()) {
      return NextResponse.json(
        { status: "expired", error: "초대장이 만료됐어요." },
        { status: 410 }
      );
    }

    const pA = invite.personA as { name?: unknown } | null;
    const nameA =
      typeof pA?.name === "string" && pA.name.trim() ? pA.name.trim() : "상대방";

    // [SECURITY] 사주 계산값(fourPillars, dayMaster, elementsScore, birthHash)과 성별은 클라이언트로 내려보내지 않는다
    return NextResponse.json({
      status: "pending",
      nameA,
      relation: invite.relation,
    });
  } catch {
    console.error("[api/compat/invite/token] get failed");
    return NextResponse.json(
      { error: "초대장 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const clientIp = getClientIp(req);
    const rl = await checkChatRateLimit(clientIp);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const { token } = await context.params;
    if (!isValidInviteToken(token)) {
      return NextResponse.json(
        { status: "not_found", error: "초대장을 찾을 수 없어요." },
        { status: 404 }
      );
    }

    let body: { personB?: InvitePersonInput; consentSharedResult?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
    }

    // 받는 사람 결과 공유 동의 확인 (필수)
    if (body?.consentSharedResult !== true) {
      return NextResponse.json(
        { error: "결과 공유 안내 확인 후 동의가 필요합니다." },
        { status: 400 }
      );
    }

    if (!body?.personB || typeof body.personB !== "object") {
      return NextResponse.json(
        { error: "내 생년월일 정보가 필요합니다." },
        { status: 400 }
      );
    }

    let safePersonB;
    try {
      safePersonB = buildSafeInvitePerson(body.personB, "상대방");
    } catch (err) {
      if (!(err instanceof InviteInputError)) throw err;
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const now = new Date();
    const invite = await prisma.compatInvite.findUnique({
      where: { token },
    });

    // 만료된 미완성 초대장 일괄 정리
    await prisma.compatInvite.deleteMany({
      where: { completedAt: null, expiresAt: { lt: now } },
    });

    if (!invite) {
      return NextResponse.json(
        { status: "not_found", error: "초대장을 찾을 수 없어요." },
        { status: 404 }
      );
    }

    // 1:1 1회 완성: 이미 완성된 초대장은 두 번째 완성을 거절하고 완성된 결과로 안내한다
    if (invite.completedAt || invite.completedShareToken) {
      return NextResponse.json(
        {
          status: "completed",
          error: "이미 완성된 초대장이에요.",
          shareToken: invite.completedShareToken,
          compatId: invite.completedCompatId,
        },
        { status: 409 }
      );
    }

    if (invite.expiresAt.getTime() <= now.getTime()) {
      return NextResponse.json(
        { status: "expired", error: "초대장이 만료됐어요." },
        { status: 410 }
      );
    }

    if (!isValidStoredSafePerson(invite.personA)) {
      return NextResponse.json(
        { status: "expired", error: "초대장이 만료됐어요." },
        { status: 410 }
      );
    }

    // 1회 완성 선점: 동시에 두 요청이 와도 하나만 통과한다(나머지는 완성된 결과로 안내)
    const claim = await prisma.compatInvite.updateMany({
      where: { id: invite.id, completedAt: null, expiresAt: { gt: now } },
      data: { completedAt: now },
    });
    if (claim.count === 0) {
      const latest = await prisma.compatInvite.findUnique({
        where: { id: invite.id },
        select: { completedShareToken: true, completedCompatId: true },
      });
      return NextResponse.json(
        {
          status: "completed",
          error: "이미 완성된 초대장이에요.",
          shareToken: latest?.completedShareToken ?? null,
          compatId: latest?.completedCompatId ?? null,
        },
        { status: 409 }
      );
    }

    const safePersonA = invite.personA;
    const compatResult = calculateCompatibility(
      {
        dayMaster: safePersonA.dayMaster,
        elementsScore: safePersonA.elementsScore,
        fourPillars: safePersonA.fourPillars,
      } as SajuResult,
      {
        dayMaster: safePersonB.dayMaster,
        elementsScore: safePersonB.elementsScore,
        fourPillars: safePersonB.fourPillars,
      } as SajuResult
    );

    const session = await getServerSession(authOptions).catch(() => null);
    const userId = invite.creatorId || session?.user?.id || null;
    const shareToken = crypto.randomBytes(18).toString("base64url");

    // [DECISION] Compatibility.sourceCompatId에는 "invite:..." 문자열을 넣지 않는다 (null 유지).
    // 유입 연결은 CompatInvite.completedCompatId로 잇는다.
    let compat;
    try {
      compat = await prisma.compatibility.create({
        data: {
          userId,
          personA: safePersonA as unknown as Prisma.InputJsonValue,
          personB: safePersonB as unknown as Prisma.InputJsonValue,
          relation: invite.relation,
          score: compatResult.score,
          keywords: compatResult.keywords,
          breakdown: compatResult.breakdown as unknown as Prisma.InputJsonValue,
          shareToken,
          sourceCompatId: null,
        },
        select: {
          id: true,
          shareToken: true,
          score: true,
          keywords: true,
          relation: true,
        },
      });
    } catch (err) {
      // 궁합을 못 만들었으면 선점을 풀어 다시 채울 수 있게 한다
      await prisma.compatInvite.updateMany({
        where: { id: invite.id, completedCompatId: null },
        data: { completedAt: null },
      });
      throw err;
    }

    // [SECURITY] 완성되는 순간 CompatInvite.personA를 즉시 비운다({})
    await prisma.compatInvite.update({
      where: { id: invite.id },
      data: {
        personA: {} as Prisma.InputJsonValue,
        completedCompatId: compat.id,
        completedShareToken: compat.shareToken,
      },
    });

    void logGeneration({ catalogId: "compat_basic", kind: "COMPAT", ok: true });

    return NextResponse.json({
      id: compat.id,
      shareToken: compat.shareToken,
      score: compat.score,
      keywords: compat.keywords,
      relation: compat.relation,
    });
  } catch {
    console.error("[api/compat/invite/token] complete failed");
    return NextResponse.json(
      { error: "궁합 완성 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
