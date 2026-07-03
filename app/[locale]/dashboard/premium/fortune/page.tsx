"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/routing";
import { Sparkles, Loader2, Flame, Droplets, TreePine, Mountain, Lock, Crown } from "lucide-react";
import SajuDataGatekeeper from "@/components/SajuDataGatekeeper";

function PremiumPaywall() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/10 border-2 border-orange-400/40 flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.3)]">
          <Lock className="w-10 h-10 text-orange-300" />
        </div>
      </div>
      <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-4">Premium Content Locked</h2>
      <p className="font-sans text-gray-400 text-sm sm:text-base max-w-md mb-8 leading-relaxed">
        Unlock the 2027 Fortune Prediction to see your year&apos;s major cosmic shifts, turning points, and opportunities.
      </p>
      <Link href="/pricing">
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl font-sans font-bold text-lg bg-gradient-to-r from-[#D4AF37] via-[#FFF5C3] to-[#D4AF37] text-background shadow-[0_0_30px_rgba(212,175,55,0.4)]">
          <Crown className="w-5 h-5" />Upgrade to Premium
        </motion.button>
      </Link>
    </motion.div>
  );
}

const quarters = [
  { key: "q1", icon: <Droplets className="w-5 h-5" />, color: "text-blue-400", bg: "from-blue-500/15 to-cyan-600/5", border: "border-blue-500/20", dot: "bg-blue-400" },
  { key: "q2", icon: <TreePine className="w-5 h-5" />, color: "text-green-400", bg: "from-green-500/15 to-emerald-600/5", border: "border-green-500/20", dot: "bg-green-400" },
  { key: "q3", icon: <Mountain className="w-5 h-5" />, color: "text-amber-400", bg: "from-amber-500/15 to-yellow-600/5", border: "border-amber-500/20", dot: "bg-amber-400" },
  { key: "q4", icon: <Flame className="w-5 h-5" />, color: "text-red-400", bg: "from-red-500/15 to-orange-600/5", border: "border-red-500/20", dot: "bg-red-400" },
];

export default function Fortune2027Page() {
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

  return (
    <SajuDataGatekeeper>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-sans uppercase tracking-widest font-bold text-gold bg-gold/10 border border-gold/20 px-3 py-1 rounded-full">{t("badge_premium")}</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-2">{t("fortune_title")}</h1>
        <p className="font-sans text-gray-400 text-sm sm:text-base max-w-2xl">{t("fortune_subtitle")}</p>
      </div>

      {/* Year Theme */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="relative bg-gradient-to-br from-orange-950/30 via-red-950/20 to-amber-950/30 backdrop-blur-xl border border-orange-500/20 rounded-3xl p-6 sm:p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <p className="text-xs font-sans uppercase tracking-widest text-orange-300/60 mb-2">{t("fortune_year_theme")}</p>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-300 via-red-300 to-amber-300 bg-clip-text text-transparent mb-4">
          {t("fortune_year_theme_value")}
        </h2>
        <p className="font-sans text-sm sm:text-base text-gray-300 leading-relaxed relative z-10">{t("fortune_year_desc")}</p>
      </motion.div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/40 via-green-500/40 via-amber-500/40 to-red-500/40" />

        <div className="space-y-6">
          {quarters.map((q, i) => (
            <motion.div key={q.key} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.15 }}
              className="relative pl-16 sm:pl-20">
              {/* Timeline Dot */}
              <div className={`absolute left-[18px] sm:left-[26px] top-6 w-4 h-4 rounded-full ${q.dot} shadow-[0_0_12px_currentColor] border-2 border-background z-10`} />

              <div className={`bg-gradient-to-r ${q.bg} backdrop-blur-xl border ${q.border} rounded-2xl p-5 sm:p-6`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${q.color}`}>{q.icon}</div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-white">{t(`fortune_${q.key}_title`)}</h3>
                    <p className={`text-xs font-sans font-bold uppercase tracking-widest ${q.color} mt-0.5`}>{t(`fortune_${q.key}_theme`)}</p>
                  </div>
                </div>
                <p className="font-sans text-sm text-gray-300 leading-relaxed">{t(`fortune_${q.key}_desc`)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Generate Button */}
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
