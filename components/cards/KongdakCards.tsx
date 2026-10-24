"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import {
  type CatalogItem,
  formatWon,
  getProductCover,
  getSetCoverStack,
  isOnSeasonPromo,
  listPrice,
  priceLabel,
  SEASON_PROMO_LABEL,
  SEASON_PROMO_UNTIL,
  separatePrice,
} from "@/lib/catalog";
import { trackEvent } from "@/lib/gtag";
import KongdakMascot from "@/components/KongdakMascot";

export function resolveProductHref(product: Pick<CatalogItem, "id">): string {
  if (product.id === "compat_basic") return "/compat/new";
  if (product.id === "annual_2026") return "/fortune/annual?year=2026";
  if (product.id === "annual_2027") return "/fortune/annual?year=2027";
  return `/products/${product.id}`;
}

function CoverImageWithFallback({
  src,
  alt,
  label,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  label: string;
  sizes: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#2A1635] via-[#22142A] to-[#140B18] p-4">
        <div className="mb-2 opacity-90">
          <KongdakMascot size={56} animate="none" />
        </div>
        <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#F6EEF3]">
          {label}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  );
}

/**
 * 카드 1 — 포스터 카드 (3:4)
 * 표지 이미지 + 하단 그라디언트(linear-gradient(180deg, transparent 40%, #140B18 100%)) + 제목 + 한 줄 후킹 + "무료 미리보기"
 */
export function PosterCard({
  product,
  listName = "home_poster_grid",
  priority = false,
}: {
  product: CatalogItem;
  listName?: string;
  priority?: boolean;
}) {
  const href = resolveProductHref(product);
  const coverSrc = getProductCover(product);
  const onPromo = isOnSeasonPromo(product.id);
  const isSet = product.type === "SET";
  const stackCovers = isSet ? getSetCoverStack(product) : [];

  const handleClick = () => {
    trackEvent("select_item", {
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
      item_list_name: listName,
    });
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="group relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#22142A] p-3.5 text-left shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition-transform duration-150 active:scale-[0.98]"
    >
      {/* 배경 표지 (세트일 때는 2~3장 겹침 연출, 단품은 전체 3:4 표지) */}
      {isSet && stackCovers.length >= 2 ? (
        <div className="absolute inset-0 bg-gradient-to-b from-[#2B1738] via-[#22142A] to-[#140B18]">
          <div className="relative mx-auto mt-4 h-[56%] w-[82%]">
            {stackCovers.slice(0, 3).map((src, idx) => {
              const transforms = [
                "-rotate-6 -translate-x-4 translate-y-2 scale-90 opacity-75",
                "rotate-6 translate-x-4 translate-y-2 scale-90 opacity-85",
                "rotate-0 translate-y-0 scale-100 z-10",
              ];
              return (
                <div
                  key={`${product.id}-stack-${idx}`}
                  className={`absolute inset-0 mx-auto aspect-[3/4] h-full overflow-hidden rounded-xl border border-white/20 shadow-lg transition-transform duration-300 ${transforms[idx] ?? ""}`}
                >
                  <CoverImageWithFallback
                    src={src}
                    alt={product.name}
                    label={product.gridLabel || product.name}
                    sizes="160px"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <CoverImageWithFallback
          src={coverSrc}
          alt={product.name}
          label={product.gridLabel || product.name}
          sizes="(max-width: 640px) 46vw, 220px"
          priority={priority}
        />
      )}

      {/* 포스터 하단 그라디언트 오버레이 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(20,11,24,0.12) 0%, rgba(20,11,24,0.08) 38%, rgba(20,11,24,0.88) 72%, #140B18 100%)",
        }}
      />

      {/* 상단 배지 줄 */}
      <div className="relative z-10 flex items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1">
          {product.isFree && (
            <span className="rounded-full bg-[#FF5C77] px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
              무료
            </span>
          )}
          {onPromo && (
            <span className="rounded-full bg-[#FFC24B] px-2 py-0.5 text-[10px] font-extrabold text-[#140B18] shadow-sm">
              {SEASON_PROMO_LABEL} · {SEASON_PROMO_UNTIL}
            </span>
          )}
          {!onPromo && product.tier === "premium" && (
            <span className="rounded-full border border-[#FFC24B]/50 bg-[#140B18]/80 px-2 py-0.5 text-[10px] font-bold text-[#FFC24B] backdrop-blur-sm">
              프리미엄
            </span>
          )}
          {isSet && (
            <span className="rounded-full border border-[#FFC24B]/40 bg-[#140B18]/80 px-2 py-0.5 text-[10px] font-bold text-[#FFC24B] backdrop-blur-sm">
              세트 할인
            </span>
          )}
        </div>
        {product.id === "secret_love" && (
          <span className="rounded-full bg-[#FF5C77] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
            19
          </span>
        )}
      </div>

      {/* 하단 1/3 텍스트 영역 */}
      <div className="relative z-10 mt-auto pt-6">
        <h3 className="line-clamp-1 text-[15px] font-extrabold leading-snug tracking-tight text-[#F6EEF3] drop-shadow-sm">
          {product.gridLabel || product.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#B9A9BF]">
          {product.hook || product.description}
        </p>
        <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.08] pt-2">
          <span className="text-[11px] font-bold text-[#FF5C77]">
            {product.isFree ? "지금 바로 무료" : "무료 미리보기"}
          </span>
          <span className="text-[11px] font-bold text-[#FFC24B]">
            {priceLabel(product)}
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * 카드 2 — 목록 행 카드
 * 정사각 썸네일(표지 이미지 정사각 크롭) + 제목 + 한 줄 후킹 + 가격
 * 랭킹·세트·프리미엄·보관함·후기 아래 상품 안내가 모두 이 카드를 공유한다.
 */
export function ListRowCard({
  product,
  rank,
  badgeText,
  rightSubtext,
  hrefOverride,
  listName = "list_row",
}: {
  product: CatalogItem;
  rank?: number;
  badgeText?: string;
  rightSubtext?: string;
  hrefOverride?: string;
  listName?: string;
}) {
  const href = hrefOverride ?? resolveProductHref(product);
  const coverSrc = getProductCover(product);
  const strike = listPrice(product);
  const onPromo = isOnSeasonPromo(product.id);

  const handleClick = () => {
    trackEvent("select_item", {
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
      item_list_name: listName,
    });
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-[#22142A] p-3 text-left transition-colors hover:border-white/20 active:scale-[0.99]"
    >
      {typeof rank === "number" && (
        <span className="w-5 shrink-0 text-center text-[15px] font-extrabold text-[#FFC24B]">
          {rank}
        </span>
      )}

      {/* 정사각 표지 썸네일 */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#140B18]">
        <CoverImageWithFallback
          src={coverSrc}
          alt={product.name}
          label={product.gridLabel || product.name}
          sizes="56px"
        />
      </div>

      {/* 가운데 제목 + 한 줄 후킹 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-[14px] font-bold text-[#F6EEF3]">
            {product.name}
          </h3>
          {(badgeText || onPromo) && (
            <span className="shrink-0 rounded-full bg-[#FFC24B]/15 px-2 py-0.5 text-[10px] font-bold text-[#FFC24B]">
              {badgeText ?? SEASON_PROMO_LABEL}
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[12px] text-[#B9A9BF]">
          {product.hook || product.description}
        </p>
      </div>

      {/* 오른쪽 가격 / 상태 */}
      <div className="shrink-0 text-right">
        {rightSubtext ? (
          <span className="inline-block rounded-full bg-[#FF5C77]/15 px-2.5 py-1 text-[11px] font-bold text-[#FF5C77]">
            {rightSubtext}
          </span>
        ) : (
          <div className="flex flex-col items-end">
            {strike && (
              <span className="text-[11px] text-[#B9A9BF] line-through">
                {formatWon(strike)}
              </span>
            )}
            <span className="text-[13px] font-extrabold text-[#FFC24B]">
              {priceLabel(product)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * 카드 3 — 세트 카드
 * 포함된 단품 표지 2~3장을 살짝 겹친 썸네일 + "따로 사면 / 세트가"
 */
export function SetStackCard({
  product,
  listName = "set_card",
}: {
  product: CatalogItem;
  listName?: string;
}) {
  const href = resolveProductHref(product);
  const stack = getSetCoverStack(product);
  const separate = separatePrice(product);
  const saved = Math.max(0, separate - product.price);
  const onPromo = isOnSeasonPromo(product.id);

  const handleClick = () => {
    trackEvent("select_item", {
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
      item_list_name: listName,
    });
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-[#22142A] p-3.5 text-left transition-colors hover:border-white/20 active:scale-[0.99]"
    >
      {/* 단품 표지 2~3장 겹친 썸네일 */}
      <div className="relative h-16 w-16 shrink-0">
        {stack.slice(0, 3).map((src, idx) => {
          const offsets = [
            "left-0 top-1.5 -rotate-6 opacity-75",
            "left-2 top-0.5 rotate-3 opacity-85",
            "left-4 top-0 rotate-0 z-10",
          ];
          return (
            <div
              key={`${product.id}-thumb-${idx}`}
              className={`absolute h-14 w-11 overflow-hidden rounded-lg border border-white/20 bg-[#140B18] shadow-md ${offsets[idx] ?? ""}`}
            >
              <CoverImageWithFallback
                src={src}
                alt={product.name}
                label={product.gridLabel || product.name}
                sizes="48px"
              />
            </div>
          );
        })}
      </div>

      {/* 세트 설명 + 따로 사면 / 세트가 */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="truncate text-[14px] font-extrabold text-[#F6EEF3]">
            {product.name}
          </h3>
          {saved > 0 && (
            <span className="rounded-full bg-[#FFC24B]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#FFC24B]">
              {onPromo ? `${SEASON_PROMO_LABEL} · ` : ""}
              {formatWon(saved)} 절약
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[12px] text-[#B9A9BF]">
          {product.hook || product.description}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
          {separate > product.price && (
            <span className="text-[#B9A9BF]">
              따로 사면 <span className="line-through">{formatWon(separate)}</span>
            </span>
          )}
          <span className="font-extrabold text-[#FFC24B]">
            세트가 {formatWon(product.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}
