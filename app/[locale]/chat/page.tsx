"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowLeft, Send, Sparkle, Bot, Flame, Zap } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { MASTERS } from "@/lib/masters";
import { useSession } from "next-auth/react";
import { getMaster, getKarma, saveKarma, getProfile, saveProfile } from "@/lib/userStateManager";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
  emotion?: string;
}

const PAYWALL_TAG = "[SYSTEM_PAYWALL]";

/**
 * Parse lightweight markdown (##, ###, **, -, newlines) into styled React elements
 */
function formatMasterResponse(text: string): React.ReactNode[] {
// ... skipped unmodified lines but I have to provide the full replacement chunk up to 327.

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip completely empty lines but add spacing
    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      continue;
    }

    // ## Main heading
    if (trimmed.startsWith("## ")) {
      const headingText = trimmed.slice(3);
      elements.push(
        <h3
          key={`h2-${i}`}
          className="text-gold font-serif text-base sm:text-lg font-bold mt-4 mb-2 flex items-center gap-2"
        >
          {formatInlineMarkdown(headingText)}
        </h3>
      );
      continue;
    }

    // ### Sub-heading
    if (trimmed.startsWith("### ")) {
      const subText = trimmed.slice(4);
      elements.push(
        <h4
          key={`h3-${i}`}
          className="text-white/80 font-serif text-sm sm:text-base font-semibold mt-3 mb-1.5"
        >
          {formatInlineMarkdown(subText)}
        </h4>
      );
      continue;
    }

    // Bullet point "- " or "• "
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      const bulletText = trimmed.slice(2);
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 ml-1 my-1">
          <span className="text-gold/60 mt-1 flex-shrink-0 text-xs">◆</span>
          <span className="text-gray-300 text-sm leading-relaxed">
            {formatInlineMarkdown(bulletText)}
          </span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-gray-300 text-sm leading-relaxed my-1">
        {formatInlineMarkdown(trimmed)}
      </p>
    );
  }

  return elements;
}

/**
 * Inline markdown: **bold** → <strong>
 */
function formatInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={`b-${match.index}`} className="text-white font-semibold">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function TypewriterText({ content }: { content: string }) {
  const [displayedText, setDisplayedText] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayedText("");
    
    const intervalId = setInterval(() => {
      indexRef.current += 4; // 4 chars per tick for fast, smooth typing
      if (indexRef.current >= content.length) {
        setDisplayedText(content);
        clearInterval(intervalId);
      } else {
        setDisplayedText(content.substring(0, indexRef.current));
      }
    }, 30); // 30ms = ~33 renders/sec (halved from 66)

    return () => clearInterval(intervalId);
  }, [content]);

  return <>{formatMasterResponse(displayedText)}</>;
}

function renderMessageContent(content: string, paywallText: string, useTypewriter: boolean = false) {
  const paywallIndex = content.indexOf(PAYWALL_TAG);
  let visibleText = content;
  let hasPaywall = false;
  
  if (paywallIndex !== -1) {
    visibleText = content.substring(0, paywallIndex).trim();
    hasPaywall = true;
  }

  return (
    <>
      {visibleText && (
        <div className="space-y-0.5 mb-4">
          {useTypewriter ? <TypewriterText content={visibleText} /> : formatMasterResponse(visibleText)}
        </div>
      )}
      {hasPaywall && (
        <div className="mt-3 pt-3 border-t border-gold/20">
          <Link
            href="/pricing"
            className="w-full px-4 py-3 bg-gradient-to-r from-gold to-[#a68625] text-black font-sans font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] hover:scale-[1.02] active:scale-95 active:bg-opacity-80 transition-all duration-150 ease-in-out transform-gpu flex items-center justify-center gap-2 text-center"
          >
            <Sparkle className="w-5 h-5 flex-shrink-0" />
            {paywallText}
          </Link>
        </div>
      )}
    </>
  );
}

const LOADING_PHRASES: Record<string, string[]> = {
  ko: [
    "별들의 궤적을 살피는 중...",
    "당신의 운명과 기운을 동기화하고 있습니다...",
    "오행의 흐름을 짚어보고 있습니다...",
    "카르마의 장부를 펼치는 중...",
    "거의 다 되었습니다...",
    "잠시만 더 기다려 주십시오..."
  ],
  en: [
    "Tracing the stellar paths...",
    "Synchronizing your destiny with the cosmos...",
    "Analyzing the flow of the Five Elements...",
    "Opening the records of karma...",
    "Almost finished...",
    "Just a moment more..."
  ]
};

function RotatingLoadingText({ locale }: { locale: string }) {
  const [index, setIndex] = useState(0);
  const phrases = LOADING_PHRASES[locale] || LOADING_PHRASES.en;
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => {
        // Stop at the last phrase instead of looping infinitely
        if (prev >= phrases.length - 1) return prev;
        return prev + 1;
      });
    }, 2800);
    return () => clearInterval(interval);
  }, [phrases.length]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={index}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.3 }}
        className="block"
      >
        {phrases[index]}
      </motion.span>
    </AnimatePresence>
  );
}

function MasterEmotionImage({ masterId, emotion, defaultImage }: { masterId: string | number, emotion: string, defaultImage: string }) {
  const [imgSrc, setImgSrc] = useState(`/images/master_${masterId}_${emotion}.webp`);
  
  return (
    <Image 
      src={imgSrc}
      alt={emotion}
      fill
      priority
      className="object-cover"
      sizes="(max-width: 768px) 224px, 288px"
      onError={() => {
        if (imgSrc !== defaultImage) {
          setImgSrc(defaultImage);
        }
      }}
    />
  );
}

/* ─── Karma Energy Bar ─── */
function KarmaEnergyBar({
  current,
  max,
  onRefill,
}: {
  current: number;
  max: number;
  onRefill: () => void;
}) {
  const percentage = (current / max) * 100;
  const isEmpty = current === 0;
  const isLow = current <= 1 && current > 0;

  return (
    <div className="w-full px-4 sm:px-6 py-3 bg-black/40 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-4xl mx-auto">
        {/* Label Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <motion.div
              animate={
                isEmpty
                  ? { opacity: [0.3, 0.6, 0.3] }
                  : { opacity: 1 }
              }
              transition={
                isEmpty
                  ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  : {}
              }
            >
              <Flame
                className={`w-4 h-4 ${
                  isEmpty
                    ? "text-gray-600"
                    : isLow
                      ? "text-red-400"
                      : "text-gold"
                }`}
              />
            </motion.div>
            <span
              className={`text-[10px] font-sans tracking-[0.2em] uppercase font-semibold ${
                isEmpty
                  ? "text-gray-600"
                  : isLow
                    ? "text-red-400/80"
                    : "text-gold/70"
              }`}
            >
              Karma Energy
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-sans font-bold tabular-nums ${
                isEmpty
                  ? "text-gray-600"
                  : isLow
                    ? "text-red-400"
                    : "text-gold"
              }`}
            >
              {current}/{max}
            </span>

            {/* Refill button — shown when empty */}
            <AnimatePresence>
              {isEmpty && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={onRefill}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-gold to-amber-500 text-black text-[10px] font-sans font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.7)] hover:scale-105 active:scale-95 active:bg-opacity-80 transition-all duration-150 ease-in-out transform-gpu"
                >
                  <Zap className="w-3 h-3" />
                  Refill Energy
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Energy Bar Track */}
        <div className="relative h-2 rounded-full bg-white/[0.04] overflow-hidden">
          {/* Glow underneath */}
          <div
            className="absolute inset-0 rounded-full blur-[6px] transition-all duration-700"
            style={{
              width: `${percentage}%`,
              background: isEmpty
                ? "transparent"
                : isLow
                  ? "rgba(248, 113, 113, 0.3)"
                  : "rgba(212, 175, 55, 0.25)",
            }}
          />

          {/* Fill bar */}
          <motion.div
            className="relative h-full rounded-full"
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{
              background: isEmpty
                ? "transparent"
                : isLow
                  ? "linear-gradient(90deg, #dc2626, #f87171)"
                  : "linear-gradient(90deg, #a68625, #d4af37, #f0d060)",
            }}
          >
            {/* Shimmer effect on the bar */}
            {!isEmpty && (
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: "easeInOut",
                }}
              />
            )}

            {/* Tip glow */}
            {!isEmpty && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gold/80 blur-[4px]" />
            )}
          </motion.div>

          {/* Segment notches */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: max - 1 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-white/[0.06] last:border-0"
              />
            ))}
          </div>
        </div>

        {/* Empty state message */}
        <AnimatePresence>
          {isEmpty && (
            <motion.p
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="text-gray-600 text-[11px] font-sans text-center tracking-wide"
            >
              The cosmic channels are depleted. Refill your Karma Energy to continue.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChatPageContent() {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Find current master from query string or default to Master Karma (5)
  const masterId = parseInt(searchParams.get("masterId") || getMaster()?.toString() || "5", 10);
  const currentMaster = MASTERS.find((m) => m.id === masterId) || MASTERS[0];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [karmaTokens, setKarmaTokens] = useState(5);
  const [maxKarma, setMaxKarma] = useState(5);
  const { data: session } = useSession();
  const isPremium = session?.user?.tier === 'PREMIUM' || session?.user?.role === 'ADMIN';
  const [userId, setUserId] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isKarmaEmpty = karmaTokens === 0;

  // Sync karma from localStorage on mount
  useEffect(() => {
    const isPrem = isPremium || searchParams.get("premium") === "true";

    const karma = getKarma();
    let current = karma.current;
    let max = karma.max;

    // Fallback for existing premium users who got stuck with the default 5 karma
    // Or if they just upgraded to premium and max is still 5
    if (isPrem && max === 5) {
      max = 20;
      current = 20;
      saveKarma(current, max);
    }

    setKarmaTokens(current);
    setMaxKarma(max);
  }, [searchParams]);

  // Fetch current user ID from session
  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id as string);
    }
  }, [session]);

  // Load initial welcome message
  useEffect(() => {
    const welcomeText = t("welcome_msg", { masterName: currentMaster.name });
    setMessages([
      {
        id: "welcome",
        role: "model",
        content: welcomeText,
        timestamp: Date.now(),
      },
    ]);
  }, [currentMaster, t]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleRefillKarma = () => {
    // Navigate to the pricing page for upsell
    router.push("/pricing");
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isTyping || isKarmaEmpty) return;

    const userText = inputValue.trim();
    setInputValue("");
    setError(null);

    // Deduct one karma token and save immediately
    setKarmaTokens((prev) => {
      const next = Math.max(0, prev - 1);
      saveKarma(next, maxKarma);
      return next;
    });

    // 1. Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userText,
      timestamp: Date.now(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Format history into Gemini API format
      const historyPayload = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      // Detect locale from next-intl hook
      const currentLocale = locale;
      
      // Fetch user profile — DB first (source of truth), localStorage fallback
      let profile = null;
      if (session?.user?.id) {
        try {
          const profileRes = await fetch('/api/user/saju-profile', { cache: 'no-store' });
          if (profileRes.ok) {
            const { profile: dbProfile } = await profileRes.json();
            if (dbProfile && (dbProfile.birthYear || dbProfile.name)) {
              profile = {
                name: dbProfile.name,
                year: dbProfile.birthYear,
                month: dbProfile.birthMonth,
                day: dbProfile.birthDay,
                time: dbProfile.birthTime,
                unknownTime: dbProfile.unknownTime,
                country: dbProfile.country,
                city: dbProfile.city,
                gender: dbProfile.gender,
              };
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
          // Fallback to localStorage
        }
      }
      if (!profile) {
        profile = getProfile();
      }

      // 2. Fetch AI response
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: historyPayload,
          masterName: currentMaster.name,
          locale: currentLocale,
          isPremium: isPremium,
          userId: userId,
          profile: profile, // Important for Saju context!
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle 403: Karma Energy depleted from server
        if (response.status === 403) {
          setKarmaTokens(0); // Sync client state with server
          saveKarma(0, maxKarma);
          throw new Error(errorData.error || "Karma Energy depleted. Master is meditating.");
        }

        throw new Error(errorData.error || "Failed to communicate with master.");
      }

      const data = await response.json();
      
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "model",
        content: data.reply,
        timestamp: Date.now(),
        emotion: data.emotion || "calm",
      };

      setMessages((prev) => [...prev, botMessage]);

      // ─── Save chat to localStorage for Dashboard Recent Reports ───
      // This ensures persistence in the mock/local environment where
      // the server-side Supabase insert doesn't actually persist data.
      try {
        const existingReports = JSON.parse(localStorage.getItem("kdestiny_chat_reports") || "[]");
        const newReport = {
          id: `chat-${Date.now()}`,
          user_id: userId || "local-user",
          type: "Chat",
          content: {
            masterName: currentMaster.name,
            userMessage: userText,
            aiResponse: data.reply,
          },
          created_at: new Date().toISOString(),
        };
        existingReports.unshift(newReport); // newest first
        // Keep only the latest 50 chat reports to avoid bloating localStorage
        localStorage.setItem("kdestiny_chat_reports", JSON.stringify(existingReports.slice(0, 50)));
      } catch (e) {
        console.warn("[Chat] Could not save chat report to localStorage:", e);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "The cosmic link was temporarily broken.");
      // Refund the karma token on error
      setKarmaTokens((prev) => {
        const next = Math.min(maxKarma, prev + 1);
        saveKarma(next, maxKarma);
        return next;
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <main className="relative min-h-[100dvh] w-full bg-background overflow-hidden flex flex-col items-center justify-between">
      
      {/* Mystical Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-stardust opacity-20 mix-blend-screen" />
        <div className="absolute top-0 right-0 w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-dark/15 via-transparent to-transparent blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/5 via-transparent to-transparent blur-[120px]" />
      </div>

      {/* Top Navigation & Status Bar */}
      <header className="relative z-10 w-full max-w-4xl border-b border-white/5 bg-background/60 backdrop-blur-xl px-4 py-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-white/5 transition-colors text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full border border-gold/40 overflow-hidden shadow-[0_0_10px_rgba(212,175,55,0.2)] bg-black/40 flex items-center justify-center">
              {currentMaster.image ? (
                <Image 
                  src={currentMaster.image} 
                  alt={currentMaster.name} 
                  fill 
                  priority
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <Bot className="w-6 h-6 text-gold" />
              )}
            </div>
            <div>
              <h2 className="font-serif text-white font-bold leading-tight text-sm sm:text-base">
                {currentMaster.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-sans text-emerald-400 tracking-wider uppercase font-semibold">
                  {t("status_online")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 bg-gold/5 border border-gold/20 px-3 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-gold animate-spin-slow" />
          <span className="text-[10px] font-sans tracking-widest text-gold/80 uppercase font-medium">
            {currentMaster.specialty}
          </span>
        </div>
      </header>

      {/* Karma Energy Bar */}
      <KarmaEnergyBar
        current={karmaTokens}
        max={maxKarma}
        onRefill={handleRefillKarma}
      />

      {/* Chat Area */}
      <div className="relative z-10 w-full max-w-4xl flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6 flex flex-col scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                {msg.role === "model" && msg.emotion && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    style={{ willChange: "transform, opacity" }}
                    className="w-56 sm:w-64 md:w-72 aspect-[3/4] rounded-2xl border-2 border-gold/20 overflow-hidden relative bg-black/40 shadow-[0_4px_20px_rgba(212,175,55,0.2)] mb-2 transform-gpu"
                  >
                    <MasterEmotionImage 
                      masterId={masterId} 
                      emotion={msg.emotion} 
                      defaultImage={currentMaster.image || `/images/master_${masterId}_calm.webp`} 
                    />
                  </motion.div>
                )}
                <div
                  className={`p-4 rounded-2xl leading-relaxed text-sm sm:text-base font-sans ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-gold/10 to-gold/5 border border-gold/30 text-white rounded-br-none shadow-[0_4px_15px_rgba(212,175,55,0.05)]"
                      : "bg-white/[0.03] backdrop-blur-xl border border-white/5 text-gray-300 rounded-bl-none shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
                  }`}
                >
                  {msg.role === "user" ? msg.content : renderMessageContent(msg.content, t("premium_upsell"), msg.role === "model")}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full justify-start items-center gap-3 text-gray-500 font-sans text-xs tracking-wider"
          >
            <div className="flex gap-1.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5 rounded-bl-none">
              <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-bounce [animation-delay:0.4s]" />
            </div>
            <RotatingLoadingText locale={locale} />
          </motion.div>
        )}

        {error && (
          <div className="w-full flex justify-center">
            <span className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-sans text-xs text-center max-w-md">
              {error}
            </span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <footer className="relative z-10 w-full max-w-4xl px-4 py-3 sm:py-6 sm:px-6 bg-gradient-to-t from-background to-transparent">
        {/* Empty karma overlay message */}
        <AnimatePresence>
          {isKarmaEmpty && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center justify-center gap-3 mb-3 px-4 py-3 rounded-2xl bg-gold/[0.04] border border-gold/15"
            >
              <Flame className="w-4 h-4 text-gold/50" />
              <p className="text-gold/50 text-xs font-sans tracking-wide">
                Your Karma Energy is depleted. Refill to continue your cosmic dialogue.
              </p>
              <button
                onClick={handleRefillKarma}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-gold to-amber-500 text-black text-[10px] font-bold tracking-wider uppercase shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.6)] hover:scale-105 active:scale-95 active:bg-opacity-80 transition-all duration-150 ease-in-out transform-gpu"
              >
                <Zap className="w-3 h-3" />
                Refill
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="relative flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isTyping || isKarmaEmpty}
            placeholder={
              isKarmaEmpty
                ? "Master is meditating. Wait until tomorrow or refill Karma Energy."
                : t("placeholder_input")
            }
            className={`w-full backdrop-blur-xl border rounded-2xl px-5 py-4 pr-14 font-sans text-sm sm:text-base outline-none transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.4)] disabled:opacity-50 ${
              isKarmaEmpty
                ? "bg-white/[0.01] border-white/5 text-gray-600 placeholder-gray-700 cursor-not-allowed"
                : "bg-white/[0.02] border-white/10 text-white placeholder-gray-500 focus:border-gold/50"
            }`}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping || isKarmaEmpty}
            className="absolute right-2 p-3 bg-gradient-to-r from-gold to-[#a68625] text-black rounded-xl transform-gpu hover:scale-[1.05] active:scale-95 active:bg-opacity-80 transition-all duration-150 ease-in-out disabled:opacity-20 disabled:scale-100 disabled:hover:scale-100 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex w-full h-[100dvh] items-center justify-center bg-background">
        <Sparkles className="w-8 h-8 text-gold animate-pulse" />
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
