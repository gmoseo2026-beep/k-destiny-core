"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  Compass,
  Calendar,
  Sparkles,
  MessageCircle,
  Heart,
  Settings,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Crown,
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
  { icon: Compass, color: "from-purple-500 to-violet-600", borderColor: "border-purple-500/30", bgColor: "bg-purple-500/10" },
  { icon: Calendar, color: "from-blue-500 to-cyan-600", borderColor: "border-blue-500/30", bgColor: "bg-blue-500/10" },
  { icon: Sparkles, color: "from-gold to-amber-600", borderColor: "border-gold/30", bgColor: "bg-gold/10" },
  { icon: MessageCircle, color: "from-emerald-500 to-green-600", borderColor: "border-emerald-500/30", bgColor: "bg-emerald-500/10" },
  { icon: Heart, color: "from-rose-500 to-pink-600", borderColor: "border-rose-500/30", bgColor: "bg-rose-500/10" },
  { icon: Settings, color: "from-gray-400 to-gray-600", borderColor: "border-gray-500/30", bgColor: "bg-gray-500/10" },
];

export default function GuidePage() {
  const t = useTranslations("Guide");

  return (
    <main className="relative min-h-[100dvh] w-full bg-background overflow-hidden flex flex-col items-center py-16 px-4 sm:px-6">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-stardust opacity-20 mix-blend-screen" />
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-dark/20 via-transparent to-transparent blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-10"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-gold" />
              <span className="text-sm font-sans tracking-widest text-gold/90 uppercase">
                {t("badge")}
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                {t("title")}
              </span>
            </h1>
            <p className="font-sans text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
              {t("subtitle")}
            </p>
          </motion.div>

          {/* Steps */}
          <div className="space-y-6">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const stepNum = idx + 1;
              const titleKey = `step${stepNum}_title` as keyof typeof t;
              const descKey = `step${stepNum}_desc` as keyof typeof t;

              return (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className={`relative bg-white/[0.03] backdrop-blur-2xl border ${step.borderColor} rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)] hover:bg-white/[0.05] transition-colors group`}
                >
                  <div className="flex items-start gap-5">
                    {/* Step Number & Icon */}
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${step.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white/90" />
                      </div>
                      <span className="text-[10px] font-mono text-gold/50 tracking-widest">
                        {String(stepNum).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="font-serif text-xl sm:text-2xl text-white font-bold mb-2 group-hover:text-gold transition-colors">
                        {t(`step${stepNum}_title`)}
                      </h3>
                      <p className="font-sans text-gray-400 text-sm sm:text-base leading-relaxed">
                        {t(`step${stepNum}_desc`)}
                      </p>
                    </div>
                  </div>

                  {/* Connector line to next step */}
                  {idx < steps.length - 1 && (
                    <div className="absolute -bottom-6 left-[29px] sm:left-[33px] w-px h-6 bg-gradient-to-b from-white/10 to-transparent" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Pro Tip Card */}
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-r from-gold/10 to-amber-500/10 backdrop-blur-2xl border border-gold/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(212,175,55,0.1)]"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gold/10 flex-shrink-0">
                <Lightbulb className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-gold font-bold mb-2 flex items-center gap-2">
                  {t("tip_title")}
                  <Crown className="w-4 h-4 text-gold/60" />
                </h3>
                <p className="font-sans text-gold/80 text-sm leading-relaxed">
                  {t("tip_desc")}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row justify-center gap-4 pt-4"
          >
            <Link href="/" className="block">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all font-sans text-sm group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                {t("btn_back")}
              </motion.button>
            </Link>
            <Link href="/select-master" className="block">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto relative flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-sans text-background bg-gradient-to-r from-[#D4AF37] via-[#FFF5C3] to-[#D4AF37] font-bold text-base overflow-hidden transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]"
              >
                <span className="relative z-10">{t("btn_start")}</span>
                <ArrowRight className="relative z-10 w-5 h-5" />
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent z-0 w-1/2"
                />
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
