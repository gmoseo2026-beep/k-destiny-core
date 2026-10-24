"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/gtag";
import { formatWon, getProductCover, listPrice, priceLabel, discountBadge, type CatalogItem } from "@/lib/catalog";
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
  const price = priceLabel(product);
  const coverSrc = getProductCover(product);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5 pb-12 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="relative h-[96px] w-[72px] overflow-hidden rounded-xl border border-white/10 bg-[#22142A]">
          <Image src={coverSrc} alt="" fill sizes="72px" className="object-cover" />
        </div>
        <p className="text-xs font-bold text-[#FF8AA1]">오늘의 무료 미리보기 {limit}개를 모두 봤어요</p>
        {canSignup ? (
          <h2 className="text-xl font-black leading-snug text-[#F6EEF3]">가입하면 오늘 {signupBonus}개 더 볼 수 있어요</h2>
        ) : (
          <>
            <h2 className="text-xl font-black leading-snug text-[#F6EEF3]">{product.name}은 전체 리포트로 바로 볼 수 있어요</h2>
            <p className="text-xs text-[#B9A9BF]">무료 미리보기는 내일 다시 볼 수 있어요</p>
          </>
        )}
      </div>

      {canSignup && signupHref && (
        <div className="rounded-3xl border border-[#FF5C77]/35 bg-[#22142A] p-5 text-left">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-[#F6EEF3]">
            <Sparkles className="h-4 w-4 text-[#FF5C77]" />
            {product.name} 미리보기, 이어서 볼 수 있어요
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-[#B9A9BF]">
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[#FF5C77]" /> 카카오·네이버로 3초, 무료
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[#FF5C77]" /> 무료 미리보기 하루 {limit + signupBonus}개 · 매일 오늘의 운세
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[#FF5C77]" /> 방금 넣은 정보 그대로 이어져요
            </li>
          </ul>
          <Link
            href={signupHref}
            onClick={() => trackEvent("preview_limit_signup_click", { productId: product.id })}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#FF5C77] px-6 py-4 text-base font-bold text-white shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all active:scale-[0.97]"
          >
            3초 가입하고 미리보기 이어 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="rounded-3xl border border-white/[0.08] bg-[#22142A] p-5 text-left shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
        {sectionTitles.length > 0 && (
          <>
            <p className="text-xs font-bold text-[#F6EEF3]">전체 리포트에 담기는 내용</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {sectionTitles.map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-[#B9A9BF]">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-[#FF5C77]" />
                  <span className="truncate">{t}</span>
                </li>
              ))}
            </ul>
          </>
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

        <div className="mt-4">
          {strike && (
            <span className="mb-0.5 flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#8E7D96] line-through">{formatWon(strike)}</span>
              <span className="rounded bg-[#FF5C77]/15 px-1.5 py-0.5 text-[10px] font-extrabold text-[#FF8AA1]">{discountBadge(product)}</span>
            </span>
          )}
          <span className="block text-2xl font-black text-[#F6EEF3]">{price}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            trackTeaserUnlock(product.id, "limit");
            onUnlock();
          }}
          className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl px-6 py-4 text-base font-bold transition-all active:scale-[0.97] ${
            canSignup
              ? "border border-[#FF5C77]/40 bg-[#140B18] text-[#FF8AA1]"
              : "bg-[#FF5C77] text-white shadow-[0_4px_16px_rgba(255,92,119,0.25)] hover:opacity-95"
          }`}
        >
          {canSignup ? "미리보기 없이 전체 리포트 열기" : "전체 리포트 바로 열기"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
