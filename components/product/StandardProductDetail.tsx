"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, User, Share2, Check, ArrowRight } from "lucide-react";
import type { CatalogItem, ProductCategory } from "@/lib/catalog";
import { priceLabel, formatWon, separatePrice, setsContaining } from "@/lib/catalog";
import SetUpsell from "@/components/product/SetUpsell";
import ProductViewTracker from "@/components/ProductViewTracker";
import { trackEvent } from "@/lib/gtag";
import { PRODUCT_SPECS } from "@/lib/prompts/productSpecs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tag, type TagCategory } from "@/components/ui/Tag";

const CATEGORY_GRADIENTS: Record<ProductCategory, string> = {
  "cat-fortune": "from-[#9B7BF7] to-[#5B34D6]",
  "cat-compat": "from-[#FF8FA8] to-[#E0245A]",
  "cat-wealth": "from-[#F7C85A] to-[#C98A0B]",
  "cat-reunion": "from-[#FF9A8B] to-[#C9362F]",
  "cat-career": "from-[#7FA9FF] to-[#2A5FD0]",
  "cat-premium": "from-[#5B3354] to-[#2A1526]",
};

const CATEGORY_NAMES: Record<ProductCategory, string> = {
  "cat-fortune": "운세",
  "cat-compat": "궁합",
  "cat-wealth": "재물",
  "cat-reunion": "재회·속마음",
  "cat-career": "직업·적성",
  "cat-premium": "프리미엄",
};

interface StandardProductDetailProps {
  product: CatalogItem;
  locale: string;
  preview?: boolean;
  allProducts: CatalogItem[];
}

export function StandardProductDetail({
  product,
  locale,
  preview,
  allProducts,
}: StandardProductDetailProps) {
  const [toast, setToast] = useState<string | null>(null);

  const gradientClass =
    CATEGORY_GRADIENTS[product.category] || "from-[#FF8FA8] to-[#E0245A]";
  const categoryName = CATEGORY_NAMES[product.category] || "운세";

  // Next path for form input
  const nextPath =
    product.target === "couple"
      ? `/${locale}/compat/new?productId=${product.id}`
      : `/${locale}/fortune/new?productId=${product.id}`;

  // Related products (same target, visible, excluding self, limit 3)
  const relatedProducts = allProducts
    .filter(
      (p) =>
        !p.isHidden &&
        p.target === product.target &&
        p.id !== product.id &&
        p.tier !== "premium"
    )
    .slice(0, 3);

  // 이 상품이 든 세트(공개 중인 것만 — allProducts 는 서버가 공개 판정한 목록)
  const containingSets =
    product.type !== "SET" && !product.isFree ? setsContaining(product.id, allProducts.map((p) => p.id)) : [];

  // Set items if SET
  const setProducts = product.items
    ? product.items
        .map((itemId) => allProducts.find((p) => p.id === itemId))
        .filter((p): p is CatalogItem => !!p)
    : [];

  // Content points
  interface FeaturePoint {
    title: string;
    desc: string;
  }
  let featurePoints: FeaturePoint[] = [];

  if (product.type !== "SET") {
    const spec = PRODUCT_SPECS[product.promptKey];
    if (spec?.sections) {
      featurePoints = spec.sections.map((s) => ({
        title: s.title,
        desc: s.guide || product.pointDesc?.[s.key] || "",
      }));
    } else if (product.pointDesc) {
      const titles: Record<string, string> = {
        chemistry: "둘만의 첫인상과 케미",
        communication: "대화와 감정의 온도",
        conflict: "부딪히기 쉬운 순간과 해법",
        advice: "두근이의 다정한 현실 조언",
        yearly_overview: "한 해의 큰 흐름",
        monthly_flow: "월별 운세의 오르내림",
        caution_points: "조심하면 좋은 시기",
        fortune_tips: "좋은 기운을 살리는 행동 팁",
      };
      featurePoints = Object.entries(product.pointDesc).map(([key, desc]) => ({
        title: titles[key] || "핵심 포인트",
        desc,
      }));
    }
  }

  const handleShare = async () => {
    trackEvent("share_click", {
      location: "product_detail",
      product_id: product.id,
    });
    const shareData = {
      title: `${product.name} | 콩닥`,
      text: product.hook || product.description,
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        setToast("링크가 복사되었습니다!");
        setTimeout(() => setToast(null), 2500);
      } catch {
        setToast("링크 복사에 실패했습니다.");
        setTimeout(() => setToast(null), 2500);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink pb-32">
      <ProductViewTracker productId={product.id} tier={product.tier} />

      {/* 1. Header (Sticky) */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-b border-line z-50 flex items-center justify-between px-4 max-w-[480px] mx-auto">
        <Link
          href={`/${locale}`}
          className="p-2 -ml-2 text-ink hover:text-coral transition-colors"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Link
          href={`/${locale}`}
          className="flex items-center gap-1.5 font-bold text-base text-ink"
        >
          <Image
            src="/mascot/transparent/couple_red_thread.webp"
            alt=""
            width={26}
            height={26}
            className="object-contain"
          />
          <span>콩닥</span>
        </Link>
        <Link
          href={`/${locale}/me`}
          className="p-2 -mr-2 text-ink hover:text-coral transition-colors"
          aria-label="마이페이지"
        >
          <User className="w-5 h-5" />
        </Link>
      </header>

      {/* Main Container constrained to max-w-[480px] */}
      <div className="w-full max-w-[480px] mx-auto">
        {/* Hidden preview banner if applicable */}
        {product.isHidden && preview && (
          <div className="w-full bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-semibold py-2 px-4 text-center">
            🔒 미리보기 — 미공개 상품
          </div>
        )}

        {/* 2. Banner 270px */}
        <section
          className={`relative w-full h-[270px] bg-gradient-to-b ${gradientClass} flex flex-col items-center justify-center text-center overflow-hidden px-4`}
        >
          {/* Heart SVG Pattern (14% Opacity) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none select-none opacity-14"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="banner-heart-pattern"
                x="0"
                y="0"
                width="36"
                height="36"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M18 29s-9-6-12.5-11.5C2 12 3.5 6.5 9 6.5c3.2 0 6.5 2.8 9 5 2.5-2.2 5.8-5 9-5 5.5 0 7 5.5 3.5 11C27 23 18 29 18 29z"
                  fill="white"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#banner-heart-pattern)" />
          </svg>

          {/* 3D Icon 190px */}
          <div className="relative w-[150px] h-[150px] sm:w-[190px] sm:h-[190px] mb-1 z-10 transition-transform duration-300 hover:scale-105">
            <Image
              src={product.icon3d}
              alt=""
              width={190}
              height={190}
              priority
              className="object-contain w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
            />
          </div>

          {/* 38px 900 White Title */}
          <h1 className="relative z-10 text-[30px] sm:text-[36px] font-black text-white leading-tight tracking-tight drop-shadow-sm">
            {product.name}
          </h1>
        </section>

        {/* 3. Product Info */}
        <section className="px-4 pt-6 pb-4">
          {/* Tags */}
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <Tag
              category={
                (["fortune", "compat", "wealth", "reunion", "career"].includes(
                  product.category.replace("cat-", "")
                )
                  ? (product.category.replace("cat-", "") as TagCategory)
                  : "default")
              }
            >
              {categoryName}
            </Tag>
            {product.isPopular && (
              <Badge variant="popular">
                인기
              </Badge>
            )}
            {product.isNew && (
              <Badge variant="new">
                NEW
              </Badge>
            )}
          </div>

          {/* Title + Subtitle */}
          <h2 className="text-xl sm:text-2xl font-black text-ink tracking-tight mb-2">
            {product.name}
            {(product.subtitle || product.hook) && (
              <span className="font-semibold text-text-2 text-base sm:text-lg block mt-1">
                {product.subtitle || product.hook}
              </span>
            )}
          </h2>

          {/* Description */}
          <p className="text-xs sm:text-sm text-caption leading-relaxed mb-4">
            {product.description || product.hook}
          </p>

          {/* Price & Share Button (No Wish Button, No Strikethrough) */}
          <div className="flex items-center justify-between pt-3 pb-2 border-t border-line">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-2xl font-black text-ink">
                {product.isFree ? "무료" : formatWon(product.price)}
              </span>
              {/* 세트: 실제 단건 정가 합계와 비교(취소선·가짜 정가 금지) */}
              {product.type === "SET" && (
                <span className="text-xs font-bold text-caption">
                  따로 사면 {formatWon(separatePrice(product))}
                </span>
              )}
              {/* 첫 결제 할인은 표준 단품만(세트 제외) — 서버 주문 규칙과 동일 */}
              {!product.isFree && product.price > 0 && product.tier === "standard" && product.type !== "SET" && (
                <span className="bg-coral-soft text-coral-deep text-xs font-extrabold px-2.5 py-1 rounded-md">
                  회원 첫 결제 4,900원
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="p-2.5 rounded-full bg-surface-soft hover:bg-[#F2ECEB] text-text-2 border border-line transition-all active:scale-[0.96] shadow-2xs"
              aria-label="공유하기"
            >
              <Share2 className="w-4 h-4 text-coral" />
            </button>
          </div>

          {toast && (
            <div className="mt-2 text-xs font-bold text-coral text-center animate-in fade-in duration-200">
              {toast}
            </div>
          )}
        </section>

        {/* 이 상품이 들어 있는 세트 */}
        {containingSets.length > 0 && (
          <section className="px-4 pb-5">
            <SetUpsell
              sets={containingSets.slice(0, 2)}
              source="product_detail"
              title={product.target === "couple" ? "이 궁합이 들어 있는 세트" : "이 운세가 들어 있는 세트"}
              locale={locale}
              currentId={product.id}
            />
          </section>
        )}

        {/* 4. What's in this report / 세트 구성 */}
        <section className="px-4 py-6 border-t border-line">
          <h3 className="text-base sm:text-lg font-extrabold text-ink mb-4 tracking-tight">
            {product.type === "SET" ? "세트 구성 안내" : "이런 내용을 확인할 수 있어요"}
          </h3>

          {product.type === "SET" && setProducts.length > 0 ? (
            <div className="space-y-3">
              {setProducts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface-soft border border-line"
                >
                  <div className="w-12 h-12 relative shrink-0">
                    <Image
                      src={item.icon3d}
                      alt=""
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-ink truncate">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-text-2 truncate mt-0.5">
                      {item.hook || item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : featurePoints.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {featurePoints.map((pt, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-surface-soft border border-line flex items-start gap-3"
                >
                  <div className="w-8 h-8 relative shrink-0 mt-0.5">
                    <Image
                      src={product.icon3d}
                      alt=""
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-ink">
                      {pt.title}
                    </h4>
                    <p className="text-xs text-text-2 mt-1 leading-relaxed">
                      {pt.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-surface-soft border border-line text-xs text-caption">
              타고난 기운과 사주 원국을 바탕으로 정밀한 4대 분석 결과를 제공합니다.
            </div>
          )}
        </section>

        {/* 5. Recommended For (이런 분께 추천해요) */}
        {product.recommendFor && product.recommendFor.length > 0 && (
          <section className="px-4 py-6 border-t border-line">
            <h3 className="text-base sm:text-lg font-extrabold text-ink mb-3.5 tracking-tight">
              이런 분께 추천해요
            </h3>
            <div className="space-y-2.5">
              {product.recommendFor.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-line/80 shadow-2xs"
                >
                  <div className="w-5 h-5 rounded-full bg-coral-soft flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-coral stroke-[2.5]" />
                  </div>
                  <span className="text-xs sm:text-sm text-text-2 leading-relaxed font-medium">
                    {line}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. Dugeuni's Promise (두근이의 약속 - plum-deep) */}
        <section className="px-4 py-6 border-t border-line">
          <div className="bg-plum-deep text-white rounded-3xl p-5 sm:p-6 border border-[#4E2A45] shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 relative shrink-0">
                <Image
                  src="/mascot/transparent/couple_red_thread.webp"
                  alt="두근이"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-gold-soft tracking-tight">
                  두근이의 세 가지 약속
                </h3>
                <p className="text-[11px] text-white/70">
                  신뢰할 수 있는 콩닥의 정직한 원칙
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-white/90">
              <div className="flex items-start gap-2">
                <span className="text-gold-soft font-bold">1.</span>
                <span>같은 생년월일이면 언제 봐도 같은 점수</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gold-soft font-bold">2.</span>
                <span>비회원이 입력한 생년월일·시간은 원문으로 저장하지 않아요</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gold-soft font-bold">3.</span>
                <span>
                  결제 후 <strong className="text-gold-soft">{product.accessDays}일</strong> 동안 언제든 내 보관함에서 다시 열람
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Together with (함께 봐요) */}
        {relatedProducts.length > 0 && (
          <section className="px-4 py-6 border-t border-line">
            <h3 className="text-base sm:text-lg font-extrabold text-ink mb-3.5 tracking-tight">
              함께 보면 좋은 콘텐츠
            </h3>
            <div className="space-y-2.5">
              {relatedProducts.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/${locale}/products/${rel.id}`}
                  className="group flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-surface-soft border border-line transition-all active:scale-[0.97]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 relative shrink-0">
                      <Image
                        src={rel.icon3d}
                        alt=""
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-ink group-hover:text-coral transition-colors truncate">
                        {rel.name}
                      </h4>
                      <p className="text-[11px] text-caption truncate mt-0.5">
                        {rel.hook || rel.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs font-bold text-ink">
                      {priceLabel(rel)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-caption group-hover:text-coral group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 8. Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-3.5 sm:p-4 bg-white/95 backdrop-blur-md border-t border-line z-40 max-w-[480px] mx-auto shadow-lg">
        <Link href={nextPath} className="block w-full">
          <Button
            size="lg"
            fullWidth
          >
            {product.isFree
              ? "무료로 보기"
              : `무료로 ${product.target === "couple" ? "궁합" : "운세"} 먼저 보기`}
          </Button>
        </Link>
        {!product.isFree && (
          <p className="text-[11px] text-caption text-center mt-1.5 font-medium">
            점수와 미리보기는 무료 · 전체 리포트는 결제 후 바로 열람
          </p>
        )}
      </div>
    </div>
  );
}
