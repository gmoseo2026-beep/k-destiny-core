"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Sparkles, Crown, ArrowLeft, Check, Zap, Shield, Eye, Moon, Sun, FileText, RefreshCw, ArrowRight } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import { gumroadUrl, type GumroadProduct } from "@/lib/gumroad";
import { trackEvent } from "@/lib/gtag";

// Purchase intent survives the login redirect so the buyer never has to
// re-find the plan they already chose (checkout resume = fewer lost sales).
const PENDING_CHECKOUT_KEY = "kdestiny_pending_checkout";

function CosmicParticles() {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; delay: number; duration: number }[]>([]);
  useEffect(() => {
    setParticles(Array.from({ length: 40 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5, delay: Math.random() * 5, duration: Math.random() * 4 + 3,
    })));
  }, []);
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div key={p.id} className="absolute rounded-full bg-white"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function PricingPage() {
  const t = useTranslations("Pricing");
  const { data: session } = useSession();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [checkingUnlock, setCheckingUnlock] = useState(false);
  const [purchaseConfirmed, setPurchaseConfirmed] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<GumroadProduct | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Entitlement check: did the webhook land yet? ──
  const fetchEntitlement = async (): Promise<{ premium: boolean; hasReport: boolean }> => {
    try {
      const res = await fetch("/api/user/entitlement", { cache: "no-store" });
      if (!res.ok) return { premium: false, hasReport: false };
      const data = await res.json();
      return { premium: !!data.premium, hasReport: !!data.hasReport };
    } catch {
      return { premium: false, hasReport: false };
    }
  };

  // After checkout opens in the Gumroad tab, poll until the webhook activates
  // the purchase (usually seconds), then celebrate + route to the content.
  const pollEntitlement = (product: GumroadProduct) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setCheckingUnlock(true);
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      const { premium, hasReport } = await fetchEntitlement();
      const ok = product === "single" ? hasReport || premium : premium;
      if (ok || tries >= 24) {
        clearInterval(id);
        pollTimerRef.current = null;
        setCheckingUnlock(false);
        if (ok) {
          trackEvent("purchase_confirmed", { source: "pricing", product });
          setPurchaseConfirmed(true);
          setTimeout(() => {
            router.push(product === "single" ? "/result" : "/dashboard");
          }, 2000);
        }
      }
    }, 5000);
    pollTimerRef.current = id;
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // ── Checkout resume after login ──
  // If the user picked a plan while logged out, we stored it, sent them
  // through AuthModal (full page reload), and now surface a one-click
  // "continue to checkout" banner instead of losing the sale.
  useEffect(() => {
    if (!session?.user?.id) return;
    try {
      const stored = sessionStorage.getItem(PENDING_CHECKOUT_KEY);
      if (stored === "single" || stored === "monthly" || stored === "annual") {
        setPendingProduct(stored);
      }
    } catch { /* sessionStorage unavailable */ }
  }, [session?.user?.id]);

  const openCheckout = (product: GumroadProduct) => {
    window.open(gumroadUrl(product, session?.user?.email), "_blank", "noopener,noreferrer");
    trackEvent("begin_checkout", { source: "pricing", product });
    pollEntitlement(product);
  };

  // Login-gated checkout with email prefill so the Gumroad purchase email
  // matches the account email (reliable webhook activation).
  const handleCheckout = (product: GumroadProduct) => {
    trackEvent("unlock_click", { source: "pricing", product });
    if (!session?.user?.id) {
      try { sessionStorage.setItem(PENDING_CHECKOUT_KEY, product); } catch { /* ignore */ }
      setAuthOpen(true);
      return;
    }
    openCheckout(product);
  };

  const resumeCheckout = () => {
    if (!pendingProduct) return;
    try { sessionStorage.removeItem(PENDING_CHECKOUT_KEY); } catch { /* ignore */ }
    const product = pendingProduct;
    setPendingProduct(null);
    openCheckout(product);
  };

  const dismissResume = () => {
    try { sessionStorage.removeItem(PENDING_CHECKOUT_KEY); } catch { /* ignore */ }
    setPendingProduct(null);
  };

  const plans: {
    id: string; name: string; price: string; period: string; total: string;
    features: string[]; product: GumroadProduct; featured: boolean;
    icon: React.ReactNode; gradient: string; glow: string;
  }[] = [
    {
      id: "monthly",
      name: t("plan_1month_name"),
      price: "$7.99",
      period: t("per_month"),
      total: t("plan_monthly_total"),
      features: [t("feature_karma_20"), t("feature_blueprint"), t("feature_daily"), t("feature_chat"), t("feature_basic_sync")],
      product: "monthly",
      featured: false,
      icon: <Zap className="w-5 h-5" />,
      gradient: "from-blue-500/30 to-purple-600/10",
      glow: "rgba(99, 102, 241, 0.4)",
    },
    {
      id: "annual",
      name: t("plan_annual_name"),
      price: "$4.17",
      period: t("per_month"),
      total: t("plan_annual_total"),
      features: [t("feature_karma_20"), t("feature_blueprint"), t("feature_daily"), t("feature_chat"), t("feature_adv_sync"), t("feature_priority"), t("feature_forecast")],
      product: "annual",
      featured: true,
      icon: <Crown className="w-5 h-5" />,
      gradient: "from-gold/40 to-amber-600/10",
      glow: "rgba(212, 175, 55, 0.5)",
    },
  ];

  return (
    <main className="relative min-h-[100dvh] w-full bg-[#06050e] overflow-hidden flex flex-col items-center py-12 px-4 sm:px-6">
      <CosmicParticles />
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent blur-[100px]" />
        <div className="absolute bottom-[5%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/6 via-transparent to-transparent blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gold/80 transition-colors text-xs font-sans tracking-widest uppercase mb-10">
          <ArrowLeft className="w-3.5 h-3.5" /> {t("back_home")}
        </Link>

        {/* Checkout-resume banner (purchase intent recovered after login) */}
        <AnimatePresence>
          {pendingProduct && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/[0.06] px-5 py-4 backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-gold flex-shrink-0" />
                <p className="text-gold/90 text-sm font-sans">{t("continue_checkout_msg")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={resumeCheckout}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-gold to-amber-400 text-black font-sans font-bold text-xs whitespace-nowrap hover:brightness-110 transition">
                  {t("continue_checkout_btn")} <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={dismissResume}
                  className="px-3 py-2 rounded-xl text-gray-500 hover:text-gray-300 text-xs font-sans transition">
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-5">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}><Moon className="w-5 h-5 text-purple-400/60" /></motion.div>
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}><Sparkles className="w-6 h-6 text-gold/80" /></motion.div>
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}><Sun className="w-5 h-5 text-amber-400/60" /></motion.div>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/50 leading-tight mb-5">{t("title")}</h1>
          <p className="font-sans text-gray-500 max-w-xl mx-auto text-sm sm:text-base">{t("subtitle")}</p>
        </motion.div>

        {/* 2 Plans Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto items-stretch">
          {plans.map((plan, idx) => (
            <motion.div key={plan.id}
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: idx * 0.15 }}
              className={`relative flex flex-col ${plan.featured ? 'sm:-mt-4' : ''}`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30">
                  <div className="flex items-center gap-1.5 px-5 py-1.5 bg-gradient-to-r from-gold via-amber-400 to-gold rounded-full shadow-[0_0_30px_rgba(212,175,55,0.5)]">
                    <Crown className="w-3 h-3 text-black" />
                    <span className="text-[9px] font-sans font-black tracking-[0.2em] text-black uppercase">BEST VALUE</span>
                  </div>
                </div>
              )}
              <div className={`relative rounded-[28px] p-[1px] h-full ${plan.featured ? 'bg-gradient-to-b from-gold/50 via-gold/15 to-gold/5 shadow-[0_0_50px_rgba(212,175,55,0.2)]' : 'bg-gradient-to-b from-white/8 via-white/3 to-transparent'}`}>
                <div className={`relative flex flex-col h-full rounded-[27px] overflow-hidden bg-gradient-to-b ${plan.gradient} backdrop-blur-xl`}>
                  <div className="absolute inset-0 bg-[#0a0918]/85 rounded-[27px]" />
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="px-6 pt-7 pb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${plan.featured ? 'bg-gold/15 text-gold' : 'bg-white/5 text-gray-500'}`}>{plan.icon}</div>
                      <h3 className={`font-serif text-xl ${plan.featured ? 'text-gold' : 'text-white/90'}`}>{plan.name}</h3>
                    </div>
                    <div className="px-6 pb-4">
                      <div className="flex items-baseline gap-1">
                        <span className={`font-serif text-[42px] font-bold leading-none ${plan.featured ? 'text-transparent bg-clip-text bg-gradient-to-b from-gold to-amber-300' : 'text-white'}`}>{plan.price}</span>
                        <span className="text-gray-600 text-xs font-sans">{plan.period}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-gray-500 text-[11px] font-sans">{plan.total}</span>
                      </div>
                      {/* Price framing — makes $4.17/mo feel trivially small */}
                      {plan.featured && (
                        <p className="mt-1.5 text-gold/60 text-[11px] font-sans">☕ {t("annual_framing")}</p>
                      )}
                    </div>
                    <div className="mx-6 h-[1px] bg-gradient-to-r from-transparent via-white/6 to-transparent" />
                    <div className="px-6 pt-5 pb-2 flex-1">
                      <ul className="space-y-3">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2.5">
                            <div className={`w-4 h-4 mt-[1px] rounded-full flex items-center justify-center flex-shrink-0 ${plan.featured ? 'bg-gold/15 text-gold' : 'bg-white/[0.04] text-gray-500'}`}>
                              <Check className="w-2.5 h-2.5" strokeWidth={3} />
                            </div>
                            <span className="text-[13px] font-sans text-gray-400">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="px-6 pb-7 pt-4">
                      <button type="button" onClick={() => handleCheckout(plan.product)}
                        className={`relative w-full py-3.5 rounded-xl font-sans font-bold text-sm tracking-wider transition-all duration-500 transform-gpu active:scale-95 overflow-hidden flex items-center justify-center ${
                          plan.featured
                            ? 'bg-gradient-to-r from-gold via-amber-400 to-gold text-black shadow-[0_4px_25px_rgba(212,175,55,0.35)] hover:shadow-[0_4px_40px_rgba(212,175,55,0.6)] hover:scale-[1.02]'
                            : 'bg-white/[0.04] text-white/80 border border-white/[0.06] hover:bg-white/[0.08]'
                        }`}
                      >
                        {plan.featured && (
                          <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                            animate={{ x: ["-100%", "200%"] }}
                            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                          />
                        )}
                        <span className="relative z-10">{t("select_plan")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Single Report Card */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="max-w-3xl mx-auto mt-8">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400"><FileText className="w-5 h-5" /></div>
              <div>
                <h3 className="font-serif text-white text-lg">{t("single_title")}</h3>
                <p className="text-gray-500 text-sm font-sans">{t("single_desc")}</p>
              </div>
            </div>
            <button type="button" onClick={() => handleCheckout('single')}
              className="px-6 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 font-sans font-bold text-sm hover:bg-purple-500/20 transition-colors whitespace-nowrap">
              {t("single_cta")}
            </button>
          </div>
        </motion.div>

        {/* Trust Bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 mt-16">
          {[
            { icon: <Shield className="w-3.5 h-3.5" />, text: t("trust_secure") },
            { icon: <Zap className="w-3.5 h-3.5" />, text: t("trust_instant") },
            { icon: <Eye className="w-3.5 h-3.5" />, text: t("trust_cancel") },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2 text-[11px] font-sans tracking-widest text-gray-600 uppercase">
              {item.icon}<span>{item.text}</span>
            </div>
          ))}
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="text-center text-gray-700 text-xs font-sans mt-10 mb-6">{t("guarantee_text")}</motion.p>
      </div>

      {/* Login gate — a purchase needs an account so the webhook can activate it */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => setAuthOpen(false)}
        redirectTo="/pricing"
      />

      {/* Success pill — purchase confirmed, routing to the unlocked content */}
      <AnimatePresence>
        {purchaseConfirmed && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 px-5 py-3 rounded-full bg-black/85 border border-gold/60 backdrop-blur-md shadow-[0_0_30px_rgba(212,175,55,0.35)]"
          >
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-gold text-sm font-sans font-medium">{t("purchase_success")}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Confirming your purchase" pill while polling for the webhook */}
      <AnimatePresence>
        {checkingUnlock && !purchaseConfirmed && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 px-5 py-3 rounded-full bg-black/85 border border-gold/30 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.6)]"
          >
            <RefreshCw className="w-4 h-4 text-gold animate-spin" />
            <span className="text-gold/90 text-sm font-sans">{t("checking_purchase")}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
