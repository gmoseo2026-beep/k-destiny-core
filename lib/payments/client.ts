import * as PortOne from "@portone/browser-sdk/v2";

export interface BuyerInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
}

export interface PayOptions {
  type: "SINGLE" | "PERIOD_PASS";
  planId?: "1_MONTH" | "3_MONTHS";
  compatId?: string;
  buyer: BuyerInfo;
  locale?: string;
}

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
 *
 * 이 토큰은 "증명 제출용"일 뿐 권한 그 자체가 아니다. 서버는 이미 fail-closed 로
 * 403 을 돌려주고 있으므로 보안상 필수는 아니지만, 무효한 토큰을 들고 열람 버튼을
 * 계속 노출하면 환불받은 사용자가 403 만 반복해서 만나게 된다.
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

export async function requestPortOnePayment(opts: PayOptions): Promise<boolean> {
  // 1) 서버가 주문 생성 (금액은 서버에서 결정)
  const orderRes = await fetch("/api/payments/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: opts.type,
      planId: opts.planId,
      compatId: opts.compatId,
      email: opts.buyer.email,
    }),
  });

  const order = await orderRes.json();
  if (!orderRes.ok) {
    alert(order.error || "주문 생성 실패");
    return false;
  }

  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;

  if (!storeId || !channelKey) {
    alert("결제 설정(Store ID 또는 Channel Key)이 누락되었습니다.");
    return false;
  }

  const locale = opts.locale || "ko";
  const redirectUrl = `${window.location.origin}/${locale}/pay/complete?paymentId=${order.orderId}`;

  // 2) PortOne v2 결제창 호출 (KG이니시스)
  const res = await PortOne.requestPayment({
    storeId,
    channelKey,
    paymentId: order.orderId,
    orderName: opts.type === "SINGLE" ? "콩닥 심층 궁합 리포트" : "콩닥 플러스 이용권",
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
    alert(`결제 실패: ${res.message || res.code}`);
    return false;
  }

  // 4) 서버 결제 검증 (서버가 PortOne getPayment 로만 최종 판정)
  return await verifyAndCompletePayment(order.orderId);
}

export async function verifyAndCompletePayment(paymentId: string): Promise<boolean> {
  try {
    const r = await fetch("/api/payments/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });

    if (r.ok) {
      // 서버가 확정한 주문 정보로만 열람 토큰을 보관한다(클라가 지어내지 않는다).
      const result = await r.json().catch(() => null);
      if (result?.type === "SINGLE" && result?.compatId && result?.orderId) {
        rememberUnlockToken(result.compatId, result.orderId);
      }
      window.location.reload();
      return true;
    } else {
      const e = await r.json();
      alert(e.error || "결제 확인에 실패했습니다.");
      return false;
    }
  } catch (err: any) {
    alert("결제 확인 서버 통신 중 오류가 발생했습니다.");
    return false;
  }
}
