"use client";

import React from "react";

interface MeClientProps {
  locale: string;
}

export default function MeClient({ locale }: MeClientProps) {
  return (
    <div className="w-full max-w-md flex flex-col items-center">
      {/* Summary Card */}
      <div className="w-full bg-white rounded-3xl p-6 shadow-sm border border-[#FFD9E0]/40 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🌿</span>
          <span className="text-xs font-bold text-[#FF5C77] bg-[#FFD9E0]/30 px-3 py-1 rounded-full">
            타고난 본질 에너지
          </span>
        </div>
        <h2 className="text-xl font-bold text-[#2B2430] mb-2">
          곧고 푸른 나무의 기운
        </h2>
        <p className="text-sm text-[#8A8291] leading-relaxed">
          겉으로는 차분하고 흔들림 없어 보이지만, 내면에는 끝없이 더 나은 방향으로 자라나고자 하는 맑고 곧은 성장의 힘을 품고 있습니다.
        </p>
      </div>

      {/* Trait Chips */}
      <div className="w-full grid grid-cols-2 gap-3 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/30 text-center">
          <span className="text-2xl mb-1 block">🎯</span>
          <p className="text-xs font-bold text-[#2B2430]">깊은 통찰력</p>
          <p className="text-[11px] text-[#8A8291] mt-0.5">상황의 본질을 꿰뚫는 눈</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/30 text-center">
          <span className="text-2xl mb-1 block">🤝</span>
          <p className="text-xs font-bold text-[#2B2430]">신뢰와 책임감</p>
          <p className="text-[11px] text-[#8A8291] mt-0.5">한 번 맺은 인연을 소중히</p>
        </div>
      </div>

      {/* CTA Button */}
      <a
        href={`/${locale}/compat/new`}
        className="w-full bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] hover:opacity-95 active:scale-[0.99] text-white text-center py-4 rounded-xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <span>우리, 얼마나 잘 맞을까? 궁합 보러가기 💖</span>
      </a>
    </div>
  );
}
