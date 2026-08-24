"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/routing";
import { Heart, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import KongdakMascot from "@/components/KongdakMascot";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

/**
 * 콩닥 Phase A 대시보드 — 로그인 직후 착지 지점.
 *
 * 궁합 기록은 아직 계정에 묶이지 않는다(Compatibility.userId 가 비회원 생성 흐름에서
 * 채워지지 않음). 그래서 목록 대신 "다음 행동"만 제시한다. 기록 목록은 userId 연결이
 * 붙는 시점에 이 자리에 추가한다.
 */
export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const { data: session } = useSession();

  const firstName = session?.user?.name?.split(" ")[0] || t("guest_name");

  return (
    <main className="min-h-[70vh] w-full bg-background px-4 sm:px-6 py-10 sm:py-14">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-3xl mx-auto"
      >
        {/* Greeting */}
        <motion.div variants={itemVariants} className="flex items-center gap-4 mb-8">
          <KongdakMascot size={56} animate="none" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-ink">
              {t("welcome", { name: firstName })}
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">{t("subtitle")}</p>
          </div>
        </motion.div>

        {/* Primary action — new compatibility reading */}
        <motion.div variants={itemVariants}>
          <Link href="/compat/new" className="block group">
            <div className="rounded-3xl bg-gradient-to-br from-coral-light via-coral to-plum p-6 sm:p-8 text-white shadow-lg shadow-coral/25 border border-white/30">
              <div className="flex items-center gap-2 text-white/90 text-xs font-bold mb-3">
                <Sparkles className="w-4 h-4" />
                <span>{t("cta_badge")}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2">
                {t("cta_title")}
              </h2>
              <p className="text-sm text-white/85 leading-relaxed mb-5">
                {t("cta_desc")}
              </p>
              <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2.5 text-sm font-bold border border-white/25">
                <Heart className="w-4 h-4 fill-white" />
                {t("cta_button")}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>
        </motion.div>

        {/* History placeholder */}
        <motion.div
          variants={itemVariants}
          className="mt-6 rounded-3xl bg-white border border-[#FFD9E0]/50 p-6 sm:p-8 shadow-sm"
        >
          <h3 className="text-base font-bold text-ink mb-1.5">{t("history_title")}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{t("history_desc")}</p>
        </motion.div>

        {/* Guide link */}
        <motion.div variants={itemVariants} className="mt-6">
          <Link
            href="/guide"
            className="flex items-center justify-between rounded-2xl bg-white border border-[#2B2430]/8 px-5 py-4 shadow-sm hover:border-coral/40 hover:bg-coral/[0.03] transition-colors group"
          >
            <span className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-coral" />
              <span className="text-sm font-semibold text-ink">{t("guide_link")}</span>
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 group-hover:text-coral transition-all" />
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
