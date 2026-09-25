"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Heart, AlertCircle } from "lucide-react";
import {
  PremiumShell,
  PremiumCover,
  PremiumToc,
  PremiumChapter,
  PremiumBadge,
  PrintButton,
} from "@/components/premium";
import type { PremiumNamingReportContent } from "@/lib/premium/generateNaming";
import { ELEMENT_WORD, type Element } from "@/lib/premium/ganzhi";
import { LUCKY_81 } from "@/lib/premium/naming/rules";

interface NamingReportProps {
  reportId: string;
  content: PremiumNamingReportContent;
  targetName?: string;
  createdAt?: string;
}

function getLuckLabel(num: number): string {
  return LUCKY_81.has(num) ? "아주 좋은 수" : "좋은 수";
}

function getStrokeYinYang(strokes: { s: number; g1: number; g2: number }): string {
  return [
    strokes.s % 2 === 1 ? "양" : "음",
    strokes.g1 % 2 === 1 ? "양" : "음",
    strokes.g2 % 2 === 1 ? "양" : "음",
  ].join(" · ");
}

function getSoundElements(soundSeq: Element[]): string {
  return soundSeq.map((e) => ELEMENT_WORD[e] ?? e).join(" → ");
}

export function NamingReport({
  reportId,
  content,
  targetName = "아이",
  createdAt,
}: NamingReportProps) {
  const { engine, sections } = content;
  const { names, letter } = sections;

  const [expandedNumberIndex, setExpandedNumberIndex] = useState<number | null>(0);

  const dateStr = createdAt
    ? new Date(createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  const tocItems = [
    { id: "sec-01", number: "01", title: "작명의 4대 원칙" },
    { id: "sec-02", number: "02", title: "추천 이름 5선" },
    { id: "sec-03", number: "03", title: "이름의 숫자 (4격 수리표)" },
    { id: "sec-04", number: "04", title: "5선 종합 비교표" },
    { id: "sec-05", number: "05", title: "부모님께 드리는 편지" },
  ];

  const weakestWords = engine.child.weakest.map((e) => ELEMENT_WORD[e] ?? "조화로운").join(", ");

  return (
    <PremiumShell>
      {/* 1. Cover */}
      <PremiumCover
        title="프리미엄 정통 성명학 리포트"
        subtitle="타고난 기운을 온전히 채우는 평생의 첫 선물"
        targetName={targetName}
        dateStr={dateStr}
        reportId={reportId}
      />

      {/* 2. Table of Contents */}
      <PremiumToc items={tocItems} />

      {/* 3. Section 01: Principles */}
      <PremiumChapter
        id="sec-01"
        number="01"
        title="작명의 4대 원칙"
        subtitle="대법원 인명용 한자 원획과 정통 성명학의 철학"
      >
        <div className="space-y-6 text-left">
          {/* Child Energy Focus */}
          <div className="bg-[#14101A] border border-[#D9B26A]/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-[#B9AEC4] block mb-1">
                아이의 타고난 기운
              </span>
              <p className="font-serif-kr text-base sm:text-lg font-bold text-[#F3E3BF]">
                {weakestWords}의 기운을 보완하는 작명
              </p>
            </div>
            <div className="bg-[#1E1726] border border-[#3A2E45] px-3.5 py-1.5 rounded-full text-xs text-[#D9B26A] font-semibold">
              부족한 기운을 채우는 이름
            </div>
          </div>

          {/* Intro Narrative */}
          <div className="bg-[#14101A] border border-[#3A2E45] rounded-2xl p-5 text-xs sm:text-sm text-[#F6F1EA]/90 leading-relaxed whitespace-pre-line space-y-3 font-serif-kr">
            {letter.intro}
          </div>

          {/* 4 Core Principles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-[#14101A] border border-[#3A2E45] p-4 rounded-xl space-y-1">
              <span className="text-[#D9B26A] font-bold block">1. 획수의 조화</span>
              <p className="text-[#B9AEC4]">
                글자의 본래 획수로 계산한 초년·청년·장년·말년 네 가지 숫자가 모두 좋은 수가 되도록 고릅니다.
              </p>
            </div>
            <div className="bg-[#14101A] border border-[#3A2E45] p-4 rounded-xl space-y-1">
              <span className="text-[#D9B26A] font-bold block">2. 홀짝 균형</span>
              <p className="text-[#B9AEC4]">
                글자의 획수가 모두 홀수(양)이거나 짝수(음)로 치우치지 않도록 조화롭게 배합합니다.
              </p>
            </div>
            <div className="bg-[#14101A] border border-[#3A2E45] p-4 rounded-xl space-y-1">
              <span className="text-[#D9B26A] font-bold block">3. 부르기 좋은 소리</span>
              <p className="text-[#B9AEC4]">
                초성과 종성의 한글 소리가 서로 충돌하지 않고 부드럽게 상생하도록 구성합니다.
              </p>
            </div>
            <div className="bg-[#14101A] border border-[#3A2E45] p-4 rounded-xl space-y-1">
              <span className="text-[#D9B26A] font-bold block">4. 타고난 기운 보완</span>
              <p className="text-[#B9AEC4]">
                아이에게 부족한 기운을 뜻과 뿌리가 그 기운에 닿는 글자로 채웁니다.
              </p>
            </div>
          </div>
        </div>
      </PremiumChapter>

      {/* 4. Section 02: 5 Recommended Names */}
      <PremiumChapter
        id="sec-02"
        number="02"
        title="추천 이름 5선"
        subtitle="엄선된 5개 후보작과 상세 해설"
      >
        <div className="space-y-6 text-left">
          {engine.names.map((engName, idx) => {
            const story = names.names[idx];
            return (
              <div
                key={idx}
                className="bg-[#14101A] border border-[#3A2E45] rounded-3xl p-6 sm:p-7 space-y-5 shadow-lg relative overflow-hidden"
              >
                {/* Gold accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#F3E3BF] via-[#D9B26A] to-[#A8823C]" />

                {/* Header: Hangul Name & Rank */}
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#3A2E45] pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <PremiumBadge text={`후보 0${idx + 1}`} />
                      <span className="text-xs text-[#D9B26A] font-semibold">
                        {story?.oneLine || "조화로운 축복의 이름"}
                      </span>
                    </div>
                    <h3 className="font-serif-kr text-3xl sm:text-4xl font-bold text-[#F6F1EA] tracking-tight">
                      {engName.hangul}
                    </h3>
                  </div>

                  {/* Hanja & Hun/Eum Display */}
                  <div className="flex flex-wrap gap-2 text-xs bg-[#1E1726] border border-[#3A2E45] px-3.5 py-2 rounded-xl">
                    {engName.hanja.map((char, charIdx) => (
                      <div key={charIdx} className="flex items-center gap-1.5 text-[#F3E3BF]">
                        <span className="text-base font-bold font-serif-kr text-[#F6F1EA]">{char}</span>
                        <span className="text-[11px] text-[#B9AEC4]">
                          {engName.hun[charIdx]} {engName.eum[charIdx]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stories & Commentary */}
                <div className="space-y-4 text-xs sm:text-sm text-[#F6F1EA]/90 leading-relaxed font-serif-kr">
                  {/* Meaning */}
                  <div>
                    <span className="text-xs font-bold text-[#D9B26A] block mb-1 font-sans">
                      글자의 뜻과 품은 이야기
                    </span>
                    <p className="whitespace-pre-line bg-[#1E1726]/50 p-3.5 rounded-xl border border-[#3A2E45]/60">
                      {story?.meaning}
                    </p>
                  </div>

                  {/* Harmony */}
                  <div>
                    <span className="text-xs font-bold text-[#D9B26A] block mb-1 font-sans">
                      아이의 기운과의 어울림
                    </span>
                    <p className="bg-[#1E1726]/50 p-3.5 rounded-xl border border-[#3A2E45]/60">
                      {story?.harmony}
                    </p>
                  </div>

                  {/* Sound */}
                  <div>
                    <span className="text-xs font-bold text-[#D9B26A] block mb-1 font-sans">
                      불렀을 때의 소리와 울림
                    </span>
                    <p className="bg-[#1E1726]/50 p-3.5 rounded-xl border border-[#3A2E45]/60">
                      {story?.sound}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PremiumChapter>

      {/* 5. Section 03: Four Grid Table */}
      <PremiumChapter
        id="sec-03"
        number="03"
        title="이름의 숫자 (4격 수리표)"
        subtitle="이름 획수로 보는 초년·청년·장년·말년의 흐름"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-[#B9AEC4]">
            성명학 4격 수리는 이름의 각 글자 원획수를 조합하여 인생의 네 시기 길흉을 살핍니다. 각 이름을 누르면 상세 수리표를 확인할 수 있습니다.
          </p>

          <div className="space-y-3">
            {engine.names.map((n, idx) => {
              const isExpanded = expandedNumberIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-[#14101A] border border-[#3A2E45] rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedNumberIndex(isExpanded ? null : idx)}
                    className="w-full p-4.5 flex items-center justify-between hover:bg-[#1E1726] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-serif-kr text-lg font-bold text-[#F6F1EA]">
                        {n.hangul}
                      </span>
                      <span className="text-xs text-[#B9AEC4]">
                        ({n.hanja.join("")} · 원획 {n.strokes.s}+{n.strokes.g1}+{n.strokes.g2}획)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#D9B26A]">
                      <span className="font-semibold">수리 분석 보기</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 border-t border-[#3A2E45] bg-[#1E1726]/40 space-y-3 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-[#14101A] p-3 rounded-xl border border-[#3A2E45]">
                          <span className="text-[11px] text-[#B9AEC4] block mb-0.5">초년운</span>
                          <div className="text-base font-bold text-[#F3E3BF] font-serif-kr">
                            {n.grids.won}획
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-400">
                            {getLuckLabel(n.grids.won)}
                          </span>
                        </div>
                        <div className="bg-[#14101A] p-3 rounded-xl border border-[#3A2E45]">
                          <span className="text-[11px] text-[#B9AEC4] block mb-0.5">청년운</span>
                          <div className="text-base font-bold text-[#F3E3BF] font-serif-kr">
                            {n.grids.hyeong}획
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-400">
                            {getLuckLabel(n.grids.hyeong)}
                          </span>
                        </div>
                        <div className="bg-[#14101A] p-3 rounded-xl border border-[#3A2E45]">
                          <span className="text-[11px] text-[#B9AEC4] block mb-0.5">장년운</span>
                          <div className="text-base font-bold text-[#F3E3BF] font-serif-kr">
                            {n.grids.i}획
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-400">
                            {getLuckLabel(n.grids.i)}
                          </span>
                        </div>
                        <div className="bg-[#14101A] p-3 rounded-xl border border-[#3A2E45]">
                          <span className="text-[11px] text-[#B9AEC4] block mb-0.5">총운 · 말년운</span>
                          <div className="text-base font-bold text-[#F3E3BF] font-serif-kr">
                            {n.grids.jeong}획
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-400">
                            {getLuckLabel(n.grids.jeong)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-[#B9AEC4]">
                        <span>획수 음양: <strong className="text-[#F6F1EA]">{getStrokeYinYang(n.strokes)}</strong></span>
                        <span>소리 흐름: <strong className="text-[#F6F1EA]">{getSoundElements(n.soundSeq)}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </PremiumChapter>

      {/* 6. Section 04: Comparison Table */}
      <PremiumChapter
        id="sec-04"
        number="04"
        title="5선 종합 비교표"
        subtitle="다섯 가지 이름의 획수 풀이와 채워 주는 기운 한눈에 보기"
      >
        <div className="bg-[#14101A] border border-[#3A2E45] rounded-2xl overflow-x-auto text-left text-xs">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-[#3A2E45] bg-[#1E1726] text-[#B9AEC4]">
                <th className="py-3 px-3 font-semibold">후보</th>
                <th className="py-3 px-3 font-semibold">이름</th>
                <th className="py-3 px-3 font-semibold">한자</th>
                <th className="py-3 px-3 font-semibold text-center">원획</th>
                <th className="py-3 px-3 font-semibold text-center">총운</th>
                <th className="py-3 px-3 font-semibold text-center">음양 배합</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A2E45]/60 text-[#F6F1EA]">
              {engine.names.map((n, idx) => (
                <tr key={idx} className="hover:bg-[#1E1726]/40">
                  <td className="py-3 px-3 text-[#D9B26A] font-bold">0{idx + 1}</td>
                  <td className="py-3 px-3 font-serif-kr font-bold text-sm text-[#F3E3BF]">
                    {n.hangul}
                  </td>
                  <td className="py-3 px-3 font-serif-kr">{n.hanja.join("")}</td>
                  <td className="py-3 px-3 text-center text-[#B9AEC4]">
                    {n.strokes.s}+{n.strokes.g1}+{n.strokes.g2}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-emerald-400 font-semibold">{getLuckLabel(n.grids.jeong)}</span> ({n.grids.jeong}획)
                  </td>
                  <td className="py-3 px-3 text-center text-[#B9AEC4]">{getStrokeYinYang(n.strokes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PremiumChapter>

      {/* 7. Section 05: Letter to Parents */}
      <PremiumChapter
        id="sec-05"
        number="05"
        title="부모님께 드리는 편지"
        subtitle="아이와의 소중한 인연을 축복하며"
      >
        <div className="bg-gradient-to-b from-[#14101A] to-[#1E1726] border border-[#D9B26A]/40 rounded-3xl p-6 sm:p-8 text-left space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-[#D9B26A]" />
            <span className="font-serif-kr text-base font-bold text-[#F3E3BF]">
              사랑하는 부모님께
            </span>
          </div>
          <div className="text-xs sm:text-sm text-[#F6F1EA]/90 leading-relaxed whitespace-pre-line space-y-3 font-serif-kr">
            {letter.letter}
          </div>
          <div className="text-right pt-4 text-xs text-[#D9B26A] font-semibold">
            콩닥 작명 연구팀 올림
          </div>
        </div>
      </PremiumChapter>

      {/* 8. Mandatory Supreme Court Notice */}
      <div className="mt-12 bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5 text-left text-xs text-amber-200/90 space-y-2">
        <div className="flex items-center gap-1.5 text-[#F3E3BF] font-semibold">
          <AlertCircle className="w-4 h-4 text-[#D9B26A]" />
          <span>대법원 인명용 한자 확인 안내 (필수)</span>
        </div>
        <p className="leading-relaxed font-medium">
          {letter.notice}
        </p>
        <p className="text-[11px] text-[#B9AEC4] leading-relaxed">
          본 리포트의 모든 추천 한자는 대한민국 대법원 인명용 한자 규정(규칙 제3220호 기준)에 부합하도록 엄격히 검증되었으나, 최종 출생신고를 진행하시기 전 대법원 전자가족관계등록시스템에서 한 번 더 한자 음훈을 대조 확인하시기를 권장합니다.
        </p>
      </div>

      {/* Footer Print & Storage Button */}
      <div className="mt-8 text-center no-print">
        <PrintButton />
      </div>
    </PremiumShell>
  );
}
