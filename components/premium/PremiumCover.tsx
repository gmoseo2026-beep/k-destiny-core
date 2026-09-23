import React from "react";
import { PremiumBadge } from "./PremiumBadge";

interface PremiumCoverProps {
  title: string;
  subtitle?: string;
  targetName: string;
  dateStr?: string;
  reportId?: string;
}

export function PremiumCover({
  title,
  subtitle,
  targetName,
  dateStr,
  reportId,
}: PremiumCoverProps) {
  const shortId = reportId ? reportId.replace(/-/g, "").slice(0, 8).toUpperCase() : "KD-PREMIUM";
  const publishedDate = dateStr ?? new Date().toISOString().slice(0, 10).replace(/-/g, ".");

  return (
    <section className="text-center py-12 md:py-16 border-b border-[#3A2E45]/80 relative overflow-hidden">
      {/* Decorative ambient background */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#D9B26A]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-4">
          <PremiumBadge text="KONGDAK PREMIUM" />
        </div>

        <p className="text-xs tracking-[0.25em] text-[#D9B26A]/80 uppercase mb-3 font-medium">
          Exclusive Life Blueprint
        </p>

        <h1 className="font-serif-kr text-2xl sm:text-4xl font-bold tracking-tight text-[#F6F1EA] mb-3 leading-snug">
          {title}
        </h1>

        {subtitle && (
          <p className="text-sm sm:text-base text-[#B9AEC4] max-w-md mx-auto mb-8 font-normal leading-relaxed">
            {subtitle}
          </p>
        )}

        <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#D9B26A]/60 to-transparent my-4" />

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#B9AEC4]">
          <div>
            <span className="text-[#D9B26A] mr-1.5 font-medium">대상</span>
            <span className="text-[#F6F1EA] font-semibold">{targetName}</span>
          </div>
          <div>
            <span className="text-[#D9B26A] mr-1.5 font-medium">발행일</span>
            <span>{publishedDate}</span>
          </div>
          <div>
            <span className="text-[#D9B26A] mr-1.5 font-medium">문서 번호</span>
            <span className="font-mono text-[#F3E3BF]">{shortId}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
