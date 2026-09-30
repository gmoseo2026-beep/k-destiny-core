"use client";

import React, { useEffect, useRef, useState } from "react";
import { Lock, ArrowRight, Check } from "lucide-react";
import { trackEvent } from "@/lib/gtag";
import { priceLabel, type CatalogItem } from "@/lib/catalog";

/**
 * 맛보기(티저) 화면의 결제 안내 — 본문 아래 안내 카드 + 화면 하단 고정 바.
 *
 * 이전에는 맨 아래 버튼 하나("전체 리포트 열기 (6,900원 · 회원 첫 결제 4,900원)")뿐이라
 * 무엇이 열리는지·얼마인지 한눈에 안 보였다. 여기서 열리는 분량·혜택·가격을 나눠 보여 준다.
 *
 * GA4: click_unlock_teaser { productId, source: "inline" | "sticky" | "locked_card" }
 *   퍼널 = teaser_created → click_unlock_teaser → checkout_open → purchase_confirmed
 */
export type TeaserUnlockSource = "inline" | "sticky" | "locked_card";

export function trackTeaserUnlock(productId: string, source: TeaserUnlockSource) {
  trackEvent("click_unlock_teaser", { productId, source });
}

const FIRST_TAG = " · 회원 첫 결제 ";

interface TeaserUnlockPanelProps {
  product: CatalogItem;
  lockedTitles: string[];
  onUnlock: (source: TeaserUnlockSource) => void;
}

export default function TeaserUnlockPanel({ product, lockedTitles, onUnlock }: TeaserUnlockPanelProps) {
  const label = priceLabel(product);
  const [price, firstPrice] = label.includes(FIRST_TAG) ? label.split(FIRST_TAG) : [label, null];
  const lockedCount = lockedTitles.length;

  // 하단 고정 바는 안내 카드에 닿기 전까지만 보인다(카드와 버튼 중복·하단 고지 가림 방지)
  const cardRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(true);
  useEffect(() => {
    const update = () => {
      const el = cardRef.current;
      if (el) setShowSticky(el.getBoundingClientRect().top > window.innerHeight - 80);
    };
    update();
    // 레이아웃에 따라 창이 아닌 안쪽 영역이 스크롤되므로 capture 로 모든 스크롤을 받는다
    document.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, []);

  const handle = (source: TeaserUnlockSource) => {
    trackTeaserUnlock(product.id, source);
    onUnlock(source);
  };

  return (
    <>
      <div ref={cardRef} className="rounded-3xl border border-coral/30 bg-white p-5 text-left shadow-[0_4px_16px_rgba(255,92,119,0.12)]">
        <p className="text-xs font-bold text-coral">여기까지가 무료 미리보기예요</p>
        <h3 className="mt-1 text-lg font-black leading-snug text-ink">
          {lockedCount > 0 ? `남은 ${lockedCount}개 이야기가 준비돼 있어요` : "전체 리포트가 준비돼 있어요"}
        </h3>

        {lockedCount > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {lockedTitles.map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm text-text-2">
                <Lock className="h-3.5 w-3.5 shrink-0 text-coral" />
                <span className="truncate">{t}</span>
              </li>
            ))}
          </ul>
        )}

        <ul className="mt-4 flex flex-col gap-1 border-t border-line pt-3 text-xs text-text-2">
          <li className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-coral" /> 결제하면 바로 전체 열람
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-coral" /> {product.accessDays}일 동안 언제든 다시 보기
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-coral" /> 한 번 결제로 끝, 추가 요금 없음
          </li>
        </ul>

        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            <span className="block text-2xl font-black text-ink">{price}</span>
            {firstPrice && <span className="text-[11px] font-bold text-coral-deep">회원 첫 결제는 {firstPrice}</span>}
          </div>
        </div>

        <button
          type="button"
          onClick={() => handle("inline")}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-coral px-6 py-4 text-base font-bold text-white shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all hover:bg-coral active:scale-[0.97]"
        >
          전체 리포트 바로 열기
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* 하단 고정 바 — 안내 카드까지 내려가기 전에도 바로 결제 */}
      <div
        aria-hidden={!showSticky}
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-200 ${showSticky ? "translate-y-0" : "pointer-events-none translate-y-full"} border-t border-[#FFD9E0] bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md`}
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col text-left">
            <span className="flex items-center gap-1 truncate text-[11px] font-bold text-[#8A8291]">
              <Lock className="h-3 w-3 shrink-0 text-coral" />
              {product.name} 전체 보기
            </span>
            <span className="mt-0.5 text-base font-black text-coral">{price}</span>
          </div>
          <button
            type="button"
            onClick={() => handle("sticky")}
            className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-coral px-5 py-3 text-sm font-black text-white shadow-[0_4px_12px_rgba(255,92,119,0.3)] transition-all hover:bg-coral active:scale-[0.96]"
          >
            지금 열기
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
