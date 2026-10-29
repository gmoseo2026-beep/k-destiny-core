import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { isSellableFor } from "@/lib/catalog";
import { getEffectiveProduct } from "@/lib/catalogVisibility";
import { toStorageKey } from "@/lib/productIdentity";
import { canPreview } from "@/lib/preview";
import { campaignFromCookieHeader } from "@/lib/campaignLinks";
import { calculateDiscountedAmount, findUsableCoupon } from "@/lib/reviews";
import { extractOrderAdSignals } from "@/lib/adConversions";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const type = body.type ?? "SINGLE";
    const productId = body.productId || body.product;
    const compatId = body.compatId;
    const email = body.email;
    // 접속 환경 라벨(클라이언트가 보낸 값). 정해진 글자만 받아 그대로 저장한다 — 판정에는 쓰지 않는다.
    const clientEnv =
      typeof body.env === "string" && /^[a-z]{2,12}:(m|pc)$/.test(body.env) ? body.env : null;

    // 제휴 배너 전용 주소(/go/<코드>)로 들어온 사람이면 그 유입 표시를 주문에 남긴다(집계용, 판정에는 쓰지 않는다)
    const campaign = campaignFromCookieHeader(req.headers.get("cookie"));
    // [Argon 15] 메타 CAPI·틱톡 Events API용 서버 광고 신호(IP·UA·_fbp·_fbc·_ttp·ttclid 쿠키). 이름·전화·이메일·생년월일 미포함.
    const adSignals = extractOrderAdSignals(req);

    // 결제 수단("KAKAOPAY" | "NAVERPAY" | "CARD"). 없거나 다른 값이면 null로 저장하며 이 값 때문에 주문을 거절하지 않는다.
    const payMethod =
      body.payMethod === "KAKAOPAY" || body.payMethod === "NAVERPAY" || body.payMethod === "CARD" ? body.payMethod : null;

    if (type === "PERIOD_PASS") {
      // [D4] PERIOD_PASS 분기는 더 이상 사용되지 않으므로 410 반환
      return NextResponse.json({ error: "기간권 판매가 종료되었습니다." }, { status: 410 });
    }

    if (type === "SINGLE") {
      // Legacy compatibility for annual and initial compat
      let catalogId = productId;
      if (productId === "ANNUAL_2026") catalogId = "annual_2026";
      else if (!productId && compatId) catalogId = "compat_basic";

      const preview = canPreview(session?.user?.email);
      const catalogItem = await getEffectiveProduct(catalogId);
      if (!catalogItem || !isSellableFor(catalogItem, preview)) {
        return NextResponse.json({ error: "유효하지 않거나 판매할 수 없는 상품입니다." }, { status: 400 });
      }

      if (catalogItem.requiresLogin && !session?.user?.id) {
        return NextResponse.json({ error: "로그인이 필요합니다.", code: "LOGIN_REQUIRED" }, { status: 401 });
      }

      const requiresCompatId = catalogItem.target === "couple";
      if (requiresCompatId) {
        if (!compatId) {
          return NextResponse.json({ error: "compatId is required for this product" }, { status: 400 });
        }
        const existingCompat = await prisma.compatibility.findUnique({ where: { id: compatId } });
        if (!existingCompat) {
          return NextResponse.json({ error: "궁합 정보를 찾을 수 없습니다." }, { status: 404 });
        }
      }

      let parsedEmail = session?.user?.email || null;
      if (!session?.user?.id) {
        // 비회원 이메일은 선택이다(2026-10-03). 모바일 결제는 이메일 없이 바로 결제창으로 간다 —
        // 이메일 입력 칸에서 결제 모달을 연 사람의 2/3 가 나갔다. 열람 증명은 주문번호이고,
        // 이메일은 결제 완료 화면에서 선택으로 받는다(/api/payments/contact). 보냈다면 형식은 검사한다.
        if (typeof email === "string" && email.trim()) {
          parsedEmail = email.trim().toLowerCase();
          if (!isValidEmail(parsedEmail)) {
            return NextResponse.json({ error: "유효하지 않은 이메일 형식입니다." }, { status: 400 });
          }
        }
      }

      // 회원·비회원 같은 가격(회원 첫 결제 할인은 2026-10-15 폐지)
      const baseAmount = catalogItem.price;
      const sessionUserId = session?.user?.id ?? null;

      const { productType, productKey } = toStorageKey(catalogItem.id);
      
      // 세트이면서 궁합(커플) 포함 시 주문에 compatId 저장 (커밋 D1 보완 지시)
      const orderCompatId = requiresCompatId ? compatId : null;

      const orderId = `kd_ord_${uuidv4().replace(/-/g, "")}`;

      // [P-016-4 §3] 쿠폰 금액 계산·검증은 서버에서만 수행 (클라 금액 신뢰 금지).
      // 유효한 미사용 쿠폰이 있으면 서버가 차감한 금액을 Order.amount 로 저장하고 PortOne 결제창도 같은 금액을 쓴다.
      const couponCode = typeof body.couponCode === "string" ? body.couponCode.trim() : null;
      const guestOrderTokens = Array.isArray(body.guestOrderTokens)
        ? body.guestOrderTokens.filter((t: unknown): t is string => typeof t === "string" && t.length > 0).slice(0, 20)
        : [];
      const usableCoupon = await findUsableCoupon({
        couponCode,
        userId: sessionUserId,
        guestOrderTokens,
      });

      let amount = baseAmount;
      let appliedCouponCode: string | null = null;
      let discountAmount = 0;

      if (usableCoupon) {
        const couponRepo = (prisma as unknown as { coupon?: typeof prisma.coupon }).coupon;
        const claimed = couponRepo?.updateMany
          ? await couponRepo.updateMany({
              where: { id: usableCoupon.id, usedOrderId: usableCoupon.usedOrderId },
              data: { usedOrderId: orderId },
            })
          : { count: 0 }; // 쿠폰 테이블을 못 쓰면 할인하지 않는다(선점 없이 깎아 주지 않음)
        if (claimed.count === 1) {
          // 결제를 끝내지 않은 이전 주문에서 쿠폰을 옮겨 온 경우: 이전 주문은 정가로 되돌린다.
          // 이전 결제창에서 할인 금액으로 결제하면 금액 불일치로 완료(/complete·웹훅)가 거절돼, 쿠폰 1장이 두 번 쓰이지 않는다.
          if (usableCoupon.usedOrderId && usableCoupon.usedOrderId !== orderId) {
            await prisma.order.updateMany({
              where: { orderId: usableCoupon.usedOrderId, status: { not: "PAID" } },
              data: { amount: { increment: calculateDiscountedAmount(Number.MAX_SAFE_INTEGER, usableCoupon.amount).discount } },
            });
          }
          const calc = calculateDiscountedAmount(baseAmount, usableCoupon.amount);
          amount = calc.amount;
          discountAmount = calc.discount;
          appliedCouponCode = usableCoupon.code;
        }
      }

      const order = await prisma.order.create({
        data: {
          orderId,
          userId: sessionUserId,
          email: parsedEmail,
          compatId: orderCompatId,
          productType,
          productKey,
          type: "SINGLE",
          amount,
          clientEnv,
          campaign,
          payMethod,
          ...(adSignals ? { adSignals } : {}),
          status: "PENDING",
          provider: process.env.PG_PROVIDER || "portone",
        },
      });

      return NextResponse.json(
        {
          orderId: order.orderId,
          amount: order.amount,
          type: order.type,
          orderName: catalogItem.name,
          ...(appliedCouponCode ? { couponCode: appliedCouponCode, discountAmount } : {}),
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Invalid order type" }, { status: 400 });
  } catch (e: unknown) {
    // [SECURITY / L-4] Prisma 예외 원문은 서버 로그에만 남긴다.
    console.error("[payments/order]", e);
    return NextResponse.json({ error: "주문 생성에 실패했습니다." }, { status: 500 });
  }
}
