"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Moon, Lock, ArrowRight, RefreshCw, Heart, DollarSign, Activity, BookOpen, Clock, Eye, Star } from "lucide-react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { saveLastResult, getLastResult, getProfile, getMaster, saveProfile } from "@/lib/userStateManager";
import { MASTERS } from "@/lib/masters";
import dynamic from "next/dynamic";
import ShareCard from "@/components/ShareCard";

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
}

function isValidResult(data: any): data is DestinyResult {
  return (
    data &&
    typeof data.core_essence === "string" &&
    data.core_essence.length > 10 &&
    typeof data.imminent_karma_teaser === "string" &&
    typeof data.locked_secrets === "string" &&
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

function ResultPageContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const { data: session } = useSession();
  const premium = session?.user?.tier === 'PREMIUM' || session?.user?.role === 'ADMIN';
  const t = useTranslations("Result");
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const masterId = searchParams.get("masterId") || getMaster()?.toString() || "5";
  const fetchAttemptRef = useRef(0);
  const currentLocale = locale;
  const phrases = LOADING_PHRASES[currentLocale] || LOADING_PHRASES.en;

  const [aiData, setAiData] = useState<DestinyResult | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  // ── Countdown timer (24h from first load) ──
  const [timerDisplay, setTimerDisplay] = useState("23:59:59");
  useEffect(() => {
    const endKey = "kdestiny_offer_end";
    let end = parseInt(localStorage.getItem(endKey) || "0", 10);
    if (!end || end < Date.now()) {
      end = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(endKey, String(end));
    }
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimerDisplay(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Scarcity: fake viewing count ──
  const viewingCount = useMemo(() => Math.floor(2 + Math.random() * 5), []);
  const socialCount = useMemo(() => Math.floor(80 + Math.random() * 120), []);

  // Check premium status on mount
  // Derived from session above

  const handlePayment = async () => {
    if (isPaying) return;
    setIsPaying(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: currentLocale }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to initiate payment session.");
      }
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned from the server.");
      }
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      alert(err.message || "Something went wrong. Please try again.");
      setIsPaying(false);
    }
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

      const resultData = await response.json();

      // 3. Validate the response has all required fields
      if (!isValidResult(resultData)) {
        console.warn("[Fetch] API returned incomplete data:", Object.keys(resultData));
        if (attempt <= MAX_FETCH_RETRIES) {
          console.log(`[Fetch] Incomplete response, auto-retrying (attempt ${attempt}/${MAX_FETCH_RETRIES})...`);
          setRetryCount(attempt);
          await new Promise((r) => setTimeout(r, 1500));
          return fetchDestiny(true);
        }
        throw new Error("The cosmic reading was incomplete. Please try again.");
      }

      // 4. Success! Store in state and cache
      setAiData(resultData);
      setRetryCount(0);

      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data: resultData, timestamp: Date.now() })
        );
      } catch { /* localStorage full — continue */ }

      // Also persist to userStateManager for dashboard access
      saveLastResult(resultData);

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
                  <div className="font-sans text-gray-300 leading-loose space-y-4 text-sm sm:text-base whitespace-pre-wrap">{formatDestinyText(aiData.core_essence)}</div>
                </motion.div>

                {/* Card 2: Karma Teaser — FREE HOOK */}
                <motion.div variants={cardVariants} className="bg-gradient-to-r from-red-500/10 to-orange-500/10 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-full bg-red-500/20 text-red-400"><Sparkles className="w-6 h-6" /></div>
                    <h2 className="font-serif text-xl text-white">{t("card_karma_teaser")}</h2>
                  </div>
                  <p className="font-sans text-red-200/90 font-medium leading-relaxed text-lg sm:text-xl italic">&ldquo;{aiData.imminent_karma_teaser}&rdquo;</p>
                </motion.div>

                {/* LOCKED SECTIONS — psychological paywall for free users */}
                {[
                  { key: 'love', titleKey: 'section_love', icon: <Heart className="w-5 h-5" />, content: aiData.love_fortune || aiData.locked_secrets, color: 'pink' },
                  { key: 'wealth', titleKey: 'section_wealth', icon: <DollarSign className="w-5 h-5" />, content: aiData.wealth_warning || '', color: 'amber' },
                  { key: 'health', titleKey: 'section_health', icon: <Activity className="w-5 h-5" />, content: aiData.health_alert || '', color: 'emerald' },
                  { key: 'prescription', titleKey: 'section_prescription', icon: <BookOpen className="w-5 h-5" />, content: aiData.master_prescription || '', color: 'purple' },
                ].filter(s => s.content).map((section) => (
                  <motion.div key={section.key} variants={cardVariants}
                    className={`relative bg-white/[0.02] backdrop-blur-xl border ${premium ? 'border-gold/30' : 'border-white/10'} rounded-3xl p-6 sm:p-8 overflow-hidden`}>
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                      <div className={`p-2.5 rounded-full ${premium ? 'bg-gold/15 text-gold' : 'bg-white/5 text-gray-400'}`}>{section.icon}</div>
                      <h2 className={`font-serif text-lg ${premium ? 'text-gold' : 'text-white'}`}>{t(section.titleKey)}</h2>
                      {premium && <span className="px-2 py-0.5 rounded-full bg-gold/10 text-gold text-[9px] font-sans tracking-wider">{t("unlocked_label")}</span>}
                    </div>
                    {premium ? (
                      <div className="font-sans text-gray-300 leading-loose text-sm whitespace-pre-wrap">{formatDestinyText(section.content)}</div>
                    ) : (
                      <>
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
                            <p className="text-gray-400 text-xs mb-1">{t("unlock_desc")}</p>
                            {/* Viewing count */}
                            <div className="flex items-center justify-center gap-1.5 mb-3">
                              <Eye className="w-3 h-3 text-green-400" />
                              <span className="text-green-400/80 text-[10px] font-sans">
                                {t("viewing_now", { count: viewingCount })}
                              </span>
                            </div>
                            <div className="flex flex-col gap-2">
                              {/* Anchor pricing */}
                              <a href="https://moseo.gumroad.com/l/zmqhr" target="_blank" rel="noopener noreferrer">
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
                              </a>
                              {/* Timer */}
                              <div className="flex items-center justify-center gap-1.5 text-amber-400/70 text-[10px] font-sans">
                                <Clock className="w-3 h-3" />
                                <span>{t("timer_label")}: {timerDisplay}</span>
                              </div>
                              <Link href="/pricing" className="text-gold/60 text-xs hover:text-gold transition-colors">{t("unlock_or_premium")}</Link>
                            </div>
                          </div>
                        </div>
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

              {/* Social Proof + Share */}
              <motion.div variants={cardVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 py-6 border-t border-white/5">
                <div className="flex items-center gap-4">
                  <p className="text-gray-400 text-sm font-sans">
                    {t("social_proof", { count: socialCount })}
                  </p>
                  <span className="text-gray-600 text-xs">|</span>
                  <p className="text-amber-400/80 text-xs font-sans">
                    {t("rating_text", { count: "2,847" })}
                  </p>
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
