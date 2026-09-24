import { NextResponse } from "next/server";
import { getAdminSessionOrThrow, logAdminAction } from "@/lib/adminAuth";
import { getProduct } from "@/lib/catalog";
import { toStorageKey } from "@/lib/productIdentity";
import { applyPaidOrder } from "@/lib/payments/grant";
import prisma from "@/lib/prisma";

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

  const { catalogId, userId, email, compatId, reason } = (body || {}) as {
    catalogId?: string;
    userId?: string;
    email?: string;
    compatId?: string;
    reason?: string;
  };

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "발급 사유(reason)를 입력해주세요." }, { status: 400 });
  }

  if (!catalogId || typeof catalogId !== "string") {
    return NextResponse.json({ error: "상품(catalogId)을 지정해주세요." }, { status: 400 });
  }

  const product = getProduct(catalogId);
  if (!product) {
    return NextResponse.json({ error: "존재하지 않는 상품입니다." }, { status: 400 });
  }

  // couple 상품은 compatId 필수 및 존재 여부 확인
  if (product.target === "couple") {
    if (!compatId || typeof compatId !== "string") {
      return NextResponse.json(
        { error: "궁합 관련 상품은 compatId가 필수입니다." },
        { status: 400 }
      );
    }
    const compat = await prisma.compatibility.findUnique({
      where: { id: compatId },
    });
    if (!compat) {
      return NextResponse.json(
        { error: "존재하지 않는 궁합(compatId)입니다." },
        { status: 400 }
      );
    }
  }

  // userId 또는 email 중 하나 필수
  const trimmedUserId = typeof userId === "string" && userId.trim() ? userId.trim() : null;
  const trimmedEmail = typeof email === "string" && email.trim() ? email.trim() : null;

  if (!trimmedUserId && !trimmedEmail) {
    return NextResponse.json(
      { error: "회원 ID(userId) 또는 이메일(email) 중 하나는 필수입니다." },
      { status: 400 }
    );
  }

  let finalEmail = trimmedEmail;
  if (trimmedUserId) {
    const user = await prisma.user.findUnique({
      where: { id: trimmedUserId },
    });
    if (!user) {
      return NextResponse.json(
        { error: "존재하지 않는 회원(userId)입니다." },
        { status: 400 }
      );
    }
    if (!finalEmail && user.email) {
      finalEmail = user.email;
    }
  }

  // 1. Order 생성: PENDING, amount 0, admin_manual
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const orderId = `kd_ord_${Date.now()}_${randomSuffix}`;
  const { productType, productKey } = toStorageKey(catalogId);

  try {
    await prisma.order.create({
      data: {
        orderId,
        status: "PENDING",
        type: "SINGLE",
        amount: 0,
        provider: "admin_manual",
        productType,
        productKey,
        compatId: compatId || null,
        userId: trimmedUserId,
        email: finalEmail,
      },
    });
  } catch (err) {
    console.error("[adminGrants] Order creation failed:", err);
    return NextResponse.json(
      { error: "주문 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  // 2. applyPaidOrder 호출: 결제와 동일한 Unlock 및 accessDays 부여 경로
  const grantRes = await applyPaidOrder(orderId, "admin_manual");
  if (!grantRes.ok) {
    console.error("[adminGrants] applyPaidOrder failed:", grantRes);
    return NextResponse.json(
      { error: "권한 부여(applyPaidOrder) 처리에 실패했습니다." },
      { status: 500 }
    );
  }

  // 3. 감사 로그 기록
  await logAdminAction({
    adminUserId: admin.id,
    action: "GRANT_MANUAL",
    targetType: "ORDER",
    targetId: orderId,
    detail: {
      catalogId,
      userId: trimmedUserId,
      email: finalEmail,
      compatId: compatId || null,
      reason: reason.trim(),
      orderId,
    },
  });

  const viewUrl = !trimmedUserId
    ? `https://kongdak.kr/ko/pay/complete?paymentId=${orderId}`
    : undefined;

  return NextResponse.json(
    {
      success: true,
      orderId,
      viewUrl,
      message: "수동 발급이 성공적으로 완료되었습니다.",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
