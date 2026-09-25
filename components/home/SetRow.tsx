import React from "react";
import Link from "next/link";
import Image from "next/image";
import { CatalogItem, formatWon, getProduct, separatePrice } from "@/lib/catalog";

interface SetRowProps {
  locale: string;
  /** 서버가 공개 판정한 상품 목록(세트만 골라 쓴다) */
  products: CatalogItem[];
}

// 홈 "세트로 한 번에" 가로 줄. 가격 비교는 실제 단건 정가 합계만 쓴다(취소선 금지).
export default function SetRow({ locale, products }: SetRowProps) {
  const sets = products
    .filter((p) => p.type === "SET")
    // 아끼는 금액이 큰 세트부터
    .sort((a, b) => separatePrice(b) - b.price - (separatePrice(a) - a.price));
  if (sets.length === 0) return null;

  return (
    <section className="w-full max-w-[480px] mx-auto px-4 mt-10">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base sm:text-lg font-extrabold text-ink tracking-tight">세트로 한 번에</h2>
        <span className="text-xs text-caption">밀어서 보기 →</span>
      </div>
      <p className="text-xs text-caption mb-4">궁금한 리포트를 묶어 보면 따로 사는 것보다 알뜰해요</p>

      <div className="flex gap-3 overflow-x-auto snap-x no-scrollbar pb-2 -mx-4 px-4">
        {sets.map((set) => {
          const items = (set.items ?? []).map((id) => getProduct(id)).filter((p): p is CatalogItem => !!p);
          return (
            <Link
              key={set.id}
              href={`/${locale}/products/${set.id}`}
              className="group shrink-0 w-[168px] snap-start rounded-2xl bg-white hover:bg-surface-soft border border-line p-3.5 flex flex-col justify-between gap-3 transition-all duration-150 active:scale-[0.96]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-coral-deep bg-coral-soft px-2 py-0.5 rounded-full">
                    리포트 {items.length}개
                  </span>
                  <Image src={set.icon3d} alt="" width={32} height={32} className="object-contain" />
                </div>
                <h3 className="text-sm font-extrabold text-ink group-hover:text-coral transition-colors mt-2 leading-snug">
                  {set.name}
                </h3>
                <p className="text-[11px] text-caption mt-1 leading-snug line-clamp-2">
                  {items.map((p) => p.gridLabel || p.name).join(" · ")}
                </p>
              </div>
              <div>
                <div className="text-sm font-black text-coral">{formatWon(set.price)}</div>
                <div className="text-[10px] text-caption">따로 사면 {formatWon(separatePrice(set))}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
