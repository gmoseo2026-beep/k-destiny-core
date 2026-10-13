"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { trackEvent } from "@/lib/gtag";
import { useSeenOnce } from "@/lib/useSeenOnce";
import { formatWon, type CatalogItem } from "@/lib/catalog";

/**
 * 홈 맨 위 연말 특가 안내(2026-10-13 사장님 결정, 12/31까지).
 * 지금 받을 수 있는 할인 두 가지와 기본 혜택을 첫 화면에서 보여 준다.
 *
 * - 가격은 서버가 넘긴 상품 값 그대로 쓴다(lib/catalog.ts 의 기간 한정 가격 — 결제 금액과 같은 출처).
 * - 기간이 끝나면 서버가 이 컴포넌트를 그리지 않는다(app/[locale]/page.tsx).
 * - GA4: season_promo_view(화면에 보인 순간 1회), home_card_click { section: "season_promo" }
 */
export interface SeasonPromoItem {
  product: Pick<CatalogItem, "id" | "name" | "icon3d" | "price" | "originalPrice">;
  /** 카드에 적는 한 줄 */
  line: string;
}

interface SeasonPromoBannerProps {
  locale: string;
  items: SeasonPromoItem[];
  /** 남은 날 수(서버에서 계산 — 클라이언트 시계와 어긋나 화면이 바뀌지 않게) */
  daysLeft: number;
  /** 무료 미리보기를 볼 수 있는 풀이 수 */
  total: number;
}

export default function SeasonPromoBanner({ locale, items, daysLeft, total }: SeasonPromoBannerProps) {
  const ref = useRef<HTMLElement>(null);
  useSeenOnce(ref, () => trackEvent("season_promo_view", { items: items.map((i) => i.product.id).join(",") }));
  if (items.length === 0) return null;

  return (
    <section ref={ref} className="mx-auto w-full max-w-[480px] px-4 pt-3" aria-label="연말 특가">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#3A1B40] via-[#5A2560] to-[#6A2C70] p-4 text-white shadow-[0_8px_24px_rgba(106,44,112,0.25)]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-black tracking-tight">🎁 연말 특가</h2>
          <span className="shrink-0 rounded-full bg-[#FFC24B] px-2.5 py-1 text-[11px] font-extrabold text-ink">
            12월 31일까지{daysLeft > 0 ? ` · D-${daysLeft}` : ""}
          </span>
        </div>
        <p className="mt-1 text-xs font-semibold text-white/80">올해는 잘 마무리하고, 내년은 미리 준비해요</p>

        <div className={`mt-3 grid gap-2 ${items.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {items.map(({ product, line }, i) => (
            <Link
              prefetch
              key={product.id}
              href={`/${locale}/products/${product.id}`}
              onClick={() => trackEvent("home_card_click", { section: "season_promo", position: i + 1, productId: product.id, tab: "-" })}
              className="flex flex-col rounded-2xl bg-white p-3 text-left text-ink transition-all active:scale-[0.97]"
            >
              <div className="flex items-center gap-2">
                <Image src={product.icon3d} alt="" width={36} height={36} className="shrink-0 object-contain" />
                <span className="text-[13px] font-extrabold leading-tight [word-break:keep-all]">{product.name}</span>
              </div>
              <p className="mt-1.5 text-[11px] font-semibold leading-snug text-text-2 [word-break:keep-all]">{line}</p>
              <div className="mt-2 flex items-end justify-between gap-1">
                <div>
                  {product.originalPrice > product.price && (
                    <span className="block text-[11px] font-bold text-text-3 line-through">{formatWon(product.originalPrice)}</span>
                  )}
                  <span className="block text-lg font-black leading-none text-coral">{formatWon(product.price)}</span>
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-coral text-white">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-white/85">
          <li className="flex items-center gap-1">
            <Check className="h-3 w-3 text-[#FFC24B]" /> {total}가지 무료 미리보기
          </li>
          <li className="flex items-center gap-1">
            <Check className="h-3 w-3 text-[#FFC24B]" /> 가입 없이 30초
          </li>
          <li className="flex items-center gap-1">
            <Check className="h-3 w-3 text-[#FFC24B]" /> 결제 후 바로 열람
          </li>
        </ul>
      </div>
    </section>
  );
}
