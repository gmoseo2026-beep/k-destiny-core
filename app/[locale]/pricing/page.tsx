"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import {
  Sparkles,
  Crown,
  ArrowLeft,
  Check,
  Zap,
  Shield,
  Star,
  Flame,
  Eye,
  Moon,
  Sun,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AuthModal from "@/components/AuthModal";

/* ─── Animated Star Particles ─── */
function CosmicParticles() {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; delay: number; duration: number }[]
  >([]);

  useEffect(() => {
    const pts = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      delay: Math.random() * 5,
      duration: Math.random() * 4 + 3,
    }));
    setParticles(pts);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            opacity: [0, 0.8, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

const PLAN_IDS = ["1month", "3months", "6months", "1year"] as const;

export default function PricingPage() {
  const t = useTranslations("Pricing");
  const locale = useLocale();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const plans = [
    {
      id: "1month" as const,
      icon: <Zap className="w-5 h-5" />,
      accentFrom: "from-blue-500/30",
      accentTo: "to-purple-600/10",
      glowColor: "rgba(99, 102, 241, 0.4)",
      borderGlow: "hover:shadow-[0_0_40px_rgba(99,102,241,0.25)]",
    },
    {
      id: "3months" as const,
      icon: <Star className="w-5 h-5" />,
      accentFrom: "from-violet-500/30",
      accentTo: "to-fuchsia-600/10",
      glowColor: "rgba(139, 92, 246, 0.4)",
      borderGlow: "hover:shadow-[0_0_40px_rgba(139,92,246,0.25)]",
    },
    {
      id: "6months" as const,
      icon: <Shield className="w-5 h-5" />,
      accentFrom: "from-fuchsia-500/30",
      accentTo: "to-pink-600/10",
      glowColor: "rgba(217, 70, 239, 0.4)",
      borderGlow: "hover:shadow-[0_0_40px_rgba(217,70,239,0.25)]",
    },
    {
      id: "1year" as const,
      icon: <Crown className="w-5 h-5" />,
      accentFrom: "from-gold/40",
      accentTo: "to-amber-600/10",
      glowColor: "rgba(212, 175, 55, 0.5)",
      borderGlow: "hover:shadow-[0_0_60px_rgba(212,175,55,0.35)]",
    },
  ];

  // Feature keys per plan tier (cumulative unlock)
  const tierFeatures: Record<string, string[]> = {
    "1month": ["feature_karma_5", "feature_blueprint", "feature_basic_sync"],
    "3months": ["feature_karma_10", "feature_blueprint", "feature_basic_sync", "feature_monthly_report"],
    "6months": ["feature_karma_15", "feature_blueprint", "feature_basic_sync", "feature_monthly_report", "feature_priority"],
    "1year": ["feature_karma_20", "feature_blueprint", "feature_basic_sync", "feature_monthly_report", "feature_priority", "feature_forecast"],
  };

  const processCheckout = async (planId: string) => {
    try {
      // Map planId to real Lemon Squeezy variantId
      const variants: Record<string, number> = {
        "1month": 1850041,
        "3months": 1850043,
        "6months": 1850045,
        "1year": 1850047,
      };
      const variantId = variants[planId] || 1850041;

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, planId, locale }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create checkout session");
      }
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      alert(err.message || "Something went wrong. Please try again.");
      setLoadingPlan(null);
      setPendingPlanId(null);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (loadingPlan) return;
    setLoadingPlan(planId);
    
    // Check if user is logged in
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // User not logged in: Intercept checkout and show Auth Modal
        setPendingPlanId(planId);
        setIsAuthModalOpen(true);
        // We do not reset loadingPlan here so the button shows a loading state
        // until the modal is closed or login is complete.
        return;
      }
    }
    
    // User is logged in: proceed to consent modal
    setPendingPlanId(planId);
    setIsConsentModalOpen(true);
  };

  const handleAuthSuccess = () => {
    if (pendingPlanId) {
      setIsAuthModalOpen(false);
      setIsConsentModalOpen(true);
    }
  };

  const handleAuthClose = () => {
    setIsAuthModalOpen(false);
    setLoadingPlan(null);
    setPendingPlanId(null);
  };

  const handleConsentAgree = async () => {
    if (!pendingPlanId) return;
    try {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from("payment_consents").insert({
            user_id: session.user.id,
            plan_id: pendingPlanId,
            user_agent: window.navigator.userAgent,
          });
        }
      }
    } catch (e) {
      console.error("Consent log failed", e);
    }
    // Proceed to checkout regardless of log success so we don't block payment
    setIsConsentModalOpen(false);
    await processCheckout(pendingPlanId);
  };

  const handleConsentDecline = () => {
    setIsConsentModalOpen(false);
    setLoadingPlan(null);
    setPendingPlanId(null);
  };

  return (
    <main className="relative min-h-[100dvh] w-full bg-[#06050e] overflow-hidden flex flex-col items-center py-12 px-4 sm:px-6">
      {/* ═══ Cosmic Background Layers ═══ */}
      <CosmicParticles />

      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Central aura */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent blur-[100px]" />
        {/* Left accent */}
        <div className="absolute top-[40%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/15 via-transparent to-transparent blur-[120px]" />
        {/* Right accent */}
        <div className="absolute bottom-[5%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/6 via-transparent to-transparent blur-[140px]" />
        {/* Bottom mist */}
        <div className="absolute bottom-0 left-0 w-full h-[30vh] bg-gradient-to-t from-[#06050e] to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">
        {/* ═══ Navigation ═══ */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gold/80 transition-colors text-xs font-sans tracking-widest uppercase mb-10"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("back_home")}
        </Link>

        {/* ═══ Header ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          {/* Floating icon cluster */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Moon className="w-5 h-5 text-purple-400/60" />
            </motion.div>
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-6 h-6 text-gold/80" />
            </motion.div>
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            >
              <Sun className="w-5 h-5 text-amber-400/60" />
            </motion.div>
          </div>

          <span className="inline-block text-[10px] sm:text-xs font-sans tracking-[0.35em] text-gold/60 uppercase mb-4">
            {t("badge")}
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/50 leading-tight mb-5">
            {t("title")}
          </h1>
          <p className="font-sans text-gray-500 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* ═══ Pricing Grid ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-5 items-end">
          {plans.map((plan, idx) => {
            const isFeatured = plan.id === "1year";
            const isLoading = loadingPlan === plan.id;
            const isHovered = hoveredPlan === plan.id;
            const features = tierFeatures[plan.id];

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: idx * 0.1, ease: "easeOut" }}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                className={`relative flex flex-col ${isFeatured ? "lg:-mt-4" : ""}`}
              >
                {/* Master's Pick badge */}
                {isFeatured && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 z-30"
                  >
                    <div className="flex items-center gap-1.5 px-5 py-1.5 bg-gradient-to-r from-gold via-amber-400 to-gold rounded-full shadow-[0_0_30px_rgba(212,175,55,0.5)]">
                      <Crown className="w-3 h-3 text-black" />
                      <span className="text-[9px] font-sans font-black tracking-[0.2em] text-black uppercase">
                        {t("masters_choice")}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Card Wrapper — outer glow border */}
                <motion.div
                  animate={
                    isFeatured
                      ? { y: [0, -4, 0] }
                      : {}
                  }
                  transition={
                    isFeatured
                      ? { duration: 4, repeat: Infinity, ease: "easeInOut" }
                      : {}
                  }
                  className={`
                    relative rounded-[28px] p-[1px] transition-all duration-700
                    ${
                      isFeatured
                        ? "bg-gradient-to-b from-gold/50 via-gold/15 to-gold/5 shadow-[0_0_50px_rgba(212,175,55,0.2)]"
                        : isHovered
                          ? "bg-gradient-to-b from-white/20 via-white/8 to-transparent"
                          : "bg-gradient-to-b from-white/8 via-white/3 to-transparent"
                    }
                    ${plan.borderGlow}
                  `}
                >
                  <div
                    className={`
                      relative flex flex-col h-full rounded-[27px] overflow-hidden
                      bg-gradient-to-b ${plan.accentFrom} ${plan.accentTo}
                      backdrop-blur-xl
                    `}
                  >
                    {/* Inner glass surface */}
                    <div className="absolute inset-0 bg-[#0a0918]/85 rounded-[27px]" />

                    {/* Accent glow at top */}
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] transition-all duration-700"
                      style={{
                        background: isHovered || isFeatured
                          ? `linear-gradient(90deg, transparent, ${plan.glowColor}, transparent)`
                          : "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                      }}
                    />

                    <div className="relative z-10 flex flex-col h-full">
                      {/* ── Header ── */}
                      <div className="px-6 pt-7 pb-3">
                        <div
                          className={`
                            w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-500
                            ${
                              isFeatured
                                ? "bg-gold/15 text-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                                : "bg-white/5 text-gray-500 group-hover:text-white"
                            }
                          `}
                        >
                          {plan.icon}
                        </div>
                        <h3
                          className={`font-serif text-lg tracking-wide ${
                            isFeatured ? "text-gold" : "text-white/90"
                          }`}
                        >
                          {t(`plan_${plan.id}_name`)}
                        </h3>
                        <p className="text-gray-600 text-[11px] font-sans mt-0.5 tracking-wide">
                          {t(`plan_${plan.id}_duration`)}
                        </p>
                      </div>

                      {/* ── Price Block ── */}
                      <div className="px-6 pb-4">
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`font-serif text-[32px] sm:text-[42px] font-bold leading-none ${
                              isFeatured
                                ? "text-transparent bg-clip-text bg-gradient-to-b from-gold to-amber-300"
                                : "text-white"
                            }`}
                          >
                            {t(`plan_${plan.id}_price`)}
                          </span>
                          <span className="text-gray-600 text-xs font-sans">
                            {t("per_month")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-gray-600 text-[11px] font-sans">
                            {t(`plan_${plan.id}_total`)}
                          </span>
                          {plan.id !== "1month" && (
                            <span
                              className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded-full tracking-wider ${
                                isFeatured
                                  ? "bg-gold/15 text-gold"
                                  : "bg-emerald-500/10 text-emerald-400"
                              }`}
                            >
                              {t(`plan_${plan.id}_save`)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── Divider ── */}
                      <div className="mx-6 h-[1px] bg-gradient-to-r from-transparent via-white/6 to-transparent" />

                      {/* ── Features ── */}
                      <div className="px-6 pt-5 pb-2 flex-1">
                        <p className="text-gray-600 text-[9px] font-sans tracking-[0.25em] uppercase mb-3">
                          {t("includes")}
                        </p>
                        <ul className="space-y-3">
                          {features.map((fKey) => (
                            <li
                              key={fKey}
                              className="flex items-start gap-2.5"
                            >
                              <div
                                className={`w-4 h-4 mt-[1px] rounded-full flex items-center justify-center flex-shrink-0 ${
                                  isFeatured
                                    ? "bg-gold/15 text-gold"
                                    : "bg-white/[0.04] text-gray-500"
                                }`}
                              >
                                <Check className="w-2.5 h-2.5" strokeWidth={3} />
                              </div>
                              <span
                                className={`text-[13px] font-sans leading-snug ${
                                  fKey.includes("karma")
                                    ? isFeatured
                                      ? "text-gold font-semibold"
                                      : "text-white/80 font-medium"
                                    : "text-gray-400"
                                }`}
                              >
                                {t(fKey)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* ── CTA ── */}
                      <div className="px-6 pb-7 pt-4">
                        <button
                          onClick={() => handleSelectPlan(plan.id)}
                          disabled={!!loadingPlan}
                          className={`
                            relative w-full py-3.5 rounded-xl font-sans font-bold text-sm tracking-wider transition-all duration-500 transform-gpu active:scale-95 active:bg-opacity-80
                            disabled:cursor-not-allowed overflow-hidden
                            ${
                              isFeatured
                                ? "bg-gradient-to-r from-gold via-amber-400 to-gold text-black shadow-[0_4px_25px_rgba(212,175,55,0.35)] hover:shadow-[0_4px_40px_rgba(212,175,55,0.6)] hover:scale-[1.02] disabled:opacity-60"
                                : "bg-white/[0.04] text-white/80 border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] hover:text-white disabled:opacity-40"
                            }
                          `}
                        >
                          {/* Shimmer effect on featured */}
                          {isFeatured && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                              animate={{ x: ["-100%", "200%"] }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                repeatDelay: 2,
                                ease: "easeInOut",
                              }}
                            />
                          )}
                          <span className="relative z-10">
                            {isLoading ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                {t("redirecting")}
                              </span>
                            ) : (
                              t("select_plan")
                            )}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* ═══ Trust Bar ═══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 mt-16"
        >
          {[
            { icon: <Shield className="w-3.5 h-3.5" />, key: "trust_secure" },
            { icon: <Zap className="w-3.5 h-3.5" />, key: "trust_instant" },
            { icon: <Eye className="w-3.5 h-3.5" />, key: "trust_cancel" },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center gap-2 text-[11px] font-sans tracking-widest text-gray-600 uppercase"
            >
              {item.icon}
              <span>{t(item.key)}</span>
            </div>
          ))}
        </motion.div>

        {/* ═══ Bottom Guarantee ═══ */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="text-center text-gray-700 text-xs font-sans mt-10 mb-6"
        >
          {t("guarantee_text")}
        </motion.p>
      </div>
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={handleAuthClose} 
        onSuccess={handleAuthSuccess} 
      />

      {/* ═══ Consent Modal ═══ */}
      {isConsentModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleConsentDecline} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20 mb-2">
                <Shield className="w-6 h-6 text-gold" />
              </div>
              <h2 className="text-xl font-serif text-white font-bold">{t("consent_title")}</h2>
              <p className="text-sm font-sans text-gray-400 leading-relaxed">
                {t("consent_desc")}
              </p>
              
              <div className="w-full grid grid-cols-1 gap-3 mt-6">
                <button
                  onClick={handleConsentAgree}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold to-[#a68625] text-black font-bold font-sans text-sm hover:scale-[1.02] active:scale-95 active:bg-opacity-80 transition-all duration-150 ease-in-out transform-gpu"
                >
                  {t("btn_agree")}
                </button>
                <button
                  onClick={handleConsentDecline}
                  className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium font-sans text-sm hover:bg-white/10 transition-colors"
                >
                  {t("btn_decline")}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
