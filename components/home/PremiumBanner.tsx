import React from "react";
import Link from "next/link";
import Image from "next/image";
import { CatalogItem, priceLabel } from "@/lib/catalog";

interface PremiumBannerProps {
  locale: string;
  premiumProducts: CatalogItem[];
}

export default function PremiumBanner({ locale, premiumProducts }: PremiumBannerProps) {
  const visiblePremium = premiumProducts.filter((p) => !p.isHidden);
  if (visiblePremium.length === 0) return null;

  return (
    <section className="w-full max-w-[480px] mx-auto px-4 mt-8">
      <div className="bg-plum-deep text-white rounded-3xl p-5 border border-[#4E2A45] shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-1.5 text-xs font-black text-gold-soft tracking-wider">
            <span className="text-sm">👑</span>
            <span>KONGDAK PREMIUM</span>
          </div>
          <span className="text-[11px] text-white/60">평생 보관 심층 리포트</span>
        </div>

        {/* Rows */}
        <div className="space-y-3">
          {visiblePremium.map((product) => (
            <Link
              key={product.id}
              href={`/${locale}/products/${product.id}`}
              className="group flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all duration-150 active:scale-[0.97]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 relative shrink-0">
                  <Image
                    src={product.icon3d}
                    alt=""
                    width={44}
                    height={44}
                    className="object-contain"
                  />
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-xs sm:text-sm font-bold text-white group-hover:text-gold-soft transition-colors truncate">
                    {product.name}
                  </div>
                  <div className="text-[11px] text-white/70 truncate mt-0.5">
                    {product.hook || product.description}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs sm:text-sm font-extrabold text-gold-soft">
                  {priceLabel(product)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
