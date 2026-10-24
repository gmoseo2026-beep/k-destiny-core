import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { orderGrants } from "@/lib/entitlementRules";
import {
  COUPON_AMOUNT,
  COUPON_TTL_DAYS,
  couponOwnerKeyForOrder,
  generateCouponCode,
  getPublicReviewsForCatalog,
  validateReviewInput,
} from "@/lib/reviews";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const catalogId = searchParams.get("catalogId");
    const reportId = searchParams.get("reportId");

    if (reportId) {
      const report = await prisma.generatedReport.findUnique({
        where: { id: reportId },
        select: { orderId: true, firstViewedAt: true },
      });
      if (!report?.orderId) {
        return NextResponse.json({ canReview: false, alreadyReviewed: false }, { headers: NO_STORE });
      }
      const existing = await prisma.review.findUnique({
        where: { orderId: report.orderId },
        select: { id: true },
      });
      return NextResponse.json(
        {
          canReview: Boolean(report.firstViewedAt) && !existing,
          alreadyReviewed: Boolean(existing),
        },
        { headers: NO_STORE },
      );
    }

    if (catalogId) {
      const reviews = await getPublicReviewsForCatalog(catalogId, 6);
      return NextResponse.json({ reviews }, { headers: NO_STORE });
    }

    return NextResponse.json({ reviews: [] }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ reviews: [], canReview: false, alreadyReviewed: false }, { headers: NO_STORE });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      reportId?: unknown;
      orderId?: unknown;
      rating?: unknown;
      text?: unknown;
    } | null;

    const reportId = typeof body?.reportId === "string" ? body.reportId.trim() : "";
    if (!reportId) {
      return NextResponse.json({ error: "리포트 정보가 필요합니다." }, { status: 400, headers: NO_STORE });
    }

    const validated = validateReviewInput({ rating: body?.rating, text: body?.text });
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400, headers: NO_STORE });
    }

    const report = await prisma.generatedReport.findUnique({
      where: { id: reportId },
    });
    if (!report || report.kind !== "FULL" || !report.orderId) {
      return NextResponse.json({ error: "유효한 유료 리포트를 찾을 수 없습니다." }, { status: 404, headers: NO_STORE });
    }

    // [P-016-4 §2] 리포트를 실제로 연(firstViewedAt 있음) 구매자만 후기 작성 가능
    if (!report.firstViewedAt) {
      return NextResponse.json(
        { error: "리포트를 먼저 열람한 뒤에 후기를 작성할 수 있어요." },
        { status: 403, headers: NO_STORE },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: report.orderId },
      include: { unlocks: true },
    });
    if (!order || order.status !== "PAID") {
      return NextResponse.json({ error: "결제된 주문을 확인할 수 없습니다." }, { status: 403, headers: NO_STORE });
    }

    const session = await getServerSession(authOptions).catch(() => null);
    const sessionUserId = session?.user?.id ?? null;
    const presentedOrderId = typeof body?.orderId === "string" ? body.orderId.trim() : null;
    const now = new Date();

    const grant = orderGrants(order, {
      catalogId: report.catalogId,
      compatId: report.compatId,
      now,
      sessionUserId,
      presentedOrderId,
    });
    if (!grant.ok) {
      return NextResponse.json({ error: "이 리포트의 구매자만 후기를 남길 수 있어요." }, { status: 403, headers: NO_STORE });
    }

    const existing = await prisma.review.findUnique({
      where: { orderId: order.id },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "이미 이 주문에 대한 후기를 작성하셨어요.", code: "ALREADY_REVIEWED" },
        { status: 409, headers: NO_STORE },
      );
    }

    const ownerKey = couponOwnerKeyForOrder(order);
    const expiresAt = new Date(now.getTime() + COUPON_TTL_DAYS * 24 * 60 * 60 * 1000);
    const code = generateCouponCode();

    const created = await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          orderId: order.id,
          catalogId: report.catalogId,
          rating: validated.rating,
          text: validated.text,
          // 연락처·주소·링크가 든 후기는 공개하지 않는다(쿠폰은 그대로 발급). 별점이 낮아도 숨기지 않는다.
          displayOk: !/(https?:\/\/|www\.|[a-z0-9._-]+@[a-z0-9.-]+|01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}|카톡|오픈채팅|텔레그램)/i.test(validated.text),
        },
      });
      const coupon = await tx.coupon.create({
        data: {
          code,
          amount: COUPON_AMOUNT,
          ownerKey,
          expiresAt,
        },
      });
      return { review, coupon };
    });

    return NextResponse.json(
      {
        ok: true,
        reviewId: created.review.id,
        coupon: {
          code: created.coupon.code,
          amount: created.coupon.amount,
          expiresAt: created.coupon.expiresAt.toISOString(),
          ...(order.userId ? {} : { ownerToken: order.orderId }),
        },
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (e: unknown) {
    console.error("[api/reviews POST]", e);
    return NextResponse.json({ error: "후기 등록 중 오류가 발생했습니다." }, { status: 500, headers: NO_STORE });
  }
}
