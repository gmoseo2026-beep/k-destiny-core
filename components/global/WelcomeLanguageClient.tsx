"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/gtag";
import {
  buildWelcomeTargetHref,
  detectPreferredWelcomeLang,
} from "@/lib/globalCoupleLocale";

type WelcomeLang = "ko" | "en" | "ja" | "zh";

interface LangOption {
  lang: WelcomeLang;
  flag: string;
  label: string;
  sublabel: string;
}

const BASE_OPTIONS: LangOption[] = [
  {
    lang: "ko",
    flag: "🇰🇷",
    label: "한국어 — 우리 궁합 보기",
    sublabel: "생년월일로 보는 30초 사주 궁합",
  },
  {
    lang: "en",
    flag: "🌐",
    label: "English — Korean Couple Compatibility",
    sublabel: "30-second Korean birth-date chemistry",
  },
  {
    lang: "ja",
    flag: "🇯🇵",
    label: "日本語 — 韓国式のカップル相性占い",
    sublabel: "生年月日で占う30秒の韓国式カップル相性",
  },
  {
    lang: "zh",
    flag: "🇨🇳",
    label: "中文(简体) — 韩式情侣缘分合盘",
    sublabel: "用出生日期测算30秒韩式情侣缘分",
  },
];

export default function WelcomeLanguageClient() {
  const searchParams = useSearchParams();
  const [preferredLang, setPreferredLang] = useState<WelcomeLang>("ko");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const detected = detectPreferredWelcomeLang(window.navigator.language);
      queueMicrotask(() => setPreferredLang(detected));
    }
  }, []);

  const orderedOptions = React.useMemo(() => {
    const top = BASE_OPTIONS.find((o) => o.lang === preferredLang);
    const rest = BASE_OPTIONS.filter((o) => o.lang !== preferredLang);
    return top ? [top, ...rest] : BASE_OPTIONS;
  }, [preferredLang]);

  const currentSearch = searchParams?.toString() ?? "";

  return (
    <div className="-mt-14 min-h-dvh w-full bg-[#FFF6F1] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px] bg-white rounded-3xl border border-[#FFE3EA] shadow-lg p-6 sm:p-7 flex flex-col items-center text-center">
        {/* Brand Logo & Mascot */}
        <div className="w-16 h-16 rounded-2xl bg-[#FFF6F1] border border-[#FFE3EA] flex items-center justify-center mb-3 shadow-xs">
          <Image
            src="/mascot/transparent/couple_red_thread.webp"
            alt="kongdak"
            width={48}
            height={48}
            className="object-contain"
            priority
          />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0F3] text-[#FF5C77] text-[11px] font-extrabold tracking-wide mb-2">
          <span>KONGDAK · 콩닥</span>
        </div>
        <h1 className="text-lg sm:text-xl font-black text-[#2B2430] leading-snug">
          Choose Your Language
        </h1>
        <p className="text-xs text-text-3 mt-1 mb-5">
          언어를 선택해 주세요 · 言語を選択 · 请选择语言
        </p>

        {/* 4 Language Buttons */}
        <div className="w-full space-y-2.5">
          {orderedOptions.map((opt, idx) => {
            const isHighlighted = idx === 0;
            const targetHref = buildWelcomeTargetHref(opt.lang, currentSearch);
            return (
              <a
                key={opt.lang}
                href={targetHref}
                role="button"
                data-lang={opt.lang}
                data-highlighted={isHighlighted ? "true" : "false"}
                onClick={() =>
                  trackEvent("welcome_language_click", { lang: opt.lang })
                }
                className={`w-full rounded-2xl px-4 py-3.5 text-left transition-all flex items-center justify-between gap-3 ${
                  isHighlighted
                    ? "bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] text-white shadow-md ring-2 ring-[#FF5C77]/30"
                    : "bg-[#22142A] hover:bg-[#2C1A36] text-[#F6EEF3] border border-white/10"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0" aria-hidden="true">
                    {opt.flag}
                  </span>
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-extrabold leading-snug ${
                        isHighlighted ? "text-white" : "text-[#F6EEF3]"
                      }`}
                    >
                      {opt.label}
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 truncate ${
                        isHighlighted ? "text-white/85" : "text-[#B9A9BF]"
                      }`}
                    >
                      {opt.sublabel}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs font-extrabold shrink-0 px-2.5 py-1 rounded-full ${
                    isHighlighted
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-[#FF5C77] border border-white/15"
                  }`}
                >
                  →
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
