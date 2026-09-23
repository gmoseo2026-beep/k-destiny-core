"use client";

import React from "react";
import { Check, AlertTriangle, Sparkles, Calendar, Heart, Shield } from "lucide-react";
import {
  PremiumShell,
  PremiumCover,
  PremiumToc,
  PremiumChapter,
  PremiumBadge,
  PrintButton,
} from "@/components/premium";
import type { Premium2027ReportContent } from "@/lib/premium/generate2027";

interface Daeun2027ReportProps {
  reportId: string;
  content: Premium2027ReportContent;
  targetName?: string;
  createdAt?: string;
}

const DOMAIN_KOREAN: Record<string, string> = {
  love: "연애 · 사랑",
  money: "재물 · 자산",
  career: "직업 · 성취",
  health: "건강 · 활력",
  relationships: "대인관계 · 인연",
  family: "가정 · 평온",
};

export function Daeun2027Report({
  reportId,
  content,
  targetName = "회원님",
  createdAt,
}: Daeun2027ReportProps) {
  const { engine, sections } = content;
  const { overview, domains, months, closing } = sections;

  const dateStr = createdAt
    ? new Date(createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  const tocItems = [
    { id: "sec-01", number: "01", title: "나의 10년 대운 지도" },
    { id: "sec-02", number: "02", title: "2027 정미년 총평" },
    { id: "sec-03", number: "03", title: "6대 핵심 분야 분석" },
    { id: "sec-04", number: "04", title: "12개월 월별 흐름" },
    { id: "sec-05", number: "05", title: "분기별 실행 로드맵" },
    { id: "sec-06", number: "06", title: "두근이의 편지" },
  ];

  // Radar Chart calculations (6 axes)
  const DOMAIN_KEYS = ["love", "money", "career", "health", "relationships", "family"] as const;
  const radarLabels = ["연애", "재물", "직업", "건강", "관계", "가정"];
  const radarScores = DOMAIN_KEYS.map((k) => engine.domains[k] ?? 80);
  const cx = 150;
  const cy = 135;
  const maxR = 90;

  const getPoint = (angleIdx: number, val: number) => {
    const angle = (Math.PI * 2 * angleIdx) / 6 - Math.PI / 2;
    const r = (val / 100) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const radarPolygon = radarScores
    .map((s: number, i: number) => {
      const p = getPoint(i, s);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  // Line Chart for 12 months
  const monthScores = engine.months.map((m) => m.score);
  const linePoints = monthScores.map((s, i) => {
    const x = 35 + (i * (465 - 35)) / 11;
    const y = 130 - (s / 100) * 85;
    return { x, y, score: s, month: i + 1 };
  });
  const linePathD = linePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const lineAreaD = `${linePathD} L ${linePoints[11].x} 145 L ${linePoints[0].x} 145 Z`;

  return (
    <PremiumShell>
      {/* 1. Cover */}
      <PremiumCover
        title="2027 대운 심층 리포트"
        subtitle="인생 10년의 지도와 정미년의 완전한 청사진"
        targetName={targetName}
        dateStr={dateStr}
        reportId={reportId}
      />

      {/* 2. Table of Contents */}
      <PremiumToc items={tocItems} />

      {/* 3. Section 01: 10-Year Map */}
      <PremiumChapter
        id="sec-01"
        number="01"
        title="나의 10년 대운 지도"
        subtitle="삶을 관통하는 거대한 기운의 파도와 현재의 자리"
      >
        <div className="space-y-6">
          <p className="text-xs sm:text-sm text-[#B9AEC4] leading-relaxed">
            사주명리학에서 대운(大運)은 10년마다 바뀌는 인생의 계절입니다. 아래는 평생을 관통하는 8개의 10년 주기 지도이며, 현재 지나고 있는 시기가 금빛으로 강조되어 있습니다.
          </p>

          {/* Cycles Horizontal Flow */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {engine.cycles.map((c) => {
              const isCurrent = engine.current?.index === c.index;
              return (
                <div
                  key={c.index}
                  className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                    isCurrent
                      ? "bg-gradient-to-b from-[#1E1726] to-[#2B1D3A] border-[#D9B26A] shadow-md ring-1 ring-[#D9B26A]/50"
                      : "bg-[#14101A] border-[#3A2E45]/80 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-[#D9B26A]">
                      {c.startAge}세 ~ {c.startAge + 9}세
                    </span>
                    {isCurrent && <PremiumBadge text="현재 대운" />}
                  </div>
                  <div className="font-serif-kr text-sm font-bold text-[#F6F1EA] mb-1 leading-snug">
                    {c.label}
                  </div>
                  <span className="text-[10px] text-[#B9AEC4]/60 mt-2 block">
                    {c.startYear}~{c.endYear}년
                  </span>
                </div>
              );
            })}
          </div>

          {/* Cycle Story */}
          <div className="bg-[#14101A] border border-[#3A2E45] rounded-2xl p-5 text-left text-xs sm:text-sm text-[#F6F1EA] leading-relaxed space-y-3">
            <h4 className="text-xs font-bold text-[#D9B26A] tracking-wider uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>현재 10년의 깊은 의미</span>
            </h4>
            <div className="whitespace-pre-line text-[#F6F1EA]/90">
              {overview.cycleStory}
            </div>
          </div>
        </div>
      </PremiumChapter>

      {/* 4. Section 02: 2027 Overview */}
      <PremiumChapter
        id="sec-02"
        number="02"
        title="2027 정미년 총평"
        subtitle="10년의 흐름 속에서 2027년이 갖는 위치와 총운 지수"
      >
        <div className="space-y-6 text-left">
          {/* Score & Keywords Card */}
          <div className="bg-[#14101A] border border-[#3A2E45] rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <span className="text-xs text-[#B9AEC4] uppercase tracking-wider block mb-1">
                2027 정미(丁未)년 종합 기운 지수
              </span>
              <div className="text-4xl sm:text-5xl font-black font-serif-kr text-transparent bg-clip-text bg-gradient-to-r from-[#F3E3BF] via-[#D9B26A] to-[#A8823C]">
                {engine.yearScore}점
              </div>
              <p className="text-xs text-[#F3E3BF] mt-1 font-medium">
                {overview.headline}
              </p>
            </div>
            <div className="flex flex-wrap sm:flex-col gap-2 justify-center">
              {overview.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-3.5 py-1 rounded-full text-xs font-semibold bg-[#1E1726] border border-[#D9B26A]/40 text-[#F3E3BF]"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>

          {/* Position in 10-Year Cycle */}
          <div className="bg-[#14101A] border border-[#3A2E45] rounded-2xl p-5 text-xs sm:text-sm text-[#F6F1EA] leading-relaxed space-y-2">
            <h4 className="text-xs font-bold text-[#D9B26A] tracking-wider uppercase">
              10년 중 2027년의 자리
            </h4>
            <p className="text-[#F6F1EA]/90">{overview.position}</p>
          </div>

          {/* Year Summary */}
          <div className="bg-[#14101A] border border-[#3A2E45] rounded-2xl p-5 text-xs sm:text-sm text-[#F6F1EA] leading-relaxed space-y-2">
            <h4 className="text-xs font-bold text-[#D9B26A] tracking-wider uppercase">
              2027년 한 해의 총평
            </h4>
            <p className="text-[#F6F1EA]/90 whitespace-pre-line">{overview.yearSummary}</p>
          </div>
        </div>
      </PremiumChapter>

      {/* 5. Section 03: 6 Domains */}
      <PremiumChapter
        id="sec-03"
        number="03"
        title="6대 핵심 분야 분석"
        subtitle="사랑·재물·직업·건강·관계·가정의 정밀 진단"
      >
        <div className="space-y-6 text-left">
          {/* Radar Chart */}
          <div className="bg-[#14101A] border border-[#3A2E45] rounded-3xl p-5 sm:p-6 text-center">
            <span className="text-xs text-[#B9AEC4] font-semibold block mb-2">
              분야별 기운 밸런스 레이더
            </span>
            <div className="w-full max-w-xs mx-auto">
              <svg viewBox="0 0 300 270" className="w-full h-auto overflow-visible">
                {/* Background Web Polygons */}
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((level) => {
                  const pts = [0, 1, 2, 3, 4, 5]
                    .map((i) => {
                      const p = getPoint(i, level * 100);
                      return `${p.x},${p.y}`;
                    })
                    .join(" ");
                  return (
                    <polygon
                      key={level}
                      points={pts}
                      fill="none"
                      stroke="#3A2E45"
                      strokeWidth="1"
                      strokeDasharray={level === 1.0 ? "none" : "2,2"}
                    />
                  );
                })}

                {/* Axis lines */}
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const end = getPoint(i, 100);
                  return (
                    <line
                      key={i}
                      x1={cx}
                      y1={cy}
                      x2={end.x}
                      y2={end.y}
                      stroke="#3A2E45"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Data Polygon */}
                <polygon
                  points={radarPolygon}
                  fill="url(#radarGoldGradient)"
                  fillOpacity="0.45"
                  stroke="#D9B26A"
                  strokeWidth="2.5"
                />

                {/* Point markers & Labels */}
                {radarScores.map((score: number, i: number) => {
                  const p = getPoint(i, score);
                  const labelPos = getPoint(i, 118);
                  return (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="4" fill="#F3E3BF" stroke="#14101A" strokeWidth="1.5" />
                      <text
                        x={labelPos.x}
                        y={labelPos.y + 4}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="#F3E3BF"
                      >
                        {radarLabels[i]} {score}
                      </text>
                    </g>
                  );
                })}

                <defs>
                  <linearGradient id="radarGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F3E3BF" />
                    <stop offset="50%" stopColor="#D9B26A" />
                    <stop offset="100%" stopColor="#A8823C" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Domain Cards */}
          <div className="grid grid-cols-1 gap-4">
            {domains.domains.map((dom) => {
              const engScore = engine.domains[dom.key] ?? 80;
              return (
                <div
                  key={dom.key}
                  className="bg-[#14101A] border border-[#3A2E45] rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#3A2E45] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-serif-kr text-base font-bold text-[#F6F1EA]">
                        {DOMAIN_KOREAN[dom.key] || dom.key}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-[#D9B26A] font-serif-kr">
                      {engScore}점
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#F6F1EA]/90 leading-relaxed whitespace-pre-line">
                    {dom.body}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-[#1E1726] p-3 rounded-xl border border-emerald-900/30 text-xs">
                      <div className="text-emerald-400 font-bold mb-1.5 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>추천하는 행동 (Do)</span>
                      </div>
                      <ul className="space-y-1 text-[#B9AEC4]">
                        {dom.do.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-[#1E1726] p-3 rounded-xl border border-rose-900/30 text-xs">
                      <div className="text-rose-400 font-bold mb-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>주의할 점 (Don&apos;t)</span>
                      </div>
                      <ul className="space-y-1 text-[#B9AEC4]">
                        {dom.dont.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PremiumChapter>

      {/* 6. Section 04: 12 Months */}
      <PremiumChapter
        id="sec-04"
        number="04"
        title="12개월 월별 흐름"
        subtitle="1월부터 12월까지 매달의 테마와 이달의 좋은 날"
      >
        <div className="space-y-6 text-left">
          {/* 12-Month Line Chart */}
          <div className="bg-[#14101A] border border-[#3A2E45] rounded-3xl p-5 text-center">
            <span className="text-xs text-[#B9AEC4] font-semibold block mb-2">
              12개월 운세 흐름 추이
            </span>
            <div className="w-full overflow-x-auto">
              <svg viewBox="0 0 500 160" className="w-full min-w-[420px] h-auto">
                <defs>
                  <linearGradient id="lineAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#D9B26A" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#D9B26A" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal reference lines */}
                <line x1="30" y1="45" x2="475" y2="45" stroke="#3A2E45" strokeDasharray="2,2" strokeWidth="0.8" />
                <line x1="30" y1="90" x2="475" y2="90" stroke="#3A2E45" strokeDasharray="2,2" strokeWidth="0.8" />
                <line x1="30" y1="135" x2="475" y2="135" stroke="#3A2E45" strokeWidth="1" />

                {/* Area under curve */}
                <path d={lineAreaD} fill="url(#lineAreaGrad)" />

                {/* Path line */}
                <path d={linePathD} fill="none" stroke="#D9B26A" strokeWidth="2.5" />

                {/* Points & Labels */}
                {linePoints.map((p) => (
                  <g key={p.month}>
                    <circle cx={p.x} cy={p.y} r="3.5" fill="#F3E3BF" stroke="#14101A" strokeWidth="1.5" />
                    <text x={p.x} y={152} textAnchor="middle" fontSize="10" fill="#B9AEC4">
                      {p.month}월
                    </text>
                    <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#F3E3BF">
                      {p.score}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* 12 Months Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {months.months.map((m) => {
              const engMonth = engine.months.find((em) => em.month === m.month);
              const goodDates = engine.monthlyGoodDates?.[m.month] || [];
              return (
                <div
                  key={m.month}
                  className="bg-[#14101A] border border-[#3A2E45] rounded-2xl p-4.5 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[#3A2E45] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-serif-kr text-base font-bold text-[#F3E3BF]">
                        {m.month}월
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-[#1E1726] border border-[#D9B26A]/30 px-2 py-0.5 rounded text-[#D9B26A] font-semibold">
                        {m.theme}
                      </span>
                      <span className="text-xs font-bold text-[#F6F1EA] font-serif-kr">
                        {engMonth?.score}점
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#F6F1EA]/90 leading-relaxed whitespace-pre-line">
                    {m.body}
                  </p>

                  <div className="bg-[#1E1726] p-2.5 rounded-xl border border-[#3A2E45] text-[11px] space-y-1">
                    <div className="text-emerald-400">
                      <span className="font-semibold">Do:</span> {m.do}
                    </div>
                    <div className="text-rose-400">
                      <span className="font-semibold">Don&apos;t:</span> {m.dont}
                    </div>
                  </div>

                  {goodDates.length > 0 && (
                    <div className="bg-[#1E1726]/60 p-2.5 rounded-xl border border-[#D9B26A]/20 text-[11px]">
                      <span className="text-[#D9B26A] font-bold block mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>이달의 좋은 날</span>
                      </span>
                      <div className="flex flex-wrap gap-2 text-[#B9AEC4]">
                        {goodDates.map((gd, idx) => (
                          <span key={idx} className="bg-[#14101A] px-2 py-0.5 rounded border border-[#3A2E45]">
                            {gd.date} ({gd.score}점)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </PremiumChapter>

      {/* 7. Section 05: Quarterly Roadmap */}
      <PremiumChapter
        id="sec-05"
        number="05"
        title="분기별 실행 로드맵"
        subtitle="사계절의 기운 변화에 맞춘 4분기 집중 액션 플랜"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {closing.quarterPlan.map((qp) => (
            <div
              key={qp.quarter}
              className="bg-[#14101A] border border-[#3A2E45] rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#3A2E45] pb-2">
                <span className="font-serif-kr text-base font-bold text-[#F3E3BF]">
                  제 {qp.quarter}분기
                </span>
                <span className="text-xs text-[#B9AEC4]">
                  {qp.quarter === 1 ? "봄 (1~3월)" : qp.quarter === 2 ? "여름 (4~6월)" : qp.quarter === 3 ? "가을 (7~9월)" : "겨울 (10~12월)"}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-[#D9B26A] block mb-1">
                  핵심 집중 과제
                </span>
                <p className="text-xs sm:text-sm text-[#F6F1EA] font-medium">{qp.focus}</p>
              </div>
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-[#B9AEC4] font-semibold block">
                  실천 액션 3가지
                </span>
                {qp.actions.map((act, idx) => (
                  <div key={idx} className="text-xs text-[#F6F1EA]/90 flex items-start gap-1.5">
                    <span className="text-[#D9B26A] font-bold shrink-0">{idx + 1}.</span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PremiumChapter>

      {/* 8. Section 06: Dugeun Letter */}
      <PremiumChapter
        id="sec-06"
        number="06"
        title="두근이의 편지"
        subtitle="당신의 찬란한 내일을 온 마음으로 응원합니다"
      >
        <div className="bg-gradient-to-b from-[#14101A] to-[#1E1726] border border-[#D9B26A]/40 rounded-3xl p-6 sm:p-8 text-left space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-[#D9B26A]" />
            <span className="font-serif-kr text-base font-bold text-[#F3E3BF]">
              {targetName}님께 보내는 두근이의 응원
            </span>
          </div>
          <div className="text-xs sm:text-sm text-[#F6F1EA]/90 leading-relaxed whitespace-pre-line space-y-3 font-serif-kr">
            {closing.letter}
          </div>
          <div className="text-right pt-4 text-xs text-[#D9B26A] font-semibold">
            콩닥 마스코트 두근이 올림
          </div>
        </div>
      </PremiumChapter>

      {/* Disclaimer / Notice */}
      <div className="mt-12 bg-[#14101A] border border-[#3A2E45]/80 rounded-2xl p-5 text-left text-xs text-[#B9AEC4] space-y-2">
        <div className="flex items-center gap-1.5 text-[#F3E3BF] font-semibold">
          <Shield className="w-3.5 h-3.5" />
          <span>안내 및 유의사항</span>
        </div>
        <p className="leading-relaxed">
          본 리포트는 전통 사주명리학과 천문 절기 데이터를 현대적으로 해석한 자기이해 및 라이프 가이드 콘텐츠입니다. 운세와 사주는 정해진 미래를 단정하는 것이 아니며, 삶의 주체적인 선택과 노력을 돕는 긍정적인 조언으로 활용해 주시기 바랍니다.
        </p>
        <p className="text-[11px] text-[#B9AEC4]/70">
          구매하신 프리미엄 리포트는 내 보관함에서 1년간 언제든 다시 열람하실 수 있으며, 아래 버튼을 통해 PDF로 평생 보관하실 수 있습니다.
        </p>
      </div>

      {/* Footer Print & Storage Button */}
      <div className="mt-8 text-center no-print">
        <PrintButton />
      </div>
    </PremiumShell>
  );
}
