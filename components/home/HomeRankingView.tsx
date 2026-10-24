import React from "react";
import { HomeRankingResult } from "@/lib/home/ranking";
import { ListRowCard } from "@/components/cards/KongdakCards";

interface HomeRankingViewProps {
  locale: string;
  ranking: HomeRankingResult;
}

export default function HomeRankingView({ ranking }: HomeRankingViewProps) {
  if (ranking.items.length === 0) return null;

  return (
    <section className="w-full max-w-[480px] mx-auto px-4 mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg font-extrabold text-[#F6EEF3] tracking-tight">
          🔥 {ranking.title}
        </h2>
        {ranking.isRealRanking && (
          <span className="text-[11px] text-[#B9A9BF] font-medium">
            최근 30일 집계 기준
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {ranking.items.slice(0, 5).map(({ product, rank }) => (
          <ListRowCard
            key={product.id}
            product={product}
            rank={rank}
            listName="home_ranking_top5"
          />
        ))}
      </div>
    </section>
  );
}
