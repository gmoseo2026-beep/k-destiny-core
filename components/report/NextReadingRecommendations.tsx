"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { ArrowRight, Gift } from "lucide-react";
import { type CatalogItem, formatWon, getProduct, priceLabel, separatePrice } from "@/lib/catalog";
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
  sourceScreen: "report_view" | "compat_unlocked";
}

export default function NextReadingRecommendations({
  currentCatalogId,
  compatId,
  locale = "ko",
  visibleIds,
  sourceScreen,
}: NextReadingRecommendationsProps) {
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
        // 1) 이 기기에 저장된 주문 토큰 + 정통 궁합 unlock 토큰을 서버(/api/payments/owned)로 검증
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

        // 2) 로그인한 계정이면 /api/reports/mine 에서 같은 compatId 주문/리포트를 추가 수집
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
        // 확인에 실패하면 가진 상품이 잠깐이라도 노출되지 않도록 권유를 그리지 않는다 (P-007 §2-4)
        if (!alive) return;
        setResolved({ key: checkKey, ok: false, ownedCatalogIds: [] });
      }
    })();

    return () => {
      alive = false;
    };
  }, [checkKey, compatId, currentCatalogId, sessionStatus]);

  const isReady = resolved?.key === checkKey && resolved.ok;
  const { singles, set: setItem } = isReady
    ? getNextReadings({ currentCatalogId, ownedCatalogIds: resolved.ownedCatalogIds, visibleIds })
    : { singles: [], set: null };

  const hasRecommendations = isReady && (singles.length > 0 || Boolean(setItem));

  useSeenOnce(
    containerRef,
    () => {
      trackEvent("view_next_reading", {
        fromProductId: currentCatalogId,
        sourceScreen,
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
      aria-label="두 사람 사주로 이어서 볼 수 있는 풀이"
      className="w-full rounded-2xl border border-[#FFD9E0] bg-[#FFF8FA] p-4 text-left shadow-xs"
    >
      <div className="mb-3">
        <h3 className="text-sm font-black text-ink">두 사람 사주로 이어서 볼 수 있어요</h3>
        <p className="text-[11px] font-medium text-text-2 mt-0.5">
          생년월일을 다시 넣지 않고 바로 미리보기로 이어져요
        </p>
      </div>

      {singles.length > 0 && (
        <div className="space-y-2">
          {singles.map((item) => (
            <Link
              key={item.id}
              href={nextReadingHref(item.id, compatId, locale)}
              onClick={() =>
                trackEvent("click_next_reading", {
                  fromProductId: currentCatalogId,
                  toProductId: item.id,
                  isSet: false,
                  sourceScreen,
                })
              }
              className="group w-full flex items-center justify-between gap-2.5 p-3 rounded-xl bg-white hover:bg-cream/60 border border-line transition-all duration-150 active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 relative shrink-0 rounded-xl bg-coral-soft flex items-center justify-center">
                  <Image src={item.icon3d} alt="" width={32} height={32} className="object-contain" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-extrabold text-ink truncate">{item.name}</h4>
                  <p className="text-[11px] font-medium text-text-2 truncate mt-0.5">{item.hook}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <span className="text-xs font-black text-coral whitespace-nowrap">{priceLabel(item)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-caption group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {setItem && (
        <div className={singles.length > 0 ? "mt-2.5 pt-2.5 border-t border-[#FFE4EA]" : ""}>
          <Link
            href={nextReadingHref(setItem.id, compatId, locale)}
            onClick={() =>
              trackEvent("click_next_reading", {
                fromProductId: currentCatalogId,
                toProductId: setItem.id,
                isSet: true,
                sourceScreen,
              })
            }
            className="group w-full flex items-center justify-between gap-2 p-3 rounded-xl bg-white hover:bg-cream/60 border border-line transition-all duration-150 active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 relative shrink-0 rounded-xl bg-coral-soft flex items-center justify-center">
                <Image src={setItem.icon3d} alt="" width={32} height={32} className="object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <Gift className="w-3 h-3 text-coral shrink-0" />
                  <span className="text-[10px] font-extrabold text-coral-deep bg-coral-soft px-1.5 py-0.5 rounded">
                    세트 · 리포트 {setConstituents.length}개
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-extrabold text-ink truncate mt-0.5">{setItem.name}</h4>
                <p className="text-[11px] text-caption truncate">
                  {setConstituents.map((p) => p.gridLabel || p.name).join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 ml-1">
              <span className="text-xs font-black text-coral whitespace-nowrap">{formatWon(setItem.price)}</span>
              <span className="text-[10px] text-caption whitespace-nowrap">
                따로 사면 {formatWon(separatePrice(setItem))}
              </span>
            </div>
          </Link>
        </div>
      )}
    </section>
  );
}
