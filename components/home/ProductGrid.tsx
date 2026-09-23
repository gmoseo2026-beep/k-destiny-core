import React from "react";
import Link from "next/link";
import Image from "next/image";
import { CatalogItem } from "@/lib/catalog";

interface ProductGridProps {
  locale: string;
  products: CatalogItem[];
}

export default function ProductGrid({ locale, products }: ProductGridProps) {
  // 보이는 표준 상품(tier: standard, SET 제외), featuredOrder 순
  const gridProducts = products
    .filter((p) => p.tier === "standard" && p.type !== "SET" && !p.isHidden)
    .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99));

  return (
    <section className="w-full max-w-[480px] mx-auto px-4 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-extrabold text-ink tracking-tight">
          인기 운세 & 궁합
        </h2>
        <span className="text-xs text-caption">전체보기</span>
      </div>

      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {gridProducts.map((product) => {
          let badgeText: string | null = null;
          let badgeColor = "bg-coral-soft text-coral-deep";

          if (product.id === "secret_love") {
            badgeText = "19";
            badgeColor = "bg-[#3A1F33] text-[#F2D08F]";
          } else if (product.isFree) {
            badgeText = "무료";
            badgeColor = "bg-coral text-white";
          } else if (product.isNew) {
            badgeText = "NEW";
            badgeColor = "bg-[#FF8AA1] text-white";
          }

          return (
            <Link
              key={product.id}
              href={`/${locale}/products/${product.id}`}
              className="group relative flex flex-col items-center p-2 rounded-2xl bg-white hover:bg-surface-soft border border-line/70 transition-all duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 ring-coral text-center"
            >
              {/* Badge */}
              {badgeText && (
                <span
                  className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-tight ${badgeColor} shadow-2xs z-10`}
                >
                  {badgeText}
                </span>
              )}

              {/* 3D Icon 62px */}
              <div className="w-[62px] h-[62px] relative flex items-center justify-center my-1 transition-transform duration-200 group-hover:scale-108">
                <Image
                  src={product.icon3d}
                  alt=""
                  width={62}
                  height={62}
                  className="object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.06)]"
                />
              </div>

              {/* Grid Label */}
              <span className="text-xs font-bold text-ink group-hover:text-coral transition-colors tracking-tight line-clamp-1 mt-1">
                {product.gridLabel || product.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
