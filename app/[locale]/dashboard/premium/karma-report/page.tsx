"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/routing";
import {
  Sparkles, Calendar, AlertTriangle, Loader2,
  TrendingUp, TrendingDown, Minus, Star, Lock, Crown
} from "lucide-react";
import SajuDataGatekeeper from "@/components/SajuDataGatekeeper";

const elements = [
  { key: "wood", icon: "🌿", color: "from-green-500/20 to-emerald-600/10", border: "border-green-500/30", barColor: "bg-gradient-to-r from-green-500 to-emerald-400", pct: 78, trend: "up" },
  { key: "fire", icon: "🔥", color: "from-red-500/20 to-orange-600/10", border: "border-red-500/30", barColor: "bg-gradient-to-r from-red-500 to-orange-400", pct: 55, trend: "stable" },
  { key: "earth", icon: "🏔️", color: "from-yellow-600/20 to-amber-600/10", border: "border-yellow-600/30", barColor: "bg-gradient-to-r from-yellow-600 to-amber-400", pct: 92, trend: "up" },
  { key: "metal", icon: "⚔️", color: "from-gray-400/20 to-slate-500/10", border: "border-gray-400/30", barColor: "bg-gradient-to-r from-gray-400 to-slate-300", pct: 35, trend: "down" },
  { key: "water", icon: "🌊", color: "from-blue-500/20 to-cyan-600/10", border: "border-blue-500/30", barColor: "bg-gradient-to-r from-blue-500 to-cyan-400", pct: 62, trend: "up" },
];

function PremiumPaywall() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6"
    >
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold/20 to-amber-600/10 border-2 border-gold/40 flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.3)]">
          <Lock className="w-10 h-10 text-gold" />
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-gold/10 border-dashed"
        />
      </div>
      <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-4">
        Premium Content Locked
      </h2>
      <p className="font-sans text-gray-400 text-sm sm:text-base max-w-md mb-8 leading-relaxed">
        Unlock the Monthly Karma Report to discover your elemental energy flow, lucky days, and cosmic warnings. Upgrade to Premium for full access.
      </p>
      <Link href="/pricing">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl font-sans font-bold text-lg tracking-wide bg-gradient-to-r from-[#D4AF37] via-[#FFF5C3] to-[#D4AF37] text-background shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_50px_rgba(212,175,55,0.6)] transition-shadow"
        >
          <Crown className="w-5 h-5" />
          Upgrade to Premium
        </motion.button>
      </Link>
    </motion.div>
  );
}

export default function KarmaReportPage() {
  const t = useTranslations("Premium");
  const { data: session } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);

  const userTier = (session?.user as any)?.tier;
  const userRole = (session?.user as any)?.role;
  const hasAccess = userTier === "PREMIUM" || userRole === "ADMIN";

  if (!hasAccess) {
    return <PremiumPaywall />;
  }

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 3000);
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-yellow-400" />;
  };

  return (
    <SajuDataGatekeeper>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-sans uppercase tracking-widest font-bold text-gold bg-gold/10 border border-gold/20 px-3 py-1 rounded-full">{t("badge_premium")}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-2">{t("karma_title")}</h1>
          <p className="font-sans text-gray-400 text-sm sm:text-base max-w-2xl">{t("karma_subtitle")}</p>
        </div>

        {/* Month Label Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gold/10"><Calendar className="w-6 h-6 text-gold" /></div>
          <div>
            <h2 className="font-serif text-xl font-bold text-white">{t("karma_month_label")}</h2>
            <p className="text-xs text-gray-500 font-sans mt-0.5">{t("karma_element_flow")}</p>
          </div>
        </motion.div>

        {/* Elemental Energy Flow Bars */}
        <div className="space-y-3">
          {elements.map((el, i) => (
            <motion.div key={el.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }}
              className={`bg-gradient-to-r ${el.color} backdrop-blur-xl border ${el.border} rounded-2xl p-5`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{el.icon}</span>
                  <div>
                    <h3 className="font-sans text-sm font-bold text-white">{t(`karma_${el.key}`)}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-sans">{t(`karma_${el.key}_desc`)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-white/80">{el.pct}%</span>
                  <TrendIcon trend={el.trend} />
                </div>
              </div>
              <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${el.pct}%` }} transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                  className={`h-full rounded-full ${el.barColor}`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Lucky Days */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-white/[0.03] backdrop-blur-xl border border-gold/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-5 h-5 text-gold" />
            <h3 className="font-serif text-lg font-bold text-white">{t("karma_lucky_title")}</h3>
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            {t("karma_lucky_days").split(",").map((day, i) => (
              <span key={i} className="px-4 py-2 bg-gold/10 border border-gold/30 rounded-xl font-mono text-sm text-gold font-bold">{day.trim()}</span>
            ))}
          </div>
          <p className="text-sm text-gray-400 font-sans">{t("karma_lucky_desc")}</p>
        </motion.div>

        {/* Energy Warnings */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-red-950/20 backdrop-blur-xl border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="font-serif text-lg font-bold text-white">{t("karma_warning_title")}</h3>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-3 bg-black/30 rounded-xl border border-red-500/10">
                <p className="font-sans text-sm text-gray-300">{t(`karma_warning_${i}`)}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Generate AI Report Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <button onClick={handleGenerate} disabled={isGenerating}
            className="w-full py-4 rounded-2xl font-sans font-bold text-lg tracking-wide transition-all relative overflow-hidden bg-gradient-to-r from-[#D4AF37] via-[#FFF5C3] to-[#D4AF37] text-background shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:shadow-[0_0_50px_rgba(212,175,55,0.5)] disabled:opacity-60 disabled:cursor-not-allowed">
            <div className="relative z-10 flex items-center justify-center gap-3">
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              <span>{isGenerating ? t("btn_generating") : t("btn_generate")}</span>
            </div>
            {!isGenerating && (
              <motion.div initial={{ x: "-100%" }} animate={{ x: "200%" }} transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent z-0 w-1/3" />
            )}
          </button>
        </motion.div>
      </motion.div>
    </SajuDataGatekeeper>
  );
}
