"use client";

import React, { useState } from "react";
import { Calendar, CheckSquare, Square, Download, Clock, Shield, AlertCircle } from "lucide-react";
import {
  PremiumShell,
  PremiumCover,
  PremiumToc,
  PremiumChapter,
  PremiumBadge,
  PrintButton,
} from "@/components/premium";
import type { PremiumDateSelectionReportContent } from "@/lib/premium/generateDates";
import { officerWord, PURPOSE_WORD, formatLunarDate } from "@/lib/premium/dateLabels";
import { downloadIcsFile, downloadMultipleIcsFile } from "@/lib/ics";

interface DateSelectionReportProps {
  reportId: string;
  content: PremiumDateSelectionReportContent;
  targetName?: string;
  createdAt?: string;
}

const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export function DateSelectionReport({
  reportId,
  content,
  targetName = "회원님",
  createdAt,
}: DateSelectionReportProps) {
  const { engine, sections } = content;
  const { dates, guide } = sections;

  const dateStr = createdAt
    ? new Date(createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  const tocItems = [
    { id: "sec-01", number: "01", title: "택일 결과 요약" },
    { id: "sec-02", number: "02", title: "길일 캘린더 지도" },
    { id: "sec-03", number: "03", title: "추천 길일 5선" },
    { id: "sec-04", number: "04", title: "준비 체크리스트" },
  ];

  // Checklist interactive state
  const [checkedItems, setCheckedItems] = useState<number[]>([]);
  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Calendar Grid builder
  // Group picks by YYYY-MM
  const monthsInPicks = Array.from(new Set(engine.picks.map((p) => p.date.slice(0, 7)))).sort();

  const handleDownloadAllIcs = () => {
    const purposeKor = PURPOSE_WORD[engine.purpose] || "길일";
    const icsEvents = engine.picks.map((pick, i) => {
      const story = dates.dates.find((d) => d.date === pick.date);
      return {
        title: `콩닥 추천 길일 · ${purposeKor} 후보 ${i + 1} (${pick.score}점)`,
        description: `${story?.why || ""}\n\n[길한 시간대]\n${pick.goodHours.join(", ")}`,
        date: pick.date,
      };
    });
    downloadMultipleIcsFile(icsEvents, `kongdak_${engine.purpose.toLowerCase()}_dates.ics`);
  };

  return (
    <PremiumShell>
      {/* 1. Cover */}
      <PremiumCover
        title={`${PURPOSE_WORD[engine.purpose] || "인생 길일"} 정통 택일 리포트`}
        subtitle="하늘과 땅이 돕는 최적의 날과 복된 시간대 5선"
        targetName={targetName}
        dateStr={dateStr}
        reportId={reportId}
      />

      {/* 2. Table of Contents */}
      <PremiumToc items={tocItems} />

      {/* 3. Section 01: Summary */}
      <PremiumChapter
        id="sec-01"
        number="01"
        title="택일 결과 요약"
        subtitle="탐색 기간과 기운 분석 총평"
      >
        <div className="space-y-6 text-left">
          {/* Summary Box */}
          <div className="bg-[#14101A] border border-[#3A2E45] rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3A2E45] pb-3">
              <div>
                <span className="text-xs text-[#B9AEC4] block mb-0.5">택일 목적</span>
                <span className="font-serif-kr text-xl font-bold text-[#F3E3BF]">
                  {PURPOSE_WORD[engine.purpose] || "일반"} 택일
                </span>
              </div>
              <div className="text-xs text-[#B9AEC4] bg-[#1E1726] border border-[#3A2E45] px-3.5 py-1.5 rounded-full">
                탐색 기간: {engine.range.start} ~ {engine.range.end}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#F6F1EA]/90 leading-relaxed whitespace-pre-line font-serif-kr">
              {guide.summary}
            </p>
          </div>

          {/* Quick Notice If Insufficient */}
          {engine.insufficient && (
            <div className="bg-rose-950/30 border border-rose-500/40 p-4 rounded-2xl text-xs text-rose-200">
              <div className="flex items-center gap-1.5 font-bold mb-1 text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>추천 길일 안내</span>
              </div>
              <p className="leading-relaxed">
                선택하신 조건 내에서 흉살을 피하고 복이 닿는 날이 적어 상위 날짜 일부만 추천되었습니다. 일정을 유연하게 조율하실 수 있다면 범위를 넓혀 확인해 보세요.
              </p>
            </div>
          )}
        </div>
      </PremiumChapter>

      {/* 4. Section 02: Calendar Map */}
      <PremiumChapter
        id="sec-02"
        number="02"
        title="길일 캘린더 지도"
        subtitle="한눈에 보는 추천 길일의 분포와 1~3위 핵심 날짜"
      >
        <div className="space-y-6 text-left">
          <div className="flex items-center justify-between text-xs text-[#B9AEC4]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full border border-[#D9B26A] bg-[#D9B26A]/30 inline-block" />
                <span>1~3위 길일</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D9B26A] inline-block" />
                <span>추천 길일</span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadAllIcs}
              className="text-xs text-[#D9B26A] hover:underline flex items-center gap-1 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>전체 캘린더 저장 (.ics)</span>
            </button>
          </div>

          {/* Monthly Calendar Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monthsInPicks.map((ym) => {
              const [yStr, mStr] = ym.split("-");
              const y = parseInt(yStr, 10);
              const m = parseInt(mStr, 10);
              const firstDayOfWeek = new Date(y, m - 1, 1).getDay();
              const daysInMonth = new Date(y, m, 0).getDate();

              const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
              const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);

              return (
                <div
                  key={ym}
                  className="bg-[#14101A] border border-[#3A2E45] rounded-2xl p-4.5 text-center space-y-3"
                >
                  <span className="font-serif-kr text-sm font-bold text-[#F3E3BF] block">
                    {y}년 {m}월
                  </span>

                  <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold text-[#B9AEC4]">
                    {WEEKDAY_NAMES.map((name, i) => (
                      <div key={name} className={i === 0 ? "text-rose-400" : i === 6 ? "text-sky-400" : ""}>
                        {name}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {blanks.map((b) => (
                      <div key={`blank-${b}`} className="h-8" />
                    ))}
                    {daysArray.map((d) => {
                      const curDateStr = `${yStr}-${mStr.padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const pickIndex = engine.picks.findIndex((p) => p.date === curDateStr);
                      const isPick = pickIndex !== -1;
                      const isTop3 = isPick && pickIndex < 3;

                      return (
                        <div
                          key={d}
                          className="h-8 flex items-center justify-center relative"
                        >
                          {isTop3 ? (
                            <div className="w-7 h-7 rounded-full border border-[#D9B26A] bg-[#D9B26A]/25 text-[#F3E3BF] font-bold flex items-center justify-center shadow-xs">
                              {d}
                            </div>
                          ) : isPick ? (
                            <div className="relative font-bold text-[#D9B26A]">
                              {d}
                              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#D9B26A]" />
                            </div>
                          ) : (
                            <span className="text-[#B9AEC4]/60">{d}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PremiumChapter>

      {/* 5. Section 03: 5 Recommended Dates */}
      <PremiumChapter
        id="sec-03"
        number="03"
        title="추천 길일 5선"
        subtitle="날짜별 기운 지수와 최적의 시간대 심층 해설"
      >
        <div className="space-y-6 text-left">
          {engine.picks.map((pick, idx) => {
            const story = dates.dates.find((d) => d.date === pick.date);
            const [y, m, d] = pick.date.split("-").map(Number);
            const dayOfWeek = WEEKDAY_NAMES[new Date(y, m - 1, d).getDay()];
            const lunarStr = formatLunarDate(pick.lunarMonth, pick.lunarDay, pick.isLeapMonth);
            const officerDesc = officerWord(pick.officer);

            const handleSingleIcs = () => {
              downloadIcsFile({
                title: `콩닥 추천 길일 · ${PURPOSE_WORD[engine.purpose]} ${idx + 1}위 (${pick.date})`,
                description: `${story?.why || ""}\n\n[길한 시간대]\n${pick.goodHours.join(", ")}`,
                date: pick.date,
              });
            };

            return (
              <div
                key={pick.date}
                className="bg-[#14101A] border border-[#3A2E45] rounded-3xl p-6 sm:p-7 space-y-5 shadow-lg relative overflow-hidden"
              >
                {/* Gold header accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#F3E3BF] via-[#D9B26A] to-[#A8823C]" />

                {/* Header: Date, Rank, Score */}
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#3A2E45] pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <PremiumBadge text={`추천 0${idx + 1}`} />
                      <span className="text-xs text-[#D9B26A] font-semibold">
                        {story?.title || `${PURPOSE_WORD[engine.purpose]} 최고의 길일`}
                      </span>
                    </div>
                    <h3 className="font-serif-kr text-2xl sm:text-3xl font-bold text-[#F6F1EA] tracking-tight">
                      {y}년 {m}월 {d}일 ({dayOfWeek})
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#B9AEC4]">
                      <span>{lunarStr}</span>
                      <span>•</span>
                      <span>{pick.dayGanZhi}일</span>
                      <span>•</span>
                      <span className="text-[#F3E3BF] font-semibold">{officerDesc}</span>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-1">
                    <span className="text-3xl font-black font-serif-kr text-[#D9B26A]">
                      {pick.score}점
                    </span>
                    <button
                      type="button"
                      onClick={handleSingleIcs}
                      className="px-3 py-1.5 bg-[#1E1726] hover:bg-[#D9B26A]/20 border border-[#D9B26A]/40 rounded-xl text-xs text-[#F3E3BF] font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#D9B26A]" />
                      <span>.ics 캘린더 저장</span>
                    </button>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {pick.yellowPath && (
                    <span className="bg-[#1E1726] border border-[#D9B26A]/40 text-[#F3E3BF] px-2.5 py-1 rounded-full">
                      ✨ 황도길일 (천을귀인 감응)
                    </span>
                  )}
                  {pick.sonEomneun && (
                    <span className="bg-[#1E1726] border border-[#D9B26A]/40 text-[#F3E3BF] px-2.5 py-1 rounded-full">
                      🕊️ 손 없는 날
                    </span>
                  )}
                  {pick.yiHit && (
                    <span className="bg-[#1E1726] border border-[#D9B26A]/40 text-[#F3E3BF] px-2.5 py-1 rounded-full">
                      🎯 목적 부합 길일
                    </span>
                  )}
                </div>

                {/* Good Hours */}
                <div className="bg-[#1E1726] border border-[#3A2E45] p-4 rounded-2xl text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#D9B26A] font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>추천 길한 시간대 (한국 표준시 기준)</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 text-[#F6F1EA]">
                    {pick.goodHours.map((h, i) => (
                      <span key={i} className="bg-[#14101A] px-3 py-1 rounded-lg border border-[#3A2E45]">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Why & Tips */}
                <div className="space-y-3 text-xs sm:text-sm text-[#F6F1EA]/90 leading-relaxed font-serif-kr">
                  <div>
                    <span className="text-xs font-bold text-[#D9B26A] block mb-1 font-sans">
                      이 날을 추천하는 이유
                    </span>
                    <p className="bg-[#1E1726]/40 p-3.5 rounded-xl border border-[#3A2E45]/60 whitespace-pre-line">
                      {story?.why}
                    </p>
                  </div>

                  {story?.tips && story.tips.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-[#D9B26A] block mb-1 font-sans">
                        실천 조언 및 주의점
                      </span>
                      <ul className="bg-[#1E1726]/40 p-3.5 rounded-xl border border-[#3A2E45]/60 space-y-1.5 text-xs text-[#B9AEC4]">
                        {story.tips.map((tip, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-1.5">
                            <span className="text-[#D9B26A] font-bold shrink-0">•</span>
                            <span className="text-[#F6F1EA]/90">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PremiumChapter>

      {/* 6. Section 04: Checklist */}
      <PremiumChapter
        id="sec-04"
        number="04"
        title="준비 체크리스트"
        subtitle="최고의 기운을 담기 위한 단계별 실천 가이드"
      >
        <div className="bg-[#14101A] border border-[#3A2E45] rounded-3xl p-6 text-left space-y-3">
          <p className="text-xs text-[#B9AEC4] mb-3">
            길일의 온전한 기운을 맞이하기 위해 미리 점검해야 할 5가지 체크리스트입니다. 완료한 항목을 체크해 보세요.
          </p>
          <div className="space-y-2.5">
            {guide.checklist.map((item, idx) => {
              const isChecked = checkedItems.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => toggleCheck(idx)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 text-xs sm:text-sm ${
                    isChecked
                      ? "bg-[#1E1726] border-[#D9B26A]/50 text-[#B9AEC4] line-through"
                      : "bg-[#14101A] border-[#3A2E45] text-[#F6F1EA] hover:border-[#D9B26A]/30"
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-[#D9B26A] shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-[#B9AEC4] shrink-0" />
                  )}
                  <span>{item}</span>
                </div>
              );
            })}
          </div>
        </div>
      </PremiumChapter>

      {/* 7. Notice / Disclaimer */}
      <div className="mt-12 bg-[#14101A] border border-[#3A2E45]/80 rounded-2xl p-5 text-left text-xs text-[#B9AEC4] space-y-2">
        <div className="flex items-center gap-1.5 text-[#F3E3BF] font-semibold">
          <Shield className="w-3.5 h-3.5" />
          <span>전통 역학 달력 안내</span>
        </div>
        <p className="leading-relaxed font-medium text-[#F6F1EA]/90">
          {guide.notice}
        </p>
        <p className="text-[11px] text-[#B9AEC4]/70">
          본 리포트는 전통 건제12신, 황도길일, 손 없는 날 등 역학적 법칙을 바탕으로 산출된 권장 일정입니다. 행사 장소의 예약 가능 여부, 참석자의 편의 등 현실적인 여건을 함께 고려하여 최종 일정을 확정하시기 바랍니다.
        </p>
      </div>

      {/* Footer Print & Storage Button */}
      <div className="mt-8 text-center no-print">
        <PrintButton />
      </div>
    </PremiumShell>
  );
}
