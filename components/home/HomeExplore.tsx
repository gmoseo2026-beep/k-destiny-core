"use client";

// 홈 첫 화면 탐색: 카테고리 탭 + 두근이 추천 2개 + 4칸 격자 + 프리미엄 띠.
// 목록은 서버가 공개 판정한 것만 받는다(lib/home/explore). 클릭 위치는 GA4 home_card_click 으로 남긴다.
import React, { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Crown } from "lucide-react";
import { type CatalogItem, priceLabel, formatWon } from "@/lib/catalog";
import type { ExploreTab, ExploreTabId } from "@/lib/home/explore";
import { trackEvent } from "@/lib/gtag";

interface HomeExploreProps {
  locale: string;
  tabs: ExploreTab[];
  picks: CatalogItem[];
}

const PICK_BADGE: Record<string, string> = { secret_love: "19", inner_mind: "속마음", cheating: "냉정 주의", spicy_annual: "팩폭 주의" };

function badgeFor(p: CatalogItem): { text: string; cls: string } | null {
  if (p.id === "secret_love") return { text: "19", cls: "bg-plum-deep text-[#F2D08F]" };
  if (p.isFree) return { text: "무료", cls: "bg-coral text-white" };
  if (p.isNew) return { text: "NEW", cls: "bg-[#FF8AA1] text-white" };
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
    <section id="explore" className="w-full max-w-[480px] mx-auto px-4 pt-3 scroll-mt-16" aria-label="사주 풀이 둘러보기">
      {/* 카테고리 탭 */}
      <div ref={tabsRef} role="tablist" aria-label="분류" className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 scroll-mt-16">
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
                  ? "bg-plum-deep text-[#F2D08F] border-plum-deep"
                  : "bg-coral text-white border-coral"
                : "bg-white text-ink border-line"
            }`}
          >
            {t.id === "premium" && <Crown className="inline w-3 h-3 mr-1 -mt-0.5" aria-hidden />}
            {t.label}
          </button>
        ))}
      </div>

      {/* 두근이 추천(인기 탭에서만) */}
      {active === "popular" && picks.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-bold text-caption mb-1.5">두근이 추천</p>
          <div className="grid grid-cols-2 gap-2">
            {picks.map((p, i) => (
              <Link
                prefetch
                key={p.id}
                href={`/${locale}/products/${p.id}`}
                onClick={() => click("pick", i + 1, p.id)}
                className="group relative flex flex-col rounded-2xl border-[1.5px] border-coral/60 bg-white p-3 active:scale-[0.97] transition-all"
              >
                <div className="flex items-start justify-between">
                  <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[10px] font-extrabold text-coral-deep">
                    {PICK_BADGE[p.id] ?? "추천"}
                  </span>
                  <Image src={p.icon3d} alt="" width={40} height={40} className="object-contain -mt-1 -mr-1" />
                </div>
                <span className="mt-1 text-[11px] font-bold text-caption leading-tight">{p.gridLabel || p.name}</span>
                <span className="mt-0.5 text-[13px] font-extrabold text-ink leading-snug line-clamp-3 break-keep">{p.hook}</span>
                <span className="mt-2 text-[11px] font-bold text-coral flex items-center gap-0.5">
                  무료 미리보기 <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 목록: 프리미엄은 가로 카드, 나머지는 4칸 격자 */}
      {active === "premium" ? (
        <div className="mt-3 space-y-2">
          {tab.items.map((p, i) => (
            <Link
              prefetch
              key={p.id}
              href={`/${locale}/products/${p.id}`}
              onClick={() => click("premium_list", i + 1, p.id)}
              className="flex items-center gap-3 rounded-2xl bg-plum-deep p-3 active:scale-[0.98] transition-all"
            >
              <Image src={p.icon3d} alt="" width={44} height={44} className="object-contain shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-white truncate">{p.name}</span>
                <span className="block text-[11px] text-white/70 truncate">{p.hook}</span>
              </div>
              <span className="shrink-0 text-sm font-black text-[#F2D08F]">{formatWon(p.price)}</span>
            </Link>
          ))}
          <p className="text-[11px] text-caption px-1">1년 보관 · PDF로 저장 · 결제 전 무료 미리보기</p>
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {tab.items.map((p, i) => {
              const badge = badgeFor(p);
              return (
                <Link
                  prefetch
                  key={p.id}
                  href={`/${locale}/products/${p.id}`}
                  onClick={() => click("grid", i + 1, p.id)}
                  className="group relative flex flex-col items-center rounded-2xl border border-line/70 bg-white p-1.5 pt-2 text-center active:scale-[0.96] transition-all"
                >
                  {badge && (
                    <span className={`absolute top-1 right-1 z-10 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${badge.cls}`}>
                      {badge.text}
                    </span>
                  )}
                  <Image src={p.icon3d} alt="" width={52} height={52} className="object-contain" />
                  <span className="mt-1 text-[11px] font-bold text-ink leading-tight line-clamp-1">{p.gridLabel || p.name}</span>
                  <span className="text-[10px] font-semibold text-coral leading-tight">{p.isFree ? "무료" : "무료 미리보기"}</span>
                </Link>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-caption px-1">
            {tab.items.some((p) => !p.isFree) ? `미리보기 후 마음에 들면 전체 리포트 ${priceLabel(tab.items.find((p) => !p.isFree)!)}` : ""}
          </p>
        </>
      )}

      {/* 프리미엄 띠(프리미엄 탭이 아닐 때) */}
      {active !== "premium" && premiumTab && (
        <button
          type="button"
          onClick={goPremium}
          className="mt-3 w-full flex items-center justify-between gap-2 rounded-2xl bg-plum-deep px-3.5 py-3 text-left active:scale-[0.98] transition-all"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-[11px] font-bold text-[#F2D08F]">
              <Crown className="w-3 h-3" aria-hidden /> 프리미엄 · 1년 보관 · PDF
            </span>
            <span className="block text-sm font-extrabold text-white truncate">
              {premiumTab.items.map((p) => p.gridLabel || p.name).join(" · ")}
            </span>
          </span>
          <ArrowRight className="w-4 h-4 text-[#F2D08F] shrink-0" />
        </button>
      )}
    </section>
  );
}
