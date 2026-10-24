"use client";

// 홈 첫 화면 탐색: 카테고리 탭 + 두근이 추천(대표 카드: 딥 플럼 그라데이션 + 골드 포인트) + 2칸 포스터 카드(표지 + hook + "무료 미리보기") + 프리미엄 띠.
// 목록은 서버가 공개 판정한 것만 받는다(lib/home/explore). 클릭 위치는 GA4 home_card_click 으로 남긴다.
import React, { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Crown } from "lucide-react";
import { type CatalogItem, priceLabel, formatWon, listPrice, isOnSeasonPromo } from "@/lib/catalog";
import type { ExploreTab, ExploreTabId } from "@/lib/home/explore";
import { trackEvent } from "@/lib/gtag";

interface HomeExploreProps {
  locale: string;
  tabs: ExploreTab[];
  picks: CatalogItem[];
}

const PICK_BADGE: Record<string, string> = {
  secret_love: "19",
  inner_mind: "속마음",
  cheating: "냉정 주의",
  spicy_annual: "팩폭 주의",
};

/** 상품별 전용 3:4 표지 이미지가 있는 경우 반환, 없으면 null(3D 아이콘 폴백) */
export const PRODUCT_COVER_MAP: Record<string, string> = {
  love_single: "/covers/cover_love_single.webp",
  reunion: "/covers/cover_reunion.webp",
  inner_mind: "/covers/cover_inner_mind.webp",
  annual_2027: "/covers/cover_2027.webp",
};

function badgeFor(p: CatalogItem): { text: string; cls: string } | null {
  if (p.id === "secret_love") return { text: "19", cls: "bg-[#3A1B40] text-[#FFC24B]" };
  if (p.isFree) return { text: "무료", cls: "bg-coral text-white" };
  if (isOnSeasonPromo(p.id)) return { text: "특가", cls: "bg-[#FFC24B] text-ink" };
  if (p.isNew) return { text: "NEW", cls: "bg-[#E0245A] text-white" };
  return null;
}

export default function HomeExplore({ locale, tabs, picks }: HomeExploreProps) {
  const [active, setActive] = useState<ExploreTabId>(tabs[0]?.id ?? "popular");
  const tabsRef = useRef<HTMLDivElement>(null);
  const tab = tabs.find((t) => t.id === active) ?? tabs[0];
  const premiumTab = tabs.find((t) => t.id === "premium");
  if (!tab) return null;

  const click = (section: string, position: number, productId: string) =>
    trackEvent("home_card_click", { section, position, productId, tab: active });

  const goPremium = () => {
    setActive("premium");
    trackEvent("home_tab_click", { tab: "premium", via: "premium_strip" });
    tabsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <section id="explore" className="w-full max-w-[480px] mx-auto px-4 pt-4 scroll-mt-16" aria-label="사주 풀이 둘러보기">
      {/* 카테고리 탭 */}
      <div
        ref={tabsRef}
        role="tablist"
        aria-label="분류"
        className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 scroll-mt-16"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            onClick={() => {
              setActive(t.id);
              trackEvent("home_tab_click", { tab: t.id, via: "tab" });
            }}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold border transition-all active:scale-[0.96] ${
              t.id === active
                ? t.id === "premium"
                  ? "bg-gradient-to-r from-[#3A1B40] to-[#6A2C70] text-[#FFC24B] border-[#3A1B40]"
                  : "bg-coral text-white border-coral"
                : "bg-white text-ink border-line"
            }`}
          >
            {t.id === "premium" && <Crown className="inline w-3 h-3 mr-1 -mt-0.5" aria-hidden />}
            {t.label}
          </button>
        ))}
      </div>

      {/* 대표 카드: 두근이 추천(인기 탭에서만 — 딥 플럼 #3A1B40→#6A2C70 그라데이션 + 골드 포인트) */}
      {active === "popular" && picks.length > 0 && (
        <div className="mt-3.5">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <p className="text-xs font-extrabold text-ink">두근이 대표 추천</p>
            <span className="text-[11px] font-bold text-plum">가장 많이 찾는 핵심 풀이</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {picks.map((p, i) => (
              <Link
                prefetch
                key={p.id}
                href={`/${locale}/products/${p.id}`}
                onClick={() => click("pick", i + 1, p.id)}
                className="group relative flex flex-col justify-between rounded-2xl border border-[#FFC24B]/35 bg-gradient-to-br from-[#3A1B40] to-[#6A2C70] p-3.5 text-white shadow-sm active:scale-[0.97] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full border border-[#FFC24B]/40 bg-[#FFC24B]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#FFC24B]">
                      {PICK_BADGE[p.id] ?? "대표"}
                    </span>
                    <Image
                      src={p.icon3d}
                      alt=""
                      width={42}
                      height={42}
                      className="object-contain -mt-1 -mr-1 drop-shadow-sm"
                    />
                  </div>
                  <span className="mt-1.5 block text-[11px] font-bold text-[#F2D08F] leading-tight">
                    {p.gridLabel || p.name}
                  </span>
                  <span className="mt-1 block text-[13px] font-extrabold text-white leading-snug line-clamp-3 break-keep">
                    {p.hook}
                  </span>
                </div>
                <span className="mt-2.5 text-[11px] font-extrabold text-[#FFC24B] flex items-center gap-0.5">
                  무료 미리보기 <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 목록: 프리미엄은 가로 카드, 나머지는 2칸 포스터 카드(표지 + hook + "무료 미리보기") */}
      {active === "premium" ? (
        <div className="mt-3.5 space-y-2.5">
          {tab.items.map((p, i) => (
            <Link
              prefetch
              key={p.id}
              href={`/${locale}/products/${p.id}`}
              onClick={() => click("premium_list", i + 1, p.id)}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#3A1B40] to-[#6A2C70] border border-[#FFC24B]/30 p-3.5 active:scale-[0.98] transition-all"
            >
              <Image src={p.icon3d} alt="" width={44} height={44} className="object-contain shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-white truncate">{p.name}</span>
                <span className="block text-[11px] text-white/75 truncate">{p.hook}</span>
              </div>
              <span className="shrink-0 text-right">
                {listPrice(p) && (
                  <span className="block text-[10px] font-semibold text-white/50 line-through">
                    {formatWon(listPrice(p)!)}
                  </span>
                )}
                <span className="block text-sm font-black text-[#FFC24B]">{formatWon(p.price)}</span>
              </span>
            </Link>
          ))}
          <p className="text-[11px] text-caption px-1">1년 보관 · PDF로 저장 · 결제 전 무료 미리보기</p>
        </div>
      ) : (
        <>
          <div className="mt-3.5 grid grid-cols-2 gap-3">
            {tab.items.map((p, i) => {
              const badge = badgeFor(p);
              const coverSrc = PRODUCT_COVER_MAP[p.id];
              return (
                <Link
                  prefetch
                  key={p.id}
                  href={`/${locale}/products/${p.id}`}
                  onClick={() => click("grid", i + 1, p.id)}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-white shadow-2xs active:scale-[0.97] transition-all"
                >
                  {/* 상단 포스터 표지 영역 (전용 webp 표지 또는 3D 아이콘 임시 표지) */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#FFF6F1] via-[#FFE8EE]/60 to-[#F3E9F5]">
                    {badge && (
                      <span
                        className={`absolute top-2 right-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-2xs ${badge.cls}`}
                      >
                        {badge.text}
                      </span>
                    )}
                    {coverSrc ? (
                      <Image
                        src={coverSrc}
                        alt={p.gridLabel || p.name}
                        fill
                        sizes="(max-width: 480px) 220px, 240px"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-3">
                        <Image
                          src={p.icon3d}
                          alt={p.gridLabel || p.name}
                          width={68}
                          height={68}
                          className="object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
                        />
                      </div>
                    )}
                  </div>

                  {/* 하단 제목 + hook + 무료 미리보기 */}
                  <div className="flex flex-1 flex-col justify-between p-3 text-left">
                    <div>
                      <span className="block text-xs sm:text-[13px] font-extrabold text-ink leading-tight">
                        {p.gridLabel || p.name}
                      </span>
                      <p className="mt-1 text-[11px] font-medium text-text-2 leading-snug line-clamp-2 break-keep">
                        {p.hook}
                      </p>
                    </div>
                    <span className="mt-2.5 inline-flex items-center gap-0.5 text-[11px] font-extrabold text-coral">
                      {p.isFree ? "무료로 바로 보기" : "무료 미리보기"}
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          <p className="mt-2.5 text-[11px] text-caption px-1">
            {(() => {
              const paid = tab.items.filter((p) => !p.isFree);
              const regular = paid.find((p) => !isOnSeasonPromo(p.id)) ?? paid[0];
              return regular ? `미리보기 후 마음에 들면 전체 리포트 ${priceLabel(regular)}` : "";
            })()}
          </p>
        </>
      )}

      {/* 프리미엄 띠(프리미엄 탭이 아닐 때 — 대표 카드와 같은 딥 플럼 그라데이션 + 골드 포인트) */}
      {active !== "premium" && premiumTab && (
        <button
          type="button"
          onClick={goPremium}
          className="mt-3.5 w-full flex items-center justify-between gap-2 rounded-2xl border border-[#FFC24B]/30 bg-gradient-to-r from-[#3A1B40] to-[#6A2C70] px-3.5 py-3 text-left active:scale-[0.98] transition-all"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-[11px] font-bold text-[#FFC24B]">
              <Crown className="w-3 h-3" aria-hidden /> 프리미엄 · 1년 보관 · PDF
            </span>
            <span className="block text-sm font-extrabold text-white truncate">
              {premiumTab.items.map((p) => p.gridLabel || p.name).join(" · ")}
            </span>
          </span>
          <ArrowRight className="w-4 h-4 text-[#FFC24B] shrink-0" />
        </button>
      )}
    </section>
  );
}
