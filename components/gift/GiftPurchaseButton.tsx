"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { Gift, X } from "lucide-react";
import { formatWon, type CatalogItem } from "@/lib/catalog";
import { blockPaymentIfInApp } from "@/lib/inAppBrowser";
import InAppPaymentChoice from "@/components/InAppPaymentChoice";
import {
  requestPortOnePayment,
  type BuyerInfo,
  type IssuedGiftSummary,
} from "@/lib/payments/client";
import { trackEvent } from "@/lib/gtag";
import GiftShareCard from "./GiftShareCard";

const GuestCheckoutModal = dynamic(() => import("@/components/GuestCheckoutModal"), {
  ssr: false,
});

interface GiftPurchaseButtonProps {
  product: Pick<CatalogItem, "id" | "name" | "price" | "tier" | "isFree">;
  locale: string;
  source: "product_detail" | "pay_complete";
  label?: string;
  className?: string;
}

export default function GiftPurchaseButton({
  product,
  locale,
  source,
  label = "선물하기",
  className,
}: GiftPurchaseButtonProps) {
  const { data: session } = useSession();
  const [formOpen, setFormOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [inAppOpen, setInAppOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const [recipientNickname, setRecipientNickname] = useState("");
  const [senderNickname, setSenderNickname] = useState(session?.user?.name || "");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [issuedGift, setIssuedGift] = useState<IssuedGiftSummary | null>(null);

  if (product.isFree || product.price <= 0) return null;

  const handleOpenGiftForm = () => {
    trackEvent("gift_click", {
      productId: product.id,
      source,
    });
    if (!senderNickname && session?.user?.name) {
      setSenderNickname(session.user.name);
    }
    setFormError(null);
    setIssuedGift(null);
    setFormOpen(true);
  };

  const handleProceedToCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRecipient = recipientNickname.trim();
    if (!cleanRecipient) {
      setFormError("받는 분의 애칭을 입력해 주세요.");
      return;
    }
    setFormError(null);

    if (
      blockPaymentIfInApp(
        () => setInAppOpen(true),
        () => {
          setFormOpen(false);
          setCheckoutOpen(true);
        }
      )
    ) {
      return;
    }

    setFormOpen(false);
    setCheckoutOpen(true);
  };

  const handleSubmitPayment = async (buyer: BuyerInfo) => {
    try {
      setIsPaying(true);
      const res = await requestPortOnePayment({
        productId: product.id,
        buyer,
        locale,
        gift: {
          recipientNickname: recipientNickname.trim(),
          senderNickname: senderNickname.trim() || undefined,
          message: message.trim() || undefined,
        },
      });

      if (res.ok && res.gift) {
        setCheckoutOpen(false);
        setIssuedGift(res.gift);
        setFormOpen(true);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "결제 진행 중 오류가 발생했어요.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenGiftForm}
        className={
          className ||
          "inline-flex items-center justify-center gap-1.5 rounded-2xl border border-[#FFC24B]/40 bg-[#22142A] hover:bg-[#2B1936] px-4 py-3 text-xs font-extrabold text-[#FFC24B] transition-all active:scale-[0.96]"
        }
      >
        <Gift className="w-4 h-4 shrink-0" />
        <span>{label}</span>
      </button>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} 선물하기`}
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-white/[0.12] bg-[#1C1124] p-6 text-[#F6EEF3] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FFC24B]/15 text-[#FFC24B]">
                  <Gift className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-[#F6EEF3]">
                    {issuedGift ? "선물 코드가 발급됐어요" : "운세 선물하기"}
                  </h3>
                  <p className="text-[11px] text-[#B9A9BF]">{product.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="닫기"
                className="rounded-full p-1.5 text-[#B9A9BF] hover:text-[#F6EEF3] hover:bg-white/10 transition-colors active:scale-[0.96]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {issuedGift ? (
              <GiftShareCard gift={issuedGift} locale={locale} />
            ) : (
              <form onSubmit={handleProceedToCheckout} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-[#D6C8DC] mb-1.5">
                    받는 분 애칭 <span className="text-[#FF5C77]">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={recipientNickname}
                    onChange={(e) => setRecipientNickname(e.target.value)}
                    placeholder="예: 수현, 내 단짝"
                    className="w-full rounded-xl border border-white/[0.14] bg-[#140B18] px-3.5 py-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-[#FF5C77]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#D6C8DC] mb-1.5">
                    보내는 분 애칭 <span className="text-[#8E7D96] font-normal">(선택)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={senderNickname}
                    onChange={(e) => setSenderNickname(e.target.value)}
                    placeholder="예: 민지 (비워두면 '소중한 분'으로 표시)"
                    className="w-full rounded-xl border border-white/[0.14] bg-[#140B18] px-3.5 py-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-[#FF5C77]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#D6C8DC] mb-1.5">
                    한 줄 메시지 <span className="text-[#8E7D96] font-normal">(선택, 60자)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="예: 내년엔 좋은 일만 가득하길 응원해!"
                    className="w-full rounded-xl border border-white/[0.14] bg-[#140B18] px-3.5 py-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-[#FF5C77]"
                  />
                </div>

                {formError && (
                  <p className="text-xs font-bold text-[#FF8AA1]">{formError}</p>
                )}

                <div className="rounded-2xl bg-[#140B18]/80 border border-white/[0.08] p-3.5 text-[11px] text-[#B9A9BF] leading-relaxed space-y-1">
                  <div className="flex items-center justify-between text-xs font-extrabold text-[#F6EEF3] pb-1 border-b border-white/[0.06] mb-1">
                    <span>선물 결제 금액 (정가)</span>
                    <span className="text-[#FFC24B]">{formatWon(product.price)}</span>
                  </div>
                  <p>• 받는 분이 직접 생년월일을 입력해 리포트를 만들어요.</p>
                  <p>• 보낸 분은 받는 분의 생년월일이나 결과를 볼 수 없어요.</p>
                  <p>• 결제일로부터 90일 안에 사용할 수 있고, 미사용 시 환불 가능해요.</p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] text-white font-extrabold text-sm shadow-md hover:opacity-95 transition-all active:scale-[0.96]"
                >
                  {formatWon(product.price)} 결제하고 선물 링크 만들기
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <InAppPaymentChoice isOpen={inAppOpen} onClose={() => setInAppOpen(false)} />

      <GuestCheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title={`${product.name} 선물하기`}
        orderName={`${product.name} (선물하기)`}
        priceLabel={formatWon(product.price)}
        productId={product.id}
        tier={product.tier}
        initialName={senderNickname || session?.user?.name || ""}
        initialEmail={session?.user?.email || ""}
        disableCoupon={true}
        isLoading={isPaying}
        onSubmit={handleSubmitPayment}
      />
    </>
  );
}
