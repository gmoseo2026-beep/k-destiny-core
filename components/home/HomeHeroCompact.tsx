"use client";

import React, { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { trackEvent } from "@/lib/gtag";
import KongdakMascot from "@/components/KongdakMascot";
import {
  formatWon,
  getProduct,
  isOnSeasonPromo,
  SEASON_PROMO_LABEL,
  SEASON_PROMO_UNTIL,
  seasonPriceAt,
} from "@/lib/catalog";
import { resolveProductHref } from "@/components/cards/KongdakCards";

export type HeroSlideId =
  | "inner_mind"
  | "annual_2027"
  | "premium_2027_daeun"
  | "compat_basic";

export interface HeroPosterSlide {
  id: HeroSlideId;
  situationLabel: string;
  headline: string;
  subCopy: string;
  coverSrc: string;
  fallbackIcon: string;
  productId: HeroSlideId;
  showPrice?: boolean;
  getHref: (locale: string) => string;
}

/** 2026-12-01 00:00 KST부터는 2027 신년운(②)이 첫 장(②①③④)으로 자동 전환된다. */
export const HERO_2027_FIRST_FROM = Date.parse("2026-12-01T00:00:00+09:00");

export const HERO_POSTER_SLIDES: readonly HeroPosterSlide[] = [
  {
    id: "inner_mind",
    situationLabel: "그 사람 속마음",
    headline: "그 사람은 지금 나를 어떻게 생각할까?",
    subCopy: "겉으로 티 안 내는 본심과 호감의 깊이",
    coverSrc: "/covers/cover_inner_mind.webp",
    fallbackIcon: "/icons3d/inner_mind.webp",
    productId: "inner_mind",
    getHref: (locale) => `/${locale}${resolveProductHref({ id: "inner_mind" })}`,
  },
  {
    id: "annual_2027",
    situationLabel: "2027 신년운",
    headline: "다가오는 2027년, 내게 올 가장 큰 행운은?",
    subCopy: "붉은 양의 해 5대 영역과 12개월 흐름",
    coverSrc: "/covers/cover_2027.webp",
    fallbackIcon: "/icons3d/annual_2027.webp",
    productId: "annual_2027",
    getHref: (locale) => `/${locale}${resolveProductHref({ id: "annual_2027" })}`,
  },
  {
    id: "premium_2027_daeun",
    situationLabel: "2027 대운 · 프리미엄",
    headline: "앞으로 10년 흐름 속, 나의 2027년은 어디쯤일까?",
    subCopy: "10년 대운의 자리와 12개월 상세 달력까지 한 권에",
    coverSrc: "/covers/cover_premium_2027_daeun.webp",
    fallbackIcon: "/icons3d/premium_2027_daeun.webp",
    productId: "premium_2027_daeun",
    showPrice: true,
    getHref: (locale) => `/${locale}${resolveProductHref({ id: "premium_2027_daeun" })}`,
  },
  {
    id: "compat_basic",
    situationLabel: "정통 궁합",
    headline: "우리 둘, 오래 갈 수 있을까?",
    subCopy: "성향·연애 방식·다툼 패턴까지 한 번에",
    coverSrc: "/covers/cover_compat_basic.webp",
    fallbackIcon: "/mascot/transparent/couple_red_thread.webp",
    productId: "compat_basic",
    getHref: (locale) => `/${locale}${resolveProductHref({ id: "compat_basic" })}`,
  },
];

/**
 * 시각(now)에 따른 홈 상단 큰 카드 4장 순서:
 * - 2026-11-30 23:59:59 KST까지: ① 속마음 → ② 2027 신년운 → ③ 2027 대운 → ④ 정통 궁합
 * - 2026-12-01 00:00:00 KST부터: ② 2027 신년운 → ① 속마음 → ③ 2027 대운 → ④ 정통 궁합
 */
export function getHeroPosterSlides(now: number = Date.now()): HeroPosterSlide[] {
  const [first, second, third, fourth] = HERO_POSTER_SLIDES;
  if (now >= HERO_2027_FIRST_FROM) {
    return [second, first, third, fourth];
  }
  return [first, second, third, fourth];
}

/**
 * 대운 등 히어로 슬라이드 상품의 배지 및 가격 정보 계산 (특가 종료 시 취소선·특가 배지 자동 소멸)
 */
export function getHeroSlideMeta(productId: string, now?: number): {
  isPremium: boolean;
  promoBadge: string | null;
  priceText: string | null;
  strikePriceText: string | null;
} {
  const product = getProduct(productId);
  if (!product) {
    return { isPremium: false, promoBadge: null, priceText: null, strikePriceText: null };
  }
  const timed = now !== undefined ? seasonPriceAt(product.id, now) : undefined;
  const currentPrice = timed ? timed.price : product.price;
  const currentOriginal = timed ? timed.originalPrice : product.originalPrice;
  const onPromo = isOnSeasonPromo(product.id, now ?? Date.now());

  return {
    isPremium: product.tier === "premium",
    promoBadge: onPromo ? `${SEASON_PROMO_LABEL} · ${SEASON_PROMO_UNTIL}` : null,
    priceText: product.isFree ? "무료" : formatWon(currentPrice),
    strikePriceText:
      !product.isFree && currentOriginal > currentPrice ? formatWon(currentOriginal) : null,
  };
}

export default function HomeHeroCompact({
  locale = "ko",
  now,
}: {
  total?: number;
  visitorCount?: number;
  locale?: string;
  now?: number;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [failedCovers, setFailedCovers] = useState<Record<string, boolean>>({});

  const slides = useMemo(() => getHeroPosterSlides(now), [now]);

  const getCardStepWidth = () => {
    const container = scrollerRef.current;
    if (!container) return 280;
    const firstCard = container.children[0] as HTMLElement | undefined;
    return firstCard ? firstCard.offsetWidth + 12 : 280;
  };

  const handleScroll = () => {
    const container = scrollerRef.current;
    if (!container) return;
    const cardWidth = getCardStepWidth();
    const idx = Math.min(
      slides.length - 1,
      Math.max(0, Math.round(container.scrollLeft / cardWidth)),
    );
    if (idx !== activeIdx) setActiveIdx(idx);
  };

  const scrollToSlide = (targetIdx: number, via: "arrow" | "dot") => {
    const clamped = Math.min(slides.length - 1, Math.max(0, targetIdx));
    const container = scrollerRef.current;
    if (container) {
      const cardWidth = getCardStepWidth();
      container.scrollTo({
        left: cardWidth * clamped,
        behavior: "smooth",
      });
    }
    setActiveIdx(clamped);
    trackEvent("home_hero_nav", {
      via,
      to: slides[clamped]?.id ?? String(clamped),
    });
  };

  const atFirst = activeIdx <= 0;
  const atLast = activeIdx >= slides.length - 1;

  return (
    <section className="w-full overflow-hidden bg-[#140B18] text-[#F6EEF3]">
      <div className="relative max-w-[480px] mx-auto pt-2 pb-4">
        {/* 마우스 화면(PC) 전용 좌우 원형 ‹ › 버튼 */}
        <button
          type="button"
          aria-label="이전 카드"
          disabled={atFirst}
          onClick={() => scrollToSlide(activeIdx - 1, "arrow")}
          className="hidden [@media(hover:hover)_and_(pointer:fine)]:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#140B18]/75 text-white shadow-lg backdrop-blur-md transition-opacity hover:bg-[#140B18]/90 disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          aria-label="다음 카드"
          disabled={atLast}
          onClick={() => scrollToSlide(activeIdx + 1, "arrow")}
          className="hidden [@media(hover:hover)_and_(pointer:fine)]:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#140B18]/75 text-white shadow-lg backdrop-blur-md transition-opacity hover:bg-[#140B18]/90 disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* 폭 86%, 양옆 다음 카드 살짝 노출되는 3:4 포스터 슬라이드 */}
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-[7%]"
          aria-label="대표 사주 포스터 슬라이드"
        >
          {slides.map((slide, idx) => {
            const useFallback = Boolean(failedCovers[slide.id]);
            const meta = getHeroSlideMeta(slide.productId, now);

            return (
              <Link
                key={slide.id}
                href={slide.getHref(locale)}
                onClick={() =>
                  trackEvent("home_hero_cta_click", {
                    target: slide.id,
                    productId: slide.productId,
                    position: idx + 1,
                  })
                }
                className="group relative w-[86%] shrink-0 snap-center aspect-[3/4] rounded-3xl overflow-hidden border border-white/[0.08] bg-[#22142A] shadow-[0_16px_36px_rgba(0,0,0,0.5)] active:scale-[0.98] transition-all"
              >
                {!useFallback ? (
                  <Image
                    src={slide.coverSrc}
                    alt={slide.situationLabel}
                    fill
                    sizes="(max-width: 480px) 86vw, 380px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    priority={idx === 0}
                    onError={() =>
                      setFailedCovers((prev) => ({ ...prev, [slide.id]: true }))
                    }
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#2A1635] via-[#22142A] to-[#140B18] pb-16">
                    <KongdakMascot size={72} animate="none" />
                    <span className="mt-3 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-[#F6EEF3]">
                      {slide.situationLabel}
                    </span>
                  </div>
                )}

                {/* 좌상단 금색 배지 (대운 등 프리미엄·연말 특가 둘 다 표시) */}
                {(meta.isPremium || meta.promoBadge) && (
                  <div className="absolute left-3.5 top-3.5 z-10 flex flex-wrap items-center gap-1.5">
                    {meta.isPremium && (
                      <span className="rounded-full border border-[#FFC24B]/60 bg-[#140B18]/80 px-2.5 py-0.5 text-[11px] font-extrabold text-[#FFC24B] backdrop-blur-md">
                        프리미엄
                      </span>
                    )}
                    {meta.promoBadge && (
                      <span className="rounded-full bg-[#FFC24B] px-2.5 py-0.5 text-[11px] font-extrabold text-[#140B18] shadow-sm">
                        {meta.promoBadge}
                      </span>
                    )}
                  </div>
                )}

                {/* 우상단 1 / 4 알약 */}
                <span className="absolute right-3.5 top-3.5 z-10 rounded-full border border-white/20 bg-[#140B18]/70 px-2.5 py-0.5 text-[11px] font-bold text-[#F6EEF3] backdrop-blur-md">
                  {idx + 1} / {slides.length}
                </span>

                {/* 하단 1/3 그라디언트 + 제목 + 한 줄 (+ 대운 가격 표시) */}
                <div
                  className="absolute inset-0 flex flex-col justify-end p-5"
                  style={{
                    background:
                      "linear-gradient(180deg, transparent 40%, rgba(20,11,24,0.88) 74%, #140B18 100%)",
                  }}
                >
                  <span className="w-fit rounded-full bg-[#FF5C77]/20 border border-[#FF5C77]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#FF8AA1]">
                    {slide.situationLabel}
                  </span>
                  <h2 className="mt-2 text-[19px] font-extrabold text-[#F6EEF3] leading-snug tracking-tight break-keep">
                    {slide.headline}
                  </h2>
                  <p className="mt-1 text-[13px] font-medium text-[#B9A9BF] leading-snug line-clamp-1">
                    {slide.subCopy}
                  </p>
                  {slide.showPrice && meta.priceText && (
                    <div className="mt-2 flex items-baseline gap-2">
                      {meta.strikePriceText && (
                        <span className="text-xs font-semibold text-[#B9A9BF] line-through">
                          {meta.strikePriceText}
                        </span>
                      )}
                      <span className="text-sm font-extrabold text-[#FFC24B]">
                        {meta.priceText}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* 카드 아래 점 4개 (모바일·PC 모두 표시, 현재 = 코랄 길쭉, 나머지 = 흰색 30%) */}
        <div
          className="mt-3 flex items-center justify-center gap-1.5"
          role="tablist"
          aria-label="슬라이드 페이지 표시"
        >
          {slides.map((slide, idx) => {
            const isCurrent = idx === activeIdx;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-label={`${idx + 1}번 카드: ${slide.situationLabel}`}
                onClick={() => scrollToSlide(idx, "dot")}
                className={`h-1.5 rounded-full transition-all ${
                  isCurrent ? "w-5 bg-[#FF5C77]" : "w-1.5 bg-white/30 hover:bg-white/50"
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
