import { NextResponse } from "next/server";
import { getAdminSessionOrThrow, logAdminAction } from "@/lib/adminAuth";
import { CATALOG, getProduct } from "@/lib/catalog";
import prisma from "@/lib/prisma";
import { invalidateVisibilityCache, resolveHidden } from "@/lib/catalogVisibility";

export async function POST(req: Request) {
  let admin;
  try {
    admin = await getAdminSessionOrThrow();
  } catch (err: unknown) {
    const errorObj = err as { message?: string; status?: number } | undefined;
    return NextResponse.json(
      { error: errorObj?.message || "관리자 권한이 없습니다." },
      { status: errorObj?.status || 403 }
    );
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { catalogId, action, reason } = (body || {}) as {
    catalogId?: string;
    action?: string;
    reason?: string;
  };

  if (!catalogId || typeof catalogId !== "string") {
    return NextResponse.json({ error: "catalogId가 필요합니다." }, { status: 400 });
  }

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "변경 사유(reason)를 입력해주세요." }, { status: 400 });
  }

  if (!action || !["show", "hide", "reset"].includes(action)) {
    return NextResponse.json(
      { error: "action은 'show', 'hide', 'reset' 중 하나여야 합니다." },
      { status: 400 }
    );
  }

  const targetProduct = getProduct(catalogId);
  if (!targetProduct) {
    return NextResponse.json({ error: "존재하지 않는 상품입니다." }, { status: 400 });
  }

  // 1. 현재 DB 오버라이드 조회
  let rows: { catalogId: string; visible: boolean }[] = [];
  try {
    rows = await prisma.productVisibility.findMany({
      select: { catalogId: true, visible: true },
    });
  } catch (e) {
    // 현재 상태를 모르면 세트·구성품 규칙을 판정할 수 없다 → 변경하지 않는다
    console.error("[productVisibility] Failed to fetch productVisibility:", e);
    return NextResponse.json({ error: "현재 공개 상태를 읽지 못했어요. 잠시 후 다시 시도하세요." }, { status: 500 });
  }

  const currentOverrides = new Map<string, boolean>();
  for (const r of rows) {
    currentOverrides.set(r.catalogId, r.visible);
  }

  const currentBeforeHidden = resolveHidden(targetProduct, currentOverrides);

  // 2. 가상 시뮬레이션 맵 생성
  const simulatedOverrides = new Map<string, boolean>(currentOverrides);
  if (action === "show") {
    simulatedOverrides.set(catalogId, true);
  } else if (action === "hide") {
    simulatedOverrides.set(catalogId, false);
  } else if (action === "reset") {
    simulatedOverrides.delete(catalogId);
  }

  const getSimulatedHidden = (p: typeof targetProduct) => resolveHidden(p, simulatedOverrides);
  const targetNewHidden = getSimulatedHidden(targetProduct);

  // 3. 일관성 규칙 검증
  // 규칙 1: SET이 공개(hidden === false) 상태인 경우 모든 구성품도 공개여야 함
  if (targetProduct.type === "SET" && !targetNewHidden) {
    const componentIds = targetProduct.items || [];
    const hiddenComponents: string[] = [];
    for (const compId of componentIds) {
      const compProd = getProduct(compId);
      if (compProd && getSimulatedHidden(compProd)) {
        hiddenComponents.push(compProd.name);
      }
    }
    if (hiddenComponents.length > 0) {
      return NextResponse.json(
        { error: `구성 상품 ${hiddenComponents.join(", ")}을 먼저 공개하세요.` },
        { status: 409 }
      );
    }
  }

  // 규칙 2: 어떤 상품이 숨김(hidden === true) 상태가 될 때, 그 상품을 포함하는 공개 SET이 있으면 409
  if (targetNewHidden) {
    const setProducts = CATALOG.filter((p) => p.type === "SET");
    for (const setP of setProducts) {
      if (!getSimulatedHidden(setP)) {
        if (setP.items && setP.items.includes(catalogId)) {
          return NextResponse.json(
            { error: `이 상품이 들어 있는 공개 세트 ${setP.name}을 먼저 숨기세요.` },
            { status: 409 }
          );
        }
      }
    }
  }

  // 4. DB 반영
  try {
    if (action === "show") {
      await prisma.productVisibility.upsert({
        where: { catalogId },
        update: { visible: true, updatedBy: admin.id, reason: reason.trim() },
        create: { catalogId, visible: true, updatedBy: admin.id, reason: reason.trim() },
      });
    } else if (action === "hide") {
      await prisma.productVisibility.upsert({
        where: { catalogId },
        update: { visible: false, updatedBy: admin.id, reason: reason.trim() },
        create: { catalogId, visible: false, updatedBy: admin.id, reason: reason.trim() },
      });
    } else if (action === "reset") {
      await prisma.productVisibility.deleteMany({
        where: { catalogId },
      });
    }
  } catch (dbErr) {
    console.error("[productVisibility] Failed to update DB:", dbErr);
    return NextResponse.json({ error: "공개 설정 저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  // 5. 캐시 무효화
  invalidateVisibilityCache();

  // 6. 감사 로그 기록
  await logAdminAction({
    adminUserId: admin.id,
    action: "product_visibility",
    targetType: "PRODUCT",
    targetId: catalogId,
    detail: {
      catalogId,
      action,
      before: !currentBeforeHidden,
      after: !targetNewHidden,
      reason: reason.trim(),
    },
  });

  const isFreeOrZero = targetProduct.isFree || targetProduct.price === 0;

  return NextResponse.json(
    {
      success: true,
      catalogId,
      visible: !targetNewHidden,
      action,
      message: "반영되었습니다. 모든 서버 반영까지 최대 30초가 소요될 수 있습니다.",
      note: isFreeOrZero ? "무료 상품으로 판매 대상이 아닙니다." : undefined,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
