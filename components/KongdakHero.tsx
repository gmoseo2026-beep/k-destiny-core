"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Heart, ArrowRight } from "lucide-react";
import Link from "next/link";
import KongdakMascot from "@/components/KongdakMascot";

interface KongdakHeroProps {
  locale: string;
}

export default function KongdakHero({ locale }: KongdakHeroProps) {
  return (
    <div className="relative min-h-[90vh] w-full flex flex-col lg:flex-row items-center justify-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto py-12 gap-12 lg:gap-16">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[600px] h-[340px] sm:h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-coral-light/20 via-transparent to-transparent rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Left Column: Text & CTA */}
      <div className="flex-1 flex flex-col items-center lg:items-start w-full z-10 text-center lg:text-left">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#FFD9E0] shadow-sm mb-6"
        >
          <Sparkles className="w-4 h-4 text-coral" />
          <span className="text-xs sm:text-sm font-extrabold text-plum tracking-wide">
            30초 사주 케미 분석 · 콩닥
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-ink leading-[1.15] mb-6"
        >
          우리,{" "}
          <br className="hidden lg:block" />
          <span className="bg-gradient-to-r from-coral-light via-coral to-plum bg-clip-text text-transparent">
            얼마나 잘 맞을까?
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="text-base sm:text-lg lg:text-xl text-gray-500 font-medium max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed"
        >
          복잡한 한자 없이 다정하게 풀어내는 진짜 사주 궁합.
          <br className="hidden sm:block" />
          두 사람의 생년월일만 넣으면 30초 만에 확인 완료 💖
        </motion.p>

        {/* 1st Primary CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xs sm:max-w-sm flex flex-col items-center lg:items-start gap-3"
        >
          <Link
            href={`/${locale}/compat/new`}
            className="w-full bg-gradient-to-r from-coral-light via-coral to-plum hover:opacity-95 active:scale-[0.98] text-white py-4 sm:py-5 px-8 rounded-2xl font-bold text-base sm:text-lg shadow-lg shadow-coral/30 transition-all flex items-center justify-center gap-2 group"
          >
            <Heart className="w-5 h-5 fill-white text-white group-hover:scale-110 transition-transform" />
            <span>우리 궁합 무료로 보기</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-xs text-gray-500 font-semibold">
            회원가입 없이 30초면 바로 확인 가능해요
          </p>
        </motion.div>
      </div>

      {/* Right Column: Mascot & Preview Card */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10 mt-8 lg:mt-0">
        {/* Kongdak Mascot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-[-20px] lg:mb-[-30px] z-20"
        >
          <KongdakMascot size={140} animate="heartbeat" priority={true} />
        </motion.div>

        {/* Preview Card Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm sm:max-w-md bg-gradient-to-br from-coral-light via-coral to-plum rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-coral/20 border border-white/30 relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-white/90 text-xs sm:text-sm font-bold mb-4">
            <span>나 ❤️ 상대방</span>
            <span className="bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm text-[11px]">콩닥 궁합 리포트</span>
          </div>

          <div className="flex items-baseline justify-center gap-1 my-3">
            <span className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight drop-shadow-md">91</span>
            <span className="text-2xl sm:text-3xl font-bold text-gold">점</span>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {["천생연분", "기운 찰떡궁합", "떨어질 수 없는 케미"].map((tag, idx) => (
              <span
                key={idx}
                className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
