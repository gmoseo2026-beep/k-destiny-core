"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import KongdakMascot from "./KongdakMascot";
import { useSession } from "next-auth/react";
import GuestCheckoutModal from "@/components/GuestCheckoutModal";
import { requestPortOnePayment, BuyerInfo } from "@/lib/payments/client";

export default function PricingClient({ locale }: { locale: string }) {
  const t = useTranslations("Pricing");
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedPlan, setSelectedPlan] = useState<"1_MONTH" | "3_MONTHS">("1_MONTH");
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handlePeriodPassCheckout = (planId: "1_MONTH" | "3_MONTHS") => {
    if (!session?.user?.id) {
      alert("패스권 구매는 로그인이 필요합니다.");
      window.location.href = `/${locale}/login?callbackUrl=${encodeURIComponent(window.location.href)}`;
      return;
    }
    setSelectedPlan(planId);
    setCheckoutModalOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="text-center mb-10 sm:mb-14">
        <div className="flex justify-center mb-4">
          <KongdakMascot size={64} animate="bounce" expression="flutter" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#2B2430] tracking-tight mb-3">
          {t("title")}
        </h1>
        <p className="text-[#8A8291] text-sm sm:text-base font-medium">
          {t("subtitle")}
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-16 pt-3">
        
        {/* Card 1: Single Report */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md border border-[#FFD9E0]/60 flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-1">
          {/* Tag Area */}
          <div className="h-7 mb-2 flex items-center justify-center">
            <span className="text-[11px] font-bold text-[#8A8291] bg-gray-100 px-3 py-1 rounded-full">
              체험형 단건
            </span>
          </div>

          <h2 className="text-xl font-black text-[#2B2430] mb-2">{t("product_single_title")}</h2>
          <p className="text-xs sm:text-sm text-[#8A8291] min-h-[38px] mb-5 leading-relaxed">{t("product_single_desc")}</p>
          
          {/* Price Box */}
          <div className="w-full bg-[#FFF6F1]/60 border border-[#FFD9E0]/40 rounded-2xl py-4 px-3 mb-6 flex flex-col items-center">
            <span className="text-xs font-bold text-[#FF5C77] bg-[#FFF6F1] border border-[#FFD9E0] px-2.5 py-0.5 rounded-full mb-1.5 shadow-2xs">
              {t("product_single_price_first")}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black text-[#2B2430] tracking-tight">{t("product_single_price")}</span>
            </div>
          </div>

          {/* Benefits */}
          <ul className="w-full text-left space-y-2.5 text-xs text-[#6A5E72] mb-6 px-1">
            <li className="flex items-center gap-2">
              <span className="text-[#FF5C77] text-sm">✓</span>
              <span>2인 사주 기반 상세 심층 리포트</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#FF5C77] text-sm">✓</span>
              <span>관계의 핵심 갈등 요인 & 극복 팁</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#FF5C77] text-sm">✓</span>
              <span>영구 보관 및 언제든 다시 열람</span>
            </li>
          </ul>

          {/* Action Button */}
          <button
            onClick={() => router.push(`/${locale}/compat/new`)}
            className="w-full bg-[#FFF6F1] hover:bg-[#FFD9E0]/50 text-[#FF5C77] border border-[#FFD9E0] py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 mt-auto shadow-2xs"
          >
            {t("product_single_btn")}
          </button>
        </div>

        {/* Card 2: 1 Month Pass (Featured) */}
        <div className="bg-gradient-to-b from-[#FFF6F1] via-white to-[#FFF6F1]/30 rounded-3xl p-6 sm:p-7 shadow-lg border-2 border-[#FF8AA1] flex flex-col items-center text-center relative transition-all duration-200 hover:-translate-y-1">
          {/* Top Floating Badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] text-white text-[11px] font-black px-4 py-1 rounded-full shadow-md whitespace-nowrap z-10 flex items-center gap-1">
            <span>✨</span> 가장 많은 선택
          </div>

          {/* Tag Area */}
          <div className="h-7 mb-2 flex items-center justify-center">
            <span className="text-[11px] font-bold text-[#FF5C77] bg-[#FFD9E0]/50 px-3 py-1 rounded-full">
              30일간 무제한
            </span>
          </div>

          <h2 className="text-xl font-black text-[#6A2C70] mb-2">{t("product_1m_title")}</h2>
          <p className="text-xs sm:text-sm text-[#8A8291] min-h-[38px] mb-5 leading-relaxed">{t("product_1m_desc")}</p>
          
          {/* Price Box */}
          <div className="w-full bg-[#FFF6F1] border border-[#FF8AA1]/40 rounded-2xl py-4 px-3 mb-6 flex flex-col items-center">
            <span className="text-xs font-bold text-[#6A2C70] bg-white border border-[#FFD9E0] px-2.5 py-0.5 rounded-full mb-1.5 shadow-2xs">
              30일 이용권
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black text-[#2B2430] tracking-tight">{t("product_1m_price")}</span>
            </div>
          </div>

          {/* Benefits */}
          <ul className="w-full text-left space-y-2.5 text-xs text-[#6A5E72] mb-6 px-1">
            <li className="flex items-center gap-2">
              <span className="text-[#FF5C77] text-sm">✓</span>
              <span className="font-bold text-[#2B2430]">모든 심층 궁합 리포트 무제한</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#FF5C77] text-sm">✓</span>
              <span>매주 월요일 주간 애정/데이트 운세</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#FF5C77] text-sm">✓</span>
              <span>1회성 결제 (자동연장·구독 없음)</span>
            </li>
          </ul>

          {/* Action Button */}
          <button
            onClick={() => handlePeriodPassCheckout("1_MONTH")}
            disabled={isProcessingPayment}
            className="w-full bg-gradient-to-r from-[#FF8AA1] to-[#FF5C77] hover:opacity-95 text-white py-3.5 rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 mt-auto"
          >
            {isProcessingPayment && selectedPlan === "1_MONTH" ? "결제창 연결 중..." : t("product_1m_btn")}
          </button>
        </div>

        {/* Card 3: 3 Months Pass */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md border border-[#FFD9E0]/60 flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-1">
          {/* Tag Area */}
          <div className="h-7 mb-2 flex items-center justify-center">
            <span className="text-[11px] font-bold text-[#6A2C70] bg-[#6A2C70]/10 px-3 py-1 rounded-full">
              최대 가성비
            </span>
          </div>

          <h2 className="text-xl font-black text-[#6A2C70] mb-2">{t("product_3m_title")}</h2>
          <p className="text-xs sm:text-sm text-[#8A8291] min-h-[38px] mb-5 leading-relaxed">{t("product_3m_desc")}</p>
          
          {/* Price Box */}
          <div className="w-full bg-[#FFF6F1]/60 border border-[#FFD9E0]/40 rounded-2xl py-4 px-3 mb-6 flex flex-col items-center">
            <span className="text-xs font-bold text-[#FF5C77] bg-[#FFF6F1] border border-[#FFD9E0] px-2.5 py-0.5 rounded-full mb-1.5 shadow-2xs">
              월 8,300원 상당
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black text-[#2B2430] tracking-tight">{t("product_3m_price")}</span>
            </div>
          </div>

          {/* Benefits */}
          <ul className="w-full text-left space-y-2.5 text-xs text-[#6A5E72] mb-6 px-1">
            <li className="flex items-center gap-2">
              <span className="text-[#6A2C70] text-sm">✓</span>
              <span className="font-bold text-[#2B2430]">90일간 모든 심층 리포트 무제한</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#6A2C70] text-sm">✓</span>
              <span>매주 월요일 주간 애정/데이트 운세</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#6A2C70] text-sm">✓</span>
              <span>1회성 결제 (자동연장·구독 없음)</span>
            </li>
          </ul>

          {/* Action Button */}
          <button
            onClick={() => handlePeriodPassCheckout("3_MONTHS")}
            disabled={isProcessingPayment}
            className="w-full bg-[#FFF6F1] hover:bg-[#FFD9E0]/50 text-[#6A2C70] border border-[#FF8AA1]/40 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 mt-auto shadow-2xs"
          >
            {isProcessingPayment && selectedPlan === "3_MONTHS" ? "결제창 연결 중..." : t("product_3m_btn")}
          </button>
        </div>

      </div>

      {/* Info Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#FFD9E0]/50 text-left mb-12 shadow-sm">
        <h3 className="text-sm sm:text-base font-bold text-[#2B2430] mb-4 flex items-center gap-2">
          <span className="bg-[#FFF6F1] text-[#FF5C77] px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#FFD9E0]">
            안내
          </span>
          {t("info_title")}
        </h3>
        <ul className="space-y-2.5 text-xs sm:text-[13px] text-[#6A5E72] font-medium leading-relaxed">
          <li className="flex items-start gap-2.5">
            <span className="text-[#FF5C77] font-bold mt-0.5">•</span>
            <span>{t("info_type")}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-[#FF5C77] font-bold mt-0.5">•</span>
            <span>{t("info_delivery")}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-[#FF5C77] font-bold mt-0.5">•</span>
            <span>{t("info_method")}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-[#FF5C77] font-bold mt-0.5">•</span>
            <span>{t("info_refund")}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-[#FF5C77] font-bold mt-0.5">•</span>
            <span>{t("info_sub")}</span>
          </li>
        </ul>
      </div>

      {/* Pass Checkout Modal */}
      <GuestCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title="콩닥 플러스 무제한 이용권"
        orderName={selectedPlan === "1_MONTH" ? "콩닥 플러스 1개월 이용권" : "콩닥 플러스 3개월 이용권"}
        priceLabel={selectedPlan === "1_MONTH" ? "9,900원" : "24,900원"}
        initialName={session?.user?.name || ""}
        initialEmail={session?.user?.email || ""}
        initialPhone=""
        isLoading={isProcessingPayment}
        onSubmit={async (buyer: BuyerInfo) => {
          try {
            setIsProcessingPayment(true);
            await requestPortOnePayment({
              type: "PERIOD_PASS",
              planId: selectedPlan,
              compatId: undefined,
              buyer,
              locale,
            });
          } catch (e: any) {
            alert(e.message || "결제 진행 중 오류가 발생했습니다.");
          } finally {
            setIsProcessingPayment(false);
            setCheckoutModalOpen(false);
          }
        }}
      />
    </div>
  );
}

