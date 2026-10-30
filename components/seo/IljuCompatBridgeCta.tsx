"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/gtag";

export interface IljuCompatBridgeCtaProps {
  locale: string;
  slug: string;
  iljuName: string;
  position: "mid" | "bottom";
}

export function buildIljuCompatHref(locale: string): string {
  // [PII 보호] URL이나 쿼리스트링에 생년월일을 절대 넣지 않는다
  return `/${locale}/compat/new`;
}

export default function IljuCompatBridgeCta({
  locale,
  slug,
  iljuName,
  position,
}: IljuCompatBridgeCtaProps) {
  const href = buildIljuCompatHref(locale);

  return (
    <section className="w-full rounded-2xl border border-coral/35 bg-white p-5 shadow-[0_4px_16px_rgba(255,92,119,0.12)]">
      <h2 className="text-base font-black leading-snug text-ink break-keep">
        {iljuName}인 나 × 그 사람, 궁합은 몇 점일까?
      </h2>
      <p className="mt-1.5 mb-3.5 text-xs leading-relaxed text-text-2 break-keep">
        같은 {iljuName}라도 상대가 누구인지에 따라 마음의 온도와 호흡이 달라져요. 두 사람의 실제 궁합을 30초 만에 무료로 확인해 보세요.
      </p>
      <Link
        href={href}
        prefetch={false}
        onClick={() =>
          trackEvent("ilju_compat_cta_click", {
            slug,
            position,
          })
        }
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-coral px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all hover:bg-coral-deep active:scale-[0.96]"
      >
        <span>상대 생일만 넣고 무료로 보기</span>
        <ArrowRight className="h-4 w-4 shrink-0" />
      </Link>
    </section>
  );
}
