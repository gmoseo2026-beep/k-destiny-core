"use client";

import React from "react";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { ReportSection } from "@/components/ui/ReportSection";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
  /** 티저의 잠긴 칸을 누르면 결제 안내를 연다(없으면 누를 수 없는 카드) */
  onLockedClick?: () => void;
}

function isFullReport(mode: "teaser" | "full", data: StandardReport | StandardTeaser): data is StandardReport {
  return mode === "full" && "sections" in data;
}

export default function StandardReportView({
  mode,
  score,
  data,
  lockedSpecs = [],
  onLockedClick,
}: StandardReportViewProps) {
  if (isFullReport(mode, data)) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
        {/* Score & Headline Card */}
        <Card className="text-center flex flex-col items-center">
          <ScoreGauge score={score} label="종합 흐름 점수" color="#E0245A" />
          <h2 className="text-xl font-black text-ink mt-4 mb-2 tracking-tight">
            &ldquo;{data.headline}&rdquo;
          </h2>
          <p className="text-sm text-text-2 leading-relaxed whitespace-pre-line">
            {data.summary}
          </p>
        </Card>

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
          <Card className="flex flex-col gap-4">
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
          </Card>
        )}

        {/* Closing */}
        {data.closing && (
          <div className="bg-surface-soft rounded-2xl p-5 border border-line text-center">
            <p className="text-sm font-semibold text-plum-deep leading-relaxed whitespace-pre-line">
              {data.closing}
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <footer className="text-center py-2 px-4">
          <p className="text-[11px] text-caption leading-relaxed">
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
      <Card className="text-center flex flex-col items-center">
        <ScoreGauge score={score} label="종합 흐름 점수" color="#E0245A" />
        <h2 className="text-xl font-black text-ink mt-4 mb-2 tracking-tight">
          &ldquo;{teaser.headline}&rdquo;
        </h2>
        <p className="text-sm text-text-2 leading-relaxed whitespace-pre-line">
          {teaser.summary}
        </p>
      </Card>

      {/* Free Section 1 */}
      {teaser.freeSection && (
        <ReportSection
          title={teaser.freeSection.title}
          icon={<Sparkles className="w-5 h-5 text-coral" />}
        >
          <div className="text-sm text-ink leading-relaxed whitespace-pre-line">
            {teaser.freeSection.body}
          </div>
          {/* 뒷부분은 서버가 잘라서 보내지 않는다 → 실제 글 대신 흐린 자리 표시만 그린다 */}
          {teaser.freeSection.clipped && (
            <div className="relative mt-1">
              <p aria-hidden className="select-none text-sm leading-relaxed text-ink blur-[5px]">
                이어지는 이야기는 전체 리포트에서 볼 수 있어요. 두 번째 문단에는 지금까지의 흐름이 어디로 이어지는지,
                그리고 그 안에서 눈여겨볼 장면이 무엇인지가 담겨 있어요. 여기까지 읽었다면 뒷이야기도 궁금하실 거예요.
              </p>
              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-b from-white/10 via-white/70 to-white pb-1">
                {onLockedClick ? (
                  <button
                    type="button"
                    onClick={onLockedClick}
                    className="flex items-center gap-1.5 rounded-full border border-coral/40 bg-white px-4 py-2 text-xs font-extrabold text-coral-deep shadow-sm transition-all active:scale-[0.97]"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    이어서 읽기
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-caption">
                    <Lock className="h-3.5 w-3.5" />
                    이어지는 내용은 전체 리포트에서
                  </span>
                )}
              </div>
            </div>
          )}
        </ReportSection>
      )}

      {/* 3 Locked Sections (Hook only, NO full body DOM, surface-soft bg) */}
      <div className="flex flex-col gap-3">
        {(teaser.hooks || []).map((hook, idx) => {
          const specTitle = lockedSpecs[idx]?.title || `심층 분석 ${idx + 2}`;
          // 훅 문장은 궁금증을 만드는 핵심이라 한 줄로 자르지 않고 두 줄까지 보여 준다
          const body = (
            <>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-ink truncate">{specTitle}</span>
                  <Badge variant="popular" className="text-[10px] px-1.5 py-0.2">
                    잠금
                  </Badge>
                </div>
                <p className="text-xs text-text-2 leading-snug line-clamp-2">
                  {hook}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-white border border-line flex items-center justify-center shrink-0 shadow-2xs">
                <Lock className="w-4 h-4 text-coral" />
              </div>
            </>
          );
          const cls = "bg-surface-soft rounded-2xl p-4 border border-line flex items-center justify-between gap-3 text-left";
          return onLockedClick ? (
            <button
              key={idx}
              type="button"
              onClick={onLockedClick}
              className={`${cls} w-full transition-all hover:border-coral/40 active:scale-[0.98]`}
            >
              {body}
            </button>
          ) : (
            <div key={idx} className={cls}>
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
