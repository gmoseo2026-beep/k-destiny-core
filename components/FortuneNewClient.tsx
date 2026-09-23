"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import KongdakMascot from "@/components/KongdakMascot";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import InAppBrowserModal from "@/components/InAppBrowserModal";
import { blockPaymentIfInApp, isInAppBrowser } from "@/lib/inAppBrowser";
import { requestPortOnePayment, BuyerInfo } from "@/lib/payments/client";
import { getProduct, priceLabel } from "@/lib/catalog";
import { savePendingInput } from "@/lib/reportHandoff";
import BirthFields, { BirthValues, formatBirthInput } from "@/components/forms/BirthFields";
import StandardReportView from "@/components/report/StandardReportView";
import { PRODUCT_SPECS } from "@/lib/prompts/productSpecs";
import { trackEvent } from "@/lib/gtag";
import { StandardReport, StandardTeaser } from "@/lib/reports/standard";

const GuestCheckoutModal = dynamic(() => import("@/components/GuestCheckoutModal"), { ssr: false });

interface AnnualTeaserData {
  yearScore?: number;
  headline?: string;
  summary?: string;
  freeSection?: { text?: string };
  [key: string]: unknown;
}

interface FortuneNewClientProps {
  locale: string;
  productId?: string;
  initialProfile?: {
    name?: string | null;
    birthDate?: string | null;
    birthTime?: string | null;
    gender?: string | null;
  } | null;
}

export default function FortuneNewClient({ locale, productId, initialProfile }: FortuneNewClientProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const currentProductId = productId || "annual_2026";
  const product = getProduct(currentProductId);

  // Form values
  const initDob = initialProfile?.birthDate?.split("-") || ["", "", ""];
  const [formValues, setFormValues] = useState<BirthValues>({
    name: initialProfile?.name || "",
    year: initDob[0] || "",
    month: initDob[1] ? String(parseInt(initDob[1], 10)) : "",
    day: initDob[2] ? String(parseInt(initDob[2], 10)) : "",
    gender: (initialProfile?.gender as "F" | "M") || "F",
    ampm: initialProfile?.birthTime
      ? parseInt(initialProfile.birthTime.split(":")[0], 10) >= 12
        ? "PM"
        : "AM"
      : "",
    hour: initialProfile?.birthTime
      ? String(parseInt(initialProfile.birthTime.split(":")[0], 10) % 12 || 12)
      : "1",
    min: initialProfile?.birthTime ? initialProfile.birthTime.split(":")[1] || "00" : "00",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Result state
  const [resultData, setResultData] = useState<{
    isAnnual?: boolean;
    score: number;
    annualData?: AnnualTeaserData;
    reportData?: StandardReport | StandardTeaser;
    reportId?: string;
  } | null>(null);

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [inAppOpen, setInAppOpen] = useState(false);
  const [isInApp, setIsInApp] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setIsInApp(isInAppBrowser()));
  }, []);

  const handleOpenCheckout = () => {
    if (blockPaymentIfInApp(() => setInAppOpen(true))) return;

    const formatted = formatBirthInput(formValues);
    const requiresLogin = product?.requiresLogin ?? (currentProductId.startsWith("annual_"));

    if (requiresLogin && !session?.user?.id) {
      savePendingInput(currentProductId, formatted);
      alert("전체 리포트 열람과 결제는 로그인이 필요합니다.\n로그인 후 즉시 전체 운세를 확인하실 수 있어요.");
      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : `/${locale}/fortune/new?productId=${currentProductId}`;
      router.push(`/${locale}/login?callbackUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    trackEvent("view_paywall", {
      productId: currentProductId,
      tier: product?.tier || "standard",
      amountLabel: product ? priceLabel(product) : "",
    });
    setCheckoutModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formValues.year || !formValues.month || !formValues.day) {
      setErrorMsg("생년월일을 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const formatted = formatBirthInput(formValues);

      if (currentProductId.startsWith("annual_")) {
        // Annual route
        const res = await fetch("/api/fortune/annual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: currentProductId,
            dob: formatted.dob,
            birthYear: parseInt(formValues.year, 10),
            birthMonth: parseInt(formValues.month, 10),
            birthDay: parseInt(formValues.day, 10),
            time: formatted.time,
            gender: formatted.gender,
            name: formatted.name,
            locale,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "결과 생성 중 오류가 발생했습니다.");

        trackEvent("teaser_created", { productId: currentProductId, tier: "standard" });
        setResultData({
          isAnnual: true,
          score: json.data?.yearScore || 0,
          annualData: json.data,
        });
      } else {
        // Standard report generate route (FREE or TEASER)
        const kind = product?.isFree ? "FREE" : "TEASER";
        const res = await fetch("/api/reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            catalogId: currentProductId,
            kind,
            input: formatted,
            locale,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "결과 생성 중 오류가 발생했습니다.");

        trackEvent(kind === "FREE" ? "report_generated" : "teaser_created", {
          productId: currentProductId,
          tier: product?.tier || "standard",
        });

        setResultData({
          isAnnual: false,
          score: json.score || 0,
          reportData: json.data,
          reportId: json.reportId,
        });
      }
    } catch (err) {
      console.error("생성 실패:", err);
      setErrorMsg(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // Result View
  if (resultData) {
    const spec = product ? PRODUCT_SPECS[product.promptKey] : undefined;
    const lockedSpecs = spec?.sections?.slice(1).map((s) => ({ key: s.key, title: s.title })) || [];

    return (
      <div className="w-full max-w-md mx-auto text-center flex flex-col gap-6 pb-12">
        <h2 className="text-2xl font-bold tracking-tight">내 사주 분석 결과</h2>

        {resultData.isAnnual && resultData.annualData ? (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-plum/10 text-left">
            <div className="text-4xl font-black text-coral text-center mb-4">
              {resultData.annualData.yearScore}점
            </div>
            <h3 className="font-bold text-lg mb-2 text-ink text-center">
              &ldquo;{resultData.annualData.headline}&rdquo;
            </h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              {resultData.annualData.summary}
            </p>

            <div className="bg-cream p-4 rounded-2xl border border-[#FFD9E0]/50 mt-4">
              <h4 className="font-bold text-coral text-sm mb-2">무료 맛보기</h4>
              <p className="text-sm leading-relaxed">{resultData.annualData.freeSection?.text}</p>
            </div>

            <button
              onClick={handleOpenCheckout}
              className="w-full mt-6 bg-coral hover:bg-coral active:scale-[0.98] text-white py-4 rounded-2xl font-bold text-base shadow-sm transition-all"
            >
              전체 리포트 열람하기
            </button>
          </div>
        ) : resultData.reportData ? (
          <StandardReportView
            mode={product?.isFree ? "full" : "teaser"}
            score={resultData.score}
            data={resultData.reportData}
            lockedSpecs={lockedSpecs}
          />
        ) : null}

        {/* Free Product Recommendations */}
        {product?.isFree && (
          <div className="mt-4 flex flex-col gap-3 text-left">
            <h3 className="font-extrabold text-sm text-ink pl-1">더 깊이 알고 싶다면</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/${locale}/products/wealth`}
                className="bg-white p-4 rounded-2xl border border-plum/10 shadow-xs hover:border-coral transition-colors flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-ink block mb-1">재물운 리포트</span>
                  <span className="text-[11px] text-muted block">돈이 들어오는 길과 새는 돈 막기</span>
                </div>
                <span className="text-xs font-extrabold text-coral mt-3">자세히 보기 →</span>
              </Link>
              <Link
                href={`/${locale}/products/career`}
                className="bg-white p-4 rounded-2xl border border-plum/10 shadow-xs hover:border-coral transition-colors flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-ink block mb-1">직업·이직 리포트</span>
                  <span className="text-[11px] text-muted block">나에게 맞는 일의 방식과 환경</span>
                </div>
                <span className="text-xs font-extrabold text-coral mt-3">자세히 보기 →</span>
              </Link>
            </div>
          </div>
        )}

        {/* Paid Teaser CTA */}
        {!product?.isFree && !resultData.isAnnual && (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleOpenCheckout}
              className="w-full bg-coral hover:bg-coral active:scale-[0.97] text-white py-4 px-6 rounded-2xl font-bold text-base shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all"
            >
              전체 리포트 열기 ({product ? priceLabel(product) : ""})
            </button>
          </div>
        )}

        {/* In-app Browser Notice Banner */}
        {isInApp && (
          <div
            onClick={() => blockPaymentIfInApp(() => setInAppOpen(true))}
            className="w-full mt-1 bg-coral/10 hover:bg-coral/15 border border-coral/30 rounded-2xl p-3 text-xs text-plum flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <span className="font-semibold text-left">
              🔒 원활한 결제를 위해 오른쪽 위 메뉴(⋮)에서 <strong>‘다른 브라우저로 열기’</strong>를 눌러주세요.
            </span>
            <span className="text-[11px] font-bold text-coral shrink-0 underline whitespace-nowrap">
              외부 브라우저 열기
            </span>
          </div>
        )}

        {/* Checkout Modal */}
        <GuestCheckoutModal
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          title={`${product?.name || "사주"} 리포트 열람`}
          orderName={product?.name || "콩닥 사주 리포트"}
          priceLabel={product ? priceLabel(product) : "6,900원"}
          initialName={session?.user?.name || formValues.name || ""}
          initialEmail={session?.user?.email || ""}
          initialPhone=""
          isLoading={isProcessingPayment}
          onSubmit={async (buyer: BuyerInfo) => {
            try {
              setIsProcessingPayment(true);
              const formatted = formatBirthInput(formValues);
              savePendingInput(currentProductId, formatted);

              const res = await requestPortOnePayment({
                productId: currentProductId,
                buyer,
                locale,
              });

              if (res.ok) {
                trackEvent("purchase_confirmed", {
                  productId: currentProductId,
                  tier: product?.tier || "standard",
                  amount: product?.price || 0,
                });
                if (currentProductId.startsWith("annual_")) {
                  router.push(`/${locale}/fortune/annual?year=2026`);
                } else {
                  router.push(`/${locale}/report/new?c=${currentProductId}`);
                }
              }
            } catch (e: unknown) {
              alert(e instanceof Error ? e.message : "결제 진행 중 오류가 발생했습니다.");
            } finally {
              setIsProcessingPayment(false);
              setCheckoutModalOpen(false);
            }
          }}
        />

        <InAppBrowserModal isOpen={inAppOpen} onClose={() => setInAppOpen(false)} />
      </div>
    );
  }

  // Input Form View
  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-6 pb-12 mx-auto">
      {/* Kongdak Mascot Header */}
      <div className="flex flex-col items-center justify-center -mb-2">
        <KongdakMascot size={64} animate={isLoading ? "bounce" : "none"} />
      </div>

      {errorMsg && (
        <div className="bg-coral/10 border border-coral text-coral p-3.5 rounded-xl text-sm font-semibold text-center">
          {errorMsg}
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-plum/10 flex flex-col gap-3.5 w-full">
        <div className="flex items-center justify-between border-b border-cream pb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">👤</span>
            <h3 className="font-bold text-sm text-ink">{product?.name || "사주"} 정보 입력</h3>
          </div>
          {initialProfile && (
            <span className="text-[10px] bg-coral/10 text-coral px-2 py-0.5 rounded-full font-bold">
              저장된 프로필 불러옴
            </span>
          )}
        </div>

        <BirthFields
          values={formValues}
          onChange={(patch) => setFormValues((v) => ({ ...v, ...patch }))}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-coral hover:bg-coral active:scale-[0.97] text-white py-4 rounded-2xl font-bold text-base shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>결과 분석 중...</span>
          </div>
        ) : (
          <span>결과 확인하기 ✨</span>
        )}
      </button>
    </form>
  );
}
