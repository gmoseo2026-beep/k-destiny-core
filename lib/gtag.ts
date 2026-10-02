/**
 * Tiny GA4 event helper — safe to call anywhere on the client.
 * No-ops when GA isn't loaded (NEXT_PUBLIC_GA_ID unset) or on the server.
 *
 * 결제 퍼널 공통 이벤트:
 *   view_paywall     { source }            — locked section rendered
 *   unlock_click     { source, product }   — paywall CTA pressed
 *   begin_checkout   { product }           — 결제 창 열림
 *   purchase_confirmed { product }         — entitlement poll succeeded
 *   click_unlock_teaser { productId, source } — 맛보기 화면 결제 버튼(source: inline | sticky | locked_card)
 *     맛보기 퍼널 = teaser_created → click_unlock_teaser → checkout_open → purchase_confirmed
 *   preview_limit_view { productId }       — 하루 무료 미리보기 한도를 넘겨 결제 안내가 대신 뜬 횟수(클릭은 click_unlock_teaser source=limit)
 *   checkout_submit / checkout_validation_error { field } — 결제창에서 진행을 누름 / 어느 칸에서 막혔는지
 *   last_couple_preview_click { productId }  — 방금 본 두 사람으로 입력 없이 미리보기(teaser_created via=last_couple)
 * 
 * Kongdak Phase A 바이럴 퍼널 (확정 정의 — 이 이름 외에는 쓰지 말 것):
 *   compat_created     { relation, has_ref }        — 궁합 생성. has_ref=true 면 공유 유입자의 생성
 *   share_created      { shareToken, type }         — 실제 공유 실행 (type: 'kakao' | 'link')
 *   share_visit        { sourceCompatId, path }     — 공유 링크(?ref=)를 통한 유입
 *   share_card_created { shareToken, format }       — 스토리 카드 생성. 진단용, K 계산에서 제외
 *   view_paywall       { source }                   — 심층 궁합 티저 노출(관심도)
 *
 * K = compat_created(has_ref=true) ÷ share_created
 * share_card_created 는 분모에 넣지 않는다(카드 생성 ≠ 공유 실행).
 */
export function trackEvent(name: string, params?: Record<string, string | number | boolean>): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;
  try {
    w.gtag("event", name, params || {});
  } catch {
    // Analytics must never break the app
  }
}
