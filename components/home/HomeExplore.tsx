"use client";

import React, { useMemo, useRef, useState } from "react";
import { type CatalogItem } from "@/lib/catalog";
import {
  HOME_CATEGORY_CHIPS,
  type HomeCategoryChipId,
  filterProductsByCategory,
  type ExploreTab,
} from "@/lib/home/explore";
import type { HomeRankingResult } from "@/lib/home/ranking";
import HomeHeroCompact from "@/components/home/HomeHeroCompact";
import HomeRankingView from "@/components/home/HomeRankingView";
import { PosterCard, SetStackCard } from "@/components/cards/KongdakCards";
import { trackEvent } from "@/lib/gtag";

/** 하위 호환 테스트용 표지 맵 유지 */
export const PRODUCT_COVER_MAP: Record<string, string> = {
  love_single: "/covers/cover_love_single.webp",
  reunion: "/covers/cover_reunion.webp",
  inner_mind: "/covers/cover_inner_mind.webp",
  annual_2027: "/covers/cover_2027.webp",
};

interface HomeExploreProps {
  locale: string;
  products?: CatalogItem[];
  ranking?: HomeRankingResult;
  tabs?: ExploreTab[];
  picks?: CatalogItem[];
}

export default function HomeExplore({
  locale,
  products = [],
  ranking,
  tabs = [],
}: HomeExploreProps) {
  const [selectedChip, setSelectedChip] = useState<HomeCategoryChipId>("all");
  const gridRef = useRef<HTMLDivElement | null>(null);

  const sourceProducts = useMemo(() => {
    if (products.length > 0) return products;
    const seen = new Map<string, CatalogItem>();
    for (const t of tabs) {
      for (const item of t.items) {
        seen.set(item.id, item);
      }
    }
    return [...seen.values()];
  }, [products, tabs]);

  const filtered = useMemo(
    () => filterProductsByCategory(sourceProducts, selectedChip),
    [sourceProducts, selectedChip],
  );

  const singleAndPremium = useMemo(
    () =>
      filtered
        .filter((p) => p.type !== "SET")
        .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99)),
    [filtered],
  );

  const sets = useMemo(
    () =>
      filtered
        .filter((p) => p.type === "SET")
        .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99)),
    [filtered],
  );

  const handleChipClick = (chipId: HomeCategoryChipId) => {
    setSelectedChip(chipId);
    trackEvent("home_tab_click", { tab: chipId, via: "category_chip" });
    if (chipId !== "all" && gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="w-full">
      {/* 1. 상단 카테고리 칩 1줄 */}
      <div className="w-full max-w-[480px] mx-auto px-4 pt-2 pb-1">
        <div
          role="tablist"
          aria-label="운세 카테고리"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
        >
          {HOME_CATEGORY_CHIPS.map((chip) => {
            const isSelected = chip.id === selectedChip;
            return (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleChipClick(chip.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold border transition-all active:scale-[0.96] ${
                  isSelected
                    ? "bg-[#FF5C77] text-white border-[#FF5C77] shadow-[0_4px_14px_rgba(255,92,119,0.35)]"
                    : "bg-[#22142A] text-[#B9A9BF] border-white/[0.08] hover:text-[#F6EEF3]"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 3:4 포스터 슬라이드 (폭 86%, 양옆 다음 카드 노출, 우상단 1/4) */}
      <HomeHeroCompact locale={locale} />

      {/* 3. 🔥 지금 많이 보는 운세 TOP 5 (실제 30일 집계 1곳만) */}
      {ranking && <HomeRankingView locale={locale} ranking={ranking} />}

      {/* 4. 2열 3:4 포스터 격자 (선택된 카테고리 칩에 맞춰 필터, 연말 특가는 포스터 위 금색 배지) */}
      <section
        id="explore"
        ref={gridRef}
        className="w-full max-w-[480px] mx-auto px-4 mt-8 scroll-mt-16"
        aria-label="사주 풀이 포스터 목록"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-extrabold text-[#F6EEF3] tracking-tight">
            ✨ {HOME_CATEGORY_CHIPS.find((c) => c.id === selectedChip)?.label ?? "전체"} 운세·궁합
          </h2>
          {selectedChip !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedChip("all")}
              className="text-xs font-bold text-[#FF5C77]"
            >
              전체 보기
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {singleAndPremium.map((item, idx) => (
            <PosterCard
              key={item.id}
              product={item}
              listName={`home_grid_${selectedChip}`}
              priority={idx < 2}
            />
          ))}
        </div>

        {/* 세트 카드 (겹친 표지 썸네일 + 따로 사면 / 세트가) */}
        {sets.length > 0 && (
          <div className="mt-6 space-y-2.5">
            <h3 className="text-sm font-extrabold text-[#F6EEF3] tracking-tight">
              🎁 함께 보면 아끼는 세트
            </h3>
            {sets.map((setItem) => (
              <SetStackCard
                key={setItem.id}
                product={setItem}
                listName={`home_sets_${selectedChip}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
