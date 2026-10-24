"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import VisitorPill from "@/components/home/VisitorPill";
import { trackEvent } from "@/lib/gtag";

export interface HeroPosterSlide {
  id: "love_single" | "reunion" | "inner_mind" | "annual_2027";
  situationLabel: string;
  headline: string;
  subCopy: string;
  coverSrc: string;
  fallbackIcon: string;
  productId: string;
  getHref: (locale: string) => string;
}

export const HERO_POSTER_SLIDES: readonly HeroPosterSlide[] = [
  {
    id: "love_single",
    situationLabel: "솔로 연애운",
    headline: "올해 안에 나도 연애할 수 있을까?",
    subCopy: "다가올 인연의 시기와 그 사람의 분위기까지",
    coverSrc: "/covers/cover_love_single.webp",
    fallbackIcon: "/icons3d/love_single.webp",
    productId: "love_single",
    getHref: (locale) => `/${locale}/products/love_single`,
  },
  {
    id: "reunion",
    situationLabel: "재회운",
    headline: "헤어진 그 사람, 다시 닿을 수 있을까?",
    subCopy: "남아 있는 미련과 먼저 연락이 올 흐름",
    coverSrc: "/covers/cover_reunion.webp",
    fallbackIcon: "/icons3d/reunion.webp",
    productId: "reunion",
    getHref: (locale) => `/${locale}/products/reunion`,
  },
  {
    id: "inner_mind",
    situationLabel: "그 사람 속마음",
    headline: "그 사람은 지금 나를 어떻게 생각할까?",
    subCopy: "겉으로 티 안 내는 본심과 호감의 깊이",
    coverSrc: "/covers/cover_inner_mind.webp",
    fallbackIcon: "/icons3d/inner_mind.webp",
    productId: "inner_mind",
    getHref: (locale) => `/${locale}/products/inner_mind`,
  },
  {
    id: "annual_2027",
    situationLabel: "2027 신년운",
    headline: "다가오는 2027년, 내게 올 가장 큰 행운은?",
    subCopy: "붉은 양의 해 5대 영역과 12개월 흐름",
    coverSrc: "/covers/cover_2027.webp",
    fallbackIcon: "/icons3d/annual_2027.webp",
    productId: "annual_2027",
    getHref: (locale) => `/${locale}/fortune/annual?year=2027`,
  },
];

export default function HomeHeroCompact({
  total,
  visitorCount = 0,
  locale = "ko",
}: {
  total: number;
  visitorCount?: number;
  locale?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [failedCovers, setFailedCovers] = useState<Record<string, boolean>>({});

  const scrollToSlide = (idx: number) => {
    setActiveIdx(idx);
    const container = scrollerRef.current;
    if (!container) return;
    const card = container.children[idx] as HTMLElement | undefined;
    if (!card) return;
    const targetLeft = card.offsetLeft - 16;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  };

  const handleScroll = () => {
    const container = scrollerRef.current;
    if (!container) return;
    const firstCard = container.children[0] as HTMLElement | undefined;
    const cardWidth = firstCard ? firstCard.offsetWidth + 12 : 240;
    const idx = Math.min(
      HERO_POSTER_SLIDES.length - 1,
      Math.max(0, Math.round(container.scrollLeft / cardWidth)),
    );
    if (idx !== activeIdx) setActiveIdx(idx);
  };

  return (
    <section className="w-full overflow-hidden bg-gradient-to-b from-[#3A1B40] to-[#6A2C70] text-white">
      <VisitorPill count={visitorCount} />
      <div className="max-w-[480px] mx-auto px-4 pt-4 pb-5">
        {/* 상단 타이틀: 커플 전용처럼 보이지 않도록 솔로·재회·속마음·신년운을 아우른다 */}
        <div className="flex flex-col items-start">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#FFC24B]/40 bg-[#FFC24B]/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#FFC24B]">
            <Sparkles className="w-3 h-3" aria-hidden />
            솔로 연애 · 재회 · 속마음 · 2027 신년운
          </span>
          <h1 className="mt-2 text-lg sm:text-xl font-black text-white tracking-tight leading-snug break-keep">
            지금 내 마음, 어떤 답이 가장 궁금한가요?
          </h1>
          <p className="text-xs font-semibold text-[#F2D08F] mt-0.5">
            생년월일만 넣으면 30초 · {total}가지 사주 풀이 무료 미리보기
          </p>
        </div>

        {/* 상황별 빠른 선택 칩 */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {HERO_POSTER_SLIDES.map((slide, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => {
                  scrollToSlide(idx);
                  trackEvent("home_hero_slide_tab", {
                    slideId: slide.id,
                    position: idx + 1,
                  });
                }}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-extrabold transition-all active:scale-[0.96] ${
                  isActive
                    ? "bg-[#FFC24B] text-[#2B2430] shadow-xs"
                    : "border border-white/20 bg-white/10 text-white/85 hover:bg-white/15"
                }`}
              >
                {slide.situationLabel}
              </button>
            );
          })}
        </div>

        {/* 세로 3:4 포스터 슬라이드 4장 */}
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="mt-3 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1"
          aria-label="상황별 대표 사주 포스터"
        >
          {HERO_POSTER_SLIDES.map((slide, idx) => {
            const useFallback = Boolean(failedCovers[slide.id]);
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
                className="group relative w-[72%] max-w-[248px] shrink-0 snap-start aspect-[3/4] rounded-2xl overflow-hidden border border-[#F2D08F]/35 bg-[#2A1430] shadow-[0_10px_24px_rgba(20,8,26,0.45)] active:scale-[0.98] transition-all"
              >
                {!useFallback ? (
                  <Image
                    src={slide.coverSrc}
                    alt={slide.situationLabel}
                    fill
                    sizes="(max-width: 480px) 248px, 260px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    priority={idx < 2}
                    onError={() =>
                      setFailedCovers((prev) => ({ ...prev, [slide.id]: true }))
                    }
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#3A1B40] to-[#230F28] pb-16">
                    <Image
                      src={slide.fallbackIcon}
                      alt={slide.situationLabel}
                      width={96}
                      height={96}
                      className="object-contain"
                    />
                  </div>
                )}

                {/* 하단 1/3 어두운 그라데이션 + 상황별 질문 문구 */}
                <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-[#160A1B] via-[#160A1B]/85 to-transparent p-4 pt-12">
                  <span className="w-fit rounded-full border border-[#FFC24B]/45 bg-black/40 px-2.5 py-0.5 text-[10px] font-extrabold text-[#FFC24B] backdrop-blur-xs">
                    {slide.situationLabel}
                  </span>
                  <h2 className="mt-1.5 text-[15px] font-black text-white leading-snug break-keep drop-shadow-xs">
                    {slide.headline}
                  </h2>
                  <p className="mt-1 text-[11px] font-medium text-white/80 leading-snug line-clamp-1">
                    {slide.subCopy}
                  </p>
                  <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-extrabold text-[#FFC24B]">
                    무료 미리보기 <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 슬라이드 인디케이터 점 */}
        <div className="mt-2.5 flex items-center justify-center gap-1.5" aria-hidden="true">
          {HERO_POSTER_SLIDES.map((slide, idx) => (
            <span
              key={slide.id}
              className={`h-1.5 rounded-full transition-all ${
                idx === activeIdx ? "w-5 bg-[#FFC24B]" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* 하단 빠른 시작 2열 (혼자 보는 신년운 + 둘이 보는 궁합) */}
        <div className="grid grid-cols-2 gap-2 mt-3.5">
          <Link
            href={`/${locale}/fortune/annual?year=2027`}
            onClick={() =>
              trackEvent("home_hero_cta_click", {
                target: "annual_2027",
                productId: "annual_2027",
                position: 5,
              })
            }
            className="flex items-center justify-center rounded-xl bg-[#FFC24B] py-2.5 px-2 text-xs font-extrabold text-[#2B2430] whitespace-nowrap shadow-xs transition-all active:scale-[0.96]"
          >
            2027 신년운 미리보기
          </Link>
          <Link
            href={`/${locale}/compat/new`}
            onClick={() =>
              trackEvent("home_hero_cta_click", {
                target: "compat_new",
                productId: "compat_basic",
                position: 6,
              })
            }
            className="flex items-center justify-center rounded-xl border border-white/30 bg-white/15 py-2.5 px-2 text-xs font-extrabold text-white whitespace-nowrap shadow-xs backdrop-blur-xs transition-all active:scale-[0.96]"
          >
            두 사람 궁합 무료보기
          </Link>
        </div>
      </div>
    </section>
  );
}
