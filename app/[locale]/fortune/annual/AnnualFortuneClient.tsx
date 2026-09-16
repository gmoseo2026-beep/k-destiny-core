"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import KongdakMascot from "@/components/KongdakMascot";
import GuestCheckoutModal from "@/components/GuestCheckoutModal";
import { requestPortOnePayment, BuyerInfo } from "@/lib/payments/client";
import { motion } from "framer-motion";
import { Lock, Sparkles, Heart, Coins, Briefcase, Leaf, Users, Calendar, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface AnnualFortuneClientProps {
  locale: string;
}

interface SectionItem {
  score: number;
  text: string;
}

interface AnnualFortuneData {
  yearScore: number;
  headline: string;
  summary: string;
  sections?: {
    love: SectionItem;
    money: SectionItem;
    career: SectionItem;
    health: SectionItem;
    relationship: SectionItem;
  };
  monthlyHighlights?: Array<{ month: number; note: string }>;
  luckyPoints?: { color: string; item: string; month: number };
  locked: boolean;
}

const SECTION_CONFIG = [
  { key: "love", title: "연애 & 애정운", icon: Heart, color: "text-[#FF5C77]", bg: "bg-[#FF5C77]/10" },
  { key: "money", title: "재물 & 금전운", icon: Coins, color: "text-[#FFC24B]", bg: "bg-[#FFC24B]/10" },
  { key: "career", title: "직업 & 학업운", icon: Briefcase, color: "text-[#6A2C70]", bg: "bg-[#6A2C70]/10" },
  { key: "health", title: "건강 & 활력운", icon: Leaf, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "relationship", title: "인간관계 & 사교운", icon: Users, color: "text-indigo-500", bg: "bg-indigo-500/10" },
] as const;

export default function AnnualFortuneClient({ locale }: AnnualFortuneClientProps) {
  const { data: session } = useSession();

  const [data, setData] = useState<AnnualFortuneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment modal state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const fetchFortune = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/fortune/annual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "2026 총운을 불러오지 못했습니다.");
      }

      setData(json.data);
    } catch (err: any) {
      setError(err?.message || "2026 총운을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchFortune();
  }, [fetchFortune]);

  if (loading) {
    return (
      <div className="w-full max-w-md md:max-w-2xl flex flex-col items-center justify-center py-20">
        <KongdakMascot size={90} animate="bounce" />
        <p className="mt-5 text-base font-bold text-[#6A2C70] animate-pulse">
          콩닥콩닥... 2026년 운세 흐름을 분석하고 있어요!
        </p>
        <p className="text-xs text-[#8A8291] mt-1.5 font-medium">
          병오년(붉은 말의 해) 당신의 사주 기운을 조합하는 중입니다 ✨
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md md:max-w-2xl bg-white p-7 rounded-3xl shadow-sm border border-red-200 text-center">
        <p className="text-red-500 font-bold mb-4">{error}</p>
        <button
          onClick={() => fetchFortune()}
          className="px-5 py-2.5 bg-gradient-to-r from-[#FF8AA1] to-[#FF5C77] text-white rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all"
        >
          다시 시도하기
        </button>
      </div>
    );
  }

  if (!data) return null;

  const isLocked = Boolean(data.locked);

  const getScoreRating = (score: number) => {
    if (score >= 90) return { label: "대길 (최고의 상승운)", badgeBg: "bg-[#FF5C77] text-white" };
    if (score >= 80) return { label: "길함 (안정된 도약)", badgeBg: "bg-[#FFC24B] text-[#2B2430]" };
    if (score >= 70) return { label: "평탄 (노력 결실의 해)", badgeBg: "bg-emerald-500 text-white" };
    return { label: "변화 (지혜로운 대비)", badgeBg: "bg-[#6A2C70] text-white" };
  };

  const scoreRating = getScoreRating(data.yearScore);

  return (
    <div className="w-full max-w-md md:max-w-2xl flex flex-col gap-6 pb-16">
      {/* 1. Header & Free Teaser Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative bg-gradient-to-br from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] rounded-3xl p-6 sm:p-8 text-white shadow-xl overflow-hidden"
      >
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-white mb-4 border border-white/25 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>2026 병오년(丙午年) 붉은 말의 해</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
            나의 2026년 종합 총운
          </h1>

          {/* Big Score Display */}
          <div className="flex items-baseline justify-center gap-1.5 my-3">
            <span className="text-6xl sm:text-7xl font-black tracking-tight drop-shadow-md">
              {data.yearScore}
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-[#FFC24B]">점</span>
          </div>

          <div className={`text-xs font-black px-3 py-1 rounded-full shadow-xs mb-5 ${scoreRating.badgeBg}`}>
            {scoreRating.label}
          </div>

          {/* Headline Balloon */}
          <div className="w-full bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 sm:p-5 text-left mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <KongdakMascot size={28} animate="none" />
              <span className="text-xs font-bold text-white/90">두근이의 한 줄 요약</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white leading-snug">
              &ldquo;{data.headline}&rdquo;
            </p>
          </div>

          {/* Free Summary Overview */}
          <div className="w-full bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-left border border-white/15">
            <h3 className="text-xs font-bold text-white/80 mb-1.5">2026년 총평</h3>
            <p className="text-xs sm:text-sm text-white/95 leading-relaxed">
              {data.summary}
            </p>
          </div>
        </div>
      </motion.div>

      {/* 2. 5 Key Life Sections (연애, 재물, 직업, 건강, 인간관계) */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-black text-[#2B2430] flex items-center gap-2">
            <span>📊</span>
            <span>5대 영역별 상세 운세</span>
          </h2>
          {isLocked && (
            <span className="text-xs font-bold text-[#FF5C77] bg-[#FFF6F1] border border-[#FFD9E0] px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>잠김</span>
            </span>
          )}
        </div>

        {/* Unlocked View: 5 Rich Section Cards */}
        {!isLocked && data.sections ? (
          <div className="grid grid-cols-1 gap-4">
            {SECTION_CONFIG.map(({ key, title, icon: Icon, color, bg }) => {
              const sec = data.sections![key as keyof typeof data.sections];
              if (!sec) return null;
              return (
                <div
                  key={key}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-[#FFD9E0]/50 shadow-sm flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-extrabold text-sm sm:text-base text-[#2B2430]">{title}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-[#FFF6F1] px-3 py-1 rounded-xl border border-[#FFD9E0]/50">
                      <span className="text-xs font-semibold text-[#8A8291]">운세 지수</span>
                      <span className="text-sm font-black text-[#FF5C77]">{sec.score}점</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[#2B2430] leading-relaxed">
                    {sec.text}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          /* Locked Teaser Cards with Blur */
          <div className="relative flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-3.5 blur-[5px] select-none pointer-events-none opacity-50">
              {SECTION_CONFIG.map(({ key, title, icon: Icon, color, bg }, index) => (
                <div
                  key={key}
                  className="bg-white rounded-2xl p-5 border border-[#FFD9E0]/40 shadow-xs flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-[#2B2430]">{title}</span>
                    </div>
                    <span className="text-xs font-bold text-[#FF5C77]">{80 + (index * 3)}점</span>
                  </div>
                  <p className="text-xs text-[#8A8291] line-clamp-2">
                    2026년 이 영역에서 당신에게 다가오는 기회와 중요한 인연의 타이밍, 조심해야 할 순간을 구체적으로 알려드립니다...
                  </p>
                </div>
              ))}
            </div>

            {/* In-place Lock Prompt */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4">
              <div className="bg-[#2B2430]/95 backdrop-blur-md text-white p-6 sm:p-7 rounded-3xl text-center shadow-2xl border border-white/10 max-w-sm w-full">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3 text-[#FFC24B]">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-white mb-2">5대 영역별 상세 리포트</h3>
                <p className="text-xs text-[#C5BFC9] mb-5 leading-relaxed">
                  연애·재물·직업·건강·인간관계의 구체적 기회와<br />주의할 시기를 모두 잠금 해제하세요.
                </p>
                <button
                  type="button"
                  onClick={() => setCheckoutModalOpen(true)}
                  className="w-full bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] text-white font-bold py-3 px-5 rounded-xl active:scale-95 transition-all shadow-md text-xs sm:text-sm"
                >
                  콩닥 플러스 패스로 전체 열기
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. 12 Months Highlights (월별 운세 타임라인) */}
      <section className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-black text-[#2B2430] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#FF5C77]" />
            <span>12개월 월별 운세 타임라인</span>
          </h2>
          {isLocked && (
            <span className="text-xs font-bold text-[#8A8291] bg-white border border-[#FFD9E0] px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>미리보기</span>
            </span>
          )}
        </div>

        {!isLocked && data.monthlyHighlights ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.monthlyHighlights.map(({ month, note }) => (
              <div
                key={month}
                className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/50 shadow-xs flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-[#FF5C77] bg-[#FFF6F1] border border-[#FFD9E0] px-2 py-0.5 rounded-md">
                    {month}월
                  </span>
                </div>
                <p className="text-xs text-[#2B2430] leading-relaxed">
                  {note}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 blur-[5px] select-none pointer-events-none opacity-40">
              {[1, 2, 3, 4, 5, 6].map((m) => (
                <div key={m} className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/40 shadow-xs">
                  <span className="text-xs font-bold text-[#FF5C77]">{m}월</span>
                  <p className="text-xs text-gray-500 mt-1">이 달에는 새로운 흐름과 소식이 찾아옵니다...</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. Lucky Points (행운의 포인트) */}
      <section className="flex flex-col gap-3 mt-2">
        <h2 className="text-lg font-black text-[#2B2430] flex items-center gap-2 px-1">
          <span>🍀</span>
          <span>2026 행운 포인트</span>
        </h2>

        {!isLocked && data.luckyPoints ? (
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/50 text-center shadow-xs">
              <span className="text-[11px] font-bold text-[#8A8291] block mb-1">행운의 컬러</span>
              <span className="text-xs sm:text-sm font-black text-[#6A2C70]">{data.luckyPoints.color}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/50 text-center shadow-xs">
              <span className="text-[11px] font-bold text-[#8A8291] block mb-1">행운의 아이템</span>
              <span className="text-xs sm:text-sm font-black text-[#FF5C77]">{data.luckyPoints.item}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/50 text-center shadow-xs">
              <span className="text-[11px] font-bold text-[#8A8291] block mb-1">가장 좋은 달</span>
              <span className="text-xs sm:text-sm font-black text-[#FFC24B]">{data.luckyPoints.month}월</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 blur-[4px] select-none pointer-events-none opacity-40">
            <div className="bg-white p-3 rounded-2xl border border-[#FFD9E0]/40 text-center">
              <span className="text-[10px] text-[#8A8291] block">컬러</span>
              <span className="text-xs font-bold text-[#6A2C70]">따뜻한 코랄</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-[#FFD9E0]/40 text-center">
              <span className="text-[10px] text-[#8A8291] block">아이템</span>
              <span className="text-xs font-bold text-[#FF5C77]">원석 팔찌</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-[#FFD9E0]/40 text-center">
              <span className="text-[10px] text-[#8A8291] block">길월</span>
              <span className="text-xs font-bold text-[#FFC24B]">5월</span>
            </div>
          </div>
        )}
      </section>

      {/* 5. Sticky / Big Bottom CTA Card (when locked) */}
      {isLocked && (
        <div className="bg-gradient-to-b from-[#FFF6F1] to-white border-2 border-[#FF8AA1] rounded-3xl p-6 sm:p-7 shadow-lg text-center mt-4">
          <div className="inline-flex items-center gap-1.5 bg-[#FF5C77]/10 text-[#FF5C77] px-3 py-1 rounded-full text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>콩닥 플러스 무제한 이용권</span>
          </div>

          <h3 className="text-xl font-black text-[#2B2430] mb-2">
            2026 나의 총운 전체 리포트 열기
          </h3>

          <p className="text-xs sm:text-sm text-[#6A5E72] leading-relaxed mb-5">
            1회 결제로 30일간 <strong>2026 총운</strong>과 <strong>모든 심층 궁합 리포트</strong>, <strong>주간 운세</strong>를 무제한으로 열람하세요.
          </p>

          <div className="flex flex-col gap-2 max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => setCheckoutModalOpen(true)}
              disabled={isProcessingPayment}
              className="w-full bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] hover:opacity-95 active:scale-95 text-white py-4 px-6 rounded-2xl font-bold text-sm sm:text-base shadow-lg shadow-[#FF5C77]/30 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>30일 무제한 패스로 즉시 열기 (9,900원)</span>
            </button>

            <Link
              href={`/${locale}/pricing`}
              className="text-xs font-semibold text-[#8A8291] hover:text-[#6A2C70] py-2 transition-colors"
            >
              다른 요금제 알아보기 →
            </Link>
          </div>
        </div>
      )}

      {/* 6. Friendly Disclaimer */}
      <footer className="text-center mt-6 px-4">
        <p className="text-[11px] text-[#8A8291] leading-relaxed">
          ※ 콩닥의 2026 총운 리포트는 정통 만세력 사주 데이터를 바탕으로 오락 및 자기이해를 위해 다정하게 제공되는 콘텐츠입니다. 단정적인 미래를 예언하지 않습니다.
        </p>
      </footer>

      {/* Guest & Pass Checkout Modal */}
      <GuestCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title="콩닥 플러스 무제한 이용권"
        orderName="콩닥 플러스 1개월 이용권"
        priceLabel="9,900원 (30일 무제한)"
        initialName={session?.user?.name || ""}
        initialEmail={session?.user?.email || ""}
        initialPhone=""
        isLoading={isProcessingPayment}
        onSubmit={async (buyer: BuyerInfo) => {
          try {
            setIsProcessingPayment(true);
            await requestPortOnePayment({
              type: "PERIOD_PASS",
              planId: "1_MONTH",
              compatId: undefined,
              buyer,
              locale,
            });
          } catch (e: any) {
            alert(e?.message || "결제 진행 중 오류가 발생했습니다.");
          } finally {
            setIsProcessingPayment(false);
            setCheckoutModalOpen(false);
            // Refresh after payment flow returns
            fetchFortune();
          }
        }}
      />
    </div>
  );
}
