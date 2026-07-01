"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Moon, Lock, ArrowRight, RefreshCw } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { saveLastResult, getLastResult, getProfile, isPremium as checkPremium, getMaster } from "@/lib/userStateManager";

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
  lucky_elements: string[];
  element_analysis: Record<string, number>;
}

function isValidResult(data: any): data is DestinyResult {
  return (
    data &&
    typeof data.core_essence === "string" &&
    data.core_essence.length > 10 &&
    typeof data.imminent_karma_teaser === "string" &&
    typeof data.locked_secrets === "string" &&
    Array.isArray(data.lucky_elements) &&
    data.lucky_elements.length >= 2 &&
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

function ResultPageContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [premium, setPremium] = useState(false);
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

  // Check premium status on mount
  useEffect(() => {
    setPremium(checkPremium());
  }, []);

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
      if (!storedData) {
        // Fallback: try loading from localStorage profile
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
          setError("No birth data found. Please go back and enter your information.");
          setIsLoading(false);
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
      
      // Append userId to formData if logged in
      const payload = { ...formData };
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          payload.userId = session.user.id;
        }
      }

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

              <div className="grid grid-cols-1 gap-6">
                {/* Card 1: Core Essence — FREE section */}
                <motion.div
                  variants={cardVariants}
                  className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-full bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                      <Moon className="w-6 h-6" />
                    </div>
                    <h2 className="font-serif text-2xl text-white">{t("card_core_essence") || "Core Essence"}</h2>
                  </div>
                  <div className="font-sans text-gray-300 leading-loose space-y-4 text-sm sm:text-base whitespace-pre-wrap">
                    {formatDestinyText(aiData.core_essence)}
                  </div>
                </motion.div>

                {/* Card 2: Karma Teaser — THE HOOK */}
                <motion.div
                  variants={cardVariants}
                  className="bg-gradient-to-r from-red-500/10 to-orange-500/10 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-full bg-red-500/20 text-red-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h2 className="font-serif text-xl text-white">{t("card_karma_teaser") || "Imminent Karma"}</h2>
                  </div>
                  <p className="font-sans text-red-200/90 font-medium leading-relaxed text-lg sm:text-xl italic">
                    &ldquo;{aiData.imminent_karma_teaser}&rdquo;
                  </p>
                </motion.div>

                {/* Card 3: Locked Secrets — PREMIUM / PAYWALL */}
                <motion.div
                  variants={cardVariants}
                  className={`relative bg-white/[0.02] backdrop-blur-xl border ${
                    premium ? "border-gold/30" : "border-white/10"
                  } rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden group`}
                >
                  <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className={`p-3 rounded-full ${premium ? "bg-gold/20" : "bg-gold/10"} text-gold`}>
                      {premium ? <Sparkles className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                    </div>
                    <div>
                      <h2 className="font-serif text-2xl text-gold">{t("card_locked_secrets") || "Premium Secrets"}</h2>
                      {premium && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-gold/10 text-gold text-[10px] font-sans tracking-widest uppercase">Premium Unlocked ✨</span>
                      )}
                    </div>
                  </div>

                  {premium ? (
                    /* ═══ UNLOCKED — Full content visible ═══ */
                    <div className="font-sans text-gray-300 leading-loose space-y-4 text-sm sm:text-base whitespace-pre-wrap">
                      {formatDestinyText(aiData.locked_secrets)}
                    </div>
                  ) : (
                    /* ═══ LOCKED — Blurred with paywall overlay ═══ */
                    <>
                      <div className="font-sans text-gray-300 leading-loose space-y-4 text-sm sm:text-base whitespace-pre-wrap blur-[8px] select-none opacity-30">
                        {formatDestinyText(aiData.locked_secrets)}
                      </div>
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[2px]">
                        <div className="bg-black/80 border border-gold/30 px-6 py-6 rounded-3xl text-center shadow-[0_0_30px_rgba(212,175,55,0.2)] max-w-[90%] sm:max-w-md">
                          <Lock className="w-8 h-8 text-gold mx-auto mb-3" />
                          <h3 className="text-white font-serif text-xl mb-2">{t("locked_badge") || "Destiny Locked"}</h3>
                          <p className="text-gray-400 text-sm mb-6 px-2">{t("locked_desc") || "Unlock to reveal exact timings and actionable remedies."}</p>
                          <Link
                            href="/pricing"
                            className="block w-full px-6 py-4 bg-gradient-to-r from-gold to-[#a68625] text-black font-sans font-bold text-sm sm:text-base rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.8)] hover:scale-[1.02] active:scale-95 active:bg-opacity-80 transition-all duration-150 ease-in-out transform-gpu text-center"
                          >
                            {t("btn_paywall_text") || "🔒 Unlock Your Ultimate Destiny Blueprint ($9.99)"}
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              </div>

              {/* Lucky Elements */}
              <motion.div
                variants={cardVariants}
                className="flex flex-col items-center mt-12 mb-16 space-y-4"
              >
                <h3 className="font-sans text-sm tracking-widest text-gray-500 uppercase">
                  {t("lucky_elements")}
                </h3>
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                  {aiData.lucky_elements.map((element, idx) => (
                    <div
                      key={idx}
                      className="px-6 py-2 rounded-full border border-gold/40 bg-gold/5 text-gold font-serif text-lg tracking-wide shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                    >
                      {element}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Call to Action */}
              <motion.div
                variants={cardVariants}
                className="flex flex-col sm:flex-row justify-center items-stretch gap-4 pt-8 border-t border-white/5 w-full max-w-2xl mx-auto"
              >
                {premium ? (
                  /* ═══ PREMIUM CTAs ═══ */
                  <>
                    <Link href="/dashboard" className="w-full sm:flex-1 block">
                      <button className="relative w-full h-full px-4 sm:px-6 py-4 bg-gradient-to-r from-gold/20 to-amber-500/20 border border-gold/30 text-gold hover:from-gold/30 hover:to-amber-500/30 font-sans font-bold text-base whitespace-nowrap rounded-2xl active:scale-95 active:bg-opacity-80 transition-all duration-150 ease-in-out transform-gpu flex items-center justify-center gap-2 sm:gap-3 group">
                        <Sparkles className="w-5 h-5 opacity-70 flex-shrink-0" />
                        {t("btn_go_dashboard")}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                      </button>
                    </Link>
                    <Link href={`/chat?masterId=${masterId}`} className="w-full sm:flex-1 block">
                      <button className="relative w-full h-full px-4 sm:px-6 py-4 bg-gradient-to-r from-gold to-[#a68625] text-black font-sans font-bold text-base whitespace-nowrap rounded-2xl shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_50px_rgba(212,175,55,0.6)] hover:scale-[1.02] active:scale-95 active:bg-opacity-80 transition-all duration-150 ease-in-out transform-gpu flex items-center justify-center gap-2 sm:gap-3 group">
                        <Sparkles className="w-5 h-5 opacity-70 flex-shrink-0" />
                        {t("btn_chat")}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                      </button>
                    </Link>
                  </>
                ) : (
                  /* ═══ FREE CTAs ═══ */
                  <>
                    <Link href="/pricing" className="w-full sm:flex-1 block">
                      <button className="relative w-full h-full px-4 sm:px-6 py-4 bg-gradient-to-r from-gold to-[#a68625] text-black font-sans font-bold text-base whitespace-nowrap rounded-2xl shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_50px_rgba(212,175,55,0.6)] hover:scale-[1.02] active:scale-95 active:bg-opacity-80 transition-all duration-150 ease-in-out transform-gpu flex items-center justify-center gap-2 sm:gap-3 group">
                        <Lock className="w-5 h-5 opacity-70 flex-shrink-0" />
                        {t("btn_upgrade")}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                      </button>
                    </Link>
                    <Link href={`/chat?masterId=${masterId}`} className="w-full sm:flex-1 block">
                      <button className="relative w-full h-full px-4 sm:px-6 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-sans font-bold text-base whitespace-nowrap rounded-2xl active:scale-95 active:bg-opacity-80 transition-all duration-150 ease-in-out transform-gpu flex items-center justify-center gap-2 sm:gap-3 group">
                        <Sparkles className="w-5 h-5 opacity-70 flex-shrink-0" />
                        {t("btn_chat")}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                      </button>
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
