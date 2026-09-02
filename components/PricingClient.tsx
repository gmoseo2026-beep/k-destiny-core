"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import KongdakMascot from "./KongdakMascot";
import { loadTossPayments } from "@tosspayments/payment-sdk";

export default function PricingClient({ locale }: { locale: string }) {
  const t = useTranslations("Pricing");
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handlePeriodPassCheckout = async (planId: "1_MONTH" | "3_MONTHS") => {
    try {
      setLoadingPlan(planId);
      const res = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'PERIOD_PASS', compatId: null, planId }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          alert("패스권 구매는 로그인이 필요합니다.");
          window.location.href = `/${locale}/login?callbackUrl=${encodeURIComponent(window.location.href)}`;
          return;
        }
        throw new Error("주문 생성 실패");
      }
      
      const order = await res.json();
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";
      const tossPayments = await loadTossPayments(clientKey);
      const origin = window.location.origin;
      
      await tossPayments.requestPayment("카드", {
        amount: order.amount,
        orderId: order.orderId,
        orderName: order.orderName || "콩닥 플러스 무제한 패스",
        customerEmail: order.email || undefined,
        successUrl: `${origin}/${locale}/checkout/success?type=PERIOD_PASS`,
        failUrl: `${origin}/${locale}/checkout/fail?type=PERIOD_PASS`,
      });
    } catch (e) {
      alert("패스권 결제 초기화에 실패했습니다.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <KongdakMascot size={64} animate="bounce" expression="flutter" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#2B2430] mb-3">
          {t("title")}
        </h1>
        <p className="text-[#8A8291] text-sm sm:text-base">
          {t("subtitle")}
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        
        {/* Single Report */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#FFD9E0]/40 flex flex-col items-center text-center relative overflow-hidden transition-transform hover:-translate-y-1">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-gray-200 to-gray-300" />
          <h2 className="text-xl font-bold text-[#2B2430] mt-2 mb-2">{t("product_single_title")}</h2>
          <p className="text-sm text-[#8A8291] h-10 mb-4">{t("product_single_desc")}</p>
          <div className="mb-6 flex flex-col items-center">
            <span className="text-xs font-bold text-[#FF5C77] bg-[#FFF6F1] px-2 py-1 rounded-full mb-1">{t("product_single_price_first")}</span>
            <span className="text-3xl font-black text-[#2B2430]">{t("product_single_price")}</span>
          </div>
          <button
            onClick={() => router.push(`/${locale}/compat/new`)}
            className="w-full bg-[#FFF6F1] hover:bg-[#FFD9E0]/50 text-[#FF5C77] border border-[#FFD9E0] py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 mt-auto"
          >
            {t("product_single_btn")}
          </button>
        </div>

        {/* 1 Month Pass */}
        <div className="bg-gradient-to-br from-[#FFF6F1] to-white rounded-3xl p-6 sm:p-8 shadow-md border-2 border-[#FF8AA1] flex flex-col items-center text-center relative overflow-hidden transition-transform hover:-translate-y-1">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FF8AA1] to-[#FF5C77]" />
          <div className="absolute -top-3 -right-3 bg-[#FF5C77] text-white text-[10px] font-bold px-3 py-4 rotate-12 shadow-sm">추천</div>
          
          <h2 className="text-xl font-bold text-[#6A2C70] mt-2 mb-2">{t("product_1m_title")}</h2>
          <p className="text-sm text-[#8A8291] h-10 mb-4">{t("product_1m_desc")}</p>
          <div className="mb-6 flex flex-col items-center justify-end flex-grow">
            <span className="text-3xl font-black text-[#2B2430]">{t("product_1m_price")}</span>
          </div>
          <button
            onClick={() => handlePeriodPassCheckout("1_MONTH")}
            disabled={loadingPlan === "1_MONTH"}
            className="w-full bg-gradient-to-r from-[#FF8AA1] to-[#FF5C77] hover:opacity-95 text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 mt-auto"
          >
            {loadingPlan === "1_MONTH" ? "처리중..." : t("product_1m_btn")}
          </button>
        </div>

        {/* 3 Months Pass */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#FFD9E0]/40 flex flex-col items-center text-center relative overflow-hidden transition-transform hover:-translate-y-1">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FF5C77] to-[#6A2C70]" />
          <h2 className="text-xl font-bold text-[#6A2C70] mt-2 mb-2">{t("product_3m_title")}</h2>
          <p className="text-sm text-[#8A8291] h-10 mb-4">{t("product_3m_desc")}</p>
          <div className="mb-6 flex flex-col items-center justify-end flex-grow">
            <span className="text-3xl font-black text-[#2B2430]">{t("product_3m_price")}</span>
          </div>
          <button
            onClick={() => handlePeriodPassCheckout("3_MONTHS")}
            disabled={loadingPlan === "3_MONTHS"}
            className="w-full bg-[#FFF6F1] hover:bg-[#FFD9E0]/50 text-[#6A2C70] border border-[#FF8AA1]/30 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 mt-auto"
          >
            {loadingPlan === "3_MONTHS" ? "처리중..." : t("product_3m_btn")}
          </button>
        </div>

      </div>

      {/* Info Section */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#2B2430]/8 text-left mb-8 shadow-sm">
        <h3 className="text-sm font-bold text-[#2B2430] mb-4 flex items-center gap-2">
          <span className="bg-[#FFF6F1] text-[#FF5C77] px-2 py-0.5 rounded text-[10px]">안내</span>
          {t("info_title")}
        </h3>
        <ul className="space-y-2 text-xs text-[#8A8291] font-medium leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-[#FFD9E0] mt-0.5">•</span>
            <span>{t("info_type")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#FFD9E0] mt-0.5">•</span>
            <span>{t("info_delivery")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#FFD9E0] mt-0.5">•</span>
            <span>{t("info_method")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#FFD9E0] mt-0.5">•</span>
            <span>{t("info_refund")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#FFD9E0] mt-0.5">•</span>
            <span>{t("info_sub")}</span>
          </li>
        </ul>
      </div>

    </div>
  );
}
