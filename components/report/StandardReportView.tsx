"use client";

import React, { useRef } from "react";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { ReportSection } from "@/components/ui/ReportSection";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { StandardReport, StandardTeaser } from "@/lib/reports/standard";
import { getTeaserBlurCopy } from "@/lib/teaserBlurCopy";
import { splitLeadSentence, clampGaugePercent } from "@/lib/reportSectionLead";
import { useSeenOnce } from "@/lib/useSeenOnce";
import { Lock, Sparkles, CheckCircle2, XCircle, Heart, MessageCircleQuestion } from "lucide-react";

interface LockedSectionInfo {
  key: string;
  title: string;
}

interface StandardReportViewProps {
  mode: "teaser" | "full";
  score: number;
  data: StandardReport | StandardTeaser;
  catalogId?: string;
  lockedSpecs?: LockedSectionInfo[];
  onLockedClick?: () => void;
  onLastSectionSeen?: () => void;
}

function isFullReport(mode: "teaser" | "full", data: StandardReport | StandardTeaser): data is StandardReport {
  return mode === "full" && "sections" in data;
}

export default function StandardReportView({
  mode,
  score,
  data,
  catalogId,
  lockedSpecs = [],
  onLockedClick,
  onLastSectionSeen,
}: StandardReportViewProps) {
  const lastSectionRef = useRef<HTMLDivElement | null>(null);
  const full = isFullReport(mode, data);
  useSeenOnce(lastSectionRef, () => onLastSectionSeen?.(), full && Boolean(onLastSectionSeen));

  if (full) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
        {/* Score & Headline Card */}
        <Card className="text-center flex flex-col items-center">
          <ScoreGauge score={score} label="종합 흐름 점수" color="#FF5C77" />
          <div className="mt-2.5 w-full max-w-[220px]">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#140B18] border border-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] transition-all duration-700"
                style={{ width: `${clampGaugePercent(score)}%` }}
              />
            </div>
          </div>
          <h2 className="text-xl font-black text-[#F6EEF3] mt-4 mb-2 tracking-tight">
            &ldquo;{data.headline}&rdquo;
          </h2>
          <p className="text-[15px] text-[#B9A9BF] leading-[1.7] whitespace-pre-line">
            {data.summary}
          </p>
        </Card>

        {/* 4 Full Sections (본문 17px, 줄간격 1.75) */}
        <div className="flex flex-col gap-4">
          {data.sections.map((section, idx) => {
            const { lead, rest } = splitLeadSentence(section.body);
            return (
              <div key={section.key || idx} ref={idx === data.sections.length - 1 ? lastSectionRef : undefined}>
                <ReportSection
                  title={section.title}
                  icon={<Sparkles className="w-5 h-5 text-[#FF5C77]" />}
                >
                  {lead && (
                    <div className="mb-4 rounded-2xl border border-[#FF5C77]/30 bg-[#140B18] px-4 py-3">
                      <span className="inline-block rounded-full bg-[#FF5C77]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#FF8AA1] mb-1">
                        한 줄 결론
                      </span>
                      <p className="text-[15px] font-extrabold text-[#F6EEF3] leading-snug break-keep">
                        {lead}
                      </p>
                    </div>
                  )}
                  <div className="text-[17px] text-[#F6EEF3] leading-[1.75] whitespace-pre-line">
                    {rest}
                  </div>
                </ReportSection>
              </div>
            );
          })}
        </div>

        {/* Advice (Do & Don't) */}
        {data.advice && (
          <Card className="flex flex-col gap-4">
            <h3 className="font-extrabold text-base text-[#F6EEF3] flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#FF5C77]" />
              두근이의 실천 조언
            </h3>

            {/* DO */}
            <div className="bg-emerald-950/35 border border-emerald-500/25 rounded-2xl p-4">
              <span className="text-xs font-bold text-emerald-300 block mb-2">
                ✨ 하면 좋은 것 (DO)
              </span>
              <ul className="flex flex-col gap-2">
                {data.advice.do.map((item, i) => (
                  <li key={i} className="text-[15px] text-[#F6EEF3] flex items-start gap-2 leading-[1.65]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* DONT */}
            <div className="bg-rose-950/35 border border-rose-500/25 rounded-2xl p-4">
              <span className="text-xs font-bold text-rose-300 block mb-2">
                ⚠️ 조심할 것 (DON&apos;T)
              </span>
              <ul className="flex flex-col gap-2">
                {data.advice.dont.map((item, i) => (
                  <li key={i} className="text-[15px] text-[#F6EEF3] flex items-start gap-2 leading-[1.65]">
                    <XCircle className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}

        {/* Closing */}
        {data.closing && (
          <div className="bg-[#22142A] rounded-2xl p-5 border border-white/[0.08] text-center">
            <p className="text-[15px] font-semibold text-[#FFC24B] leading-[1.7] whitespace-pre-line">
              {data.closing}
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <footer className="text-center py-2 px-4">
          <p className="text-[11px] text-[#B9A9BF] leading-relaxed">
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
        <ScoreGauge score={score} label="종합 흐름 점수" color="#FF5C77" />
        <div className="mt-2.5 w-full max-w-[220px]">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#140B18] border border-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] transition-all duration-700"
              style={{ width: `${clampGaugePercent(score)}%` }}
            />
          </div>
        </div>
        <h2 className="text-xl font-black text-[#F6EEF3] mt-4 mb-2 tracking-tight">
          &ldquo;{teaser.headline}&rdquo;
        </h2>
        <p className="text-[15px] text-[#B9A9BF] leading-[1.7] whitespace-pre-line">
          {teaser.summary}
        </p>
      </Card>

      {/* Free Section 1 */}
      {teaser.freeSection && (() => {
        const { lead, rest } = splitLeadSentence(teaser.freeSection.body);
        return (
          <ReportSection
            title={teaser.freeSection.title}
            icon={<Sparkles className="w-5 h-5 text-[#FF5C77]" />}
          >
            {lead && (
              <div className="mb-4 rounded-2xl border border-[#FF5C77]/30 bg-[#140B18] px-4 py-3">
                <span className="inline-block rounded-full bg-[#FF5C77]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#FF8AA1] mb-1">
                  한 줄 결론
                </span>
                <p className="text-[15px] font-extrabold text-[#F6EEF3] leading-snug break-keep">
                  {lead}
                </p>
              </div>
            )}
            <div className="text-[17px] text-[#F6EEF3] leading-[1.75] whitespace-pre-line">
              {rest}
            </div>
            {teaser.freeSection.clipped && (
              <div className="relative mt-2">
                <p aria-hidden className="select-none text-[16px] leading-[1.75] text-[#F6EEF3] blur-[5px]">
                  {getTeaserBlurCopy(catalogId)}
                </p>
                <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-b from-transparent via-[#22142A]/85 to-[#22142A] pb-1">
                  {onLockedClick ? (
                    <button
                      type="button"
                      onClick={onLockedClick}
                      className="flex items-center gap-1.5 rounded-full border border-[#FF5C77]/45 bg-[#140B18] px-4 py-2 text-xs font-extrabold text-[#FF8AA1] shadow-sm transition-all active:scale-[0.97]"
                    >
                      <Lock className="h-3.5 w-3.5 text-[#FF5C77]" />
                      이어서 읽기
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#B9A9BF]">
                      <Lock className="h-3.5 w-3.5 text-[#FF5C77]" />
                      이어지는 내용은 전체 리포트에서
                    </span>
                  )}
                </div>
              </div>
            )}
          </ReportSection>
        );
      })()}

      {/* 답을 숨긴 질문 */}
      {teaser.unsaid && (
        <div className="rounded-2xl border border-[#FF5C77]/35 bg-[#22142A] p-4 text-left">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-[#FF8AA1]">
            <MessageCircleQuestion className="h-3.5 w-3.5 text-[#FF5C77]" />
            아직 모르는 것 하나
          </span>
          <p className="text-[16px] font-bold leading-relaxed text-[#F6EEF3]">{teaser.unsaid}</p>
          {onLockedClick && (
            <button
              type="button"
              onClick={onLockedClick}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FF5C77] py-3 text-sm font-bold text-white transition-all active:scale-[0.96]"
            >
              <Lock className="h-3.5 w-3.5" />
              답 보기
            </button>
          )}
        </div>
      )}

      {/* 3 Locked Sections */}
      <div className="flex flex-col gap-3">
        {(teaser.hooks || []).map((hook, idx) => {
          const specTitle = lockedSpecs[idx]?.title || `심층 분석 ${idx + 2}`;
          const body = (
            <>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#F6EEF3] truncate">{specTitle}</span>
                  <Badge variant="popular" className="text-[10px] px-1.5 py-0.2">
                    잠금
                  </Badge>
                </div>
                <p className="text-xs text-[#B9A9BF] leading-snug line-clamp-2">
                  {hook}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#140B18] border border-white/[0.08] flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-[#FF5C77]" />
              </div>
            </>
          );
          const cls = "bg-[#22142A] rounded-2xl p-4 border border-white/[0.08] flex items-center justify-between gap-3 text-left";
          return onLockedClick ? (
            <button
              key={idx}
              type="button"
              onClick={onLockedClick}
              className={`${cls} w-full transition-all hover:border-[#FF5C77]/40 active:scale-[0.98]`}
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
