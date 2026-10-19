export const GLOBAL_COUPLE_LOCALES = ["en", "ja", "zh"] as const;

export type GlobalCoupleLocale = (typeof GLOBAL_COUPLE_LOCALES)[number];

export function isGlobalCoupleLocale(
  locale: string | null | undefined
): locale is GlobalCoupleLocale {
  return (
    locale === "en" ||
    locale === "ja" ||
    locale === "zh"
  );
}

/**
 * Resolve the non-Couple locale redirect target when someone visits /{other}/couple.
 */
export function resolveGlobalCoupleGuardRedirect(locale: string): string | null {
  if (isGlobalCoupleLocale(locale)) return null;
  return "/ko/compat/new";
}

/**
 * Determine which of the 4 welcome language buttons should be highlighted and placed first
 * based on navigator.language (without auto-redirecting).
 */
export function detectPreferredWelcomeLang(
  navigatorLang?: string | null
): "ko" | "en" | "ja" | "zh" {
  const raw = (navigatorLang ?? "").trim().toLowerCase();
  if (raw.startsWith("ko")) return "ko";
  if (raw.startsWith("ja")) return "ja";
  if (raw.startsWith("zh")) return "zh";
  return "en";
}

const FORWARDED_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
  "ttclid",
  "twclid",
  "msclkid",
  "kclid",
  "ref",
]);

/**
 * Build destination URL from /ko/welcome preserving campaign UTM and click ID query parameters.
 */
export function buildWelcomeTargetHref(
  lang: "ko" | "en" | "ja" | "zh",
  currentSearch: string
): string {
  const basePath = lang === "ko" ? "/ko/compat/new" : `/${lang}/couple`;
  const incoming = new URLSearchParams(
    currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch
  );
  const outgoing = new URLSearchParams();
  for (const [k, v] of incoming.entries()) {
    if (FORWARDED_QUERY_KEYS.has(k) && v) {
      outgoing.set(k, v);
    }
  }
  const qs = outgoing.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
