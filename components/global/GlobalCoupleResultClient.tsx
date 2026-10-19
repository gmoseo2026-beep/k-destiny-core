"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMessages, useTranslations } from "next-intl";
import {
  Copy,
  MessageCircleQuestion,
  RefreshCw,
  RotateCcw,
  Share2,
  Sparkles,
} from "lucide-react";
import GlobalChrome from "@/components/global/GlobalChrome";
import KongdakMascot from "@/components/KongdakMascot";
import {
  buildCompatGaugeItems,
  type CompatPublicBreakdown,
} from "@/lib/compatGauge";
import { parseCompatFreeText } from "@/lib/compatFreeText";
import type { GlobalCoupleLocale } from "@/lib/globalCoupleLocale";
import { trackEvent } from "@/lib/gtag";
import { Card } from "@/components/ui/Card";

export interface GlobalCompatData {
  id: string;
  shareToken: string;
  relation: string;
  score: number;
  keywords: string[];
  summaryKo: string | null;
  publicBreakdown?: CompatPublicBreakdown | null;
  personA: { name: string; gender: string };
  personB: { name: string; gender: string };
}

interface GlobalCoupleResultClientProps {
  initialData: GlobalCompatData;
  locale: GlobalCoupleLocale;
  refToken?: string;
}

interface CoupleMessagesShape {
  keywords?: Record<string, string>;
  gauges?: {
    axes?: Record<string, { label?: string; description?: string }>;
    steps?: Record<string, string>;
  };
}

export default function GlobalCoupleResultClient({
  initialData,
  locale,
  refToken,
}: GlobalCoupleResultClientProps) {
  const t = useTranslations("Couple");
  const messages = useMessages() as { Couple?: CoupleMessagesShape };

  const [data] = useState<GlobalCompatData>(initialData);
  const [summary, setSummary] = useState<string | null>(initialData.summaryKo);
  const [isGenerating, setIsGenerating] = useState<boolean>(
    !initialData.summaryKo
  );
  const [aiError, setAiError] = useState<boolean>(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState<boolean>(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      typeof window.navigator?.share === "function"
    ) {
      queueMicrotask(() => setCanNativeShare(true));
    }
  }, []);

  const generateReading = useCallback(async () => {
    setIsGenerating(true);
    setAiError(false);
    try {
      const res = await fetch("/api/generate-compat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareToken: data.shareToken,
          compatId: data.id,
          isPremium: false,
        }),
      });
      if (!res.ok) {
        setAiError(true);
        setIsGenerating(false);
        return;
      }
      const text = await res.text();
      if (text && text.trim().length > 0) {
        setSummary(text);
      } else {
        setAiError(true);
      }
    } catch {
      setAiError(true);
    } finally {
      setIsGenerating(false);
    }
  }, [data.id, data.shareToken]);

  useEffect(() => {
    if (!initialData.summaryKo) {
      queueMicrotask(() => {
        void generateReading();
      });
    }
  }, [initialData.summaryKo, generateReading]);

  // Translate deterministic keywords; hide & warn if any key is missing (never leak Korean)
  const translatedKeywords = React.useMemo(() => {
    const keywordMap = messages.Couple?.keywords ?? {};
    const out: string[] = [];
    for (const kw of data.keywords) {
      const translated = keywordMap[kw];
      if (translated && translated.trim().length > 0) {
        out.push(translated);
      } else {
        console.warn(
          `[GlobalCoupleResult] Missing keyword translation for locale="${locale}": "${kw}"`
        );
      }
    }
    return out;
  }, [data.keywords, messages.Couple, locale]);

  // Translate ONLY the 3 public gauges (never render locked 2 gauges)
  const publicGaugeItems = React.useMemo(() => {
    const gaugeAxesMap = messages.Couple?.gauges?.axes ?? {};
    const gaugeStepsMap = messages.Couple?.gauges?.steps ?? {};
    const all = buildCompatGaugeItems(data.publicBreakdown, null);
    if (!all) return [];
    const out: {
      key: string;
      label: string;
      description: string;
      stepLabel: string;
      score: number;
      max: number;
      filledCells: number;
      totalCells: number;
    }[] = [];

    for (const item of all) {
      if (!item.isPublic || item.score === null || !item.step) continue;
      const axisTrans = gaugeAxesMap[item.key];
      const stepTrans = gaugeStepsMap[item.step.stepLabel];
      if (!axisTrans?.label || !stepTrans) {
        console.warn(
          `[GlobalCoupleResult] Missing gauge translation for locale="${locale}": key="${item.key}", step="${item.step.stepLabel}"`
        );
        continue;
      }
      out.push({
        key: item.key,
        label: axisTrans.label,
        description: axisTrans.description ?? "",
        stepLabel: stepTrans,
        score: item.score,
        max: item.max,
        filledCells: item.step.filledCells,
        totalCells: item.totalCells,
      });
    }
    return out;
  }, [data.publicBreakdown, messages.Couple, locale]);

  const freeView = parseCompatFreeText(summary);

  const moodText =
    data.score >= 90
      ? t("mood_90")
      : data.score >= 80
      ? t("mood_80")
      : data.score >= 70
      ? t("mood_70")
      : data.score >= 60
      ? t("mood_60")
      : t("mood_low");

  const getShareUrl = () => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://kongdak.kr";
    return `${origin}/${locale}/couple/${data.shareToken}?ref=${encodeURIComponent(
      data.shareToken
    )}`;
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      trackEvent("share_created", {
        shareToken: data.shareToken,
        type: "link",
        locale,
        flow: "global",
      });
      trackEvent("share_click", {
        channel: "copy_link",
        locale,
        flow: "global",
      });
      setCopyToast(t("share_copied_toast"));
      setTimeout(() => setCopyToast(null), 2500);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (
      typeof window === "undefined" ||
      typeof window.navigator?.share !== "function"
    ) {
      return;
    }
    const url = getShareUrl();
    try {
      await window.navigator.share({
        title: `${data.personA.name} ❤️ ${data.personB.name} — ${data.score} ${t(
          "score_unit"
        )}`,
        url,
      });
      trackEvent("share_created", {
        shareToken: data.shareToken,
        type: "native",
        locale,
        flow: "global",
      });
      trackEvent("share_click", {
        channel: "native_share",
        locale,
        flow: "global",
      });
    } catch {
      // User cancelled share sheet
    }
  };

  const tryAgainHref = refToken
    ? `/${locale}/couple?ref=${encodeURIComponent(refToken)}`
    : `/${locale}/couple`;

  return (
    <GlobalChrome locale={locale} shareToken={data.shareToken}>
      <div className="w-full flex flex-col items-center pb-10">
        {copyToast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#2B2430] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xl border border-[#FF8AA1]/30">
            {copyToast}
          </div>
        )}

        {/* 1. Main Score Card */}
        <div className="w-full bg-gradient-to-br from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] rounded-3xl p-6 sm:p-7 text-white text-center shadow-lg relative overflow-hidden">
          <div className="absolute bottom-3 left-5 text-white/10 text-2xl font-black select-none pointer-events-none">
            kongdak
          </div>

          <h1 className="text-xs sm:text-sm font-extrabold text-white/90 uppercase tracking-wider mb-4">
            {t("result_header")}
          </h1>

          {/* Couple Mascots & Red Thread */}
          <div className="relative flex items-center justify-between w-full max-w-xs mx-auto mb-4 px-2">
            <div className="flex flex-col items-center gap-1.5 z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md p-1 border border-white/30 shadow-md flex items-center justify-center">
                <KongdakMascot size={50} expression="canon" animate="pulse" />
              </div>
              <span className="text-xs font-bold text-white bg-black/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm truncate max-w-[92px]">
                {data.personA.name}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center flex-1 px-1 z-10">
              <div className="w-14 h-12 flex items-center justify-center">
                <KongdakMascot
                  size={52}
                  expression="couple"
                  animate="heartbeat"
                />
              </div>
              <span className="text-[10px] font-extrabold text-[#FFC24B] tracking-wider bg-black/25 px-2 py-0.5 rounded-full mt-0.5">
                {t("red_thread_badge")}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5 z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md p-1 border border-white/30 shadow-md flex items-center justify-center">
                <KongdakMascot
                  size={50}
                  expression="canon_white"
                  animate="pulse"
                />
              </div>
              <span className="text-xs font-bold text-white bg-black/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm truncate max-w-[92px]">
                {data.personB.name}
              </span>
            </div>
          </div>

          {/* Score Number */}
          <div className="flex items-center justify-center gap-3 my-2">
            <KongdakMascot size={60} score={data.score} animate="heartbeat" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-6xl font-black tracking-tight drop-shadow-md">
                {data.score}
              </span>
              <span className="text-2xl font-bold text-[#FFC24B]">
                {t("score_unit")}
              </span>
            </div>
          </div>

          {data.score >= 90 && (
            <div className="flex items-center justify-center gap-1 text-xs font-bold text-[#FFC24B] my-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t("best_match_badge")}</span>
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Mood Badge */}
          <div className="inline-flex items-center gap-1.5 bg-black/25 backdrop-blur-md text-[#FFF6F1] px-4 py-1.5 rounded-full text-xs font-bold border border-white/20 my-2 shadow-sm">
            {moodText}
          </div>

          {/* 2. Deterministic Keywords (3 chips, translated) */}
          {translatedKeywords.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {translatedKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="bg-white/20 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm border border-white/20"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 3. Public 3-Axis Compatibility Breakdown (no locked axes) */}
        {publicGaugeItems.length > 0 && (
          <Card className="w-full mt-4 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-[#2B2430]">
                {t("gauge_section_title")}
              </h2>
              <span className="text-[11px] font-bold text-text-3">
                {t("gauge_section_sub")}
              </span>
            </div>
            <div className="space-y-3">
              {publicGaugeItems.map((item) => (
                <div key={item.key} className="text-left">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-extrabold text-[#2B2430] truncate">
                        {item.label}
                      </span>
                      <span className="rounded-md bg-[#FFF0F3] px-1.5 py-0.5 text-[11px] font-bold text-[#FF5C77] shrink-0">
                        {item.stepLabel}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-[#6A2C70] tabular-nums shrink-0">
                      {item.score}/{item.max}
                    </span>
                  </div>
                  <div
                    className="mt-1.5 grid gap-1"
                    style={{
                      gridTemplateColumns: `repeat(${item.totalCells}, minmax(0, 1fr))`,
                    }}
                  >
                    {Array.from({ length: item.totalCells }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1.5 rounded-full ${
                          idx < item.filledCells ? "bg-[#FF5C77]" : "bg-line"
                        }`}
                      />
                    ))}
                  </div>
                  {item.description && (
                    <p className="mt-1 text-[11px] text-text-3 leading-snug">
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 4. AI Free Reading Card */}
        <Card className="w-full mt-4 p-5">
          <div className="flex items-center gap-2 mb-3.5">
            <Sparkles className="w-4 h-4 text-[#FF5C77]" />
            <h2 className="text-base font-black text-[#2B2430]">
              {t("ai_section_title")}
            </h2>
          </div>

          {isGenerating ? (
            <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
              <KongdakMascot size={84} animate="bounce" />
              <p className="text-sm font-bold text-[#6A2C70] animate-pulse">
                {t("ai_loading_title")}
              </p>
              <div className="w-full space-y-2 mt-1">
                <div className="h-3 bg-surface-soft rounded-full animate-pulse w-full" />
                <div className="h-3 bg-surface-soft rounded-full animate-pulse w-4/5 mx-auto" />
              </div>
              <p className="text-xs text-text-3">{t("ai_loading_sub")}</p>
            </div>
          ) : aiError ? (
            <div className="rounded-2xl bg-surface-soft p-4 text-center space-y-3">
              <p className="text-xs font-semibold text-text-2">
                {t("ai_error_msg")}
              </p>
              <button
                type="button"
                onClick={() => void generateReading()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF5C77] px-4 py-2.5 text-xs font-extrabold text-white shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t("ai_retry_btn")}</span>
              </button>
            </div>
          ) : freeView?.kind === "scenes" ? (
            <>
              <p className="mb-3 text-xs font-bold text-text-3">
                {t("ai_scenes_intro", {
                  nameA: data.personA.name,
                  nameB: data.personB.name,
                })}
              </p>
              <ul className="flex flex-col gap-2.5">
                {freeView.scenes.map((line, i) => (
                  <li
                    key={i}
                    className="rounded-2xl bg-surface-soft px-4 py-3 text-sm font-medium leading-relaxed text-[#2B2430]"
                  >
                    {line}
                  </li>
                ))}
              </ul>
              {freeView.unsaid && (
                <div className="mt-4 rounded-2xl border border-[#FF5C77]/30 bg-[#FFF0F3] p-4 text-left">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-[#FF5C77]">
                    <MessageCircleQuestion className="h-3.5 w-3.5" />
                    {t("ai_unsaid_title")}
                  </span>
                  <p className="text-sm font-bold leading-relaxed text-[#2B2430]">
                    {freeView.unsaid}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-[#2B2430] leading-relaxed space-y-3 whitespace-pre-line font-medium">
              {freeView?.kind === "legacy" ? freeView.text : ""}
            </div>
          )}
        </Card>

        {/* 5. Share & Try Again Actions */}
        <div className="w-full mt-5 space-y-2.5">
          <div
            className={`grid gap-2.5 ${
              canNativeShare ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#2B2430] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm"
            >
              <Copy className="w-4 h-4" />
              <span>{t("share_copy_btn")}</span>
            </button>

            {canNativeShare && (
              <button
                type="button"
                onClick={() => void handleNativeShare()}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#FF5C77] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>{t("share_native_btn")}</span>
              </button>
            )}
          </div>

          <Link
            href={tryAgainHref}
            className="w-full py-3.5 px-4 rounded-2xl bg-white border border-line text-[#2B2430] hover:bg-surface-soft text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4 text-[#FF5C77]" />
            <span>{t("try_again_btn")}</span>
          </Link>
        </div>

        {/* 6. Entertainment & Self-Reflection Disclaimer */}
        <p className="mt-6 text-center text-xs text-text-3">
          {t("disclaimer")}
        </p>
      </div>
    </GlobalChrome>
  );
}
