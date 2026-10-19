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

/** 외국어 궁합 화면의 탭 제목·설명(브라우저 탭과 공유 미리보기에 보인다). */
export const GLOBAL_COUPLE_META: Record<
  GlobalCoupleLocale,
  { title: string; description: string; resultTitle: (a: string, b: string, score: number) => string }
> = {
  en: {
    title: "Korean Couple Compatibility — kongdak",
    description: "Korean birth-date compatibility — how two birthdays click in love.",
    resultTitle: (a, b, s) => `${a} ❤️ ${b}'s Compatibility: ${s} pts — kongdak`,
  },
  ja: {
    title: "韓国式カップル相性 — kongdak",
    description: "生年月日だけで、ふたりの相性を30秒でチェック。",
    resultTitle: (a, b, s) => `${a} ❤️ ${b} の相性: ${s}点 — kongdak`,
  },
  zh: {
    title: "韩式情侣缘分合盘 — kongdak",
    description: "只需出生日期，30秒看看你们的缘分。",
    resultTitle: (a, b, s) => `${a} ❤️ ${b} 的缘分：${s}分 — kongdak`,
  },
};
