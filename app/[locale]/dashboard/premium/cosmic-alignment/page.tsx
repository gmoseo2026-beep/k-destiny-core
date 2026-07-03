"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/routing";
import {
  Sparkles, Compass, Loader2, ShieldAlert,
  CheckCircle2, Sun, Lock, Crown
} from "lucide-react";

const priorities = [
  { key: "p1", icon: "🎯", gradient: "from-gold/15 to-amber-600/5", border: "border-gold/20" },
  { key: "p2", icon: "💡", gradient: "from-green-500/15 to-emerald-600/5", border: "border-green-500/20" },
  { key: "p3", icon: "❤️", gradient: "from-pink-500/15 to-rose-600/5", border: "border-pink-500/20" },
];

function PremiumPaywall() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6"
    >
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/10 border-2 border-indigo-400/40 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.3)]">
          <Lock className="w-10 h-10 text-indigo-300" />
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-indigo-400/10 border-dashed"
        />
      </div>
      <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-4">
        Premium Content Locked
      </h2>
      <p className="font-sans text-gray-400 text-sm sm:text-base max-w-md mb-8 leading-relaxed">
        Unlock the Cosmic Alignment guide to access your daily prioritization matrix, manifestation compass, and energy forecasts. Upgrade to Premium for full access.
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

export default function CosmicAlignmentPage() {
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-sans uppercase tracking-widest font-bold text-gold bg-gold/10 border border-gold/20 px-3 py-1 rounded-full">{t("badge_premium")}</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-2">{t("alignment_title")}</h1>
        <p className="font-sans text-gray-400 text-sm sm:text-base max-w-2xl">{t("alignment_subtitle")}</p>
      </div>

      {/* Today's Cosmic Weather */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-blue-950/30 backdrop-blur-xl border border-indigo-500/20 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/20">
            <Sun className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-white">{t("alignment_today")}</h2>
            <p className="text-xs text-indigo-300/70 font-sans">{t("alignment_energy_label")}</p>
          </div>
        </div>
        <div className="bg-black/30 rounded-2xl p-5 border border-white/5 mb-4">
          <h3 className="font-serif text-2xl font-bold bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 bg-clip-text text-transparent mb-3">
            {t("alignment_energy_value")}
          </h3>
          <p className="font-sans text-sm text-gray-300 leading-relaxed">{t("alignment_energy_desc")}</p>
        </div>
      </motion.div>

      {/* Priority Matrix */}
      <div>
        <h3 className="font-serif text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Compass className="w-5 h-5 text-gold/70" />
          {t("alignment_priority_title")}
        </h3>
        <div className="space-y-4">
          {priorities.map((p, i) => (
            <motion.div key={p.key} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
              className={`bg-gradient-to-r ${p.gradient} backdrop-blur-xl border ${p.border} rounded-2xl p-5 sm:p-6`}>
              <div className="flex items-start gap-4">
                <span className="text-2xl mt-0.5">{p.icon}</span>
                <div className="flex-1">
                  <p className="font-sans text-xs uppercase tracking-widest text-gray-400 mb-1">{t(`alignment_${p.key}_label`)}</p>
                  <h4 className="font-serif text-lg font-bold text-white mb-2">{t(`alignment_${p.key}_value`)}</h4>
                  <p className="font-sans text-sm text-gray-300">{t(`alignment_${p.key}_desc`)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Manifestation Guide */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="bg-white/[0.03] backdrop-blur-xl border border-emerald-500/15 rounded-2xl p-6">
        <h3 className="font-serif text-lg font-bold text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          {t("alignment_manifest_title")}
        </h3>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-start gap-3 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
              <span className="text-emerald-400 text-xs mt-1 shrink-0">◆</span>
              <p className="font-sans text-sm text-gray-300">{t(`alignment_manifest_${i}`)}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Energies to Avoid */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="bg-red-950/15 backdrop-blur-xl border border-red-500/15 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <h3 className="font-serif text-lg font-bold text-white">{t("alignment_avoid_title")}</h3>
        </div>
        <p className="font-sans text-sm text-gray-300 leading-relaxed">{t("alignment_avoid_desc")}</p>
      </motion.div>

      {/* Generate AI Report Button */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
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
  );
}
