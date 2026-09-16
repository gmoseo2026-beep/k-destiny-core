"use client";

import React from "react";
import { Heart, ArrowRight } from "lucide-react";
import Link from "next/link";
import KongdakMascot from "@/components/KongdakMascot";

interface KongdakHeroProps {
  locale: string;
}

export default function KongdakHero({ locale }: KongdakHeroProps) {
  return (
    <div className="relative min-h-[85vh] w-full flex flex-col lg:flex-row items-center justify-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto py-10 lg:py-14 gap-10 lg:gap-16 pt-20 sm:pt-24">
      {/* Background Ambient Glow (Restrained & Soft) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FF5C77]/10 via-transparent to-transparent rounded-full blur-[80px] pointer-events-none -z-10" />

      {/* Left Column: Text & CTA */}
      <div className="flex-1 flex flex-col items-center lg:items-start w-full z-10 text-center lg:text-left">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white border border-[#FFD9E0] shadow-2xs mb-5">
          <span className="text-xs font-bold text-[#6A2C70] tracking-tight">
            30초 사주 케미 분석 · 콩닥
          </span>
        </div>

        {/* Main Headline (Clean 1-point coral accent) */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-[#2B2430] leading-[1.15] mb-5">
          우리,{" "}
          <br className="hidden lg:block" />
          <span className="text-[#FF5C77]">
            얼마나 잘 맞을까?
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-sm sm:text-base lg:text-lg text-[#6A5E72] font-medium max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
          복잡한 한자 없이 다정하게 풀어내는 진짜 사주 궁합.
          <br className="hidden sm:block" />
          두 사람의 생년월일만 넣으면 30초 만에 확인 완료.
        </p>

        {/* Action Buttons (0.15s standard transition & active scale 0.97) */}
        <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center lg:items-start gap-2.5">
          <Link
            href={`/${locale}/compat/new`}
            className="w-full bg-[#FF5C77] hover:bg-[#ff4766] active:scale-[0.97] text-white py-4 px-7 rounded-2xl font-bold text-base sm:text-lg shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all duration-150 flex items-center justify-center gap-2 group"
          >
            <Heart className="w-5 h-5 fill-white text-white group-hover:scale-105 transition-transform duration-150" />
            <span>우리 궁합 무료로 보기</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-150" />
          </Link>
          <p className="text-[11px] text-[#8A8291] font-medium">
            회원가입 없이 30초면 바로 확인 가능해요
          </p>

          <Link
            href={`/${locale}/fortune/annual`}
            className="w-full bg-white hover:bg-[#FFF6F1] border border-[#FF8AA1]/70 active:scale-[0.97] text-[#FF5C77] py-3 px-6 rounded-2xl font-bold text-sm sm:text-base shadow-2xs transition-all duration-150 flex items-center justify-center gap-2 group mt-1"
          >
            <span>2026 나의 총운 미리보기</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-150" />
          </Link>
        </div>
      </div>

      {/* Right Column: Mascot & Clean Preview Card Mockup */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10 mt-6 lg:mt-0">
        {/* Kongdak Mascot (renders immediately, zero LCP delay) */}
        <div className="mb-[-18px] lg:mb-[-24px] z-20">
          <KongdakMascot size={130} animate="none" priority={true} />
        </div>

        {/* Clean, Refined Preview Card */}
        <div className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-6 sm:p-7 text-[#2B2430] shadow-[0_8px_32px_rgba(43,36,48,0.08)] border border-[#FFD9E0]/80 relative overflow-hidden">
          <div className="flex items-center justify-between text-[#6A5E72] text-xs sm:text-sm font-bold mb-4">
            <span>나 · 상대방</span>
            <span className="bg-[#FFF6F1] text-[#FF5C77] border border-[#FFD9E0] px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              콩닥 궁합 리포트
            </span>
          </div>

          <div className="flex items-baseline justify-center gap-1 my-3">
            <span className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-[#FF5C77]">
              91
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-[#FFC24B]">점</span>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {["천생연분", "기운 찰떡궁합", "떨어질 수 없는 케미"].map((tag, idx) => (
              <span
                key={idx}
                className="bg-[#FFF6F1] text-[#6A2C70] px-3 py-1 rounded-full text-xs font-bold border border-[#FFD9E0] shadow-2xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
