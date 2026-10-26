/**
 * 틱톡 픽셀 — 틱톡 광고 성과 측정용. 브라우저에서만 쓴다. 지키는 원칙은 메타 픽셀(lib/metaPixel.ts)과 같다.
 *
 * 2026-10-22: 틱톡 광고(트래픽 목표)가 이틀 동안 클릭 1,400번에 입력 3번이었다. 클릭만 하는 사람 대신
 * 결제할 사람을 찾도록 "결제 완료"를 알려 주고 광고 목표를 전환으로 바꾸려고 붙인다.
 *
 * - 생년월일·이름·이메일 같은 입력값은 보내지 않는다(상품 id 와 금액만). 자동 고급 매칭은 틱톡 이벤트 관리자에서 껐다.
 * - 주소에 민감한 값(paymentId 등 — 비회원 열람 열쇠)이 있는 순간에는 아무것도 보내지 않는다.
 *   결제 완료 화면은 그 값을 열자마자 주소에서 지우므로, 결제 완료 신호는 지운 뒤에 나간다.
 * - 개발 PC(localhost)와 관리자 화면에서는 보내지 않는다.
 *
 * 픽셀 ID 는 비밀이 아니다(사이트 코드에 그대로 드러나는 공개 값).
 */
import { isAdminPath, safePathFor } from "@/lib/metaPixel";

export const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "DBCV7Q3C77UCF2HDIVGG";

export interface TikTokEvent {
  /** 틱톡 표준 이벤트 이름 */
  name: "ViewContent" | "SubmitForm" | "InitiateCheckout" | "AddPaymentInfo" | "CompletePayment";
  /** 같은 신호를 다른 이름으로도 한 번 더 보낸다 */
  alsoAs?: readonly string[];
  params: Record<string, string | number | { content_id: string; content_type: "product" }[]>;
  /** 같은 결제를 두 번 세지 않게 하는 값 */
  eventId?: string;
}

type Params = Record<string, string | number | boolean> | undefined;
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/**
 * 사이트의 측정 이벤트(GA4 이름) → 틱톡 표준 이벤트. 관계없는 이벤트는 null.
 *   view_item        → ViewContent        상품 소개를 봄
 *   compat_created   → SubmitForm         생년월일을 넣고 궁합 결과를 봄
 *   teaser_created   → SubmitForm         생년월일을 넣고 무료 미리보기를 봄
 *   checkout_open    → InitiateCheckout   결제창을 엶
 *   begin_checkout   → AddPaymentInfo     결제 수단 화면(PG)으로 넘어감
 *   purchase         → CompletePayment    결제 완료(금액 포함) + 같은 값으로 Purchase 도 보낸다.
 *     10-22 에는 Purchase 만 보냈는데, 10-26 광고 그룹 최적화 이벤트 목록에 "구매 완료"가 없었다(활성: 결제 정보 추가·체크아웃 시작·
 *     콘텐츠 조회·양식 제출뿐). 광고 최적화가 아는 이름은 CompletePayment("구매 완료")라 그 이름으로 보내고, Purchase 는 함께 둔다.
 */
export function tiktokEventFor(name: string, params?: Params): TikTokEvent | null {
  const productId = str(params?.productId);
  const contents: TikTokEvent["params"] = productId ? { contents: [{ content_id: productId, content_type: "product" }] } : {};
  switch (name) {
    case "view_item":
      return { name: "ViewContent", params: { ...contents } };
    case "compat_created":
      return { name: "SubmitForm", params: { description: "compat" } };
    case "teaser_created":
      return { name: "SubmitForm", params: { ...contents, description: "teaser" } };
    case "checkout_open":
      return { name: "InitiateCheckout", params: { ...contents } };
    case "begin_checkout": {
      const value = num(params?.value);
      return { name: "AddPaymentInfo", params: { ...contents, ...(value !== undefined ? { value, currency: "KRW" } : {}) } };
    }
    case "purchase": {
      const value = num(params?.value);
      const eventId = str(params?.transaction_id);
      // 금액이나 영수증 번호가 없는 결제 신호는 보내지 않는다(잘못된 매출이 잡히지 않게)
      if (value === undefined || !eventId) return null;
      return { name: "CompletePayment", alsoAs: ["Purchase"], params: { ...contents, value, currency: "KRW" }, eventId };
    }
    default:
      return null;
  }
}

interface Ttq {
  page: () => void;
  track: (name: string, params?: object, options?: { event_id?: string }) => void;
}
const getTtq = (): Ttq | undefined => (window as unknown as { ttq?: Ttq }).ttq;

function canSend(): Ttq | undefined {
  if (typeof window === "undefined") return undefined;
  if (isAdminPath(window.location.pathname)) return undefined;
  // 주소에 민감한 값이 남아 있으면 이번 신호는 버린다(틱톡은 보내는 순간의 주소를 함께 보낸다)
  if (safePathFor(window.location.href)) return undefined;
  return getTtq();
}

/** 페이지를 봄(처음 열 때와 화면이 바뀔 때) */
export function trackTikTokPageView(): void {
  try {
    canSend()?.page();
  } catch {
    // 측정이 서비스를 깨면 안 된다
  }
}

/** lib/gtag.ts 의 trackEvent 가 모든 측정 이벤트에 대해 부른다 */
export function trackTikTok(name: string, params?: Params): void {
  const ev = tiktokEventFor(name, params);
  if (!ev) return;
  try {
    const ttq = canSend();
    if (!ttq) return;
    for (const name of [ev.name, ...(ev.alsoAs ?? [])]) {
      if (ev.eventId) ttq.track(name, ev.params, { event_id: ev.eventId });
      else ttq.track(name, ev.params);
    }
  } catch {
    // 측정이 서비스를 깨면 안 된다
  }
}
