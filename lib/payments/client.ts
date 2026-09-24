import * as PortOne from "@portone/browser-sdk/v2";
import { getProduct } from "@/lib/catalog";

export interface BuyerInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
}

export interface PayOptions {
  productId: string;
  compatId?: string;
  buyer: BuyerInfo;
  locale?: string;
}

export type PayResult =
  | { ok: true; orderId: string; catalogId: string; compatId: string | null; amount: number }
  | { ok: false; reason: "LOGIN_REQUIRED" | "CANCELLED" | "FAILED" };

/**
 * [SECURITY / H-2] 게스트 열람 증명 토큰(orderId) 보관.
 *
 * 게스트는 세션이 없으므로 서버가 소유권을 확인할 수단이 추측 불가한 orderId 뿐이다.
 * URL 쿼리에 실으면 브라우저 히스토리·Referer·GA4 page_location 으로 새어 나가므로
 * 결제 완료 응답 본문으로만 받아 이 기기의 localStorage 에 보관한다.
 * (열람 유효기간 90일 판정은 전적으로 서버 DB 가 하며, 이 값은 "증명 제출용"일 뿐이다.)
 */
const UNLOCK_TOKEN_PREFIX = "kongdak_unlock_";

// 토큰이 바뀌면(발급/폐기) 이를 구독 중인 화면이 즉시 다시 그리도록 알린다.
// useSyncExternalStore 의 subscribe 로 그대로 넘길 수 있는 형태.
const unlockTokenListeners = new Set<() => void>();

export function subscribeUnlockToken(onStoreChange: () => void): () => void {
  unlockTokenListeners.add(onStoreChange);
  return () => {
    unlockTokenListeners.delete(onStoreChange);
  };
}

function notifyUnlockTokenChanged(): void {
  unlockTokenListeners.forEach((listener) => listener());
}

export function rememberUnlockToken(compatId: string, orderId: string): void {
  if (typeof window === "undefined" || !compatId || !orderId) return;
  try {
    window.localStorage.setItem(UNLOCK_TOKEN_PREFIX + compatId, orderId);
  } catch {
    // 시크릿 모드·저장소 차단 환경에서는 조용히 포기한다(로그인 사용자는 세션으로 열람).
  }
  notifyUnlockTokenChanged();
}

/**
 * [SECURITY / H-4] 서버가 권한을 회수했을 때(환불·만료) 기기에 남은 토큰을 폐기한다.
 */
export function forgetUnlockToken(compatId: string): void {
  if (typeof window === "undefined" || !compatId) return;
  try {
    window.localStorage.removeItem(UNLOCK_TOKEN_PREFIX + compatId);
  } catch {
    // 저장소 접근 불가 환경 — 어차피 읽히지도 않으므로 무시한다.
  }
  notifyUnlockTokenChanged();
}

export function recallUnlockToken(compatId: string): string | null {
  if (typeof window === "undefined" || !compatId) return null;
  try {
    return window.localStorage.getItem(UNLOCK_TOKEN_PREFIX + compatId);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// 주문 단위 열람 토큰 (일반 상품 / 세트 / 총운)
// ─────────────────────────────────────────────────────────────

const ORDER_TOKEN_PREFIX = "kongdak_order_";
const orderTokenKey = (catalogId: string, compatId?: string | null) =>
  ORDER_TOKEN_PREFIX + catalogId + (compatId ? `_${compatId}` : "");

// 정통 궁합은 궁합 결과 화면이 unlock 토큰으로 연다 → 정통 궁합이 든 세트 주문도 같은 토큰으로 남긴다
const opensCompatBasic = (catalogId: string) =>
  catalogId === "compat_basic" || !!getProduct(catalogId)?.items?.includes("compat_basic");

export function rememberOrderToken(catalogId: string, orderId: string, compatId?: string | null): void {
  if (typeof window === "undefined" || !catalogId || !orderId) return;
  try {
    window.localStorage.setItem(orderTokenKey(catalogId, compatId), orderId);
  } catch {}
  if (opensCompatBasic(catalogId) && compatId) {
    rememberUnlockToken(compatId, orderId);
  }
  notifyUnlockTokenChanged();
}

export function recallOrderToken(catalogId: string, compatId?: string | null): string | null {
  if (typeof window === "undefined" || !catalogId) return null;
  try {
    return window.localStorage.getItem(orderTokenKey(catalogId, compatId));
  } catch {
    return null;
  }
}

export function forgetOrderToken(catalogId: string, compatId?: string | null): void {
  if (typeof window === "undefined" || !catalogId) return;
  try {
    window.localStorage.removeItem(orderTokenKey(catalogId, compatId));
  } catch {}
  if (opensCompatBasic(catalogId) && compatId) {
    forgetUnlockToken(compatId);
  }
  notifyUnlockTokenChanged();
}

export async function requestPortOnePayment(opts: PayOptions): Promise<PayResult> {
  // 1) 서버가 주문 생성 (금액은 서버에서 결정)
  const orderRes = await fetch("/api/payments/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: opts.productId,
      compatId: opts.compatId,
      email: opts.buyer.email,
    }),
  });

  if (orderRes.status === 401) {
    return { ok: false, reason: "LOGIN_REQUIRED" };
  }

  const order = await orderRes.json();
  if (!orderRes.ok) {
    alert(order.error || "주문 생성에 실패했습니다.");
    return { ok: false, reason: "FAILED" };
  }

  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;

  if (!storeId || !channelKey) {
    alert("결제 설정(Store ID 또는 Channel Key)이 누락되었습니다.");
    return { ok: false, reason: "FAILED" };
  }

  const locale = opts.locale || "ko";
  const redirectUrl = `${window.location.origin}/${locale}/pay/complete?paymentId=${order.orderId}`;

  // orderName은 서버 응답의 orderName을 쓴다
  const orderName = order.orderName || "콩닥 사주 리포트";

  // 2) PortOne v2 결제창 호출 (KG이니시스)
  const res = await PortOne.requestPayment({
    storeId,
    channelKey,
    paymentId: order.orderId,
    orderName,
    totalAmount: order.amount,
    currency: "CURRENCY_KRW",
    payMethod: "CARD",
    customer: {
      fullName: opts.buyer.fullName,
      email: opts.buyer.email,
      phoneNumber: opts.buyer.phoneNumber,
    },
    redirectUrl,
  });

  // 3) PC: 프로미스 반환 (res.code != null 이면 취소/실패). 모바일: redirectUrl로 이동.
  if (res && res.code != null) {
    const isCancelled = res.code === "FAILURE_TYPE_CANCELLED" || String(res.message).includes("취소");
    if (!isCancelled) {
      alert(`결제 실패: ${res.message || res.code}`);
    }
    return { ok: false, reason: isCancelled ? "CANCELLED" : "FAILED" };
  }

  // 4) 서버 결제 검증
  return await verifyAndCompletePayment(order.orderId, opts.productId, opts.compatId, order.amount);
}

export async function verifyAndCompletePayment(
  paymentId: string,
  fallbackCatalogId?: string,
  fallbackCompatId?: string | null,
  fallbackAmount?: number
): Promise<PayResult> {
  try {
    const r = await fetch("/api/payments/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });

    if (r.ok) {
      const result = await r.json().catch(() => null);
      const catalogId = result?.catalogId || fallbackCatalogId || "compat_basic";
      const compatId = result?.compatId ?? fallbackCompatId ?? null;
      const orderId = result?.orderId || paymentId;
      const amount = typeof result?.amount === "number" ? result.amount : (fallbackAmount ?? 0);

      rememberOrderToken(catalogId, orderId, compatId);
      // Note: window.location.reload() 제거. 이동은 호출자가 결정.
      return {
        ok: true,
        orderId,
        catalogId,
        compatId,
        amount,
      };
    } else {
      const e = await r.json().catch(() => ({}));
      alert(e.error || "결제 확인에 실패했습니다.");
      return { ok: false, reason: "FAILED" };
    }
  } catch {
    alert("결제 확인 서버 통신 중 오류가 발생했습니다.");
    return { ok: false, reason: "FAILED" };
  }
}
