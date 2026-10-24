/**
 * [P-017] 비로그인 첫 방문 환영 시트 & 가입 쿠폰 설정
 *
 * - 기본값: WELCOME_COUPON_AMOUNT = 0 (시트에는 현재 사실인 3가지 혜택만 표시)
 * - 사장님이 1000(또는 2000)으로 바꾸면:
 *   1) 시트의 3번째 줄이 자동으로 "가입하면 N원 즉시 할인 쿠폰"으로 바뀌고,
 *   2) 첫 로그인 시 기존 Coupon 테이블에 가입 쿠폰(ownerKey = userId, 30일 유효)을 1장 발급한다.
 */
export const WELCOME_COUPON_AMOUNT = 0;

export const WELCOME_COUPON_TTL_DAYS = 30;
export const WELCOME_DISMISS_STORAGE_KEY = "kd_welcome_sheet_dismissed_until";
export const WELCOME_DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

export function getWelcomeSheetBenefits(amount: number = WELCOME_COUPON_AMOUNT): string[] {
  const thirdBenefit =
    amount > 0
      ? `가입하면 ${amount.toLocaleString("ko-KR")}원 쿠폰 즉시 지급`
      : "후기 쓰면 1,000원 쿠폰";
  return [
    "무료 미리보기 하루 3→6개",
    "본 결과는 보관함에 저장",
    thirdBenefit,
  ];
}

export function welcomeCouponCodeForUser(userId: string): string {
  return `WELCOME-${userId}`;
}

export interface WelcomeCouponPrismaLike {
  coupon: {
    findUnique: (args: { where: { code: string } }) => Promise<{ id: string } | null>;
    create: (args: {
      data: {
        code: string;
        amount: number;
        ownerKey: string;
        expiresAt: Date;
      };
    }) => Promise<{ id: string; code: string; amount: number }>;
  };
}

/**
 * WELCOME_COUPON_AMOUNT > 0 일 때만 첫 로그인/가입 회원에게 1회 가입 쿠폰을 발급한다.
 */
export async function issueWelcomeCouponIfEnabled(
  db: WelcomeCouponPrismaLike,
  userId: string,
  amount: number = WELCOME_COUPON_AMOUNT,
): Promise<{ issued: boolean; amount: number }> {
  if (!userId || amount <= 0) {
    return { issued: false, amount: 0 };
  }
  const code = welcomeCouponCodeForUser(userId);
  const existing = await db.coupon.findUnique({ where: { code } });
  if (existing) {
    return { issued: false, amount };
  }
  const expiresAt = new Date(Date.now() + WELCOME_COUPON_TTL_DAYS * 86_400_000);
  await db.coupon.create({
    data: {
      code,
      amount,
      ownerKey: userId,
      expiresAt,
    },
  });
  return { issued: true, amount };
}
