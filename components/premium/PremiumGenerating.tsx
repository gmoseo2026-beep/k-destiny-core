"use client";

import React, { useEffect, useState } from "react";

const STEPS = [
  { step: 1, label: "기운 계산", desc: "타고난 기운과 10년 흐름을 계산하고 있어요..." },
  { step: 2, label: "큰 흐름 도출", desc: "인생 10년의 지도와 중심 기운 해석 중..." },
  { step: 3, label: "세부 풀이", desc: "분야별 맞춤 가이드 및 월별 흐름 생성 중..." },
  { step: 4, label: "마무리", desc: "품격 있는 프리미엄 리포트 제본 중..." },
];

interface PremiumGeneratingProps {
  onTimeout?: () => void;
}

export function PremiumGenerating({ onTimeout }: PremiumGeneratingProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1;
        if (next === 180 && onTimeout) {
          onTimeout();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeout]);

  const currentStep = seconds < 10 ? 1 : seconds < 35 ? 2 : seconds < 75 ? 3 : 4;

  const progressPercent = Math.min(Math.round((seconds / 100) * 100), 96);

  return (
    <div className="py-16 px-6 max-w-md mx-auto text-center">
      {/* Animated glowing gem */}
      <div className="relative w-24 h-24 mx-auto mb-8">
        <div className="absolute inset-0 rounded-full bg-[#D9B26A]/20 blur-xl animate-pulse" />
        <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#F3E3BF] via-[#D9B26A] to-[#A8823C] p-0.5 shadow-2xl flex items-center justify-center">
          <div className="w-full h-full bg-[#14101A] rounded-2xl flex items-center justify-center">
            <span className="font-serif-kr text-3xl font-bold premium-gold-text animate-pulse">
              콩닥
            </span>
          </div>
        </div>
      </div>

      <h2 className="font-serif-kr text-2xl font-bold text-[#F6F1EA] mb-2">
        프리미엄 리포트를 준비하고 있어요
      </h2>
      <p className="text-sm text-[#B9AEC4] mb-8">
        방대한 생애 데이터를 정밀하게 대조하여 고유한 리포트를 짓고 있습니다.
      </p>

      {/* Progress bar */}
      <div className="w-full bg-[#1E1726] rounded-full h-2 mb-8 border border-[#3A2E45]/80 overflow-hidden">
        <div
          className="bg-gradient-to-r from-[#D9B26A] via-[#F3E3BF] to-[#D9B26A] h-2 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-4 text-left">
        {STEPS.map((s) => {
          const isDone = s.step < currentStep;
          const isCurrent = s.step === currentStep;

          return (
            <div
              key={s.step}
              className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                isCurrent
                  ? "bg-[#1E1726] border border-[#D9B26A]/40 shadow-md"
                  : isDone
                  ? "opacity-60"
                  : "opacity-30"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                  isDone
                    ? "bg-[#D9B26A] text-[#14101A]"
                    : isCurrent
                    ? "border-2 border-[#D9B26A] text-[#F3E3BF] animate-pulse"
                    : "border border-[#3A2E45] text-[#B9AEC4]"
                }`}
              >
                {isDone ? "✓" : s.step}
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#F6F1EA]">
                    {s.label}
                  </span>
                  {isCurrent && (
                    <span className="text-xs text-[#D9B26A] font-mono animate-pulse">
                      진행 중...
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#B9AEC4] mt-0.5">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[#B9AEC4]/60 mt-8">
        화면을 닫거나 새로고침해도 결제하신 리포트는 언제든 안전하게 보관됩니다.
      </p>
    </div>
  );
}
