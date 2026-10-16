import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { getClientIp, checkRateLimit } from "@/lib/rateLimiter";
import {
  INVITE_TTL_MS,
  InviteInputError,
  buildSafeInvitePerson,
  normalizeRelation,
  type InvitePersonInput,
} from "@/lib/compatInvite";

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rl = await checkRateLimit(clientIp);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "일일 초대장 생성 한도(10회)를 초과했습니다. 내일 다시 시도해주세요." },
        { status: 429 }
      );
    }

    let body: { personA?: InvitePersonInput; relation?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
    }

    if (!body?.personA || typeof body.personA !== "object") {
      return NextResponse.json({ error: "내 생년월일 정보가 필요합니다." }, { status: 400 });
    }

    let safePersonA;
    try {
      safePersonA = buildSafeInvitePerson(body.personA, "나");
    } catch (err) {
      if (!(err instanceof InviteInputError)) throw err;
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const safeRelation = normalizeRelation(body.relation);
    const now = new Date();

    // 만료된 미완성 초대장 정리
    await prisma.compatInvite.deleteMany({
      where: { completedAt: null, expiresAt: { lt: now } },
    });

    const session = await getServerSession(authOptions).catch(() => null);
    const creatorId = session?.user?.id || null;

    const token = crypto.randomBytes(12).toString("hex");
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);

    const invite = await prisma.compatInvite.create({
      data: {
        token,
        creatorId,
        personA: safePersonA as unknown as Prisma.InputJsonValue,
        relation: safeRelation,
        expiresAt,
      },
      select: {
        id: true,
        token: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({
      id: invite.id,
      token: invite.token,
      expiresAt: invite.expiresAt.toISOString(),
    });
  } catch {
    // [SECURITY] 서버 로그에 토큰·이름·생년월일 등 개인정보를 남기지 않는다
    console.error("[api/compat/invite] create failed");
    return NextResponse.json(
      { error: "초대장 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
