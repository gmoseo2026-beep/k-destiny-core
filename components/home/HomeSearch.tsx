"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { CatalogItem } from "@/lib/catalog";

interface HomeSearchProps {
  locale: string;
  products: CatalogItem[];
}

export default function HomeSearch({ locale, products }: HomeSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const visibleProducts = useMemo(() => {
    return products.filter((p) => !p.isHidden);
  }, [products]);

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return visibleProducts.filter((p) => {
      const name = p.name.toLowerCase();
      const grid = (p.gridLabel || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      const hook = (p.hook || "").toLowerCase();
      return name.includes(q) || grid.includes(q) || desc.includes(q) || hook.includes(q);
    });
  }, [query, visibleProducts]);

  return (
    <div className="relative w-full max-w-[480px] mx-auto px-4 mt-6 z-20">
      <label htmlFor="home-search" className="sr-only">
        운세 및 궁합 상품 검색
      </label>
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-caption pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="home-search"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="어떤 운세나 궁합을 찾고 계신가요?"
          className="w-full h-11 pl-10 pr-9 bg-surface text-ink text-xs sm:text-sm rounded-2xl border border-line focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral transition-all placeholder:text-caption"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-3 text-caption hover:text-ink p-0.5 rounded-full"
            aria-label="검색어 지우기"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-4 right-4 mt-1.5 bg-white rounded-2xl border border-line shadow-xl max-h-72 overflow-y-auto divide-y divide-line/60 z-30">
          {filteredResults.length > 0 ? (
            filteredResults.map((product) => (
              <Link
                key={product.id}
                href={`/${locale}/products/${product.id}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 p-3 hover:bg-surface-soft transition-colors active:scale-[0.98]"
              >
                <div className="w-9 h-9 relative shrink-0">
                  <Image
                    src={product.icon3d}
                    alt=""
                    width={36}
                    height={36}
                    className="object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-ink truncate">
                      {product.name}
                    </span>
                    {product.isFree && (
                      <span className="text-[10px] font-bold text-coral bg-coral-soft px-1.5 py-0.5 rounded-full">
                        무료
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-2 truncate">
                    {product.hook || product.description}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-caption">
              검색 결과가 없어요. 다른 키워드로 검색해보세요.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
