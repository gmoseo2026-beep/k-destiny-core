/**
 * 메타(인스타그램·페이스북) 픽셀 — 광고 성과 측정용. 브라우저에서만 쓴다.
 *
 * 2026-10-07: 인스타그램 광고가 끝나자 유입이 1/3 로 줄었고, 지난 광고는 239회 방문에 결제 1건이었다.
 * 광고를 다시 하기 전에, 메타가 "결과를 보고 결제까지 가는 사람"을 찾아 주도록 사이트 안의 행동을 알려 준다.
 *
 * 지키는 것:
 * - 생년월일·이름·이메일 같은 입력값은 보내지 않는다(자동 고급 매칭·버튼 자동 수집 끔). 상품 id 와 금액만 보낸다.
 * - 주소의 민감한 값(paymentId 등 — 비회원 열람 열쇠)은 메타로 넘어가지 않게, 보내는 순간에만 주소에서 가린다.
 * - 개발 PC(localhost)와 관리자 화면에서는 보내지 않는다.
 *
 * 픽셀 ID 는 비밀이 아니다(사이트 코드에 그대로 드러나는 공개 값).
 */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "2390478744821136";

/** 주소에서 가리는 값(components/Analytics.tsx 의 GA4 처리와 같은 목록 + 여유분) */
export const SENSITIVE_QUERY_KEYS = ["paymentId", "orderId", "claimToken", "token", "txId", "transactionId", "email"] as const;

/** 민감한 값을 뺀 주소(경로+쿼리+해시). 바꿀 것이 없으면 null. */
export function safePathFor(href: string): string | null {
  try {
    const u = new URL(href);
    let changed = false;
    for (const k of SENSITIVE_QUERY_KEYS) {
      if (u.searchParams.has(k)) {
        u.searchParams.delete(k);
        changed = true;
      }
    }
    return changed ? u.pathname + u.search + u.hash : null;
  } catch {
    return null;
  }
}

export interface MetaEvent {
  /** 메타 표준 이벤트 이름 */
  name: "ViewContent" | "Lead" | "InitiateCheckout" | "AddPaymentInfo" | "Purchase";
  params: Record<string, string | number | string[]>;
  /** 같은 결제를 두 번 세지 않게 하는 값(나중에 서버 전송을 붙여도 겹치지 않는다) */
  eventId?: string;
}

type Params = Record<string, string | number | boolean> | undefined;
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/**
 * 사이트의 측정 이벤트(GA4 이름) → 메타 표준 이벤트. 관계없는 이벤트는 null.
 *   view_item        → ViewContent        상품 소개를 봄
 *   compat_created   → Lead               생년월일을 넣고 궁합 결과를 봄
 *   teaser_created   → Lead               생년월일을 넣고 무료 미리보기를 봄
 *   checkout_open    → InitiateCheckout   결제창을 엶
 *   begin_checkout   → AddPaymentInfo     결제 수단 화면(PG)으로 넘어감
 *   purchase         → Purchase           결제 완료(금액 포함)
 */
export function metaEventFor(name: string, params?: Params): MetaEvent | null {
  const productId = str(params?.productId);
  const ids: MetaEvent["params"] = productId ? { content_ids: [productId], content_type: "product" } : {};
  switch (name) {
    case "view_item":
      return { name: "ViewContent", params: { ...ids } };
    case "compat_created":
      return { name: "Lead", params: { content_name: "compat_basic", content_category: "compat" } };
    case "teaser_created":
      return { name: "Lead", params: { content_name: productId ?? "unknown", content_category: "teaser" } };
    case "checkout_open":
      return { name: "InitiateCheckout", params: { ...ids } };
    case "begin_checkout": {
      const value = num(params?.value);
      return { name: "AddPaymentInfo", params: { ...ids, ...(value !== undefined ? { value, currency: "KRW" } : {}) } };
    }
    case "purchase": {
      const value = num(params?.value);
      const eventId = str(params?.transaction_id);
      // 금액이나 영수증 번호가 없는 결제 신호는 보내지 않는다(잘못된 매출이 잡히지 않게)
      if (value === undefined || !eventId) return null;
      return { name: "Purchase", params: { ...ids, value, currency: "KRW" }, eventId };
    }
    default:
      return null;
  }
}

/** 개발 PC — 여기서는 메타로 보내지 않고 기록만 한다(components/MetaPixel.tsx 가 기록용 fbq 를 둔다) */
export const isLocalHost = (hostname: string): boolean =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

/** 관리자 화면에서는 아무것도 보내지 않는다 */
export const isAdminPath = (pathname: string): boolean => pathname.split("/").includes("admin");

interface Fbq {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
}
const getFbq = (): Fbq | undefined => (window as unknown as { fbq?: Fbq }).fbq;

/**
 * fbq 를 부른다. 픽셀은 보내는 순간의 주소를 함께 보내므로, 주소에 민감한 값이 있으면
 * 그 순간에만 주소에서 가렸다가 되돌린다. Next 라우터가 모르게 원래 history 함수를 직접 쓴다
 * (라우터가 알면 화면이 "주문번호가 사라졌다"고 다시 그린다).
 */
function sendNow(fbq: Fbq, args: unknown[]): void {
  const original = window.location.pathname + window.location.search + window.location.hash;
  const safe = safePathFor(window.location.href);
  const replace = (url: string) => History.prototype.replaceState.call(window.history, window.history.state, "", url);
  try {
    if (safe) replace(safe);
    fbq(...args);
  } finally {
    if (safe) replace(original);
  }
}

function send(args: unknown[]): void {
  if (typeof window === "undefined") return;
  if (isAdminPath(window.location.pathname)) return;
  const fbq = getFbq();
  if (!fbq) return;
  // 주소를 가릴 필요가 없거나, 픽셀이 이미 떠 있으면(=바로 전송) 그대로 보낸다
  if (!safePathFor(window.location.href) || fbq.callMethod) {
    try {
      sendNow(fbq, args);
    } catch {
      // 측정이 서비스를 깨면 안 된다
    }
    return;
  }
  // 주소를 가려야 하는데 픽셀이 아직 안 떴다 → 뜰 때까지 잠깐 기다렸다 보낸다(대기열에 두면 가리지 못한 주소로 나간다)
  let tries = 0;
  const timer = window.setInterval(() => {
    const f = getFbq();
    if (f?.callMethod) {
      window.clearInterval(timer);
      try {
        sendNow(f, args);
      } catch {}
    } else if (++tries > 50) {
      window.clearInterval(timer);
    }
  }, 100);
}

/** 페이지를 봄(처음 열 때와 화면이 바뀔 때) */
export function trackMetaPageView(): void {
  send(["track", "PageView"]);
}

/** lib/gtag.ts 의 trackEvent 가 모든 측정 이벤트에 대해 부른다 */
export function trackMeta(name: string, params?: Params): void {
  const ev = metaEventFor(name, params);
  if (!ev) return;
  send(ev.eventId ? ["track", ev.name, ev.params, { eventID: ev.eventId }] : ["track", ev.name, ev.params]);
}
