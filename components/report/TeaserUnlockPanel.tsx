"use client";

import React, { useEffect, useRef, useState } from "react";
import { Lock, ArrowRight, Check } from "lucide-react";
import { trackEvent } from "@/lib/gtag";
import { useSeenOnce } from "@/lib/useSeenOnce";
import { priceLabel, listPrice, formatWon, discountBadge, type CatalogItem } from "@/lib/catalog";
import { getTeaserMaskedLines } from "@/lib/teaserBlurCopy";

export type TeaserUnlockSource = "inline" | "sticky" | "locked_card" | "limit";
export type TeaserUnlockTarget = "panel" | "checkout";

let highlightTimer: ReturnType<typeof setTimeout> | null = null;

export function trackTeaserUnlock(
  productId: string,
  source: TeaserUnlockSource,
  to?: TeaserUnlockTarget,
) {
  trackEvent("click_unlock_teaser", { productId, source, ...(to ? { to } : {}) });
}

export function revealUnlockPanel(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.getElementById("teaser-unlock");
  if (!el) return false;

  const reduceMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  el.scrollIntoView({
    block: "center",
    behavior: reduceMotion ? "auto" : "smooth",
  });
  el.focus({ preventScroll: true });

  el.classList.add("ring-2", "ring-coral");
  if (highlightTimer) clearTimeout(highlightTimer);
  highlightTimer = setTimeout(() => {
    el.classList.remove("ring-2", "ring-coral");
    highlightTimer = null;
  }, 1200);

  return true;
}

interface TeaserUnlockPanelProps {
  product: CatalogItem;
  lockedTitles: string[];
  onUnlock: (source: TeaserUnlockSource) => void;
}

export default function TeaserUnlockPanel({ product, lockedTitles, onUnlock }: TeaserUnlockPanelProps) {
  const price = priceLabel(product);
  const lockedCount = lockedTitles.length;
  const strike = listPrice(product);
  const maskedLines = getTeaserMaskedLines(product.id);

  // 하단 고정 바는 안내 카드에 닿기 전까지만 보인다(카드와 버튼 중복·하단 고지 가림 방지)
  const cardRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(true);
  useEffect(() => {
    const update = () => {
      const el = cardRef.current;
      if (el) setShowSticky(el.getBoundingClientRect().top > window.innerHeight - 80);
    };
    update();
    document.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, []);

  useSeenOnce(cardRef, () => trackEvent("view_paywall", { productId: product.id, tier: product.tier, source: "teaser_card" }));

  const handle = (source: TeaserUnlockSource) => {
    trackTeaserUnlock(product.id, source, "checkout");
    onUnlock(source);
  };

  return (
    <>
      <div
        id="teaser-unlock"
        ref={cardRef}
        tabIndex={-1}
        className="rounded-3xl border border-[#FF5C77]/35 bg-[#22142A] p-5 text-left shadow-[0_8px_28px_rgba(0,0,0,0.35)] outline-none transition-shadow"
      >
        <p className="text-xs font-bold text-[#FF8AA1]">여기까지가 무료 미리보기예요</p>
        <h3 className="mt-1 text-lg font-black leading-snug text-[#F6EEF3]">
          {lockedCount > 0 ? `남은 ${lockedCount}개 이야기가 준비돼 있어요` : "전체 리포트가 준비돼 있어요"}
        </h3>

        {/* P-016-2 §3: 핵심 단어를 ●●●로 가린 문장 2줄 (원문 단어는 브라우저로 내려보내지 않음) */}
        <div className="mt-3 rounded-2xl border border-[#FF5C77]/25 bg-[#140B18] p-3.5 space-y-2">
          <p className="text-[11px] font-extrabold text-[#FF8AA1] flex items-center gap-1">
            <Lock className="h-3 w-3 shrink-0" />
            잠긴 파트 핵심 문장 미리보기
          </p>
          {maskedLines.map((line, idx) => (
            <p key={idx} className="text-xs sm:text-sm font-bold leading-snug text-[#F6EEF3]">
              &ldquo;{line}&rdquo;
            </p>
          ))}
        </div>

        {lockedCount > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {lockedTitles.map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm text-[#B9A9BF]">
                <Lock className="h-3.5 w-3.5 shrink-0 text-[#FF5C77]" />
                <span className="truncate">{t}</span>
              </li>
            ))}
          </ul>
        )}

        <ul className="mt-4 flex flex-col gap-1 border-t border-white/[0.08] pt-3 text-xs text-[#B9A9BF]">
          <li className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-[#FF5C77]" /> 결제하면 바로 전체 열람
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-[#FF5C77]" /> {product.accessDays}일 동안 언제든 다시 보기
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-[#FF5C77]" /> 한 번 결제로 끝, 추가 요금 없음
          </li>
        </ul>

        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            {strike && (
              <span className="mb-0.5 flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#8E7D96] line-through">{formatWon(strike)}</span>
                <span className="rounded bg-[#FF5C77]/15 px-1.5 py-0.5 text-[10px] font-extrabold text-[#FF8AA1]">{discountBadge(product)}</span>
              </span>
            )}
            <span className="block text-2xl font-black text-[#F6EEF3]">{price}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handle("inline")}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#FF5C77] px-6 py-4 text-base font-bold text-white shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all hover:opacity-95 active:scale-[0.97]"
        >
          전체 리포트 바로 열기
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* 하단 고정 바 — 안내 카드까지 내려가기 전에도 바로 결제 */}
      <div
        aria-hidden={!showSticky}
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-200 ${showSticky ? "translate-y-0" : "pointer-events-none translate-y-full"} border-t border-white/[0.08] bg-[#140B18]/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md`}
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col text-left">
            <span className="flex items-center gap-1 truncate text-[11px] font-bold text-[#B9A9BF]">
              <Lock className="h-3 w-3 shrink-0 text-[#FF5C77]" />
              {product.name} 전체 보기
            </span>
            <span className="mt-0.5 text-base font-black text-[#FF5C77]">{price}</span>
          </div>
          <button
            type="button"
            onClick={() => handle("sticky")}
            className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-[#FF5C77] px-5 py-3 text-sm font-black text-white shadow-[0_4px_12px_rgba(255,92,119,0.3)] transition-all hover:opacity-95 active:scale-[0.96]"
          >
            지금 열기
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
