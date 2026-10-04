"use client";

// 오늘의 무료 미리보기(하루 3개)를 다 본 뒤 유료 상품을 열었을 때의 화면.
// 미리보기 대신 이 상품에서 받게 될 내용과 가격을 보여 주고 바로 결제로 잇는다.
// GA4: preview_limit_view { productId } → click_unlock_teaser { source: "limit" }
//
// 2026-10-04: 비회원에게는 "가입하면 N개 더"를 먼저 보여 준다(preview_limit_signup_click).
// 한도에 닿은 비회원은 결제 안내만 보고 그냥 나갔고(이틀 9명), 결제한 사람은 전부 가입 직후의 회원이었다.
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/gtag";
import { formatWon, listPrice, priceLabel, type CatalogItem } from "@/lib/catalog";
import { trackTeaserUnlock } from "@/components/report/TeaserUnlockPanel";

interface PreviewLimitPanelProps {
  product: CatalogItem;
  /** 전체 리포트에 담기는 꼭지 제목들 */
  sectionTitles: string[];
  limit: number;
  onUnlock: () => void;
  /** 비회원이 가입하면 오늘 더 볼 수 있는 미리보기 수(0·없음이면 가입 안내를 숨긴다 — 회원이거나 회원 한도까지 본 경우) */
  signupBonus?: number;
  /** 가입·로그인 주소(끝나면 이 상품 미리보기로 돌아온다) */
  signupHref?: string;
}

export default function PreviewLimitPanel({ product, sectionTitles, limit, onUnlock, signupBonus = 0, signupHref }: PreviewLimitPanelProps) {
  const canSignup = signupBonus > 0 && !!signupHref;
  useEffect(() => {
    trackEvent("preview_limit_view", { productId: product.id, signup_offer: canSignup });
  }, [product.id, canSignup]);

  const strike = listPrice(product);
  // 회원 첫 결제 문구가 붙는 경우엔 앞의 가격만 크게 보여 준다
  const price = priceLabel(product).split(" · ")[0];

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5 pb-12 text-center">
      <div className="flex flex-col items-center gap-2">
        <Image src={product.icon3d || "/mascot/transparent/couple_red_thread.webp"} alt="" width={72} height={72} className="object-contain" />
        <p className="text-xs font-bold text-coral">오늘의 무료 미리보기 {limit}개를 모두 봤어요</p>
        {canSignup ? (
          <h2 className="text-xl font-black leading-snug text-ink">가입하면 오늘 {signupBonus}개 더 볼 수 있어요</h2>
        ) : (
          <>
            <h2 className="text-xl font-black leading-snug text-ink">{product.name}은 전체 리포트로 바로 볼 수 있어요</h2>
            <p className="text-xs text-caption">무료 미리보기는 내일 다시 볼 수 있어요</p>
          </>
        )}
      </div>

      {canSignup && signupHref && (
        <div className="rounded-3xl border border-coral/30 bg-coral-soft p-5 text-left">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
            <Sparkles className="h-4 w-4 text-coral" />
            {product.name} 미리보기, 이어서 볼 수 있어요
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-text-2">
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-coral" /> 카카오·네이버로 3초, 무료
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-coral" /> 무료 미리보기 하루 {limit + signupBonus}개 · 매일 오늘의 운세
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-coral" /> 방금 넣은 정보 그대로 이어져요
            </li>
          </ul>
          <Link
            href={signupHref}
            onClick={() => trackEvent("preview_limit_signup_click", { productId: product.id })}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-coral px-6 py-4 text-base font-bold text-white shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all active:scale-[0.97]"
          >
            3초 가입하고 미리보기 이어 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="rounded-3xl border border-coral/30 bg-white p-5 text-left shadow-[0_4px_16px_rgba(255,92,119,0.12)]">
        {sectionTitles.length > 0 && (
          <>
            <p className="text-xs font-bold text-ink">전체 리포트에 담기는 내용</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {sectionTitles.map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-text-2">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-coral" />
                  <span className="truncate">{t}</span>
                </li>
              ))}
            </ul>
          </>
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

        <div className="mt-4">
          {strike && (
            <span className="mb-0.5 flex items-center gap-1.5">
              <span className="text-xs font-bold text-text-3 line-through">{formatWon(strike)}</span>
              <span className="rounded bg-coral-soft px-1.5 py-0.5 text-[10px] font-extrabold text-coral-deep">오픈 기념가</span>
            </span>
          )}
          <span className="block text-2xl font-black text-ink">{price}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            trackTeaserUnlock(product.id, "limit");
            onUnlock();
          }}
          className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl px-6 py-4 text-base font-bold transition-all active:scale-[0.97] ${
            canSignup
              ? "border border-coral/40 bg-white text-coral-deep"
              : "bg-coral text-white shadow-[0_4px_16px_rgba(255,92,119,0.25)] hover:bg-coral"
          }`}
        >
          {canSignup ? "미리보기 없이 전체 리포트 열기" : "전체 리포트 바로 열기"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
