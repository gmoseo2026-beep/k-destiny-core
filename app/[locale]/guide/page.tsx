"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  Calendar,
  Heart,
  Share2,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Sparkles,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const steps = [
  { icon: Calendar, tint: "bg-coral/10", iconColor: "text-coral" },
  { icon: Heart, tint: "bg-plum/10", iconColor: "text-plum" },
  { icon: Share2, tint: "bg-gold/15", iconColor: "text-[#C98A0E]" },
];

export default function GuidePage() {
  const t = useTranslations("Guide");

  return (
    <main className="relative min-h-[100dvh] w-full bg-background flex flex-col items-center py-12 sm:py-16 px-4 sm:px-6">
      {/* Soft ambient glow — 콩닥 코랄 톤 */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-coral-light/20 via-transparent to-transparent blur-[100px] pointer-events-none"
      />

      <div className="relative z-10 w-full max-w-2xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#FFD9E0] shadow-sm mb-5">
              <Sparkles className="w-4 h-4 text-coral" />
              <span className="text-xs font-extrabold text-plum tracking-wide">
                {t("badge")}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-ink mb-3">
              {t("title")}
            </h1>
            <p className="text-sm sm:text-base text-gray-500 font-medium max-w-lg mx-auto leading-relaxed">
              {t("subtitle")}
            </p>
          </motion.div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const stepNum = idx + 1;

              return (
                <motion.div
                  key={stepNum}
                  variants={itemVariants}
                  className="relative bg-white border border-[#FFD9E0]/60 rounded-3xl p-5 sm:p-7 shadow-sm hover:border-coral/40 transition-colors group"
                >
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <div
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${step.tint} flex items-center justify-center group-hover:scale-105 transition-transform`}
                      >
                        <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${step.iconColor}`} />
                      </div>
                      <span className="text-[10px] font-bold text-coral/50 tracking-widest">
                        {String(stepNum).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 pt-1">
                      <h2 className="text-lg sm:text-xl font-black text-ink mb-1.5">
                        {t(`step${stepNum}_title`)}
                      </h2>
                      <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
                        {t(`step${stepNum}_desc`)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Tip */}
          <motion.div
            variants={itemVariants}
            className="bg-gold/10 border border-gold/40 rounded-3xl p-5 sm:p-7"
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-gold/20 flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-[#C98A0E]" />
              </div>
              <div>
                <h3 className="text-base font-black text-ink mb-1.5">{t("tip_title")}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t("tip_desc")}</p>
              </div>
            </div>
          </motion.div>

          {/* Disclaimer */}
          <motion.p
            variants={itemVariants}
            className="text-center text-xs text-gray-500 leading-relaxed px-4"
          >
            {t("disclaimer")}
          </motion.p>

          {/* Actions */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row justify-center gap-3 pt-2"
          >
            <Link href="/" className="block">
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-[#2B2430]/10 bg-white text-gray-600 hover:text-ink hover:border-coral/40 transition-all text-sm font-semibold group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                {t("btn_back")}
              </button>
            </Link>
            <Link href="/compat/new" className="block">
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white bg-gradient-to-r from-coral-light via-coral to-plum font-bold text-base shadow-lg shadow-coral/30 hover:opacity-95 active:scale-[0.98] transition-all group">
                <Heart className="w-5 h-5 fill-white" />
                <span>{t("btn_start")}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
