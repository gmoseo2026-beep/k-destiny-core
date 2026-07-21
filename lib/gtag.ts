/**
 * Tiny GA4 event helper — safe to call anywhere on the client.
 * No-ops when GA isn't loaded (NEXT_PUBLIC_GA_ID unset) or on the server.
 *
 * Funnel events used across the app:
 *   view_paywall     { source }            — locked section rendered
 *   unlock_click     { source, product }   — paywall CTA pressed
 *   begin_checkout   { product }           — Gumroad tab opened
 *   purchase_confirmed { product }         — entitlement poll succeeded
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
