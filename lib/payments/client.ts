import * as PortOne from "@portone/browser-sdk/v2";
import { getProduct } from "@/lib/catalog";
import { grantingCatalogIds } from "@/lib/productIdentity";
import { trackEvent } from "@/lib/gtag";
import { clientEnvLabel } from "@/lib/inAppBrowser";
import { recallDeviceCoupon, collectDeviceOrderTokens, clearDeviceCoupon } from "@/lib/couponsClient";

export interface BuyerInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
  /**
   * 결제 수단 바로가기(2026-10-05 카카오페이, 2026-10-24 네이버페이). 값이 있으면 이니시스 결제창(약관 3개 + 수단 고르기)을
   * 건너뛰고 그 간편결제 화면으로 바로 간다. 없으면 기존처럼 카드 결제창(그 안에서 간편결제 선택).
   */
  payMethod?: "KAKAOPAY" | "NAVERPAY";
}

export interface GiftPurchasePayload {
  recipientNickname: string;
  senderNickname?: string;
  message?: string;
}

export interface IssuedGiftSummary {
  code: string;
  catalogId: string;
  recipientNickname: string;
  senderNickname: string | null;
  message: string | null;
  expiresAt: string;
}

export interface PayOptions {
  productId: string;
  compatId?: string;
  buyer: BuyerInfo;
  locale?: string;
  upgradeFromOrderId?: string;
  gift?: GiftPurchasePayload;
  askQuestions?: [string, string, string];
}

export type PayResult =
  | {
      ok: true;
      orderId: string;
      catalogId: string;
      compatId: string | null;
      amount: number;
      isGift?: boolean;
      gift?: IssuedGiftSummary;
    }
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
    if (catalogId === "ask_three") {
      // 같은 궁합에서 다시 구매해도 이전 답장 리포트 열람 토큰이 덮어써져 사라지지 않도록 보관
      window.localStorage.setItem(`${ORDER_TOKEN_PREFIX}hist_${orderId}`, orderId);
    }
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

/**
 * 같은 결제를 두 번 받지 않기(2026-10-25).
 * 10-24 틱톡 앱 안 손님이 같은 두 사람의 속마음을 20:11·20:24 두 번 결제하고 20:36 에 세 번째 결제창을 열었다.
 * 결제는 됐는데 결제 완료 화면으로 돌아오지 못해(앱 안 브라우저) 열람 증명이 이 기기에 남지 않았고, 화면엔 다시 "결제" 버튼이 보였다.
 * 그래서 결제창을 열 때마다 주문번호를 이 기기(localStorage, 24시간)에 적어 두고, 다음 결제 전에
 * 같은 두 사람·같은 리포트로 열었던 주문이 실제로 결제됐는지 서버에 먼저 묻는다. 결제됐으면 새 주문 없이 그 리포트를 연다.
 * 주문번호는 이 기기가 직접 만든 것만 쓰므로(게스트 열람 증명과 같은 수준) 다른 사람의 결제를 열 수 없다.
 */
const PAY_ATTEMPTS_KEY = "kongdak_pay_attempts";
const PAY_ATTEMPTS_TTL_MS = 24 * 60 * 60 * 1000;

interface PayAttempt {
  orderId: string;
  productId: string;
  compatId: string | null;
  at: number;
}

function readPayAttempts(now: number = Date.now()): PayAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PAY_ATTEMPTS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is PayAttempt =>
        !!a && typeof a.orderId === "string" && typeof a.productId === "string" &&
        typeof a.at === "number" && now - a.at < PAY_ATTEMPTS_TTL_MS
    );
  } catch {
    return [];
  }
}

function writePayAttempts(list: PayAttempt[]): void {
  try {
    window.localStorage.setItem(PAY_ATTEMPTS_KEY, JSON.stringify(list.slice(-10)));
  } catch {}
}

function recordPayAttempt(a: Omit<PayAttempt, "at">): void {
  if (typeof window === "undefined") return;
  writePayAttempts([...readPayAttempts(), { ...a, at: Date.now() }]);
}

function forgetPayAttempt(orderId: string): void {
  if (typeof window === "undefined") return;
  writePayAttempts(readPayAttempts().filter((a) => a.orderId !== orderId));
}

/** 같은 두 사람·같은 리포트(또는 그 리포트가 든 세트)로 이 기기가 열었던 결제 중 실제로 끝난 게 있으면 그 결과 */
async function recoverPaidAttempt(productId: string, compatId: string | null): Promise<PayResult | null> {
  // 한 사람 상품(신년운 등)은 compatId 가 없어 "누구 것인지" 구분이 안 된다 — 친구 것을 또 사는 경우를 막지 않도록 두 사람 상품만 본다
  // ask_three("그 사람에 대해 묻고 싶은 3가지")는 더 물으려면 다시 구매할 수 있는 단건 상품이므로 이전 결제로 막지 않는다.
  if (!compatId || productId === "ask_three") return null;
  const granting = new Set(grantingCatalogIds(productId));
  const candidates = readPayAttempts()
    .filter((a) => granting.has(a.productId) && (a.compatId ?? null) === compatId)
    .slice(-3)
    .reverse();
  for (const a of candidates) {
    try {
      const r = await fetch("/api/payments/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: a.orderId }),
      });
      if (!r.ok) continue; // 402(결제 안 됨)·403 등은 넘어간다
      const result = await r.json().catch(() => null);
      const catalogId = result?.catalogId || a.productId;
      const orderId = result?.orderId || a.orderId;
      const amount = typeof result?.amount === "number" ? result.amount : 0;
      forgetPayAttempt(a.orderId);
      clearPendingPayment();
      rememberOrderToken(catalogId, orderId, result?.compatId ?? compatId);
      trackPurchase({ receiptId: result?.receiptId, amount, catalogId });
      trackEvent("payment_already_paid", { productId, app: clientEnvLabel() });
      alert("이미 결제가 끝난 리포트예요. 다시 결제하지 않고 바로 열어 드릴게요.");
      return { ok: true, orderId, catalogId, compatId: result?.compatId ?? compatId, amount };
    } catch {
      continue;
    }
  }
  return null;
}

export async function requestPortOnePayment(opts: PayOptions): Promise<PayResult> {
  const isGift = Boolean(opts.gift);
  // 0) 이 기기에서 같은 리포트를 이미 결제했는데 완료 화면으로 못 돌아온 경우 → 새로 결제받지 않고 연다 (선물하기는 제외)
  if (!isGift) {
    const recovered = await recoverPaidAttempt(opts.productId, opts.compatId ?? null);
    if (recovered) return recovered;
  }

  // 1) 서버가 주문 생성 (금액 및 쿠폰 할인은 서버에서 검증·결정, 선물하기는 정가 그대로·차액 업그레이드는 쿠폰 없음)
  const savedCoupon = isGift || opts.upgradeFromOrderId ? null : recallDeviceCoupon();
  const guestOrderTokens = collectDeviceOrderTokens();
  const orderRes = await fetch("/api/payments/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: opts.productId,
      compatId: isGift ? undefined : opts.compatId,
      ...(isGift && opts.gift
        ? {
            isGift: true,
            recipientNickname: opts.gift.recipientNickname,
            senderNickname: opts.gift.senderNickname,
            giftMessage: opts.gift.message,
          }
        : {}),
      // 모바일 비회원은 이메일을 받지 않는다(선택) → 빈 값은 보내지 않는다
      ...(opts.buyer.email ? { email: opts.buyer.email } : {}),
      ...(savedCoupon ? { couponCode: savedCoupon.code } : {}),
      ...(opts.upgradeFromOrderId ? { upgradeFromOrderId: opts.upgradeFromOrderId } : {}),
      ...(guestOrderTokens.length > 0 ? { guestOrderTokens } : {}),
      ...(opts.askQuestions ? { askQuestions: opts.askQuestions } : {}),
      env: clientEnvLabel(),
      payMethod: opts.buyer.payMethod ?? "CARD",
    }),
  });

  if (orderRes.status === 401) {
    return { ok: false, reason: "LOGIN_REQUIRED" };
  }

  const order = await orderRes.json();
  if (!orderRes.ok) {
    trackEvent("payment_failed", { productId: opts.productId, stage: "order", code: String(orderRes.status) });
    alert(order.error || "주문 생성에 실패했습니다.");
    return { ok: false, reason: "FAILED" };
  }
  // 결제창을 여는 시점(GA4 표준 이벤트). 서버가 정한 금액으로 기록한다.
  const direct = opts.buyer.payMethod;
  trackEvent("begin_checkout", {
    productId: opts.productId,
    value: order.amount,
    currency: "KRW",
    app: clientEnvLabel(),
    method: direct ? direct.toLowerCase() : "card_window",
  });

  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;

  if (!storeId || !channelKey) {
    alert("결제 설정(Store ID 또는 Channel Key)이 누락되었습니다.");
    return { ok: false, reason: "FAILED" };
  }

  const locale = opts.locale || "ko";
  const redirectUrl = `${window.location.origin}/${locale}/pay/complete?paymentId=${order.orderId}`;
  rememberPayReturn(opts);
  rememberPendingPayment({ orderId: order.orderId, productId: opts.productId, at: Date.now() });
  if (!isGift) {
    recordPayAttempt({ orderId: order.orderId, productId: opts.productId, compatId: opts.compatId ?? null });
  }

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
    // 간편결제 바로가기: 포트원 V2 "간편결제 UI 직접 호출"(payMethod EASY_PAY + easyPayProvider)
    ...(direct
      ? { payMethod: "EASY_PAY" as const, easyPay: { easyPayProvider: direct } }
      : { payMethod: "CARD" as const }),
    customer: {
      fullName: opts.buyer.fullName,
      // 모바일 결제는 이메일·휴대폰 번호를 받지 않는다(KG이니시스: PC 결제에서만 필수)
      ...(opts.buyer.email ? { email: opts.buyer.email } : {}),
      ...(opts.buyer.phoneNumber ? { phoneNumber: opts.buyer.phoneNumber } : {}),
    },
    redirectUrl,
  });

  // 3) PC: 프로미스 반환 (res.code != null 이면 취소/실패). 모바일: redirectUrl로 이동.
  if (res && res.code != null) {
    const isCancelled = res.code === "FAILURE_TYPE_CANCELLED" || String(res.message).includes("취소");
    trackEvent(isCancelled ? "payment_cancelled" : "payment_failed", {
      productId: opts.productId,
      stage: "pg",
      code: String(res.code).slice(0, 60),
      app: clientEnvLabel(),
      method: direct ? direct.toLowerCase() : "card_window",
    });
    if (!isCancelled) {
      alert(`결제 실패: ${res.message || res.code}`);
    }
    return { ok: false, reason: isCancelled ? "CANCELLED" : "FAILED" };
  }

  // 4) 서버 결제 검증
  return await verifyAndCompletePayment(order.orderId, opts.productId, opts.compatId, order.amount);
}

/**
 * 결제를 시작한 화면(모바일은 결제창으로 떠났다가 결제 완료 화면으로 돌아온다).
 * 결제가 실패·취소됐을 때 "다시 결제하러 가기"가 여기로 보낸다 — 2026-10-04 잔액부족으로 실패한 손님이
 * 돌아갈 길이 없어 가입부터 다시 했다. 미리보기 화면은 입력 상태로 그려지므로, 같은 미리보기가
 * 바로 다시 뜨도록 표시(auto·from)를 붙인다. 같은 탭에서만 유효하다(sessionStorage).
 */
const PAY_RETURN_KEY = "kongdak_pay_return";

function rememberPayReturn(opts: PayOptions): void {
  try {
    const u = new URL(window.location.href);
    const p = u.pathname;
    if (p.endsWith("/fortune/new")) {
      if (!u.searchParams.get("productId")) u.searchParams.set("productId", opts.productId);
      u.searchParams.set("auto", "1");
    } else if (p.endsWith("/compat/new") && opts.compatId) {
      if (!u.searchParams.get("productId")) u.searchParams.set("productId", opts.productId);
      u.searchParams.set("from", opts.compatId);
    }
    window.sessionStorage.setItem(PAY_RETURN_KEY, u.pathname + u.search);
  } catch {
    // 저장소를 못 쓰면 버튼이 안 보일 뿐이다
  }
}

export function recallPayReturn(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.sessionStorage.getItem(PAY_RETURN_KEY);
    return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
  } catch {
    return null;
  }
}

/**
 * [P-016-1] 결제 중단 복귀 안내용 상태 저장 (sessionStorage, 10분 유효).
 * 결제창을 열기 직전에 `{ orderId, productId, at }`을 기록하고,
 * 결제를 시작한 화면으로 다시 돌아왔을 때(pageshow / visibilitychange) 10분 이내면 복귀 안내 시트를 띄운다.
 * 결제 완료 화면에 도착하거나 결제가 완료되면 삭제한다.
 */
const PAY_PENDING_KEY = "kongdak_pay_pending";
export const PAY_PENDING_TTL_MS = 10 * 60 * 1000;

export interface PendingPayment {
  orderId: string;
  productId: string;
  at: number;
}

export function rememberPendingPayment(p: { orderId: string; productId: string; at?: number }): void {
  if (typeof window === "undefined" || !p.orderId || !p.productId) return;
  try {
    const payload: PendingPayment = {
      orderId: p.orderId,
      productId: p.productId,
      at: typeof p.at === "number" ? p.at : Date.now(),
    };
    window.sessionStorage.setItem(PAY_PENDING_KEY, JSON.stringify(payload));
  } catch {}
}

export function recallPendingPayment(now: number = Date.now()): PendingPayment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PAY_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingPayment> | null;
    if (
      !parsed ||
      typeof parsed.orderId !== "string" ||
      !parsed.orderId ||
      typeof parsed.productId !== "string" ||
      !parsed.productId ||
      typeof parsed.at !== "number" ||
      !Number.isFinite(parsed.at)
    ) {
      window.sessionStorage.removeItem(PAY_PENDING_KEY);
      return null;
    }
    const elapsed = now - parsed.at;
    if (elapsed < 0 || elapsed > PAY_PENDING_TTL_MS) {
      window.sessionStorage.removeItem(PAY_PENDING_KEY);
      return null;
    }
    return {
      orderId: parsed.orderId,
      productId: parsed.productId,
      at: parsed.at,
    };
  } catch {
    return null;
  }
}

export function clearPendingPayment(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PAY_PENDING_KEY);
  } catch {}
}

/**
 * GA4 표준 구매 이벤트 — 매출이 보고서에 잡히게 한다(같은 transaction_id 는 GA4 가 중복 제거).
 * PC(팝업) 결제와 모바일(리다이렉트 → 결제 완료 화면) 결제가 같은 함수를 쓴다.
 * 예전에는 모바일 결제가 이 이벤트를 보내지 않아 GA4 매출이 실제보다 훨씬 적게 잡혔다(2026-10-04).
 *
 * transaction_id 에는 주문번호(orderId)를 쓰지 않는다 — 비회원의 열람 증명이라 GA4 로 내보내면 안 된다(M-10).
 * 서버가 주는 영수증 id(주문의 DB id, 열람에는 쓸 수 없다)를 쓴다.
 */
export function trackPurchase(p: {
  receiptId?: string | null;
  amount: number;
  catalogId: string;
  upgrade?: boolean;
}): void {
  if (!p.receiptId) return;
  trackEvent("purchase", {
    transaction_id: p.receiptId,
    value: p.amount,
    currency: "KRW",
    productId: p.catalogId,
    app: clientEnvLabel(),
    ...(p.upgrade ? { upgrade: true } : {}),
  });
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
      const isUpgrade = Boolean(result?.upgrade);

      clearPendingPayment();
      if (result?.isGift && result?.gift) {
        trackPurchase({ receiptId: result?.receiptId, amount, catalogId });
        trackEvent("gift_purchase", {
          productId: catalogId,
          value: amount,
          currency: "KRW",
        });
        return {
          ok: true,
          orderId,
          catalogId,
          compatId: null,
          amount,
          isGift: true,
          gift: result.gift as IssuedGiftSummary,
        };
      }

      if (!isUpgrade) {
        clearDeviceCoupon();
      }
      rememberOrderToken(catalogId, orderId, compatId);
      trackPurchase({ receiptId: result?.receiptId, amount, catalogId, upgrade: isUpgrade });
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
