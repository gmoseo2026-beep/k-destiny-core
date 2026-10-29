"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { Sparkles, ArrowRight } from "lucide-react";
import {
  recallOrderToken,
  recallUnlockToken,
  requestPortOnePayment,
  type BuyerInfo,
} from "@/lib/payments/client";
import { collectDeviceOrderTokens } from "@/lib/couponsClient";
import { trackEvent } from "@/lib/gtag";
import { getProduct } from "@/lib/catalog";

const GuestCheckoutModal = dynamic(() => import("@/components/GuestCheckoutModal"), { ssr: false });

interface UpgradeOfferItem {
  setId: string;
  setName: string;
  setDescription: string;
  setPrice: number;
  paidAmount: number;
  diffAmount: number;
  headline: string;
}

interface UpgradeOfferPayload {
  eligible: boolean;
  fromCatalogId?: string;
  upgradeFromOrderId?: string;
  compatId?: string | null;
  paidAmount?: number;
  expiresAt?: string;
  offers: UpgradeOfferItem[];
}

export interface SetUpgradeBannerProps {
  locale: string;
  orderId?: string | null;
  catalogId?: string | null;
  compatId?: string | null;
  source: "pay_complete" | "report_bottom" | "compat_bottom" | "annual_bottom";
  className?: string;
}

export default function SetUpgradeBanner({
  locale,
  orderId,
  catalogId,
  compatId,
  source,
  className = "",
}: SetUpgradeBannerProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [payload, setPayload] = useState<UpgradeOfferPayload | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<UpgradeOfferItem | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const viewedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const prod = catalogId ? getProduct(catalogId) : undefined;
    if (prod && (prod.type === "SET" || prod.isFree)) {
      return;
    }

    let alive = true;
    const resolvedOrderId =
      orderId ||
      (catalogId ? recallOrderToken(catalogId, compatId) : null) ||
      (catalogId === "compat_basic" && compatId ? recallUnlockToken(compatId) : null) ||
      null;

    if (!resolvedOrderId && !catalogId) {
      return;
    }

    const guestOrderTokens = collectDeviceOrderTokens();

    fetch("/api/payments/upgrade-offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(resolvedOrderId ? { orderId: resolvedOrderId } : {}),
        ...(catalogId ? { catalogId } : {}),
        ...(compatId ? { compatId } : {}),
        ...(guestOrderTokens.length > 0 ? { guestOrderTokens } : {}),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: UpgradeOfferPayload | null) => {
        if (!alive || !data || !data.eligible || !Array.isArray(data.offers) || data.offers.length === 0) {
          return;
        }
        setPayload(data);
        const first = data.offers[0];
        const viewKey = `${data.upgradeFromOrderId || ""}:${first.setId}:${source}`;
        if (viewedKeyRef.current !== viewKey) {
          viewedKeyRef.current = viewKey;
          trackEvent("upgrade_offer_view", {
            fromCatalogId: data.fromCatalogId || catalogId || "unknown",
            setId: first.setId,
            paidAmount: first.paidAmount,
            diffAmount: first.diffAmount,
            source,
          });
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [orderId, catalogId, compatId, source]);

  if (!payload || !payload.eligible || payload.offers.length === 0 || !payload.upgradeFromOrderId) {
    return null;
  }

  const primary = payload.offers[0];
  const secondary = payload.offers.length > 1 ? payload.offers[1] : null;
  const resolvedCompatId = payload.compatId ?? compatId ?? null;
  const upgradeFromOrderId = payload.upgradeFromOrderId;

  const handleOpenUpgrade = (offer: UpgradeOfferItem) => {
    trackEvent("upgrade_offer_click", {
      fromCatalogId: payload.fromCatalogId || catalogId || "unknown",
      setId: offer.setId,
      paidAmount: offer.paidAmount,
      diffAmount: offer.diffAmount,
      source,
    });
    setSelectedOffer(offer);
    setCheckoutOpen(true);
  };

  return (
    <>
      <div
        className={`w-full rounded-2xl border border-[#FFC24B]/35 bg-[#22142A] p-5 text-left shadow-sm ${className}`}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFC24B]/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#FFC24B]">
            <Sparkles className="h-3 w-3" />
            결제 후 24시간 세트 전환
          </span>
          <span className="text-[11px] font-semibold text-[#B9A9BF]">{primary.setName}</span>
        </div>

        <p className="text-sm sm:text-[15px] font-extrabold leading-snug text-[#F6EEF3] break-keep">
          {primary.headline}
        </p>

        <p className="mt-1.5 text-xs leading-relaxed text-[#B9A9BF]">
          {primary.setName} ({primary.setDescription}) · 기존에 연 단품 리포트는 그대로 유지돼요.
        </p>

        <button
          type="button"
          onClick={() => handleOpenUpgrade(primary)}
          className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] px-4 py-3 text-xs sm:text-sm font-extrabold text-white shadow-sm transition-all active:scale-[0.96]"
        >
          <span>{primary.diffAmount.toLocaleString("ko-KR")}원만 내고 {primary.setName} 열기</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        {secondary && (
          <button
            type="button"
            onClick={() => handleOpenUpgrade(secondary)}
            className="mt-2 flex w-full items-center justify-between rounded-xl border border-white/[0.1] bg-[#140B18] px-3.5 py-2.5 text-xs font-bold text-[#F6EEF3] transition-all hover:border-[#FF5C77]/40 active:scale-[0.96]"
          >
            <span className="truncate pr-2">{secondary.setName} ({secondary.setDescription})</span>
            <span className="shrink-0 font-extrabold text-[#FFC24B]">
              +{secondary.diffAmount.toLocaleString("ko-KR")}원 →
            </span>
          </button>
        )}
      </div>

      {selectedOffer && (
        <GuestCheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          title={`${selectedOffer.setName} 차액 전환`}
          orderName={selectedOffer.setName}
          priceLabel={`${selectedOffer.diffAmount.toLocaleString("ko-KR")}원`}
          productId={selectedOffer.setId}
          disableCoupon
          initialName={session?.user?.name || ""}
          initialEmail={session?.user?.email || ""}
          initialPhone=""
          isLoading={isPaying}
          onSubmit={async (buyer: BuyerInfo) => {
            try {
              setIsPaying(true);
              const res = await requestPortOnePayment({
                productId: selectedOffer.setId,
                compatId: resolvedCompatId ?? undefined,
                upgradeFromOrderId,
                buyer,
                locale,
              });
              if (res.ok) {
                trackEvent("purchase_confirmed", {
                  productId: selectedOffer.setId,
                  tier: "standard",
                  amount: res.amount,
                  upgrade: true,
                });
                const compatQuery = resolvedCompatId ? `&compat=${encodeURIComponent(resolvedCompatId)}` : "";
                router.push(`/${locale}/report/new?c=${encodeURIComponent(selectedOffer.setId)}${compatQuery}`);
              }
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : "결제 진행 중 오류가 발생했습니다.";
              alert(message);
            } finally {
              setIsPaying(false);
              setCheckoutOpen(false);
            }
          }}
        />
      )}
    </>
  );
}
