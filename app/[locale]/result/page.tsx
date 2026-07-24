"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Moon, Lock, ArrowRight, RefreshCw, Heart, DollarSign, Activity, BookOpen, ShieldCheck, Globe, Zap } from "lucide-react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { saveLastResult, getLastResult, getProfile, getMaster, saveProfile } from "@/lib/userStateManager";
import { MASTERS } from "@/lib/masters";
import dynamic from "next/dynamic";
import ShareCard from "@/components/ShareCard";
import AuthModal from "@/components/AuthModal";
import { gumroadUrl, type GumroadProduct } from "@/lib/gumroad";
import { trackEvent } from "@/lib/gtag";

const SajuChart = dynamic(() => import("@/components/SajuChart"), { ssr: false });

// Simple hash function matching the server-side cache key generation
function generateLocalCacheKey(params: {
  name: string;
  dob: string;
  time?: string;
  gender: string;
  locale: string;
}): string {
  const raw = `${params.name}|${params.dob}|${params.time || "unknown"}|${params.gender}|${params.locale}`.toLowerCase();
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
  }
  return `destiny_result_${hash.toString(36)}`;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_FETCH_RETRIES = 2; // Auto-retry up to 2 times on failure

interface DestinyResult {
  core_essence: string;
  imminent_karma_teaser: string;
  locked_secrets: string;
  love_fortune?: string;
  wealth_warning?: string;
  health_alert?: string;
  master_prescription?: string;
  lucky_elements: string[];
  element_analysis: Record<string, number>;
  fourPillars?: { year: string; month: string; day: string; time: string | null };
  dayMaster?: string;
  // true while only short paywall previews are loaded; the full locked
  // sections are fetched lazily from /api/generate-destiny/sections on unlock.
  previewOnly?: boolean;
}

function isValidResult(data: any): data is DestinyResult {
  return (
    data &&
    typeof data.core_essence === "string" &&
    data.core_essence.length > 10 &&
    typeof data.imminent_karma_teaser === "string" &&
    Array.isArray(data.lucky_elements) &&
    typeof data.element_analysis === "object" &&
    data.element_analysis !== null
  );
}

function formatDestinyText(text: string) {
  if (!text) return null;
  return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="text-gold font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

const LOADING_PHRASES: Record<string, string[]> = {
  ko: [
    "우주적 주파수를 맞추는 중...",
    "오행의 흐름을 읽는 중...",
    "고대의 지혜와 소통하는 중...",
    "당신의 음양 밸런스를 해독하는 중...",
    "운명의 청사진을 완성하는 중..."
  ],
  en: [
    "Aligning cosmic frequencies...",
    "Reading the Five Elements...",
    "Consulting the ancient pillars...",
    "Decoding your Yin-Yang balance...",
    "Synthesizing your destiny profile..."
  ],
  ja: [
    "宇宙の周波数を合わせています...",
    "五行の流れを読み解いています...",
    "古代の叡智と対話しています...",
    "陰陽のバランスを解析しています...",
    "運命の青写真を完成させています..."
  ],
  es: [
    "Alineando frecuencias cósmicas...",
    "Leyendo los Cinco Elementos...",
    "Consultando la sabiduría antigua...",
    "Decodificando tu equilibrio Yin-Yang...",
    "Sintetizando tu perfil de destino..."
  ],
  de: [
    "Kosmische Frequenzen werden ausgerichtet...",
    "Die Fünf Elemente werden gelesen...",
    "Alte Weisheiten werden konsultiert...",
    "Ihre Yin-Yang-Balance wird entschlüsselt...",
    "Ihr Schicksalsprofil wird erstellt..."
  ],
  fr: [
    "Alignement des fréquences cosmiques...",
    "Lecture des Cinq Éléments...",
    "Consultation de la sagesse ancienne...",
    "Décodage de votre équilibre Yin-Yang...",
    "Synthèse de votre profil de destin..."
  ]
};

// ── Honest trust signals (true for every user; replace fabricated scarcity) ──
// All three claims are verifiably true: the chart is computed deterministically
// (lunar-javascript, not AI guessing), the app ships 6 locales, results are instant.
const TRUST_BADGES: Record<string, string[]> = {
  ko: ["정통 만세력 기반 정확한 계산", "6개 언어 지원", "즉시 확인 가능"],
  en: ["Built on authentic Saju calculation", "Available in 6 languages", "Instant results"],
  ja: ["正統な万年暦に基づく計算", "6言語対応", "即時に確認可能"],
  es: ["Cálculo Saju auténtico", "Disponible en 6 idiomas", "Resultados al instante"],
  de: ["Auf echter Saju-Berechnung basierend", "In 6 Sprachen verfügbar", "Sofortige Ergebnisse"],
  fr: ["Basé sur un calcul Saju authentique", "Disponible en 6 langues", "Résultats instantanés"],
};

// ── Post-checkout "confirming unlock" text (self-contained, no new i18n keys) ──
const CHECKING_UNLOCK_TEXT: Record<string, { msg: string; btn: string; done: string }> = {
  ko: { msg: "결제를 확인하는 중입니다...", btn: "지금 확인", done: "결제 확인 완료! 모든 리딩이 해금되었습니다 ✨" },
  en: { msg: "Confirming your purchase...", btn: "Check now", done: "Purchase confirmed! Your full reading is unlocked ✨" },
  ja: { msg: "お支払いを確認しています...", btn: "今すぐ確認", done: "決済確認完了！すべてのリーディングが解放されました ✨" },
  es: { msg: "Confirmando tu compra...", btn: "Verificar ahora", done: "¡Compra confirmada! Tu lectura completa está desbloqueada ✨" },
  de: { msg: "Kauf wird bestätigt...", btn: "Jetzt prüfen", done: "Kauf bestätigt! Ihre vollständige Deutung ist freigeschaltet ✨" },
  fr: { msg: "Confirmation de votre achat...", btn: "Vérifier maintenant", done: "Achat confirmé ! Votre lecture complète est débloquée ✨" },
};

// ── "Loading full reading" pill (shown after unlock while sections stream) ──
const FULL_READING_TEXT: Record<string, string> = {
  ko: "전체 리딩을 불러오는 중...",
  en: "Loading your full reading...",
  ja: "全文リーディングを読み込み中...",
  es: "Cargando tu lectura completa...",
  de: "Vollständige Deutung wird geladen...",
  fr: "Chargement de votre lecture complète...",
};

// ── Compact-lock caption for secondary locked sections (design: only the
//    first locked card carries the full CTA; the rest stay quiet) ──
const INCLUDED_TEXT: Record<string, string> = {
  ko: "위 결제 한 번으로 함께 해금됩니다",
  en: "Unlocked together with the purchase above",
  ja: "上記の決済ひとつでまとめて解放されます",
  es: "Se desbloquea junto con la compra anterior",
  de: "Wird zusammen mit dem obigen Kauf freigeschaltet",
  fr: "Débloqué avec l'achat ci-dessus",
};

// ── Element normalization map for locale-consistent display ──
const ELEMENT_MAP: Record<string, { name: Record<string, string>; color: string; image: string }> = {
  wood: { name: { ko: '나무 (木)', en: 'Wood (木)', ja: '木' }, color: '#4ade80', image: '/images/element_wood.webp.jpg' },
  fire: { name: { ko: '불 (火)', en: 'Fire (火)', ja: '火' }, color: '#f87171', image: '/images/element_fire.webp.jpg' },
  earth: { name: { ko: '흙 (土)', en: 'Earth (土)', ja: '土' }, color: '#fbbf24', image: '/images/element_earth.webp.jpg' },
  metal: { name: { ko: '쇠 (金)', en: 'Metal (金)', ja: '金' }, color: '#e2e8f0', image: '/images/element_metal.webp.jpg' },
  water: { name: { ko: '물 (水)', en: 'Water (水)', ja: '水' }, color: '#60a5fa', image: '/images/element_water.webp.jpg' },
};

function normalizeElement(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('wood') || lower.includes('나무') || lower.includes('목')) return 'wood';
  if (lower.includes('fire') || lower.includes('불') || lower.includes('화')) return 'fire';
  if (lower.includes('earth') || lower.includes('흙') || lower.includes('토')) return 'earth';
  if (lower.includes('metal') || lower.includes('쇠') || lower.includes('금')) return 'metal';
  if (lower.includes('water') || lower.includes('물') || lower.includes('수')) return 'water';
  return lower;
}

// ── Per-card "analyzing" placeholder: shown while a section is still streaming in,
//    so a new visitor sees clear progress instead of an empty card (and doesn't
//    think it froze and bounce). ──
const ANALYZING_TEXT: Record<string, { core: string; karma: string }> = {
  ko: { core: "타고난 기운을 자세히 풀어내는 중...", karma: "다가오는 운명을 읽어내는 중..." },
  en: { core: "Unfolding your core essence...", karma: "Reading your imminent karma..." },
  ja: { core: "生まれ持つ気を読み解いています...", karma: "近づく運命を読み取っています..." },
  es: { core: "Revelando tu esencia...", karma: "Leyendo tu karma inminente..." },
  de: { core: "Deine Kernenergie wird entfaltet...", karma: "Dein nahendes Karma wird gelesen..." },
  fr: { core: "Révélation de votre essence...", karma: "Lecture de votre karma imminent..." },
};

function AnalyzingPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3 text-gray-400">
      <span className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-purple-400/80 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 rounded-full bg-purple-400/80 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 rounded-full bg-purple-400/80 animate-bounce" style={{ animationDelay: "300ms" }} />
      </span>
      <span className="font-sans text-sm animate-pulse">{label}</span>
    </div>
  );
}

function ResultPageContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const { data: session } = useSession();
  const premium = session?.user?.tier === 'PREMIUM' || session?.user?.role === 'ADMIN';
  // Single-report buyers ($2.99) are entitled without being subscription-PREMIUM.
  // `unlocked` is what actually gates the paid content.
  const [entitled, setEntitled] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [checkingUnlock, setCheckingUnlock] = useState(false);
  const [unlockConfirmed, setUnlockConfirmed] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unlocked = premium || entitled;
  const t = useTranslations("Result");
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const masterId = searchParams.get("masterId") || getMaster()?.toString() || "5";
  const fetchAttemptRef = useRef(0);
  const currentLocale = locale;
  const phrases = LOADING_PHRASES[currentLocale] || LOADING_PHRASES.en;

  const [aiData, setAiData] = useState<DestinyResult | null>(null);

  // Trust signals here are honest, verifiable claims about the product
  // (see TrustBadges below) — no fabricated viewer counts, ratings, or
  // per-device countdowns, which invite chargebacks and ad-policy strikes.

  // ── Entitlement: the source of truth for unlocking paid content ──
  const fetchEntitlement = async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/user/entitlement", { cache: "no-store" });
      if (!res.ok) return false;
      const data = await res.json();
      setEntitled(!!data.unlocked);
      if (data.email) setAccountEmail(data.email);
      return !!data.unlocked;
    } catch {
      return false;
    }
  };

  // Check on mount, and re-check whenever the user returns to this tab
  // (e.g. coming back after paying in the Gumroad checkout tab).
  useEffect(() => {
    if (!session?.user?.id) return;
    fetchEntitlement();
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchEntitlement();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [session?.user?.id]);

  // ── Guest→account profile sync ──
  // A guest who onboarded, then signed up at the paywall, has their saju data
  // only in localStorage. If the cached result short-circuits the generate API
  // (which normally persists the profile), the DB profile would stay empty and
  // the premium dashboard pages would ask them to re-enter everything. Push the
  // local profile to the DB once, right after login, if the DB has none.
  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      try {
        const check = await fetch("/api/user/saju-check", { cache: "no-store" });
        if (!check.ok) return;
        const { hasSajuData } = await check.json();
        if (hasSajuData) return;
        const local = getProfile();
        if (!local?.gender || !local?.year) return;
        await fetch("/api/user/saju-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: local.name,
            gender: local.gender.charAt(0).toUpperCase() + local.gender.slice(1),
            birthYear: local.year,
            birthMonth: local.month,
            birthDay: local.day,
            birthTime: local.time,
            unknownTime: local.unknownTime,
            country: local.country,
            city: local.city,
            selectedMasterId: getMaster() ?? undefined,
          }),
        });
        console.log("[Result] Guest profile synced to DB after login");
      } catch { /* non-fatal — next generate call will persist it */ }
    })();
  }, [session?.user?.id]);

  // After opening checkout, poll so the unlock appears automatically once the
  // Gumroad webhook lands (usually within seconds). Stops on success or ~60s.
  const pollEntitlement = () => {
    // Never stack two polling loops (e.g. user clicks unlock twice)
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setCheckingUnlock(true);
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      const ok = await fetchEntitlement();
      if (ok || tries >= 12) {
        clearInterval(id);
        pollTimerRef.current = null;
        setCheckingUnlock(false);
        if (ok) {
          trackEvent("purchase_confirmed", { source: "result" });
          // Celebrate the unlock for a few seconds, then fade out
          setUnlockConfirmed(true);
          setTimeout(() => setUnlockConfirmed(false), 5000);
        }
      }
    }, 5000);
    pollTimerRef.current = id;
  };

  // Clean up any in-flight polling when leaving the page
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Login-gated unlock. Guests MUST have an account first, otherwise the
  // Gumroad purchase email can't be matched to a user and the payment is lost.
  const handleUnlock = (product: GumroadProduct) => {
    trackEvent("unlock_click", { source: "result", product });
    if (!session?.user?.id) {
      setAuthModalOpen(true);
      return;
    }
    const url = gumroadUrl(product, accountEmail || session.user.email);
    window.open(url, "_blank", "noopener,noreferrer");
    trackEvent("begin_checkout", { source: "result", product });
    pollEntitlement();
  };

  // Cycle through loading messages to keep user engaged
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => {
        if (prev >= phrases.length - 1) return prev;
        return prev + 1;
      });
    }, 2800);
    return () => clearInterval(interval);
  }, [isLoading, phrases.length]);

  const fetchDestiny = async (isRetry = false) => {
    try {
      if (!isRetry) {
        setIsLoading(true);
        setError(null);
        fetchAttemptRef.current = 0;
      }

      let storedData = sessionStorage.getItem("destinyFormData");

      // ── DB가 Source of Truth (로그인 사용자) ──
      // sessionStorage에 데이터가 없으면 DB에서 가져와 sessionStorage + localStorage 모두 동기화
      if (!storedData && session?.user?.id) {
        try {
          const res = await fetch('/api/user/saju-profile', { cache: 'no-store' });
          if (res.ok) {
            const { profile: dbProfile } = await res.json();
            if (dbProfile && (dbProfile.birthYear || dbProfile.name)) {
              const fallbackData = {
                name: dbProfile.name || '',
                year: dbProfile.birthYear,
                month: dbProfile.birthMonth,
                day: dbProfile.birthDay,
                time: dbProfile.birthTime || '',
                unknownTime: dbProfile.unknownTime ?? false,
                country: dbProfile.country || '',
                city: dbProfile.city || '',
                gender: dbProfile.gender,
                dob: `${dbProfile.birthYear}-${(dbProfile.birthMonth || '1').padStart(2, '0')}-${(dbProfile.birthDay || '1').padStart(2, '0')}`,
                locale: currentLocale,
              };
              sessionStorage.setItem("destinyFormData", JSON.stringify(fallbackData));
              storedData = sessionStorage.getItem("destinyFormData");
              // ✅ localStorage 강제 동기화 (DB → localStorage 단방향)
              saveProfile({
                name: dbProfile.name || '',
                year: dbProfile.birthYear || '',
                month: dbProfile.birthMonth || '',
                day: dbProfile.birthDay || '',
                time: dbProfile.birthTime || '',
                unknownTime: dbProfile.unknownTime ?? false,
                country: dbProfile.country || '',
                city: dbProfile.city || '',
                gender: dbProfile.gender || '',
              });
            }
          }
        } catch {
          // Continue to localStorage fallback
        }
      }

      // ── 비로그인(게스트) 폴백: localStorage ──
      if (!storedData) {
        const savedProfile = getProfile();
        if (savedProfile) {
          const fallbackData = {
            name: savedProfile.name,
            year: savedProfile.year,
            month: savedProfile.month,
            day: savedProfile.day,
            time: savedProfile.time,
            unknownTime: savedProfile.unknownTime,
            country: savedProfile.country,
            city: savedProfile.city,
            gender: savedProfile.gender,
            dob: `${savedProfile.year}-${savedProfile.month.padStart(2, '0')}-${savedProfile.day.padStart(2, '0')}`,
            locale: currentLocale,
          };
          sessionStorage.setItem("destinyFormData", JSON.stringify(fallbackData));
          storedData = sessionStorage.getItem("destinyFormData");
        } else {
          // 프로필 데이터 없음 → 입력 페이지로 자동 리다이렉트
          console.log("[Result] No profile data found. Redirecting to input page...");
          router.replace("/input-destiny");
          return;
        }
      }

      const formData = JSON.parse(storedData!);

      // Force the locale to be the current one from the UI, so AI responds in the correct language
      formData.locale = currentLocale;

      // 1. Check localStorage cache FIRST (zero API usage)
      const cacheKey = generateLocalCacheKey({
        name: formData.name,
        dob: formData.dob,
        time: formData.time,
        gender: formData.gender,
        locale: currentLocale,
      });

      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_TTL_MS && isValidResult(parsed.data)) {
            console.log("[Cache] localStorage HIT — zero API call");
            setAiData(parsed.data);
            await new Promise((r) => setTimeout(r, 500));
            setIsLoading(false);
            return;
          } else {
            localStorage.removeItem(cacheKey);
          }
        }
      } catch {
        // localStorage unavailable — proceed to API
      }

      // 1.5 Check lastResult as a secondary cache
      const lastResult = getLastResult();
      if (lastResult && isValidResult(lastResult)) {
        // Only use if within TTL
        const age = Date.now() - new Date(lastResult.savedAt).getTime();
        if (age < CACHE_TTL_MS) {
          console.log("[Cache] lastResult HIT — zero API call");
          setAiData(lastResult as any);
          await new Promise((r) => setTimeout(r, 500));
          setIsLoading(false);
          return;
        }
      }

      // 2. Call API with auto-retry logic
      fetchAttemptRef.current += 1;
      const attempt = fetchAttemptRef.current;
      console.log(`[Fetch] Attempt ${attempt} for ${formData.name}`);
      
      // Append userId from NextAuth session if logged in
      const payload = { ...formData };
      if (session?.user?.id) {
        payload.userId = session.user.id;
      }

      // ── Ensure masterName is always present (critical fix) ──
      if (!payload.masterName) {
        const masterIdNum = parseInt(masterId, 10);
        const master = MASTERS.find(m => m.id === masterIdNum);
        payload.masterName = master?.name || "Master Karma";
      }

      // ── Ensure dob is properly formatted ──
      if (!payload.dob && payload.year) {
        payload.dob = `${payload.year}-${String(payload.month || '1').padStart(2, '0')}-${String(payload.day || '1').padStart(2, '0')}`;
      }

      // ── Ensure gender is capitalized (API expects Male/Female) ──
      if (payload.gender && payload.gender === payload.gender.toLowerCase()) {
        payload.gender = payload.gender.charAt(0).toUpperCase() + payload.gender.slice(1);
      }

      // ── Fallback name ──
      if (!payload.name) payload.name = 'Seeker';

      console.log(`[Fetch] Payload keys:`, Object.keys(payload), `masterName=${payload.masterName}, dob=${payload.dob}`);

      const response = await fetch("/api/generate-destiny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 429) {
          const retryAfter = errorData.retryAfterSeconds || 60;
          throw new Error(
            `${errorData.error || "Rate limit exceeded."} (${retryAfter}s)`
          );
        }

        // For 503 (all models failed), auto-retry
        if (response.status === 503 && attempt <= MAX_FETCH_RETRIES) {
          console.log(`[Fetch] Got 503, auto-retrying in 2s (attempt ${attempt}/${MAX_FETCH_RETRIES})...`);
          setRetryCount(attempt);
          await new Promise((r) => setTimeout(r, 2000));
          return fetchDestiny(true); // recursive retry
        }

        throw new Error(errorData.error || "Failed to generate cosmic blueprint.");
      }

      if (!response.body) {
        throw new Error("The cosmic reading was incomplete. Please try again.");
      }

      // 3. STREAM the NDJSON response. `meta` arrives first (instant chart),
      //    then core_essence streams token-by-token, then the preview `fields`.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let sawFallback = false;
      const assembled: DestinyResult = {
        core_essence: "",
        imminent_karma_teaser: "",
        locked_secrets: "",
        lucky_elements: [],
        element_analysis: {},
        previewOnly: true,
      };
      const flushRender = () => setAiData({ ...assembled });

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const raw = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!raw) continue;
          let evt: any;
          try { evt = JSON.parse(raw); } catch { continue; }
          if (evt.type === "meta") {
            assembled.fourPillars = evt.fourPillars;
            assembled.dayMaster = evt.dayMaster;
            assembled.element_analysis = evt.element_analysis || {};
            assembled.lucky_elements = evt.lucky_elements || [];
            setIsLoading(false); // reveal the page immediately (chart + streaming essence)
            flushRender();
          } else if (evt.type === "core") {
            assembled.core_essence += evt.text || "";
            flushRender();
          } else if (evt.type === "fields") {
            assembled.imminent_karma_teaser = evt.imminent_karma_teaser || "";
            assembled.love_fortune = evt.love_fortune;
            assembled.wealth_warning = evt.wealth_warning;
            assembled.health_alert = evt.health_alert;
            assembled.master_prescription = evt.master_prescription;
            if (evt.fallback) sawFallback = true;
            flushRender();
          }
        }
      }

      setIsLoading(false);
      setRetryCount(0);

      // Cache ONLY real readings (never the AI-outage mock).
      if (!sawFallback && assembled.core_essence.length > 40) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ data: assembled, timestamp: Date.now() }));
        } catch { /* localStorage full — continue */ }
        saveLastResult(assembled);
      }

    } catch (err: any) {
      console.error("API Error:", err);
      setError(err.message || "An unexpected error occurred connecting to the cosmos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDestiny();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once unlocked (subscription or single report), fetch the FULL locked
  // sections that were deferred to keep the free result fast, and merge them in.
  useEffect(() => {
    if (!unlocked || !aiData || aiData.previewOnly !== true) return;
    let cancelled = false;
    (async () => {
      setSectionsLoading(true);
      try {
        const stored = sessionStorage.getItem("destinyFormData");
        if (!stored) return;
        const fd = JSON.parse(stored);
        const payload: any = { ...fd, locale: currentLocale };
        if (!payload.masterName) {
          const m = MASTERS.find((mm) => mm.id === parseInt(masterId, 10));
          payload.masterName = m?.name || "Master Karma";
        }
        if (payload.gender && payload.gender === payload.gender.toLowerCase()) {
          payload.gender = payload.gender.charAt(0).toUpperCase() + payload.gender.slice(1);
        }
        const res = await fetch("/api/generate-destiny/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok || cancelled) return;
        const full = await res.json();
        if (cancelled || !full?.love_fortune) return;
        setAiData((prev) => {
          if (!prev) return prev;
          const merged: DestinyResult = {
            ...prev,
            love_fortune: full.love_fortune,
            wealth_warning: full.wealth_warning,
            health_alert: full.health_alert,
            master_prescription: full.master_prescription,
            previewOnly: false,
          };
          if (!full.fallback) {
            try {
              const ck = generateLocalCacheKey({ name: fd.name, dob: fd.dob, time: fd.time, gender: payload.gender, locale: currentLocale });
              localStorage.setItem(ck, JSON.stringify({ data: merged, timestamp: Date.now() }));
            } catch { /* ignore */ }
            saveLastResult(merged);
          }
          return merged;
        });
      } catch { /* keep previews on failure */ } finally {
        if (!cancelled) setSectionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, aiData?.previewOnly]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" as const },
    },
  };

  return (
    <main className="relative min-h-[100dvh] w-full bg-background overflow-hidden flex flex-col items-center py-16 px-4 sm:px-6">

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-stardust opacity-20 mix-blend-screen" />
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-dark/20 via-transparent to-transparent blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] space-y-6"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="relative w-32 h-32"
              >
                <div className="absolute inset-0 border-t-2 border-gold rounded-full opacity-70" />
                <div className="absolute inset-2 border-r-2 border-purple-400 rounded-full opacity-50" />
                <div className="absolute inset-4 border-b-2 border-white rounded-full opacity-30" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-gold animate-pulse" />
              </motion.div>
              <h2 className="font-serif text-2xl text-gold tracking-widest animate-pulse text-center">
                {t("loading_title")}
              </h2>
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingMsgIdx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.4 }}
                  className="font-sans text-gray-400 text-sm tracking-widest uppercase"
                >
                  {phrases[loadingMsgIdx]}
                </motion.p>
              </AnimatePresence>
              {retryCount > 0 && (
                <p className="font-sans text-amber-400/60 text-xs mt-2">
                  {t("reconnecting", { attempt: retryCount + 1 })}
                </p>
              )}
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <span className="text-red-500 text-2xl">!</span>
              </div>
              <h2 className="font-serif text-2xl text-red-400 tracking-wide mb-2">{t("error_title")}</h2>
              <p className="font-sans text-gray-400 max-w-md">{error}</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setError(null);
                    setRetryCount(0);
                    fetchAttemptRef.current = 0;
                    fetchDestiny();
                  }}
                  className="px-6 py-3 border border-gold/30 rounded-xl hover:bg-gold/10 transition-colors text-gold flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t("btn_retry")}
                </button>
                <button
                  onClick={() => router.push("/input-destiny")}
                  className="px-6 py-3 border border-white/20 rounded-xl hover:bg-white/5 transition-colors text-gray-300"
                >
                  {t("btn_go_back")}
                </button>
              </div>
            </motion.div>
          ) : aiData ? (
            <motion.div
              key="content"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="w-full space-y-10"
            >
              <motion.div variants={cardVariants} className="text-center mb-12">
                <span className="inline-block px-3 py-1 mb-4 border border-gold/30 rounded-full text-[10px] sm:text-xs font-sans tracking-widest text-gold/80 uppercase bg-gold/5 backdrop-blur-sm">
                  {t("badge")}
                </span>
                <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                  {t("title")}
                </h1>
                <p className="font-sans text-gray-400 max-w-2xl mx-auto">
                  {t("description")}
                </p>
              </motion.div>

              {/* 四柱 명식표 */}
              {aiData.fourPillars && aiData.dayMaster && (
                <motion.div variants={cardVariants}>
                  <SajuChart fourPillars={aiData.fourPillars} dayMaster={aiData.dayMaster} elementsScore={aiData.element_analysis} />
                </motion.div>
              )}

              <div className="grid grid-cols-1 gap-6">
                {/* Card 1: Core Essence — FREE */}
                <motion.div variants={cardVariants} className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:bg-white/[0.04] transition-colors group">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-full bg-purple-500/10 text-purple-400"><Moon className="w-6 h-6" /></div>
                    <h2 className="font-serif text-2xl text-white">{t("card_core_essence")}</h2>
                  </div>
                  {aiData.core_essence && aiData.core_essence.trim() ? (
                    <div className="font-sans text-gray-300 leading-loose space-y-4 text-sm sm:text-base whitespace-pre-wrap">{formatDestinyText(aiData.core_essence)}</div>
                  ) : (
                    <AnalyzingPlaceholder label={(ANALYZING_TEXT[locale] || ANALYZING_TEXT.en).core} />
                  )}
                </motion.div>

                {/* Card 2: Karma Teaser — FREE HOOK */}
                <motion.div variants={cardVariants} className="bg-gradient-to-r from-red-500/10 to-orange-500/10 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-full bg-red-500/20 text-red-400"><Sparkles className="w-6 h-6" /></div>
                    <h2 className="font-serif text-xl text-white">{t("card_karma_teaser")}</h2>
                  </div>
                  {aiData.imminent_karma_teaser && aiData.imminent_karma_teaser.trim() ? (
                    <p className="font-sans text-red-200/90 font-medium leading-relaxed text-lg sm:text-xl italic">&ldquo;{aiData.imminent_karma_teaser}&rdquo;</p>
                  ) : (
                    <AnalyzingPlaceholder label={(ANALYZING_TEXT[locale] || ANALYZING_TEXT.en).karma} />
                  )}
                </motion.div>

                {/* LOCKED SECTIONS — psychological paywall for free users */}
                {[
                  { key: 'love', titleKey: 'section_love', icon: <Heart className="w-5 h-5" />, content: aiData.love_fortune || aiData.locked_secrets, color: 'pink' },
                  { key: 'wealth', titleKey: 'section_wealth', icon: <DollarSign className="w-5 h-5" />, content: aiData.wealth_warning || '', color: 'amber' },
                  { key: 'health', titleKey: 'section_health', icon: <Activity className="w-5 h-5" />, content: aiData.health_alert || '', color: 'emerald' },
                  { key: 'prescription', titleKey: 'section_prescription', icon: <BookOpen className="w-5 h-5" />, content: aiData.master_prescription || '', color: 'purple' },
                ].filter(s => s.content).map((section, sIdx) => (
                  <motion.div key={section.key} variants={cardVariants}
                    className={`relative bg-white/[0.02] backdrop-blur-xl border ${unlocked ? 'border-gold/30' : 'border-white/10'} rounded-3xl ${!unlocked && sIdx > 0 ? 'p-5 sm:p-6' : 'p-6 sm:p-8'} overflow-hidden`}>
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                      <div className={`p-2.5 rounded-full ${unlocked ? 'bg-gold/15 text-gold' : 'bg-white/5 text-gray-400'}`}>{section.icon}</div>
                      <h2 className={`font-serif text-lg ${unlocked ? 'text-gold' : 'text-white'}`}>{t(section.titleKey)}</h2>
                      {unlocked && <span className="px-2 py-0.5 rounded-full bg-gold/10 text-gold text-[9px] font-sans tracking-wider">{t("unlocked_label")}</span>}
                      {!unlocked && sIdx > 0 && <Lock className="w-3.5 h-3.5 text-gold/50 ml-auto" />}
                    </div>
                    {unlocked ? (
                      <div className="font-sans text-gray-300 leading-loose text-sm whitespace-pre-wrap">{formatDestinyText(section.content)}</div>
                    ) : sIdx === 0 ? (
                      <>
                        {/* PRIMARY locked card — the ONLY full CTA on the page.
                            (Design: 4 identical CTA blocks read as pushy and add
                            scroll fatigue; one strong CTA + quiet locked rows
                            converts better and feels premium.) */}
                        {/* Show first 2 lines clearly, then gradient fade */}
                        <div className="relative">
                          <div className="font-sans text-gray-300 leading-loose text-sm whitespace-pre-wrap" style={{ maxHeight: '4.5em', overflow: 'hidden' }}>
                            {formatDestinyText(section.content)}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#06050e] to-transparent" />
                        </div>
                        <div className="mt-4 z-20 flex flex-col items-center">
                          <div className="bg-black/80 border border-gold/30 px-5 py-5 rounded-2xl text-center w-full max-w-sm mx-auto">
                            {/* Warning */}
                            <p className="text-red-400/90 text-xs font-sans font-medium mb-3 animate-pulse">
                              {t("unlock_warning")}
                            </p>
                            <Lock className="w-6 h-6 text-gold mx-auto mb-2" />
                            <p className="text-gray-400 text-xs mb-3">{t("unlock_desc")}</p>
                            <div className="flex flex-col gap-2">
                              {/* Anchor pricing — login-gated so the purchase email matches an account */}
                              <button type="button" onClick={() => handleUnlock('single')} className="w-full">
                                <motion.div
                                  whileTap={{ scale: 0.93 }}
                                  className="relative px-4 py-3 bg-gradient-to-r from-gold to-[#a68625] text-black font-bold text-sm rounded-xl text-center overflow-hidden active:brightness-75 transition-all cursor-pointer"
                                >
                                  <span className="relative z-10 flex items-center justify-center gap-2">
                                    {t("unlock_cta")}
                                    <span className="line-through text-black/40 text-xs">{t("unlock_original_price")}</span>
                                    <span className="text-base font-black">{t("unlock_sale_price")}</span>
                                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] rounded-md font-bold">{t("unlock_discount_label")}</span>
                                  </span>
                                  {/* Shimmer */}
                                  <motion.div
                                    animate={{ x: ["-100%", "200%"] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent z-0 w-1/3"
                                  />
                                </motion.div>
                              </button>
                              <Link href="/pricing" className="text-gold/60 text-xs hover:text-gold transition-colors">{t("unlock_or_premium")}</Link>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* SECONDARY locked cards — quiet: short preview + one-line
                            note; clicking anywhere still opens checkout. */}
                        <button type="button" onClick={() => handleUnlock('single')} className="w-full text-left cursor-pointer group/locked">
                          <div className="relative">
                            <div className="font-sans text-gray-400 leading-relaxed text-sm whitespace-pre-wrap" style={{ maxHeight: '3em', overflow: 'hidden' }}>
                              {formatDestinyText(section.content)}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#06050e] to-transparent" />
                          </div>
                          <div className="mt-3 flex items-center gap-2 text-gold/70 group-hover/locked:text-gold transition-colors">
                            <Lock className="w-3.5 h-3.5" />
                            <span className="text-xs font-sans">{INCLUDED_TEXT[currentLocale] || INCLUDED_TEXT.en}</span>
                          </div>
                        </button>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Lucky Elements — with images and localized names */}
              <motion.div variants={cardVariants} className="mt-10 mb-8">
                <h3 className="font-sans text-sm tracking-widest text-gray-500 uppercase text-center mb-6">{t("lucky_elements")}</h3>
                <div className="flex flex-wrap justify-center gap-4">
                  {aiData.lucky_elements.map((element, idx) => {
                    const normalized = normalizeElement(element);
                    const elData = ELEMENT_MAP[normalized];
                    const displayName = elData ? (elData.name[currentLocale] || elData.name.en) : element;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.15, duration: 0.4 }}
                        className="flex flex-col items-center gap-2"
                      >
                        {elData ? (
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                            style={{ borderColor: `${elData.color}60` }}>
                            <Image src={elData.image} alt={displayName} fill sizes="80px" className="object-cover" />
                          </div>
                        ) : null}
                        <span className="text-gold font-serif text-sm sm:text-base tracking-wide">{displayName}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Honest trust signals (verifiable claims) + Share */}
              <motion.div variants={cardVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 py-6 border-t border-white/5">
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                  {(TRUST_BADGES[currentLocale] || TRUST_BADGES.en).map((label, i) => {
                    const Icon = [ShieldCheck, Globe, Zap][i] || ShieldCheck;
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-gray-400 text-xs font-sans">
                        <Icon className="w-3.5 h-3.5 text-gold/70" />
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
                <ShareCard title="My K-Destiny Cosmic Blueprint" description={aiData.core_essence.slice(0, 100) + '...'} locale={locale} />
              </motion.div>

              {/* CTAs */}
              <motion.div variants={cardVariants} className="flex flex-col sm:flex-row justify-center items-stretch gap-4 pt-4 w-full max-w-2xl mx-auto">
                {premium ? (
                  <>
                    <Link href="/dashboard" className="w-full sm:flex-1 block">
                      <motion.button whileTap={{ scale: 0.93 }} className="relative w-full h-full px-4 sm:px-6 py-4 bg-gradient-to-r from-gold/20 to-amber-500/20 border border-gold/30 text-gold hover:from-gold/30 font-sans font-bold text-base rounded-2xl transition-all flex items-center justify-center gap-2 group active:brightness-75">
                        <Sparkles className="w-5 h-5 opacity-70" /> {t("btn_go_dashboard")} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </motion.button>
                    </Link>
                    <Link href={`/chat?masterId=${masterId}`} className="w-full sm:flex-1 block">
                      <motion.button whileTap={{ scale: 0.93 }} className="relative w-full h-full px-4 sm:px-6 py-4 bg-gradient-to-r from-gold to-[#a68625] text-black font-sans font-bold text-base rounded-2xl shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_40px_rgba(212,175,55,0.6)] transition-all flex items-center justify-center gap-2 group active:brightness-75">
                        <Sparkles className="w-5 h-5 opacity-70" /> {t("btn_chat")} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </motion.button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/pricing" className="w-full sm:flex-1 block">
                      <motion.button whileTap={{ scale: 0.93 }} className="relative w-full h-full px-4 sm:px-6 py-4 bg-gradient-to-r from-gold to-[#a68625] text-black font-sans font-bold text-base rounded-2xl shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_40px_rgba(212,175,55,0.6)] transition-all flex items-center justify-center gap-2 group active:brightness-75">
                        <Lock className="w-5 h-5 opacity-70" /> {t("btn_upgrade")} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </motion.button>
                    </Link>
                    <Link href={`/chat?masterId=${masterId}`} className="w-full sm:flex-1 block">
                      <motion.button whileTap={{ scale: 0.93 }} className="relative w-full h-full px-4 sm:px-6 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-sans font-bold text-base rounded-2xl transition-all flex items-center justify-center gap-2 group active:brightness-75">
                        <Sparkles className="w-5 h-5 opacity-70" /> {t("btn_chat")} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </motion.button>
                    </Link>
                  </>
                )}
              </motion.div>

            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Login gate for the paywall — revives the previously-unused AuthModal.
          Guests must have an account so the Gumroad purchase email can be matched. */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
        redirectTo="/result"
      />

      {/* Success pill — shown briefly once the purchase is confirmed */}
      <AnimatePresence>
        {unlockConfirmed && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 px-5 py-3 rounded-full bg-black/85 border border-gold/60 backdrop-blur-md shadow-[0_0_30px_rgba(212,175,55,0.35)]"
          >
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-gold text-sm font-sans font-medium">
              {(CHECKING_UNLOCK_TEXT[currentLocale] || CHECKING_UNLOCK_TEXT.en).done}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Confirming your purchase" pill while polling entitlement after checkout */}
      <AnimatePresence>
        {checkingUnlock && !unlocked && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 px-5 py-3 rounded-full bg-black/85 border border-gold/30 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.6)]"
          >
            <RefreshCw className="w-4 h-4 text-gold animate-spin" />
            <span className="text-gold/90 text-sm font-sans">
              {(CHECKING_UNLOCK_TEXT[currentLocale] || CHECKING_UNLOCK_TEXT.en).msg}
            </span>
            <button
              onClick={() => fetchEntitlement()}
              className="text-xs font-sans text-black bg-gold px-3 py-1 rounded-full font-bold hover:brightness-110 transition"
            >
              {(CHECKING_UNLOCK_TEXT[currentLocale] || CHECKING_UNLOCK_TEXT.en).btn}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading the full locked sections after unlock (deferred for speed) */}
      <AnimatePresence>
        {unlocked && sectionsLoading && aiData?.previewOnly && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 px-5 py-3 rounded-full bg-black/85 border border-gold/30 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.6)]"
          >
            <RefreshCw className="w-4 h-4 text-gold animate-spin" />
            <span className="text-gold/90 text-sm font-sans">
              {(FULL_READING_TEXT[currentLocale] || FULL_READING_TEXT.en)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="flex w-full h-[100dvh] items-center justify-center bg-background">
        <Sparkles className="w-8 h-8 text-gold animate-spin" />
      </div>
    }>
      <ResultPageContent />
    </Suspense>
  );
}
