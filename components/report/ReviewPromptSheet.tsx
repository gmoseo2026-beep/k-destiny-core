"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import ReviewCouponCard from "@/components/report/ReviewCouponCard";
import { trackEvent } from "@/lib/gtag";
import {
  dismissReviewPrompt,
  hasReached80PercentScroll,
  isReviewPromptDismissed,
} from "@/lib/reviewPromptStorage";

interface ReviewPromptSheetProps {
  reportId?: string | null;
  orderKey?: string | null;
  catalogId: string;
  orderToken?: string | null;
  reachedEnd?: boolean;
}

/**
 * [Argon 04] 리포트를 끝까지 읽은 구매자(80% 스크롤 또는 마지막 섹션 노출)에게
 * 기존 ReviewCouponCard 를 화면 아래에서 한 번 띄우는 하단 시트.
 * 닫으면 그 주문(orderKey)에서는 다시 띄우지 않는다(localStorage, try/catch).
 */
export default function ReviewPromptSheet({
  reportId,
  orderKey,
  catalogId,
  orderToken,
  reachedEnd = false,
}: ReviewPromptSheetProps) {
  const storageKey = orderKey || orderToken || reportId || "";
  const [dismissed, setDismissed] = useState(() => isReviewPromptDismissed(storageKey));
  const [reached80, setReached80] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [couponIssued, setCouponIssued] = useState(false);
  const viewTrackedRef = useRef(false);

  useEffect(() => {
    queueMicrotask(() => {
      setDismissed(isReviewPromptDismissed(storageKey));
    });
  }, [storageKey]);

  useEffect(() => {
    if (dismissed || reached80 || reachedEnd) return;
    if (typeof window === "undefined") return;

    const checkScroll = () => {
      const docEl = document.documentElement;
      if (
        hasReached80PercentScroll({
          scrollY: window.scrollY || window.pageYOffset || 0,
          innerHeight: window.innerHeight || 0,
          scrollHeight: docEl?.scrollHeight || 0,
        })
      ) {
        setReached80(true);
      }
    };

    checkScroll();
    window.addEventListener("scroll", checkScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", checkScroll);
    };
  }, [dismissed, reached80, reachedEnd]);

  const triggered = !dismissed && (reached80 || reachedEnd);

  useEffect(() => {
    if (!triggered || eligible) return;
    let alive = true;
    const query = reportId
      ? `reportId=${encodeURIComponent(reportId)}`
      : orderToken
      ? `orderToken=${encodeURIComponent(orderToken)}`
      : "";
    if (!query) return;

    fetch(`/api/reviews?${query}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { canReview?: boolean } | null) => {
        if (!alive || !d) return;
        if (d.canReview) {
          setEligible(true);
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [triggered, eligible, reportId, orderToken]);

  const shouldOpen = triggered && (eligible || couponIssued);

  useEffect(() => {
    if (!shouldOpen || viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    trackEvent("review_prompt_view", {
      productId: catalogId,
      ...(reportId ? { reportId } : {}),
    });
  }, [shouldOpen, catalogId, reportId]);

  const handleClose = useCallback(() => {
    dismissReviewPrompt(storageKey);
    setDismissed(true);
  }, [storageKey]);

  const handleInteract = useCallback(() => {
    trackEvent("review_prompt_click", {
      productId: catalogId,
      source: "report_prompt",
    });
  }, [catalogId]);

  const handleCouponIssued = useCallback(() => {
    dismissReviewPrompt(storageKey);
    setCouponIssued(true);
  }, [storageKey]);

  if (!shouldOpen) return null;

  return (
    <div
      role="region"
      aria-label="리포트 후기 작성 안내"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:pb-5 animate-in slide-in-from-bottom-4 duration-200 pointer-events-none no-print"
    >
      <div className="mx-auto w-full max-w-md pointer-events-auto relative rounded-3xl shadow-[0_-8px_32px_rgba(0,0,0,0.72)]">
        <button
          type="button"
          onClick={handleClose}
          aria-label="후기 안내 닫기"
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-[#140B18]/85 text-[#B9A9BF] hover:text-[#F6EEF3] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <ReviewCouponCard
          reportId={reportId}
          catalogId={catalogId}
          orderToken={orderToken}
          onCouponIssued={handleCouponIssued}
          onInteract={handleInteract}
        />
      </div>
    </div>
  );
}
