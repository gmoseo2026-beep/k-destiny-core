export interface PublicReviewItem {
  id: string;
  catalogId: string;
  rating: number;
  text: string;
  zodiacEmoji: string;
  zodiacLabel: string;
  /** 같은 사람의 실제 누적 결제(PAID) 주문 수 — "N번째 구매" 배지용 */
  purchaseCount: number;
  createdAt: string;
}

export interface StoredCoupon {
  code: string;
  amount: number;
  expiresAt: string;
  /** 비회원 후기 작성 시 증명한 주문 토큰(order.orderId) — 서버 ownerKey 해시 대조용 */
  ownerToken?: string;
}

const COUPON_STORAGE_KEY = "kongdak_coupon_v1";

export function rememberDeviceCoupon(coupon: StoredCoupon): void {
  if (typeof window === "undefined" || !coupon?.code) return;
  try {
    window.localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupon));
  } catch {
    // 저장소 차단 환경에서는 무시
  }
}

export function recallDeviceCoupon(now: number = Date.now()): StoredCoupon | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COUPON_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCoupon> | null;
    if (
      !parsed ||
      typeof parsed.code !== "string" ||
      !parsed.code ||
      typeof parsed.amount !== "number" ||
      typeof parsed.expiresAt !== "string"
    ) {
      window.localStorage.removeItem(COUPON_STORAGE_KEY);
      return null;
    }
    const exp = new Date(parsed.expiresAt).getTime();
    if (!Number.isFinite(exp) || exp <= now) {
      window.localStorage.removeItem(COUPON_STORAGE_KEY);
      return null;
    }
    return {
      code: parsed.code,
      amount: parsed.amount,
      expiresAt: parsed.expiresAt,
      ...(typeof parsed.ownerToken === "string" && parsed.ownerToken ? { ownerToken: parsed.ownerToken } : {}),
    };
  } catch {
    return null;
  }
}

export function clearDeviceCoupon(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(COUPON_STORAGE_KEY);
  } catch {}
}

/** 이 기기에 저장된 게스트 주문 토큰(kongdak_order_*, kongdak_unlock_*) 목록 수집 */
export function collectDeviceOrderTokens(): string[] {
  if (typeof window === "undefined") return [];
  const tokens: string[] = [];
  try {
    const cpn = recallDeviceCoupon();
    if (cpn?.ownerToken && !tokens.includes(cpn.ownerToken)) {
      tokens.push(cpn.ownerToken);
    }
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (
        k &&
        (k.startsWith("kongdak_order_") ||
          k.startsWith("kongdak_unlock_") ||
          k.startsWith("kd_last_order_"))
      ) {
        const v = window.localStorage.getItem(k);
        if (v) {
          if (k.startsWith("kd_last_order_")) {
            try {
              const parsed = JSON.parse(v) as { orderId?: string } | null;
              if (parsed?.orderId && !tokens.includes(parsed.orderId)) {
                tokens.push(parsed.orderId);
              }
            } catch {}
          } else if (!tokens.includes(v)) {
            tokens.push(v);
          }
        }
      }
    }
  } catch {}
  return tokens.slice(0, 20);
}
