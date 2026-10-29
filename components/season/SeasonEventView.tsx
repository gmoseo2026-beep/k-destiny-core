"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { CalendarClock, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { getProductCover, type CatalogItem } from "@/lib/catalog";
import type { SeasonEventSlug } from "@/lib/seasonEvents";
import { ListRowCard, SetStackCard } from "@/components/cards/KongdakCards";
import ProductsExplorerClient from "@/components/product/ProductsExplorerClient";
import { trackEvent } from "@/lib/gtag";

interface SeasonEventViewProps {
  slug: SeasonEventSlug;
  title: string;
  subtitle: string;
  endDateLabel: string;
  daysLeftLabel: string | null;
  active: boolean;
  seasonProducts: CatalogItem[];
  allProducts: CatalogItem[];
}

export default function SeasonEventView({
  slug,
  title,
  subtitle,
  endDateLabel,
  daysLeftLabel,
  active,
  seasonProducts,
  allProducts,
}: SeasonEventViewProps) {
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${slug}:${active ? "active" : "ended"}`;
    if (trackedRef.current === key) return;
    trackedRef.current = key;
    trackEvent("season_view", {
      season: slug,
      active,
    });
  }, [slug, active]);

  if (!active) {
    return (
      <div className="w-full">
        <div className="mx-auto w-full max-w-[480px] px-4 pt-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#22142A] px-4 py-3 text-xs text-[#B9A9BF]">
            연말 시즌 기획전이 종료되어 전체 운세 · 궁합 목록을 보여 드려요.
          </div>
        </div>
        <ProductsExplorerClient products={allProducts} />
      </div>
    );
  }

  const heroCovers = seasonProducts.slice(0, 3).map((p) => ({
    id: p.id,
    name: p.name,
    src: getProductCover(p),
  }));

  return (
    <div className="mx-auto w-full max-w-[480px] px-4 pt-4 pb-28 sm:pb-16">
      {/* 시즌 기획전 헤더 카드 */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(120%_85%_at_50%_0%,rgba(255,92,119,0.28),transparent_62%),linear-gradient(180deg,#3A1B40_0%,#22142A_100%)] p-6 text-[#F6EEF3] shadow-[0_12px_32px_rgba(0,0,0,0.38)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-3 py-1 text-[11px] font-extrabold text-[#FFC24B]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>연말 시즌 기획전 · {endDateLabel}</span>
          </span>
          {daysLeftLabel && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#FF5C77]/40 bg-[#FF5C77]/20 px-2.5 py-1 text-[11px] font-extrabold text-[#FF8AA1]">
              <CalendarClock className="h-3 w-3" />
              <span>{daysLeftLabel}</span>
            </span>
          )}
        </div>

        <h1 className="mt-3.5 text-xl font-black leading-snug tracking-tight text-[#F6EEF3]">
          {title}
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-[#F6EEF3]/85">
          {subtitle}
        </p>

        {heroCovers.length > 0 && (
          <div className="mt-5 flex items-center justify-center gap-2.5">
            {heroCovers.map((cover, idx) => (
              <div
                key={cover.id}
                className={`relative aspect-[3/4] w-20 overflow-hidden rounded-xl border border-white/20 bg-[#140B18] shadow-md ${
                  idx === 1 ? "scale-105 z-10 border-[#FFC24B]/50" : "opacity-90"
                }`}
              >
                <Image
                  src={cover.src}
                  alt={cover.name}
                  fill
                  sizes="88px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 기획전 추천 풀이 목록 (지정 순서 유지) */}
      <section className="mt-6 space-y-3" aria-label="기획전 추천 풀이">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold tracking-tight text-[#F6EEF3]">
            지금 이 고민에 맞춘 추천 풀이
          </h2>
          <span className="text-[11px] text-[#B9A9BF]">모든 풀이 무료 미리보기</span>
        </div>

        {seasonProducts.map((product) =>
          product.type === "SET" ? (
            <SetStackCard
              key={product.id}
              product={product}
              listName={`season_${slug}`}
            />
          ) : (
            <ListRowCard
              key={product.id}
              product={product}
              listName={`season_${slug}`}
            />
          )
        )}
      </section>

      {/* 전체 목록 보조 이동 */}
      <div className="mt-8 text-center">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#22142A] px-4 py-2.5 text-xs font-bold text-[#B9A9BF] transition-colors hover:text-[#F6EEF3] active:scale-[0.96]"
        >
          <span>전체 운세 · 궁합 더 둘러보기</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
