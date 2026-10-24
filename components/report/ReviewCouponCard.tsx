"use client";

import React, { useEffect, useState } from "react";
import { Gift, Star, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/gtag";
import { rememberDeviceCoupon, type StoredCoupon } from "@/lib/couponsClient";

interface ReviewCouponCardProps {
  reportId: string;
  catalogId: string;
  orderToken?: string | null;
}

export default function ReviewCouponCard({
  reportId,
  catalogId,
  orderToken,
}: ReviewCouponCardProps) {
  const [canReview, setCanReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [issuedCoupon, setIssuedCoupon] = useState<StoredCoupon | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/reviews?reportId=${encodeURIComponent(reportId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { canReview?: boolean } | null) => {
        if (!alive || !d) return;
        setCanReview(Boolean(d.canReview));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [reportId]);

  if (!canReview && !issuedCoupon) return null;

  if (issuedCoupon) {
    return (
      <Card variant="soft" className="w-full p-5 text-left border border-coral/30 bg-[#FFF8FA]">
        <div className="flex items-center gap-2 text-coral-deep font-extrabold text-sm mb-1.5">
          <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
          <span>소중한 후기 고마워요! 1,000원 쿠폰이 발급됐어요</span>
        </div>
        <p className="text-xs text-text-2 leading-relaxed">
          다음 운세·궁합을 결제할 때 결제 창에서 <b className="text-ink">1,000원이 자동으로 할인</b>돼요 (발급일로부터 30일간 유효).
        </p>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setErrorMsg("후기를 두 글자 이상 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          orderId: orderToken || undefined,
          rating,
          text: trimmed,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(json.error || "후기 등록에 실패했어요.");
        return;
      }
      if (json.coupon) {
        rememberDeviceCoupon(json.coupon as StoredCoupon);
        setIssuedCoupon(json.coupon as StoredCoupon);
      }
      setCanReview(false);
      trackEvent("review_submitted", { productId: catalogId, rating });
      trackEvent("coupon_issued", { productId: catalogId, amount: json.coupon?.amount ?? 1000 });
    } catch {
      setErrorMsg("잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full p-5 text-left border border-[#FFD9E0] bg-white">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Gift className="w-4 h-4 text-coral shrink-0" />
          <h3 className="text-sm font-black text-ink">후기 남기고 다음 구매 1,000원 할인받기</h3>
        </div>
        <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[10px] font-extrabold text-coral-deep shrink-0">
          즉시 발급
        </span>
      </div>
      <p className="text-xs text-text-2 leading-relaxed mb-3">
        리포트가 어땠는지 짧게 남겨 주시면 다음 결제에 바로 쓸 수 있는 1,000원 쿠폰을 드려요.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center gap-1" role="radiogroup" aria-label="별점 선택">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n}점`}
              className="p-1 transition-transform active:scale-90"
            >
              <Star
                className={`w-6 h-6 ${
                  n <= rating ? "fill-[#FFC24B] text-[#FFC24B]" : "text-line"
                }`}
              />
            </button>
          ))}
          <span className="ml-1.5 text-xs font-bold text-ink">{rating}점</span>
        </div>

        <div>
          <textarea
            rows={2}
            maxLength={200}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="가장 공감됐던 문장이나 솔직한 소감을 적어 주세요 (200자 이내)"
            disabled={submitting}
            className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-xs sm:text-sm text-ink placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-coral/40 resize-none"
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-text-3">
            <span>{errorMsg ? <span className="text-red-500 font-semibold">{errorMsg}</span> : "실제 열람 구매자 후기로 등록돼요"}</span>
            <span>{text.length}/200</span>
          </div>
        </div>

        <Button type="submit" size="md" fullWidth isLoading={submitting} disabled={submitting || text.trim().length < 2}>
          후기 등록하고 1,000원 쿠폰 받기
        </Button>
      </form>
    </Card>
  );
}
