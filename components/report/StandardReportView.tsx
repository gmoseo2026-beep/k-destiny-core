"use client";

import React from "react";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { ReportSection } from "@/components/ui/ReportSection";
import type { StandardReport, StandardTeaser } from "@/lib/reports/standard";
import { Lock, Sparkles, CheckCircle2, XCircle, Heart } from "lucide-react";

interface LockedSectionInfo {
  key: string;
  title: string;
}

interface StandardReportViewProps {
  mode: "teaser" | "full";
  score: number;
  data: StandardReport | StandardTeaser;
  lockedSpecs?: LockedSectionInfo[];
}

function isFullReport(mode: "teaser" | "full", data: StandardReport | StandardTeaser): data is StandardReport {
  return mode === "full" && "sections" in data;
}

export default function StandardReportView({
  mode,
  score,
  data,
  lockedSpecs = [],
}: StandardReportViewProps) {
  if (isFullReport(mode, data)) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
        {/* Score & Headline Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-plum/10 text-center flex flex-col items-center">
          <ScoreGauge score={score} label="종합 흐름 점수" color="var(--coral)" />
          <h2 className="text-xl font-black text-ink mt-4 mb-2 tracking-tight">
            &ldquo;{data.headline}&rdquo;
          </h2>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
            {data.summary}
          </p>
        </div>

        {/* 4 Full Sections */}
        <div className="flex flex-col gap-4">
          {data.sections.map((section, idx) => (
            <ReportSection
              key={section.key || idx}
              title={section.title}
              icon={<Sparkles className="w-5 h-5 text-coral" />}
            >
              <div className="text-sm text-ink leading-relaxed whitespace-pre-line">
                {section.body}
              </div>
            </ReportSection>
          ))}
        </div>

        {/* Advice (Do & Don't) */}
        {data.advice && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-plum/10 flex flex-col gap-4">
            <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
              <Heart className="w-4 h-4 text-coral" />
              두근이의 실천 조언
            </h3>

            {/* DO */}
            <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-4">
              <span className="text-xs font-bold text-emerald-800 block mb-2">
                ✨ 하면 좋은 것 (DO)
              </span>
              <ul className="flex flex-col gap-1.5">
                {data.advice.do.map((item, i) => (
                  <li key={i} className="text-xs text-emerald-950 flex items-start gap-2 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* DONT */}
            <div className="bg-rose-50/70 border border-rose-200/60 rounded-2xl p-4">
              <span className="text-xs font-bold text-rose-800 block mb-2">
                ⚠️ 조심할 것 (DON&apos;T)
              </span>
              <ul className="flex flex-col gap-1.5">
                {data.advice.dont.map((item, i) => (
                  <li key={i} className="text-xs text-rose-950 flex items-start gap-2 leading-relaxed">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Closing */}
        {data.closing && (
          <div className="bg-cream rounded-3xl p-6 border border-plum/10 text-center">
            <p className="text-sm font-semibold text-plum leading-relaxed whitespace-pre-line">
              {data.closing}
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <footer className="text-center py-2 px-4">
          <p className="text-[11px] text-muted leading-relaxed">
            ※ 콩닥의 리포트는 정통 사주 데이터를 바탕으로 오락 및 자기이해를 위해 다정하게 제공되는 참고 정보이며, 단정적 미래를 보장하지 않습니다.
          </p>
        </footer>
      </div>
    );
  }

  // TEASER MODE
  const teaser = data as StandardTeaser;
  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto">
      {/* Score & Headline Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-plum/10 text-center flex flex-col items-center">
        <ScoreGauge score={score} label="종합 흐름 점수" color="var(--coral)" />
        <h2 className="text-xl font-black text-ink mt-4 mb-2 tracking-tight">
          &ldquo;{teaser.headline}&rdquo;
        </h2>
        <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
          {teaser.summary}
        </p>
      </div>

      {/* Free Section 1 */}
      {teaser.freeSection && (
        <ReportSection
          title={teaser.freeSection.title}
          icon={<Sparkles className="w-5 h-5 text-coral" />}
        >
          <div className="text-sm text-ink leading-relaxed whitespace-pre-line">
            {teaser.freeSection.body}
          </div>
        </ReportSection>
      )}

      {/* 3 Locked Sections (Hook only, NO full body DOM) */}
      <div className="flex flex-col gap-3">
        {(teaser.hooks || []).map((hook, idx) => {
          const specTitle = lockedSpecs[idx]?.title || `심층 분석 ${idx + 2}`;
          return (
            <div
              key={idx}
              className="bg-white/80 rounded-2xl p-4 border border-plum/10 shadow-xs flex items-center justify-between gap-3 text-left"
            >
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-ink truncate">{specTitle}</span>
                  <span className="text-[10px] text-coral bg-coral/10 font-bold px-1.5 py-0.5 rounded">
                    잠금
                  </span>
                </div>
                <p className="text-xs text-muted leading-snug truncate">
                  {hook}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-muted shrink-0">
                <Lock className="w-4 h-4 text-coral" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
