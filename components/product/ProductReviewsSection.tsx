"use client";

import React from "react";
import { Star } from "lucide-react";
import type { PublicReviewItem } from "@/lib/couponsClient";
import { getProduct, type CatalogItem } from "@/lib/catalog";
import { ListRowCard } from "@/components/cards/KongdakCards";

interface ProductReviewsSectionProps {
  reviews?: PublicReviewItem[];
  variant?: "detail" | "checkout" | "home";
  catalogById?: Record<string, CatalogItem>;
}

/**
 * [P-016-4 / P-017] 실제 열람 구매자 후기 노출 (displayOk=true 만).
 * - 별점, 띠 이모지, 같은 사람 실제 누적 구매 수로 "N번째 구매" 배지 표시.
 * - 후기가 0개면 영역 자체를 숨긴다(가짜 후기·숫자 금지).
 * - variant === "home" 일 때는 각 후기 아래에 해당 상품의 ListRowCard 를 함께 보여 준다.
 */
export default function ProductReviewsSection({
  reviews = [],
  variant = "detail",
  catalogById,
}: ProductReviewsSectionProps) {
  if (!reviews || reviews.length === 0) return null;

  if (variant === "checkout") {
    return (
      <div className="mb-4 rounded-2xl border border-white/[0.08] bg-[#140B18]/80 p-3 text-left">
        <p className="mb-2 text-[11px] font-extrabold text-[#B9A9BF]">
          실제 구매자 후기 ({reviews.length})
        </p>
        <div className="flex flex-col gap-2">
          {reviews.slice(0, 2).map((r) => (
            <div key={r.id} className="rounded-xl bg-[#22142A] p-2.5 border border-white/[0.08]">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs" aria-hidden="true">{r.zodiacEmoji}</span>
                  <span className="text-[11px] font-bold text-[#F6EEF3] truncate">{r.zodiacLabel}</span>
                  <span className="rounded-full bg-[#FF5C77]/15 px-1.5 py-0.5 text-[10px] font-extrabold text-[#FF5C77] shrink-0">
                    {r.purchaseCount}번째 구매
                  </span>
                </div>
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#FFC24B] shrink-0">
                  <Star className="w-3 h-3 fill-[#FFC24B] text-[#FFC24B]" />
                  {r.rating}.0
                </span>
              </div>
              <p className="text-xs text-[#B9A9BF] leading-snug line-clamp-2">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section
      className={
        variant === "home"
          ? "w-full max-w-[480px] mx-auto px-4 mt-8"
          : "px-4 py-6 border-t border-white/[0.08]"
      }
    >
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-base sm:text-lg font-extrabold text-[#F6EEF3] tracking-tight">
          💬 실제 구매자 후기
        </h3>
        <span className="text-xs font-bold text-[#FF5C77]">
          리포트 열람 인증
        </span>
      </div>
      <div className="space-y-3">
        {reviews.map((r) => {
          const reviewedProduct =
            catalogById?.[r.catalogId] ?? getProduct(r.catalogId);
          return (
            <div
              key={r.id}
              className="rounded-2xl border border-white/[0.08] bg-[#22142A] p-4 text-left space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm" aria-hidden="true">{r.zodiacEmoji}</span>
                    <span className="text-xs font-bold text-[#F6EEF3]">{r.zodiacLabel}</span>
                    <span className="rounded-full bg-[#FF5C77]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#FF5C77]">
                      {r.purchaseCount}번째 구매
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0" aria-label={`별점 ${r.rating}점`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < r.rating ? "fill-[#FFC24B] text-[#FFC24B]" : "text-white/15"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-[#F6EEF3]/90 leading-relaxed whitespace-pre-line">
                  {r.text}
                </p>
              </div>

              {variant === "home" && reviewedProduct && (
                <div className="pt-2 border-t border-white/[0.08]">
                  <ListRowCard
                    product={reviewedProduct}
                    listName="home_review_product"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
