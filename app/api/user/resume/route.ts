import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { isViewableFor } from "@/lib/catalog";
import { getEffectiveCatalog } from "@/lib/catalogVisibility";
import { toCatalogId } from "@/lib/productIdentity";
import { pickResumeItems, RESUME_MAX_AGE_DAYS, type PaidRef, type ResumeCandidate } from "@/lib/member/resume";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/user/resume?locale=ko — 회원이 미리보기만 보고 결제하지 않은 것(최근 것부터 최대 2개).
 * 회원 홈과 보관함의 "이어보기" 카드가 쓴다. 본인 것만 돌려주고, 생년월일 등 입력값은 다루지 않는다.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ items: [] }, { status: 401, headers: NO_STORE });

  const rawLocale = req.nextUrl.searchParams.get("locale") ?? "";
  const locale = /^[a-z]{2}$/.test(rawLocale) ? rawLocale : "ko";
  const since = new Date(Date.now() - RESUME_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  try {
    const [teasers, compats, orders, catalog] = await Promise.all([
      prisma.generatedReport.findMany({
        where: { userId, kind: "TEASER", status: "READY", updatedAt: { gte: since } },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: { catalogId: true, compatId: true, updatedAt: true },
      }),
      prisma.compatibility.findMany({
        where: { userId, isPaid: false, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: { userId, status: "PAID" },
        select: { productType: true, productKey: true, compatId: true },
      }),
      getEffectiveCatalog(),
    ]);

    const candidates: ResumeCandidate[] = [
      ...teasers.map((t) => ({ kind: "teaser" as const, catalogId: t.catalogId, compatId: t.compatId, at: t.updatedAt })),
      ...compats.map((c) => ({ kind: "compat" as const, catalogId: "compat_basic", compatId: c.id, at: c.createdAt })),
    ];
    const paid: PaidRef[] = orders
      .map((o) => ({ catalogId: toCatalogId(o.productType, o.productKey, o.compatId), compatId: o.compatId }))
      .filter((p): p is PaidRef => !!p.catalogId);

    const byId = new Map(catalog.filter((p) => isViewableFor(p, false)).map((p) => [p.id, p]));
    const items = pickResumeItems(candidates, paid, (id) => byId.get(id), locale).map((it) => {
      const p = byId.get(it.catalogId)!;
      return { ...it, name: p.name, hook: p.hook, icon3d: p.icon3d };
    });
    return NextResponse.json({ items }, { headers: NO_STORE });
  } catch (e) {
    console.error("[user/resume]", e instanceof Error ? e.message : e);
    // 이어보기는 덤이다 — 실패해도 화면은 그대로
    return NextResponse.json({ items: [] }, { headers: NO_STORE });
  }
}
