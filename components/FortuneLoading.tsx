"use client";

import React, { useEffect, useState } from "react";
import KongdakMascot from "@/components/KongdakMascot";

export interface FortuneLoadingProps {
  /** 단계별 순환 문구 배열 (2.5초 간격으로 전환) */
  steps: string[];
  /** 90%까지 도달하는 기준 소요 시간(초) - 기본 15초 */
  durationSec?: number;
  /** 마스코트 하단 서브 안내 문구 */
  subMessage?: string;
  /** 화면별 스켈레톤 프리뷰 스타일 */
  skeletonVariant?: "annual" | "deep-report" | "weekly";
  className?: string;
}

export default function FortuneLoading({
  steps,
  durationSec = 15,
  subMessage = "사주 기운을 심층 분석하고 있어요",
  skeletonVariant = "annual",
  className = "",
}: FortuneLoadingProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    if (!steps.length) return;

    // 2.5초 간격으로 단계별 문구 순환
    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 2500);

    // durationSec 동안 12%에서 90%까지 부드럽게 점진 증가 (감속 곡선)
    const startTime = Date.now();
    const totalMs = Math.max(3000, durationSec * 1000);

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(1, elapsed / totalMs);
      const targetProgress = 12 + (90 - 12) * Math.sin((ratio * Math.PI) / 2);
      setProgress(targetProgress);
    }, 150);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [steps, durationSec]);

  return (
    <div className={`w-full max-w-md md:max-w-2xl flex flex-col items-center justify-center py-6 sm:py-10 gap-6 ${className}`}>
      {/* 1. 마스코트 & 단계별 문구 */}
      <div className="flex flex-col items-center text-center px-4">
        <KongdakMascot size={76} animate="bounce" />
        <h2 className="mt-4 text-base sm:text-lg font-black text-[#2B2430] min-h-[28px] flex items-center justify-center transition-all duration-300">
          {steps[stepIndex] || "분석을 진행하는 중…"}
        </h2>
        <p className="text-xs text-[#8A8291] mt-1 font-medium">
          {subMessage}
        </p>

        {/* 2. 진행 바 */}
        <div className="w-64 sm:w-80 mt-4">
          <div className="w-full bg-[#FFF6F1] border border-[#FFD9E0] h-2.5 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.round(progress)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-[#8A8291] mt-1.5 font-bold px-0.5">
            <span>운세 리포트 분석 중</span>
            <span className="text-[#FF5C77] font-extrabold">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* 3. 화면별 스켈레톤 프리뷰 카드 */}
      <div className="w-full flex flex-col gap-4 animate-pulse pointer-events-none mt-1 px-1">
        {skeletonVariant === "annual" && (
          <>
            {/* 총운 히어로 스켈레톤 */}
            <div className="relative bg-gradient-to-br from-[#FFD9E0]/40 via-[#FFF6F1] to-[#EAD4ED]/30 rounded-3xl p-6 sm:p-8 border border-[#FFD9E0]/60 flex flex-col items-center gap-3 shadow-xs">
              <div className="w-36 h-5 bg-gray-200/80 rounded-full" />
              <div className="w-52 h-7 bg-gray-200/90 rounded-xl mt-1" />
              <div className="w-28 h-16 bg-gray-200 rounded-2xl my-2" />
              <div className="w-40 h-6 bg-gray-200/70 rounded-full" />
              <div className="w-full h-16 bg-gray-200/60 rounded-2xl mt-2" />
            </div>

            {/* 총운 섹션 스켈레톤 2개 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="w-32 h-5 bg-gray-200/80 rounded-lg" />
                <div className="w-16 h-5 bg-gray-200/60 rounded-full" />
              </div>
              <div className="w-full h-12 bg-gray-100 rounded-xl" />
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="w-32 h-5 bg-gray-200/80 rounded-lg" />
                <div className="w-16 h-5 bg-gray-200/60 rounded-full" />
              </div>
              <div className="w-full h-12 bg-gray-100 rounded-xl" />
            </div>
          </>
        )}

        {skeletonVariant === "deep-report" && (
          <>
            {/* 심층 리포트 헤더 스켈레톤 */}
            <div className="bg-gradient-to-br from-[#FFF6F1] to-[#FFD9E0]/40 rounded-2xl p-5 sm:p-6 border border-[#FF8AA1]/40 flex flex-col gap-3 shadow-xs">
              <div className="w-24 h-4 bg-gray-200 rounded-full" />
              <div className="w-48 h-6 bg-gray-300 rounded-lg" />
              <div className="w-full h-12 bg-white/70 rounded-xl mt-1" />
            </div>

            {/* 갈등 포인트 & 조언 스켈레톤 3개 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-200 rounded-full" />
                <div className="w-36 h-5 bg-gray-200 rounded-md" />
              </div>
              <div className="w-full h-14 bg-gray-100 rounded-xl" />
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-200 rounded-full" />
                <div className="w-36 h-5 bg-gray-200 rounded-md" />
              </div>
              <div className="w-full h-14 bg-gray-100 rounded-xl" />
            </div>
          </>
        )}

        {skeletonVariant === "weekly" && (
          <>
            {/* 주간 총평 스켈레톤 */}
            <div className="bg-gradient-to-br from-[#FF8AA1]/60 to-[#FF5C77]/60 p-6 rounded-3xl shadow-xs text-white flex flex-col gap-3">
              <div className="w-32 h-6 bg-white/50 rounded-lg" />
              <div className="w-full h-12 bg-white/40 rounded-xl" />
            </div>

            {/* 주간 2열 그리드 스켈레톤 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-2">
                <div className="w-24 h-5 bg-gray-200 rounded-md" />
                <div className="w-full h-12 bg-gray-100 rounded-xl" />
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-2">
                <div className="w-24 h-5 bg-gray-200 rounded-md" />
                <div className="w-full h-12 bg-gray-100 rounded-xl" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
