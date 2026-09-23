import React from "react";
import Link from "next/link";
import Image from "next/image";
import { HomeRankingResult } from "@/lib/home/ranking";
import { priceLabel } from "@/lib/catalog";

interface HomeRankingViewProps {
  locale: string;
  ranking: HomeRankingResult;
}

export default function HomeRankingView({ locale, ranking }: HomeRankingViewProps) {
  if (ranking.items.length === 0) return null;

  return (
    <section className="w-full max-w-[480px] mx-auto px-4 mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-extrabold text-ink tracking-tight">
          {ranking.title}
        </h2>
        {ranking.isRealRanking && (
          <span className="text-[11px] text-caption font-medium">최근 30일 집계 기준</span>
        )}
      </div>

      <div className="space-y-2.5">
        {ranking.items.map(({ product, rank }) => (
          <Link
            key={product.id}
            href={`/${locale}/products/${product.id}`}
            className="group flex items-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-surface-soft border border-line transition-all duration-150 active:scale-[0.97]"
          >
            {/* Rank Number (if real ranking) */}
            {rank ? (
              <span className="w-6 text-center text-base sm:text-lg font-black text-coral shrink-0">
                {rank}
              </span>
            ) : (
              <span className="w-2 shrink-0" />
            )}

            {/* 3D Icon 52px */}
            <div className="w-[52px] h-[52px] relative shrink-0">
              <Image
                src={product.icon3d}
                alt=""
                width={52}
                height={52}
                className="object-contain"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-ink group-hover:text-coral transition-colors truncate">
                  {product.name}
                </span>
                {product.isPopular && (
                  <span className="text-[10px] font-bold text-coral-deep bg-coral-soft px-1.5 py-0.5 rounded-full">
                    인기
                  </span>
                )}
                {product.isFree && (
                  <span className="text-[10px] font-bold text-white bg-coral px-1.5 py-0.5 rounded-full">
                    무료
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-2 truncate mt-0.5">
                {product.hook || product.description}
              </p>
              <div className="text-[11px] font-extrabold text-caption mt-1">
                {priceLabel(product)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
