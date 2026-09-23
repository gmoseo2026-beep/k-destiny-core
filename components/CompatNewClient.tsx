"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/gtag";
import KongdakMascot from "@/components/KongdakMascot";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import InAppBrowserModal from "@/components/InAppBrowserModal";
import { blockPaymentIfInApp, isInAppBrowser } from "@/lib/inAppBrowser";
import { requestPortOnePayment, BuyerInfo } from "@/lib/payments/client";
import { getProduct, priceLabel } from "@/lib/catalog";
import StandardReportView from "@/components/report/StandardReportView";
import { PRODUCT_SPECS } from "@/lib/prompts/productSpecs";

import { StandardReport, StandardTeaser } from "@/lib/reports/standard";

const GuestCheckoutModal = dynamic(() => import("@/components/GuestCheckoutModal"), { ssr: false });

interface InitialProfile {
  name?: string | null;
  birthYear?: string | number | null;
  birthMonth?: string | number | null;
  birthDay?: string | number | null;
  gender?: "F" | "M" | string | null;
  unknownTime?: boolean | null;
  birthTime?: string | null;
  isLunar?: boolean | null;
  [key: string]: unknown;
}

interface CompatNewClientProps {
  locale: string;
  refToken?: string;
  productId?: string;
  initialProfile?: InitialProfile | null;
}

export default function CompatNewClient({ locale, refToken, productId, initialProfile }: CompatNewClientProps) {
  const router = useRouter();

  const [nameA, setNameA] = useState(initialProfile?.name || "");
  const [yearA, setYearA] = useState(initialProfile?.birthYear || "");
  const [monthA, setMonthA] = useState(initialProfile?.birthMonth || "");
  const [dayA, setDayA] = useState(initialProfile?.birthDay || "");
  const [genderA, setGenderA] = useState<"F" | "M">(initialProfile?.gender === "M" ? "M" : "F");
  
  let defaultAmpmA = "";
  let defaultHourA = "1";
  let defaultMinA = "0";
  if (initialProfile && !initialProfile.unknownTime && initialProfile.birthTime) {
    const [hStr, mStr] = initialProfile.birthTime.split(":");
    let h = parseInt(hStr);
    defaultMinA = parseInt(mStr).toString();
    if (h >= 12) {
      defaultAmpmA = "PM";
      if (h > 12) h -= 12;
    } else {
      defaultAmpmA = "AM";
    }
    defaultHourA = h.toString();
  }

  const [ampmA, setAmpmA] = useState(defaultAmpmA);
  const [hourA, setHourA] = useState(defaultHourA);
  const [minA, setMinA] = useState(defaultMinA);

  const [nameB, setNameB] = useState("");
  const [yearB, setYearB] = useState("");
  const [monthB, setMonthB] = useState("");
  const [dayB, setDayB] = useState("");
  const [genderB, setGenderB] = useState<"F" | "M">("M");
  const [ampmB, setAmpmB] = useState("");
  const [hourB, setHourB] = useState("1");
  const [minB, setMinB] = useState("0");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const getDaysInMonth = (y: string, m: string) => {
    if (!y || !m) return 31;
    return new Date(parseInt(y), parseInt(m), 0).getDate();
  };
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const [relation, setRelation] = useState<"love" | "crush" | "friend">("love");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const product = productId ? getProduct(productId) : null;
  const isSpecialCouple = Boolean(productId && productId !== "compat_basic");

  const [teaserResult, setTeaserResult] = useState<{
    compatId: string;
    score: number;
    data: StandardReport | StandardTeaser;
    reportId?: string;
  } | null>(null);

  const { data: session } = useSession();
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [inAppOpen, setInAppOpen] = useState(false);
  const [isInApp, setIsInApp] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setIsInApp(isInAppBrowser());
    });
  }, []);

  const handleOpenCheckout = () => {
    if (blockPaymentIfInApp(() => setInAppOpen(true))) return;
    if (product) {
      trackEvent("view_paywall", {
        productId: product.id,
        tier: product.tier,
        amountLabel: priceLabel(product),
      });
    }
    setCheckoutModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!yearA || !monthA || !dayA) {
      setErrorMsg("내 생년월일을 입력해주세요.");
      return;
    }
    if (!yearB || !monthB || !dayB) {
      setErrorMsg("상대방의 생년월일을 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const dobA = `${yearA}-${String(monthA).padStart(2, '0')}-${String(dayA).padStart(2, '0')}`;
      const dobB = `${yearB}-${String(monthB).padStart(2, '0')}-${String(dayB).padStart(2, '0')}`;

      let finalTimeA = null;
      if (ampmA) {
        let h = parseInt(hourA);
        if (ampmA === "PM" && h !== 12) h += 12;
        if (ampmA === "AM" && h === 12) h = 0;
        finalTimeA = `${h.toString().padStart(2, '0')}:${minA.padStart(2, '0')}`;
      }

      let finalTimeB = null;
      if (ampmB) {
        let h = parseInt(hourB);
        if (ampmB === "PM" && h !== 12) h += 12;
        if (ampmB === "AM" && h === 12) h = 0;
        finalTimeB = `${h.toString().padStart(2, '0')}:${minB.padStart(2, '0')}`;
      }

      const payload = {
        personA: {
          name: nameA.trim() || "나",
          dob: dobA,
          gender: genderA,
          time: finalTimeA,
        },
        personB: {
          name: nameB.trim() || "상대방",
          dob: dobB,
          gender: genderB,
          time: finalTimeB,
        },
        relation,
        ref: refToken || null,
      };

      const res = await fetch("/api/compat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.shareToken) {
        throw new Error(json.error || "궁합 계산 중 오류가 발생했습니다.");
      }

      // GA4 측정 이벤트 발사
      trackEvent("compat_created", {
        relation,
        has_ref: Boolean(refToken),
      });

      if (isSpecialCouple && productId) {
        const genRes = await fetch("/api/reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            catalogId: productId,
            kind: "TEASER",
            compatId: json.id,
            locale,
          }),
        });

        const genJson = await genRes.json();
        if (!genRes.ok) throw new Error(genJson.error || "리포트 생성 중 오류가 발생했습니다.");

        trackEvent("teaser_created", { productId, tier: product?.tier || "standard" });

        setTeaserResult({
          compatId: json.id,
          score: genJson.score || 0,
          data: genJson.data,
          reportId: genJson.reportId,
        });
        setIsLoading(false);
        return;
      }

      // 결과 화면으로 이동 (compat_basic 또는 기본 궁합)
      if (productId) {
        router.push(`/${locale}/compat/${json.shareToken}?productId=${productId}`);
      } else {
        router.push(`/${locale}/compat/${json.shareToken}`);
      }
    } catch (err) {
      console.error("궁합 생성 실패:", err);
      setErrorMsg(err instanceof Error ? err.message : "궁합 계산 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  // Teaser Result View for couple products
  if (teaserResult && product) {
    const spec = PRODUCT_SPECS[product.promptKey];
    const lockedSpecs = spec?.sections?.slice(1).map((s) => ({ key: s.key, title: s.title })) || [];

    return (
      <div className="w-full max-w-md mx-auto text-center flex flex-col gap-6 pb-12">
        <h2 className="text-2xl font-bold tracking-tight">우리의 {product.name} 미리보기</h2>
        <StandardReportView
          mode="teaser"
          score={teaserResult.score}
          data={teaserResult.data}
          lockedSpecs={lockedSpecs}
        />

        <div className="flex flex-col gap-3">
          <button
            onClick={handleOpenCheckout}
            className="w-full bg-coral hover:bg-coral active:scale-[0.97] text-white py-4 px-6 rounded-2xl font-bold text-base shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all"
          >
            전체 리포트 열기 ({priceLabel(product)})
          </button>
        </div>

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

        <GuestCheckoutModal
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          title={`${product.name} 열람`}
          orderName={product.name}
          priceLabel={priceLabel(product)}
          initialName={session?.user?.name || nameA || ""}
          initialEmail={session?.user?.email || ""}
          initialPhone=""
          isLoading={isProcessingPayment}
          onSubmit={async (buyer: BuyerInfo) => {
            try {
              setIsProcessingPayment(true);
              const res = await requestPortOnePayment({
                productId: product.id,
                compatId: teaserResult.compatId,
                buyer,
                locale,
              });

              if (res.ok) {
                trackEvent("purchase_confirmed", {
                  productId: product.id,
                  tier: product.tier,
                  amount: res.amount,
                });
                router.push(`/${locale}/report/new?c=${product.id}&compat=${teaserResult.compatId}`);
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

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md md:max-w-3xl flex flex-col gap-6 pb-12 mx-auto">
      {/* Kongdak Mascot Header */}
      <div className="flex flex-col items-center justify-center -mb-2">
        <KongdakMascot size={64} animate={isLoading ? "bounce" : "heartbeat"} />
      </div>

      {errorMsg && (
        <div className="bg-coral/10 border border-coral text-coral p-3.5 rounded-xl text-sm font-semibold text-center">
          {errorMsg}
        </div>
      )}

      {/* Relation Type Selector */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#FFD9E0]/40">
        <label className="block text-xs font-bold text-[#8A8291] mb-2">우리의 관계</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "love", label: "연인 · 커플", icon: "❤️" },
            { key: "crush", label: "썸 · 호감", icon: "💌" },
            { key: "friend", label: "친구 · 지인", icon: "✨" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setRelation(item.key as "love" | "crush" | "friend")}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 border ${
                relation === item.key
                  ? "bg-gradient-to-br from-[#FF8AA1] to-coral text-white border-transparent shadow-sm"
                  : "bg-cream text-ink border-[#FFD9E0]/50 hover:bg-[#FFD9E0]/30"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Person A (Me) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#FFD9E0]/40 flex flex-col gap-3.5 h-full">
          <div className="flex items-center justify-between border-b border-cream pb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">👤</span>
              <h3 className="font-bold text-sm text-ink">내 정보</h3>
            </div>
            {initialProfile && (
              <span className="text-[10px] bg-coral/10 text-coral px-2 py-0.5 rounded-full font-bold">
                저장된 프로필 불러옴
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8A8291] mb-1">내 이름 또는 닉네임 (선택)</label>
            <input
              type="text"
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              placeholder="예: 김콩닥"
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
            />
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8A8291] mb-1">
                생년월일 <span className="text-coral">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={yearA}
                  onChange={(e) => setYearA(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
                >
                  <option value="">년도</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  value={monthA}
                  onChange={(e) => setMonthA(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
                >
                  <option value="">월</option>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={dayA}
                  onChange={(e) => setDayA(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
                >
                  <option value="">일</option>
                  {Array.from({ length: getDaysInMonth(String(yearA), String(monthA)) }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-[#8A8291] mb-1">성별</label>
                <select
                  value={genderA}
                  onChange={(e) => setGenderA(e.target.value as "F" | "M")}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
                >
                  <option value="F">여성</option>
                  <option value="M">남성</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-[#8A8291] mb-1">태어난 시간 (선택)</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={ampmA}
                    onChange={(e) => setAmpmA(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
                  >
                    <option value="">모름</option>
                    <option value="AM">오전</option>
                    <option value="PM">오후</option>
                  </select>
                  <select
                    value={hourA}
                    onChange={(e) => setHourA(e.target.value)}
                    disabled={!ampmA}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40 disabled:opacity-50"
                  >
                    {hours.map(h => <option key={h} value={h}>{h}시</option>)}
                  </select>
                  <select
                    value={minA}
                    onChange={(e) => setMinA(e.target.value)}
                    disabled={!ampmA}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40 disabled:opacity-50"
                  >
                    {minutes.map(m => <option key={m} value={m}>{m}분</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Person B (Partner) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#FFD9E0]/40 flex flex-col gap-3.5 h-full">
          <div className="flex items-center gap-2 border-b border-cream pb-2">
            <span className="text-base">💖</span>
            <h3 className="font-bold text-sm text-ink">상대방 정보</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8A8291] mb-1">상대방 이름 또는 애칭 (선택)</label>
            <input
              type="text"
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              placeholder="예: 이설렘"
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
            />
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8A8291] mb-1">
                생년월일 <span className="text-coral">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={yearB}
                  onChange={(e) => setYearB(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
                >
                  <option value="">년도</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  value={monthB}
                  onChange={(e) => setMonthB(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
                >
                  <option value="">월</option>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={dayB}
                  onChange={(e) => setDayB(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
                >
                  <option value="">일</option>
                  {Array.from({ length: getDaysInMonth(yearB, monthB) }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-[#8A8291] mb-1">성별</label>
                <select
                  value={genderB}
                  onChange={(e) => setGenderB(e.target.value as "M" | "F")}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
                >
                  <option value="M">남성</option>
                  <option value="F">여성</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-[#8A8291] mb-1">태어난 시간 (선택)</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={ampmB}
                    onChange={(e) => setAmpmB(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
                  >
                    <option value="">모름</option>
                    <option value="AM">오전</option>
                    <option value="PM">오후</option>
                  </select>
                  <select
                    value={hourB}
                    onChange={(e) => setHourB(e.target.value)}
                    disabled={!ampmB}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40 disabled:opacity-50"
                  >
                    {hours.map(h => <option key={h} value={h}>{h}시</option>)}
                  </select>
                  <select
                    value={minB}
                    onChange={(e) => setMinB(e.target.value)}
                    disabled={!ampmB}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40 disabled:opacity-50"
                  >
                    {minutes.map(m => <option key={m} value={m}>{m}분</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
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
            <span>궁합 점수와 케미 분석 중...</span>
          </div>
        ) : (
          <span>우리 궁합 점수 확인하기 (무료) ✨</span>
        )}
      </button>
    </form>
  );
}
