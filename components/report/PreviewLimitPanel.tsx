"use client";

// 오늘의 무료 미리보기(하루 3개)를 다 본 뒤 유료 상품을 열었을 때의 화면.
// 미리보기 대신 이 상품에서 받게 될 내용과 가격을 보여 주고 바로 결제로 잇는다.
// GA4: preview_limit_view { productId } → click_unlock_teaser { source: "limit" }
import { useEffect } from "react";
import Image from "next/image";
import { ArrowRight, Check, Lock } from "lucide-react";
import { trackEvent } from "@/lib/gtag";
import { formatWon, listPrice, priceLabel, type CatalogItem } from "@/lib/catalog";
import { trackTeaserUnlock } from "@/components/report/TeaserUnlockPanel";

interface PreviewLimitPanelProps {
  product: CatalogItem;
  /** 전체 리포트에 담기는 꼭지 제목들 */
  sectionTitles: string[];
  limit: number;
  onUnlock: () => void;
}

export default function PreviewLimitPanel({ product, sectionTitles, limit, onUnlock }: PreviewLimitPanelProps) {
  useEffect(() => {
    trackEvent("preview_limit_view", { productId: product.id });
  }, [product.id]);

  const strike = listPrice(product);
  // 회원 첫 결제 문구가 붙는 경우엔 앞의 가격만 크게 보여 준다
  const price = priceLabel(product).split(" · ")[0];

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5 pb-12 text-center">
      <div className="flex flex-col items-center gap-2">
        <Image src={product.icon3d || "/mascot/transparent/couple_red_thread.webp"} alt="" width={72} height={72} className="object-contain" />
        <p className="text-xs font-bold text-coral">오늘의 무료 미리보기 {limit}개를 모두 봤어요</p>
        <h2 className="text-xl font-black leading-snug text-ink">{product.name}은 전체 리포트로 바로 볼 수 있어요</h2>
        <p className="text-xs text-caption">무료 미리보기는 내일 다시 볼 수 있어요</p>
      </div>

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
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-coral px-6 py-4 text-base font-bold text-white shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all hover:bg-coral active:scale-[0.97]"
        >
          전체 리포트 바로 열기
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
