import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { normalizeContactEmail } from "@/lib/audienceStats";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * 혜택·새 소식(광고성 정보) 수신 동의 — 선택 항목.
 * GET  → { consent, decided, hasEmail }   현재 상태(보관함의 스위치, 홈의 물어보기 카드)
 * POST { agree: boolean, email?: string } → { consent }   동의 또는 철회. 본인 계정만 바꾼다.
 *
 * 동의한 회원에게만 홍보 메일 등을 보낼 수 있다(정보통신망법 제50조). 여기서는 동의 여부와 시각만 기록한다.
 * 카카오·네이버 가입자는 계정에 이메일이 없는 경우가 많아, 동의할 때 "소식 받을 이메일"을 함께 받을 수 있다.
 * 이 값은 로그인에 쓰는 이메일(User.email)과 따로 둔다(contactEmail) — 남의 주소를 적어도 계정이 엮이지 않게.
 */
export async function GET() {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ consent: false }, { status: 401, headers: NO_STORE });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { marketingConsent: true, marketingConsentAt: true, email: true, contactEmail: true },
  });
  return NextResponse.json(
    {
      consent: Boolean(user?.marketingConsent),
      decided: Boolean(user?.marketingConsentAt),
      hasEmail: Boolean(user?.email || user?.contactEmail),
    },
    { headers: NO_STORE }
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers: NO_STORE });

  const body = (await req.json().catch(() => null)) as { agree?: unknown; email?: unknown } | null;
  if (typeof body?.agree !== "boolean") {
    return NextResponse.json({ error: "agree 값이 필요합니다." }, { status: 400, headers: NO_STORE });
  }

  // 소식 받을 이메일은 동의할 때만, 보냈을 때만 저장한다
  let contactEmail: string | undefined;
  if (body.agree && body.email !== undefined && body.email !== "") {
    const normalized = normalizeContactEmail(body.email);
    if (!normalized) {
      return NextResponse.json({ error: "이메일 주소를 다시 확인해 주세요.", code: "BAD_EMAIL" }, { status: 400, headers: NO_STORE });
    }
    contactEmail = normalized;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      marketingConsent: body.agree,
      marketingConsentAt: new Date(),
      ...(contactEmail ? { contactEmail } : {}),
    },
    select: { marketingConsent: true },
  });
  return NextResponse.json({ consent: user.marketingConsent }, { headers: NO_STORE });
}
