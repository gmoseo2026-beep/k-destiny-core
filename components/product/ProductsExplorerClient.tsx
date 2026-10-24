"use client";

import React, { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { CatalogItem } from "@/lib/catalog";
import {
  HOME_CATEGORY_CHIPS,
  type HomeCategoryChipId,
  filterProductsByCategory,
} from "@/lib/home/explore";
import { PosterCard, SetStackCard } from "@/components/cards/KongdakCards";
import { trackEvent } from "@/lib/gtag";

export default function ProductsExplorerClient({
  products,
}: {
  products: CatalogItem[];
}) {
  const [selectedChip, setSelectedChip] = useState<HomeCategoryChipId>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const byCategory = filterProductsByCategory(products, selectedChip);
    const q = query.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.gridLabel && p.gridLabel.toLowerCase().includes(q)) ||
        (p.hook && p.hook.toLowerCase().includes(q)) ||
        p.description.toLowerCase().includes(q),
    );
  }, [products, selectedChip, query]);

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

  return (
    <div className="mx-auto w-full max-w-[480px] px-4 pt-3 pb-28 sm:pb-16">
      <h1 className="text-lg font-extrabold text-[#F6EEF3] tracking-tight">
        전체 운세 · 궁합
      </h1>
      <p className="mt-0.5 text-xs text-[#B9A9BF]">
        지금 궁금한 주제나 단어로 찾아보세요
      </p>

      {/* 검색 입력창 */}
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B9A9BF]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 재회, 속마음, 결혼, 신년운, 이름..."
          className="w-full rounded-2xl border border-white/[0.08] bg-[#22142A] py-3 pl-10 pr-9 text-sm text-[#F6EEF3] placeholder:text-[#B9A9BF]/70 focus:border-[#FF5C77] focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="검색어 지우기"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#B9A9BF] hover:text-[#F6EEF3]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 카테고리 칩 */}
      <div
        role="tablist"
        aria-label="운세 카테고리"
        className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
      >
        {HOME_CATEGORY_CHIPS.map((chip) => {
          const isSelected = chip.id === selectedChip;
          return (
            <button
              key={chip.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setSelectedChip(chip.id);
                trackEvent("products_category_chip", { tab: chip.id });
              }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold border transition-all active:scale-[0.96] ${
                isSelected
                  ? "bg-[#FF5C77] text-white border-[#FF5C77]"
                  : "bg-[#22142A] text-[#B9A9BF] border-white/[0.08] hover:text-[#F6EEF3]"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-[#22142A] p-8 text-center">
          <p className="text-sm font-bold text-[#F6EEF3]">
            찾으시는 운세가 없어요
          </p>
          <p className="mt-1 text-xs text-[#B9A9BF]">
            다른 검색어를 입력하거나 전체 카테고리를 선택해 보세요.
          </p>
        </div>
      ) : (
        <>
          {singleAndPremium.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {singleAndPremium.map((item, idx) => (
                <PosterCard
                  key={item.id}
                  product={item}
                  listName="products_page_grid"
                  priority={idx < 4}
                />
              ))}
            </div>
          )}

          {sets.length > 0 && (
            <div className="mt-6 space-y-2.5">
              <h2 className="text-sm font-extrabold text-[#F6EEF3] tracking-tight">
                🎁 함께 보면 아끼는 세트
              </h2>
              {sets.map((setItem) => (
                <SetStackCard
                  key={setItem.id}
                  product={setItem}
                  listName="products_page_sets"
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
