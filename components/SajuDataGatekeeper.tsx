"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { ScrollText, Sparkles, ArrowRight } from "lucide-react";

/**
 * SajuDataGatekeeper
 * 
 * Wraps Premium page content and checks the DB (via API) to see if the
 * current user has a saved UserSajuProfile. If not, renders a beautiful
 * fallback UI prompting the user to enter their birth info first.
 */
export default function SajuDataGatekeeper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<"loading" | "has-data" | "missing">("loading");

  useEffect(() => {
    fetch("/api/user/saju-check", { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.hasSajuData ? "has-data" : "missing");
      })
      .catch(() => {
        // If the check fails (e.g. not logged in), let the existing
        // session/paywall checks handle access control.
        setStatus("has-data");
      });
  }, []);

  // Loading state – subtle skeleton pulse
  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10" />
          <div className="w-48 h-4 rounded-full bg-white/5" />
          <div className="w-32 h-3 rounded-full bg-white/5" />
        </motion.div>
      </div>
    );
  }

  // Data exists – render children (the actual premium content)
  if (status === "has-data") {
    return <>{children}</>;
  }

  // ─── Missing Saju Data Fallback UI ───
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6"
    >
      {/* Animated cosmic icon */}
      <div className="relative mb-10">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-4 rounded-full border border-dashed border-purple-500/20"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-8 rounded-full border border-dashed border-indigo-500/10"
        />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 via-indigo-500/15 to-blue-500/20 border-2 border-purple-400/30 flex items-center justify-center shadow-[0_0_60px_rgba(139,92,246,0.25)]">
          <ScrollText className="w-10 h-10 text-purple-300" />
        </div>
        {/* Floating sparkle particles */}
        <motion.div
          animate={{ y: [-8, 8, -8], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-2 -right-2"
        >
          <Sparkles className="w-4 h-4 text-gold/60" />
        </motion.div>
        <motion.div
          animate={{ y: [6, -6, 6], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute -bottom-1 -left-3"
        >
          <Sparkles className="w-3 h-3 text-indigo-400/60" />
        </motion.div>
      </div>

      {/* Title */}
      <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
        우주적 설계도가 비어있습니다
      </h2>

      {/* Subtitle */}
      <p className="font-sans text-gray-400 text-sm sm:text-base max-w-md mb-10 leading-relaxed">
        정확한 프리미엄 리포트를 생성하려면
        <br />
        사주 정보를 먼저 등록해야 합니다.
      </p>

      {/* CTA Button */}
      <Link href="/dashboard/profile">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-sans font-bold text-lg tracking-wide bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-600 text-white shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_50px_rgba(139,92,246,0.6)] transition-shadow relative overflow-hidden"
        >
          {/* Shimmer effect */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent z-0 w-1/3"
          />
          <ScrollText className="w-5 h-5 relative z-10" />
          <span className="relative z-10">사주 정보 입력하기</span>
          <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </Link>

      {/* Decorative bottom text */}
      <p className="mt-8 text-xs text-gray-600 font-sans">
        생년월일 · 출생시간 · 성별 정보가 필요합니다
      </p>
    </motion.div>
  );
}
