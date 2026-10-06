import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { getClientIp } from "@/lib/rateLimiter";
import { isBotUserAgent } from "@/app/api/visit/route";
import { kstDateKey } from "@/lib/campaignLinks";
import { pwaCounterKey, type PwaKind } from "@/lib/pwaStats";

const NO_STORE = { "Cache-Control": "no-store" };

// 같은 곳에서 하루에 올릴 수 있는 횟수(숫자 부풀리기 방지). IP 는 메모리에서만 세고 저장하지 않는다.
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PER_IP_PER_DAY = 30;
const ipHits = new Map<string, number[]>();

function allowIp(ip: string, now: number = Date.now()): boolean {
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < DAY_MS);
  if (hits.length >= MAX_PER_IP_PER_DAY) {
    ipHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  return true;
}

async function bump(kind: PwaKind): Promise<void> {
  const key = pwaCounterKey(kind, kstDateKey());
  await prisma.siteCounter.upsert({ where: { key }, create: { key, value: 1 }, update: { value: { increment: 1 } } });
}

/**
 * POST /api/pwa/event { type: "install" | "launch", first?: boolean }
 * 홈 화면에 설치한 앱의 설치·실행을 숫자로만 센다(components/PwaTracker 가 부른다).
 * 로그인한 회원이면 "앱을 설치한 회원"으로 한 번 표시해 둔다(User.pwaInstalledAt).
 */
export async function POST(req: NextRequest) {
  try {
    if (isBotUserAgent(req.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });
    const body = (await req.json().catch(() => null)) as { type?: unknown; first?: unknown } | null;
    const type = body?.type;
    if (type !== "install" && type !== "launch") {
      return NextResponse.json({ error: "type 이 필요합니다." }, { status: 400, headers: NO_STORE });
    }
    if (!allowIp(getClientIp(req))) return new NextResponse(null, { status: 204 });

    const session = await getServerSession(authOptions).catch(() => null);
    const userId = session?.user?.id ?? null;

    const kinds: PwaKind[] = [];
    if (type === "install") kinds.push("install");
    else {
      kinds.push("launch");
      if (body?.first === true) kinds.push("device");
      if (userId) kinds.push("launch_member");
    }
    await Promise.all(kinds.map(bump));
    if (userId) {
      await prisma.user.updateMany({ where: { id: userId, pwaInstalledAt: null }, data: { pwaInstalledAt: new Date() } });
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    console.error("[pwa/event]", e instanceof Error ? e.message : e);
    // 집계는 덤이다 — 실패해도 화면에는 영향이 없게
    return new NextResponse(null, { status: 204 });
  }
}
