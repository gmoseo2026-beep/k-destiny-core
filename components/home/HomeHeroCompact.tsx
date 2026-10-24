"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { trackEvent } from "@/lib/gtag";
import KongdakMascot from "@/components/KongdakMascot";

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
  locale = "ko",
}: {
  total?: number;
  visitorCount?: number;
  locale?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [failedCovers, setFailedCovers] = useState<Record<string, boolean>>({});

  const handleScroll = () => {
    const container = scrollerRef.current;
    if (!container) return;
    const firstCard = container.children[0] as HTMLElement | undefined;
    const cardWidth = firstCard ? firstCard.offsetWidth + 12 : 280;
    const idx = Math.min(
      HERO_POSTER_SLIDES.length - 1,
      Math.max(0, Math.round(container.scrollLeft / cardWidth)),
    );
    if (idx !== activeIdx) setActiveIdx(idx);
  };

  return (
    <section className="w-full overflow-hidden bg-[#140B18] text-[#F6EEF3]">
      <div className="max-w-[480px] mx-auto pt-2 pb-4">
        {/* 폭 86%, 양옆 다음 카드 살짝 노출되는 3:4 포스터 슬라이드 */}
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-[7%]"
          aria-label="대표 사주 포스터 슬라이드"
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

                {/* 우상단 1 / 4 알약 */}
                <span className="absolute right-3.5 top-3.5 z-10 rounded-full border border-white/20 bg-[#140B18]/70 px-2.5 py-0.5 text-[11px] font-bold text-[#F6EEF3] backdrop-blur-md">
                  {idx + 1} / {HERO_POSTER_SLIDES.length}
                </span>

                {/* 하단 1/3 그라디언트 + 제목 + 한 줄만 */}
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
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
