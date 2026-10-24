"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { ArrowRight, Gift } from "lucide-react";
import { type CatalogItem, formatWon, getProduct, getProductCover, priceLabel, separatePrice } from "@/lib/catalog";
import { trackEvent } from "@/lib/gtag";
import { forgetUnlockToken, recallUnlockToken } from "@/lib/payments/client";
import { type DeviceOrder, forgetDeviceOrder, listDeviceOrders } from "@/lib/payments/deviceOrders";
import {
  type MineOrderSummary,
  extractOwnedForCompat,
  getNextReadings,
  nextReadingHref,
} from "@/lib/recommendations/nextReadings";
import { useSeenOnce } from "@/lib/useSeenOnce";

export interface NextReadingRecommendationsProps {
  currentCatalogId: string;
  compatId: string;
  locale?: string;
  visibleIds?: string[];
  sourceScreen: "report_view" | "compat_unlocked" | "compat_free";
  variant?: "owned" | "free_preview";
}

export default function NextReadingRecommendations({
  currentCatalogId,
  compatId,
  locale = "ko",
  visibleIds,
  sourceScreen,
  variant = "owned",
}: NextReadingRecommendationsProps) {
  const isFreePreview = variant === "free_preview";
  const { status: sessionStatus } = useSession();
  const checkKey = `${compatId}:${currentCatalogId}:${sessionStatus}`;
  const [resolved, setResolved] = useState<{
    key: string;
    ok: boolean;
    ownedCatalogIds: string[];
  } | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!compatId || sessionStatus === "loading") return;
    let alive = true;

    (async () => {
      try {
        const deviceOrders = listDeviceOrders();
        const unlockOrderId = recallUnlockToken(compatId);
        const candidates: DeviceOrder[] = [...deviceOrders];
        if (
          unlockOrderId &&
          !candidates.some((o) => o.compatId === compatId && o.catalogId === "compat_basic" && o.orderId === unlockOrderId)
        ) {
          candidates.push({ catalogId: "compat_basic", compatId, orderId: unlockOrderId });
        }

        let validOrderIds: string[] = [];
        if (candidates.length > 0) {
          const asked = [...new Set(candidates.map((o) => o.orderId))].slice(0, 30);
          const ownedRes = await fetch("/api/payments/owned", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderIds: asked }),
          });
          if (!ownedRes.ok) {
            throw new Error("owned check failed");
          }
          const ownedJson = (await ownedRes.json()) as { valid?: string[] };
          validOrderIds = ownedJson.valid ?? [];
          const validSet = new Set(validOrderIds);
          const invalidIds = asked.filter((id) => !validSet.has(id));
          invalidIds.forEach((id) => forgetDeviceOrder(id));
          if (unlockOrderId && invalidIds.includes(unlockOrderId)) {
            forgetUnlockToken(compatId);
          }
        }

        let mineRows: MineOrderSummary[] = [];
        if (sessionStatus === "authenticated") {
          const mineRes = await fetch("/api/reports/mine", { cache: "no-store" });
          if (!mineRes.ok) {
            throw new Error("mine check failed");
          }
          const parsed = (await mineRes.json()) as MineOrderSummary[];
          if (Array.isArray(parsed)) {
            mineRows = parsed;
          }
        }

        if (!alive) return;
        setResolved({
          key: checkKey,
          ok: true,
          ownedCatalogIds: extractOwnedForCompat(compatId, {
            currentCatalogId,
            deviceOrders: candidates,
            validOrderIds,
            mineRows,
          }),
        });
      } catch {
        if (!alive) return;
        setResolved({ key: checkKey, ok: false, ownedCatalogIds: [] });
      }
    })();

    return () => {
      alive = false;
    };
  }, [checkKey, compatId, currentCatalogId, sessionStatus]);

  const isReady = isFreePreview ? true : resolved?.key === checkKey && resolved.ok;
  const ownedCatalogIds = resolved?.key === checkKey && resolved.ok ? resolved.ownedCatalogIds : [];
  const { singles, set: rawSetItem } = isReady
    ? getNextReadings({ currentCatalogId, ownedCatalogIds, visibleIds })
    : { singles: [], set: null };
  const setItem = isFreePreview ? null : rawSetItem;

  const hasRecommendations = isReady && (singles.length > 0 || Boolean(setItem));

  useSeenOnce(
    containerRef,
    () => {
      trackEvent("view_next_reading", {
        fromProductId: currentCatalogId,
        sourceScreen,
        source_screen: sourceScreen,
      });
    },
    hasRecommendations,
  );

  if (!hasRecommendations) {
    return null;
  }

  const setConstituents = (setItem?.items ?? [])
    .map((id) => getProduct(id))
    .filter((p): p is CatalogItem => Boolean(p));

  return (
    <section
      ref={containerRef}
      aria-label={isFreePreview ? "이 두 사람으로 더 보기" : "같은 두 사람으로 이어서 보기"}
      className="w-full rounded-2xl border border-white/[0.08] bg-[#22142A] p-4 text-left"
    >
      <div className="mb-3">
        <h3 className="text-sm font-black text-[#F6EEF3]">
          {isFreePreview ? "이 두 사람으로 더 보기" : "같은 두 사람으로 이어서 보기"}
        </h3>
        <p className="text-[11px] font-medium text-[#B9A9BF] mt-0.5">
          {isFreePreview
            ? "다시 입력 없이 · 무료 미리보기"
            : "생년월일을 다시 넣지 않고 바로 미리보기로 이어져요"}
        </p>
      </div>

      {singles.length > 0 && (
        <div className="space-y-2">
          {singles.map((item) => (
            <Link
              key={item.id}
              href={nextReadingHref(item.id, compatId, locale, isFreePreview ? "free_result" : "next")}
              onClick={() =>
                trackEvent("click_next_reading", {
                  fromProductId: currentCatalogId,
                  toProductId: item.id,
                  isSet: false,
                  sourceScreen,
                  source_screen: sourceScreen,
                })
              }
              className="group w-full flex items-center justify-between gap-2.5 p-3 rounded-xl bg-[#140B18] hover:bg-white/[0.04] border border-white/[0.08] transition-all duration-150 active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative h-[56px] w-[42px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#22142A]">
                  <Image src={getProductCover(item)} alt="" fill sizes="42px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-extrabold text-[#F6EEF3] truncate">{item.name}</h4>
                  <p
                    className={
                      isFreePreview
                        ? "text-[11px] font-medium text-[#B9A9BF] line-clamp-2 leading-snug mt-0.5"
                        : "text-[11px] font-medium text-[#B9A9BF] truncate mt-0.5"
                    }
                  >
                    {item.hook}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                {isFreePreview ? (
                  <span className="text-xs font-black text-[#FF5C77] whitespace-nowrap">무료 미리보기 →</span>
                ) : (
                  <>
                    <span className="text-xs font-black text-[#FF5C77] whitespace-nowrap">{priceLabel(item)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#B9A9BF] group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {setItem && (
        <div className={singles.length > 0 ? "mt-2.5 pt-2.5 border-t border-white/[0.08]" : ""}>
          <Link
            href={nextReadingHref(setItem.id, compatId, locale)}
            onClick={() =>
              trackEvent("click_next_reading", {
                fromProductId: currentCatalogId,
                toProductId: setItem.id,
                isSet: true,
                sourceScreen,
                source_screen: sourceScreen,
              })
            }
            className="group w-full flex items-center justify-between gap-2 p-3 rounded-xl bg-[#140B18] hover:bg-white/[0.04] border border-white/[0.08] transition-all duration-150 active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative h-[56px] w-[42px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#22142A]">
                <Image src={getProductCover(setItem)} alt="" fill sizes="42px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <Gift className="w-3 h-3 text-[#FF5C77] shrink-0" />
                  <span className="text-[10px] font-extrabold text-[#FF8AA1] bg-[#FF5C77]/15 px-1.5 py-0.5 rounded">
                    세트 · 리포트 {setConstituents.length}개
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-extrabold text-[#F6EEF3] truncate mt-0.5">{setItem.name}</h4>
                <p className="text-[11px] text-[#B9A9BF] truncate">
                  {setConstituents.map((p) => p.gridLabel || p.name).join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 ml-1">
              <span className="text-xs font-black text-[#FF5C77] whitespace-nowrap">{formatWon(setItem.price)}</span>
              <span className="text-[10px] text-[#8E7D96] whitespace-nowrap">
                따로 사면 {formatWon(separatePrice(setItem))}
              </span>
            </div>
          </Link>
        </div>
      )}
    </section>
  );
}
