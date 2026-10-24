"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, User, Share2, Check, Lock, Sparkles } from "lucide-react";
import type { CatalogItem, ProductCategory } from "@/lib/catalog";
import {
  formatWon,
  separatePrice,
  setsContaining,
  listPrice,
  discountBadge,
  getProductCover,
  getSetCoverStack,
} from "@/lib/catalog";
import SetUpsell from "@/components/product/SetUpsell";
import ProductViewTracker, { ProductCtaLink } from "@/components/ProductViewTracker";
import { trackEvent } from "@/lib/gtag";
import { useSeenOnce } from "@/lib/useSeenOnce";
import type { SectionOutline } from "@/lib/prompts/sectionOutline";
import type { StandardSamplePreview } from "@/lib/reports/standardSamplePreview";
import type { PublicReviewItem } from "@/lib/couponsClient";
import ProductReviewsSection from "@/components/product/ProductReviewsSection";
import { getTeaserBlurCopy } from "@/lib/teaserBlurCopy";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import OwnedReportNotice from "@/components/OwnedReportNotice";
import { loadLastCouple, loadLastPerson, type LastCouple, type LastPerson } from "@/lib/reportHandoff";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tag, type TagCategory } from "@/components/ui/Tag";
import { ListRowCard } from "@/components/cards/KongdakCards";

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
  sections?: SectionOutline[];
  samplePreview?: StandardSamplePreview | null;
  reviews?: PublicReviewItem[];
}

export function StandardProductDetail({
  product,
  locale,
  preview,
  allProducts,
  sections,
  samplePreview,
  reviews = [],
}: StandardProductDetailProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [lastCouple, setLastCouple] = useState<LastCouple | null>(null);
  const [lastPerson, setLastPerson] = useState<LastPerson | null>(null);
  const sampleSectionRef = useRef<HTMLElement>(null);

  useSeenOnce(sampleSectionRef, () => {
    if (samplePreview) {
      trackEvent("sample_preview_view", { productId: product.id });
    }
  });

  useEffect(() => {
    queueMicrotask(() => {
      setLastCouple(loadLastCouple());
      setLastPerson(loadLastPerson());
    });
  }, []);

  const categoryName = CATEGORY_NAMES[product.category] || "운세";
  const isAnnual = product.id === "annual_2026" || product.id === "annual_2027";
  const coverSrc = getProductCover(product);
  const setStack = product.type === "SET" ? getSetCoverStack(product) : [];

  const nextPath =
    product.id === "annual_2026"
      ? `/${locale}/fortune/annual?year=2026`
      : product.id === "annual_2027"
      ? `/${locale}/fortune/annual?year=2027`
      : product.target === "couple"
      ? `/${locale}/compat/new?productId=${product.id}`
      : `/${locale}/fortune/new?productId=${product.id}`;

  const savedInfo = (() => {
    if (isAnnual) return null;
    if (product.target === "couple" && lastCouple) {
      const nameA = lastCouple.a.name || "나";
      const nameB = lastCouple.b.name || "상대방";
      const href =
        product.id === "compat_basic"
          ? `/${locale}/compat/${encodeURIComponent(lastCouple.compatId)}`
          : `/${locale}/compat/new?productId=${encodeURIComponent(product.id)}&from=${encodeURIComponent(lastCouple.compatId)}&via=saved_detail`;
      return {
        href,
        hint: `방금 본 두 사람(${nameA} · ${nameB}) 정보가 남아 있어요`,
        buttonLabel: "저장된 두 사람 정보로 바로 보기",
      };
    }
    if (product.target === "individual" && lastPerson) {
      const personLabel = lastPerson.name ? `${lastPerson.name} 님의 ` : "";
      return {
        href: `/${locale}/fortune/new?productId=${encodeURIComponent(product.id)}&auto=1`,
        hint: `방금 입력한 ${personLabel}생년월일 정보가 남아 있어요`,
        buttonLabel: "저장된 내 정보로 바로 보기",
      };
    }
    return null;
  })();

  const relatedProducts = allProducts
    .filter(
      (p) =>
        !p.isHidden &&
        p.target === product.target &&
        p.id !== product.id &&
        p.tier !== "premium",
    )
    .slice(0, 3);

  const containingSets =
    product.type !== "SET" && !product.isFree
      ? setsContaining(product.id, allProducts.map((p) => p.id))
      : [];

  const setProducts = product.items
    ? product.items
        .map((itemId) => allProducts.find((p) => p.id === itemId))
        .filter((p): p is CatalogItem => !!p)
    : [];

  interface FeaturePoint {
    title: string;
    desc: string;
  }
  let featurePoints: FeaturePoint[] = [];

  if (product.type !== "SET") {
    if (sections?.length) {
      featurePoints = sections.map((s) => ({
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
    <div className="min-h-screen bg-[#140B18] text-[#F6EEF3] pb-32">
      <ProductViewTracker productId={product.id} tier={product.tier} />

      {/* 1. Header (Sticky) */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#140B18]/90 backdrop-blur-md border-b border-white/[0.08] z-50 flex items-center justify-between px-4 max-w-[480px] mx-auto">
        <Link
          prefetch
          href={`/${locale}`}
          className="p-2 -ml-2 text-[#F6EEF3] hover:text-[#FF5C77] transition-colors"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Link
          prefetch
          href={`/${locale}`}
          className="flex items-center gap-1.5 font-bold text-base text-[#F6EEF3]"
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
          className="p-2 -mr-2 text-[#F6EEF3] hover:text-[#FF5C77] transition-colors"
          aria-label="마이페이지"
        >
          <User className="w-5 h-5" />
        </Link>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-[480px] mx-auto">
        {product.isHidden && preview && (
          <div className="w-full bg-[#FFC24B]/15 border-b border-[#FFC24B]/30 text-[#FFC24B] text-xs font-semibold py-2 px-4 text-center">
            🔒 미리보기 — 미공개 상품
          </div>
        )}

        {/* 2. 상단 3:4 표지 포스터 (3D 이모지 제거, 홈과 동일한 표지 포스터) */}
        <section className="px-4 pt-3">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[380px] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#22142A] shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
            {product.type === "SET" && setStack.length >= 2 ? (
              <div className="absolute inset-0 bg-gradient-to-b from-[#2B1738] via-[#22142A] to-[#140B18]">
                <div className="relative mx-auto mt-8 h-[56%] w-[78%]">
                  {setStack.slice(0, 3).map((src, idx) => {
                    const transforms = [
                      "-rotate-6 -translate-x-5 translate-y-2 scale-90 opacity-75",
                      "rotate-6 translate-x-5 translate-y-2 scale-90 opacity-85",
                      "rotate-0 translate-y-0 scale-100 z-10",
                    ];
                    return (
                      <div
                        key={`${product.id}-hero-${idx}`}
                        className={`absolute inset-0 mx-auto aspect-[3/4] h-full overflow-hidden rounded-2xl border border-white/20 shadow-xl ${transforms[idx] ?? ""}`}
                      >
                        <Image src={src} alt={product.name} fill sizes="240px" className="object-cover" priority={idx === 2} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Image
                src={coverSrc}
                alt={product.name}
                fill
                sizes="(max-width: 480px) 92vw, 380px"
                priority
                className="object-cover"
              />
            )}

            <div
              className="absolute inset-0 flex flex-col justify-end p-5 text-left"
              style={{
                background:
                  "linear-gradient(180deg, transparent 38%, rgba(20,11,24,0.86) 72%, #140B18 100%)",
              }}
            >
              <span className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-xs font-bold text-[#F6EEF3] backdrop-blur-sm">
                {product.name}
              </span>
              <h1 className="mt-2 text-[22px] sm:text-[25px] font-extrabold text-[#F6EEF3] leading-snug tracking-tight break-keep">
                {product.hook || product.name}
              </h1>
            </div>
          </div>
        </section>

        {/* 3. Product Info */}
        <section className="px-4 pt-5 pb-4">
          <OwnedReportNotice locale={locale} catalogId={product.id} source="product" className="mb-4" />
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <Tag
              category={
                (["fortune", "compat", "wealth", "reunion", "career"].includes(
                  product.category.replace("cat-", ""),
                )
                  ? (product.category.replace("cat-", "") as TagCategory)
                  : "default")
              }
            >
              {categoryName}
            </Tag>
            {product.isPopular && <Badge variant="popular">인기</Badge>}
            {product.isNew && <Badge variant="new">NEW</Badge>}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-[#F6EEF3] tracking-tight mb-2">
            {product.name}
            {(product.subtitle || product.hook) && (
              <span className="font-semibold text-[#B9A9BF] text-sm sm:text-base block mt-1">
                {product.subtitle || product.hook}
              </span>
            )}
          </h2>

          <p className="text-xs sm:text-sm text-[#B9A9BF] leading-relaxed mb-4">
            {product.description || product.hook}
          </p>

          <div className="flex items-center justify-between pt-3 pb-2 border-t border-white/[0.08]">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-2xl font-black text-[#FFC24B]">
                {product.isFree ? "무료" : formatWon(product.price)}
              </span>
              {listPrice(product) && (
                <>
                  <span className="text-sm font-bold text-[#B9A9BF] line-through">
                    {formatWon(listPrice(product)!)}
                  </span>
                  <span className="bg-[#FFC24B]/15 text-[#FFC24B] text-xs font-extrabold px-2.5 py-1 rounded-md">
                    {discountBadge(product)}
                  </span>
                </>
              )}
              {product.type === "SET" && separatePrice(product) > product.price && (
                <span className="text-xs font-bold text-[#B9A9BF]">
                  따로 사면 <span className="line-through">{formatWon(separatePrice(product))}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="p-2.5 rounded-full bg-[#22142A] hover:border-white/20 text-[#F6EEF3] border border-white/[0.08] transition-all active:scale-[0.96]"
              aria-label="공유하기"
            >
              <Share2 className="w-4 h-4 text-[#FF5C77]" />
            </button>
          </div>

          {toast && (
            <div className="mt-2 text-xs font-bold text-[#FF5C77] text-center animate-in fade-in duration-200">
              {toast}
            </div>
          )}

          {savedInfo && (
            <div className="mt-4 rounded-2xl border border-[#FF5C77]/35 bg-[#22142A] p-3.5">
              <p className="mb-2 text-xs font-bold text-[#F6EEF3]">
                {savedInfo.hint}
              </p>
              <ProductCtaLink
                href={savedInfo.href}
                productId={product.id}
                tier={product.tier}
                target={product.target}
                isFree={Boolean(product.isFree)}
                location="saved_info_hero"
                className="block w-full"
              >
                <Button size="md" fullWidth>
                  {savedInfo.buttonLabel}
                </Button>
              </ProductCtaLink>
              <ProductCtaLink
                href={nextPath}
                productId={product.id}
                tier={product.tier}
                target={product.target}
                isFree={Boolean(product.isFree)}
                location="hero"
                className="mt-2 block text-center text-xs font-bold text-[#B9A9BF] underline underline-offset-4 hover:text-[#FF5C77] transition-colors"
              >
                다른 생년월일로 새로 입력하기
              </ProductCtaLink>
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
        <section className="px-4 py-6 border-t border-white/[0.08]">
          <h3 className="text-base sm:text-lg font-extrabold text-[#F6EEF3] mb-4 tracking-tight">
            {product.type === "SET" ? "세트 구성 안내" : "이런 내용을 확인할 수 있어요"}
          </h3>

          {product.type === "SET" && setProducts.length > 0 ? (
            <div className="space-y-2.5">
              {setProducts.map((item) => (
                <ListRowCard key={item.id} product={item} listName="set_detail_items" />
              ))}
            </div>
          ) : featurePoints.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {featurePoints.map((pt, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#22142A] border border-white/[0.08] flex items-start gap-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FF5C77]/15 text-xs font-extrabold text-[#FF5C77]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#F6EEF3]">
                      {pt.title}
                    </h4>
                    <p className="text-xs text-[#B9A9BF] mt-1 leading-relaxed">
                      {pt.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#22142A] border border-white/[0.08] text-xs text-[#B9A9BF]">
              타고난 기운과 사주 원국을 바탕으로 정밀한 4대 분석 결과를 제공합니다.
            </div>
          )}
        </section>

        {/* 4-1. Sample Preview */}
        {samplePreview && (
          <section ref={sampleSectionRef} className="px-4 py-6 border-t border-white/[0.08]">
            <div className="flex items-center justify-between gap-2 mb-3.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-extrabold text-[#F6EEF3] tracking-tight">
                결과 예시
              </h3>
              <span className="rounded-full bg-[#22142A] border border-white/[0.08] px-2.5 py-1 text-[11px] font-bold text-[#B9A9BF]">
                {samplePreview.targetLabel}
              </span>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#22142A] p-5">
              <div
                aria-hidden="true"
                className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-[0.04] -rotate-12"
              >
                <span className="text-7xl font-black tracking-widest text-white">
                  예시
                </span>
              </div>

              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex flex-col items-center text-center border-b border-white/[0.08] pb-4">
                  <div className="scale-90 origin-bottom">
                    <ScoreGauge score={samplePreview.score} color="#FF5C77" />
                  </div>
                  <p className="mt-2 text-base sm:text-lg font-black text-[#F6EEF3] leading-snug tracking-tight">
                    &ldquo;{samplePreview.headline}&rdquo;
                  </p>
                  <p className="mt-1.5 text-xs sm:text-sm text-[#B9A9BF] leading-relaxed">
                    {samplePreview.summary}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#140B18]/80 border border-white/[0.08] p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-[#FF5C77] shrink-0" />
                    <h4 className="text-xs sm:text-sm font-extrabold text-[#F6EEF3]">
                      {samplePreview.firstSection.title}
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm text-[#F6EEF3] leading-relaxed whitespace-pre-line">
                    {samplePreview.firstSection.bodyExcerpt}
                  </p>
                  <div className="relative mt-1">
                    <p aria-hidden="true" className="select-none text-xs sm:text-sm leading-relaxed text-[#F6EEF3] blur-[5px]">
                      {getTeaserBlurCopy(product.id)}
                    </p>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#140B18]/70 to-[#140B18]" />
                  </div>
                </div>

                {samplePreview.lockedSections.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {samplePreview.lockedSections.map((sec, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#140B18]/70 px-3.5 py-3 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-[#F6EEF3] truncate">
                            {sec.title}
                          </span>
                          <p className="mt-0.5 text-[11px] text-[#B9A9BF] truncate">
                            {sec.firstSentence}
                          </p>
                        </div>
                        <Lock className="w-4 h-4 text-[#FF5C77] shrink-0" aria-hidden="true" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="mt-2.5 text-center text-xs font-medium text-[#B9A9BF]">
              내 생년월일로 보면 점수와 내용이 달라져요
            </p>
          </section>
        )}

        {/* 5. 실제 구매자 후기 + 이런 분께 추천해요 */}
        <ProductReviewsSection reviews={reviews} variant="detail" />
        {product.recommendFor && product.recommendFor.length > 0 && (
          <section className="px-4 py-6 border-t border-white/[0.08]">
            <h3 className="text-base sm:text-lg font-extrabold text-[#F6EEF3] mb-3.5 tracking-tight">
              이런 분께 추천해요
            </h3>
            <div className="space-y-2.5">
              {product.recommendFor.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#22142A] border border-white/[0.08]"
                >
                  <div className="w-5 h-5 rounded-full bg-[#FF5C77]/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-[#FF5C77] stroke-[2.5]" />
                  </div>
                  <span className="text-xs sm:text-sm text-[#F6EEF3] leading-relaxed font-medium">
                    {line}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. 두근이의 세 가지 약속 */}
        <section className="px-4 py-6 border-t border-white/[0.08]">
          <div className="bg-[#22142A] text-[#F6EEF3] rounded-3xl p-5 sm:p-6 border border-white/[0.08]">
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
                <h3 className="text-sm sm:text-base font-extrabold text-[#FFC24B] tracking-tight">
                  두근이의 세 가지 약속
                </h3>
                <p className="text-[11px] text-[#B9A9BF]">
                  신뢰할 수 있는 콩닥의 정직한 원칙
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-[#F6EEF3]/90">
              <div className="flex items-start gap-2">
                <span className="text-[#FFC24B] font-bold">1.</span>
                <span>같은 생년월일이면 언제 봐도 같은 점수</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#FFC24B] font-bold">2.</span>
                <span>비회원이 입력한 생년월일·시간은 원문으로 저장하지 않아요</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#FFC24B] font-bold">3.</span>
                <span>
                  결제 후 <strong className="text-[#FFC24B]">{product.accessDays}일</strong> 동안 언제든 내 보관함에서 다시 열람
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. 함께 보면 좋은 콘텐츠 */}
        {relatedProducts.length > 0 && (
          <section className="px-4 py-6 border-t border-white/[0.08]">
            <h3 className="text-base sm:text-lg font-extrabold text-[#F6EEF3] mb-3.5 tracking-tight">
              함께 보면 좋은 콘텐츠
            </h3>
            <div className="space-y-2.5">
              {relatedProducts.map((rel) => (
                <ListRowCard key={rel.id} product={rel} listName="related_products" />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 8. Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-3.5 sm:p-4 bg-[#140B18]/95 backdrop-blur-md border-t border-white/[0.08] z-40 max-w-[480px] mx-auto shadow-lg pb-safe-bar">
        {savedInfo && (
          <ProductCtaLink
            href={savedInfo.href}
            productId={product.id}
            tier={product.tier}
            target={product.target}
            isFree={Boolean(product.isFree)}
            location="saved_info_sticky"
            className="mb-2 block w-full"
          >
            <Button size="lg" fullWidth>
              {savedInfo.buttonLabel}
            </Button>
          </ProductCtaLink>
        )}
        <Link
          prefetch
          href={nextPath}
          onClick={() =>
            trackEvent("product_cta_click", {
              productId: product.id,
              tier: product.tier,
              target: product.target,
              isFree: Boolean(product.isFree),
              location: "bottom_fixed",
            })
          }
          className={
            savedInfo
              ? "block w-full text-center text-xs font-bold text-[#B9A9BF] underline underline-offset-4 py-1 hover:text-[#FF5C77] transition-colors"
              : "block w-full"
          }
        >
          {savedInfo ? (
            "다른 생년월일로 새로 입력하기"
          ) : (
            <Button size="lg" fullWidth>
              {product.isFree
                ? "무료로 보기"
                : product.target === "couple" && product.id !== "compat_basic"
                ? `${product.name} 무료 미리보기`
                : `무료로 ${product.target === "couple" ? "궁합" : "운세"} 먼저 보기`}
            </Button>
          )}
        </Link>
        {!product.isFree && (
          <p className="text-[11px] text-[#B9A9BF] text-center mt-1.5 font-medium">
            점수와 미리보기는 무료 · 전체 리포트는 결제 후 바로 열람
          </p>
        )}
      </div>
    </div>
  );
}
