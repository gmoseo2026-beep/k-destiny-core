"use client";

import React from "react";
import { Star } from "lucide-react";
import type { PublicReviewItem } from "@/lib/couponsClient";

interface ProductReviewsSectionProps {
  reviews?: PublicReviewItem[];
  variant?: "detail" | "checkout";
}

/**
 * [P-016-4 §4] 실제 열람 구매자 후기 노출 (displayOk=true 만).
 * - 별점, 띠 이모지, 같은 사람 실제 누적 구매 수로 "N번째 구매" 배지 표시.
 * - 후기가 0개면 영역 자체를 숨긴다(가짜 후기·숫자 금지).
 */
export default function ProductReviewsSection({
  reviews = [],
  variant = "detail",
}: ProductReviewsSectionProps) {
  if (!reviews || reviews.length === 0) return null;

  if (variant === "checkout") {
    return (
      <div className="mb-4 rounded-2xl border border-line bg-surface-soft/70 p-3 text-left">
        <p className="mb-2 text-[11px] font-extrabold text-text-2">
          실제 구매자 후기 ({reviews.length})
        </p>
        <div className="flex flex-col gap-2">
          {reviews.slice(0, 2).map((r) => (
            <div key={r.id} className="rounded-xl bg-white p-2.5 border border-line/70">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs" aria-hidden="true">{r.zodiacEmoji}</span>
                  <span className="text-[11px] font-bold text-ink truncate">{r.zodiacLabel}</span>
                  <span className="rounded-full bg-coral-soft px-1.5 py-0.5 text-[10px] font-extrabold text-coral-deep shrink-0">
                    {r.purchaseCount}번째 구매
                  </span>
                </div>
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#C98A0B] shrink-0">
                  <Star className="w-3 h-3 fill-[#FFC24B] text-[#FFC24B]" />
                  {r.rating}.0
                </span>
              </div>
              <p className="text-xs text-text-2 leading-snug line-clamp-2">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="px-4 py-6 border-t border-line">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-base sm:text-lg font-extrabold text-ink tracking-tight">
          실제 구매자 후기
        </h3>
        <span className="text-xs font-bold text-coral">
          리포트 열람 인증
        </span>
      </div>
      <div className="space-y-2.5">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-line bg-white p-4 shadow-2xs text-left"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm" aria-hidden="true">{r.zodiacEmoji}</span>
                <span className="text-xs font-bold text-ink">{r.zodiacLabel}</span>
                <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[10px] font-extrabold text-coral-deep">
                  {r.purchaseCount}번째 구매
                </span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0" aria-label={`별점 ${r.rating}점`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < r.rating ? "fill-[#FFC24B] text-[#FFC24B]" : "text-line"
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-text-2 leading-relaxed whitespace-pre-line">
              {r.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
