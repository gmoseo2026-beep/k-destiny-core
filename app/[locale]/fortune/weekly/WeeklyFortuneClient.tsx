"use client";

import React, { useEffect, useState } from "react";
import KongdakMascot from "@/components/KongdakMascot";
import FortuneLoading from "@/components/FortuneLoading";
// [D4] 기간권 구매 UI 동면
// import { useSession } from "next-auth/react";
// import { useRouter } from "next/navigation";
import Link from "next/link";
// import dynamic from "next/dynamic";
import { Sparkles, Calendar, Heart, Coins, ArrowRight, Lock, Bell, CheckCircle2 } from "lucide-react";
import { subscribeToPush, isPushSubscribed } from "@/lib/push";
// import { requestPortOnePayment } from "@/lib/payments/client";
// const GuestCheckoutModal = dynamic(() => import("@/components/GuestCheckoutModal"), { ssr: false });
// import InAppBrowserModal from "@/components/InAppBrowserModal";
// import { blockPaymentIfInApp } from "@/lib/inAppBrowser";


interface WeeklyFortuneClientProps {
  locale: string;
  compatId?: string;
}

interface DailyData {
  dayScore: number;
  oneLine: string;
  action: string;
  focus: "love" | "money" | "career" | "relationship";
  goodTiming: string;
}

interface WeeklyData {
  summary?: string;
  loveLuck?: string;
  wealthLuck?: string;
  workLuck?: string;
  goodDays?: string[];
  cautionDays?: string[];
  bestDay?: {
    day?: string;
    reason?: string;
  };
  caution?: string;
  [key: string]: unknown;
}

export default function WeeklyFortuneClient({ locale, compatId }: WeeklyFortuneClientProps) {
  // [D4] 기간권 구매 UI 동면
  // const { data: session } = useSession();
  // const router = useRouter();

  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Push notification state
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // [D4] Pass Checkout Modal State 동면
  // const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  // const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  // const [inAppOpen, setInAppOpen] = useState(false);

  // 마운트 시 실제 브라우저 푸시 구독 상태 복원
  useEffect(() => {
    isPushSubscribed().then(setPushSubscribed).catch(() => {});
  }, []);

  useEffect(() => {
    async function loadFortunes() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Weekly Fortune
        const weeklyRes = await fetch("/api/fortune/weekly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetCompatId: compatId, locale }),
        });
        const weeklyJson = await weeklyRes.json();

        if (weeklyRes.status === 401 || weeklyRes.status === 403 || weeklyJson.locked) {
          setIsLocked(true);
        }
        if (weeklyJson.data) {
          setWeeklyData(weeklyJson.data);
        }

        // 2. Fetch Daily Fortune Coach
        const dailyRes = await fetch("/api/fortune/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        });
        const dailyJson = await dailyRes.json();

        if (dailyRes.status === 403 || dailyJson.locked) {
          setIsLocked(true);
        } else if (dailyRes.ok && dailyJson.data) {
          setDailyData(dailyJson.data);
        }
      } catch (err: unknown) {
        console.error("Failed to load coach fortunes:", err);
        setError(err instanceof Error ? err.message : "운세를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    loadFortunes();
  }, [compatId, locale]);

  const handleSubscribePush = async () => {
    try {
      setPushLoading(true);
      const res = await subscribeToPush();
      if (res.success) {
        setPushSubscribed(true);
        alert("알림이 켜졌어요. 새 운세 소식이 생기면 알려드릴게요.");
      } else {
        alert(res.error || "알림 권한을 허용해주세요.");
      }
    } catch {
      alert("알림 설정 중 오류가 발생했습니다.");
    } finally {
      setPushLoading(false);
    }
  };

  /* [D4] 기간권 구매 핸들러 동면
  const handleOpenPassCheckout = () => {
    if (blockPaymentIfInApp(() => setInAppOpen(true))) return;
    if (!session?.user?.id) {
      alert("패스권 구매는 로그인이 필요합니다.");
      const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/${locale}/fortune/weekly`;
      router.push(`/${locale}/login?callbackUrl=${encodeURIComponent(currentPath)}`);
      return;
    }
    setCheckoutModalOpen(true);
  };
  */

  if (loading) {
    return (
      <FortuneLoading
        steps={[
          "오늘의 사주 기운을 읽는 중…",
          "데일리 행동 조언을 정리하는 중…",
          "이번 주 흐름을 맞추는 중…",
        ]}
        durationSec={8}
        subMessage="나만의 운세 코치 두근이가 오늘과 이번 주 기운을 읽고 있어요"
        skeletonVariant="weekly"
      />
    );
  }

  if (error && !weeklyData && !dailyData) {
    return (
      <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-sm border border-red-200 text-center">
        <p className="text-red-500 font-bold mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-coral text-white rounded-xl font-bold text-sm shadow-xs active:scale-95 transition-all"
        >
          다시 시도하기
        </button>
      </div>
    );
  }

  const focusMap: Record<string, { label: string; color: string; bg: string }> = {
    love: { label: "연애 & 애정", color: "text-coral", bg: "bg-coral/10" },
    money: { label: "재물 & 금전", color: "text-[#FFC24B]", bg: "bg-[#FFC24B]/10" },
    career: { label: "일 & 학업", color: "text-[#6A2C70]", bg: "bg-[#6A2C70]/10" },
    relationship: { label: "인간관계 & 소통", color: "text-indigo-500", bg: "bg-indigo-500/10" },
  };

  return (
    <div className="w-full max-w-md md:max-w-2xl flex flex-col gap-6 pb-16 pt-2">
      {/* 1. Header Banner */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 bg-[#6A2C70]/10 text-[#6A2C70] px-3.5 py-1 rounded-full text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-coral" />
          <span>매일 오는 나만의 운세 코치</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
          데일리 코치 & 주간 운세
        </h1>
        <p className="text-xs sm:text-sm text-[#8A8291] mt-1.5">
          매일 실천하는 오늘의 조언과 이번 주 좋은 날·주의할 타이밍
        </p>
      </div>

      {/* 2. Today's Daily Coach Card */}
      <section className="bg-gradient-to-br from-[#FF8AA1] via-coral to-[#6A2C70] rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/20">
            <span>오늘의 운세 코치</span>
          </div>
          <span className="text-xs text-white/80 font-medium">매일 자정 갱신</span>
        </div>

        {dailyData ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <KongdakMascot size={48} animate="none" />
                <div>
                  <span className="text-xs font-semibold text-white/80 block">오늘의 운세 지수</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black">{dailyData.dayScore}</span>
                    <span className="text-lg font-bold text-[#FFC24B]">점</span>
                  </div>
                </div>
              </div>
              {dailyData.focus && focusMap[dailyData.focus] && (
                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-extrabold text-white border border-white/20">
                  포커스: {focusMap[dailyData.focus].label}
                </div>
              )}
            </div>

            {/* One line summary */}
            <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-4">
              <p className="text-sm font-bold leading-snug">
                &ldquo;{dailyData.oneLine}&rdquo;
              </p>
            </div>

            {/* Action Item */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-[#FFC24B] flex items-center gap-1">
                <span>💡 오늘 추천 행동</span>
              </span>
              <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-medium">
                {dailyData.action}
              </p>
            </div>

            {/* Good Timing */}
            {dailyData.goodTiming && (
              <div className="text-[11px] text-white/85 flex items-center gap-1.5 px-1 font-medium">
                <span>⏰</span>
                <span>{dailyData.goodTiming}</span>
              </div>
            )}
          </div>
        ) : (
          /* Locked / Sample Daily Card */
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <KongdakMascot size={44} animate="none" />
                <div>
                  <span className="text-xs font-semibold text-white/80 block">오늘의 운세 지수</span>
                  <span className="text-2xl font-black text-[#FFC24B]">●●점</span>
                </div>
              </div>
              <span className="text-xs font-bold bg-black/20 px-3 py-1 rounded-full text-white/90">
                패스 회원 전용
              </span>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4">
              <p className="text-xs sm:text-sm font-bold leading-snug">
                &ldquo;오늘 당신에게 특별히 좋은 기운과 타이밍이 찾아옵니다 —&rdquo;
              </p>
            </div>
            <p className="text-xs text-white/70 blur-[2.5px] select-none pointer-events-none leading-relaxed">
              오늘 오후 연락하기 가장 좋은 시간과 놓치지 말아야 할 대화의 힌트를 매일 아침 두근이가 알려드립니다.
            </p>
          </div>
        )}
      </section>

      {/* 3. Push Notification Opt-in Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#FFD9E0]/60 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center text-coral shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h4 className="text-xs sm:text-sm font-bold text-ink">콩닥 소식 알림</h4>
            <p className="text-[11px] text-[#8A8291] mt-0.5">새 운세·이벤트 소식이 생기면 알려드려요</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSubscribePush}
          disabled={pushSubscribed || pushLoading}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95 ${
            pushSubscribed
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
              : "bg-cream hover:bg-[#FFD9E0]/50 text-coral border border-[#FFD9E0]"
          }`}
        >
          {pushSubscribed ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>알림 켜짐</span>
            </>
          ) : (
            <span>{pushLoading ? "설정 중..." : "알림 받기"}</span>
          )}
        </button>
      </div>

      {/* 4. Weekly Flow Section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-black text-ink flex items-center gap-2">
            <Calendar className="w-4 h-4 text-coral" />
            <span>이번 주 월~일 흐름</span>
          </h2>
          {isLocked && (
            <span className="text-xs font-bold text-coral bg-cream border border-[#FFD9E0] px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>패스 전용</span>
            </span>
          )}
        </div>

        {/* Weekly Summary */}
        <div className="bg-white rounded-2xl p-5 border border-[#FFD9E0]/60 shadow-xs">
          <h3 className="text-xs font-bold text-[#6A2C70] mb-2 flex items-center gap-1.5">
            <span>이번 주 총평</span>
          </h3>
          <p className="text-xs sm:text-sm text-ink leading-relaxed font-medium">
            {weeklyData?.summary || "이번 주 당신을 기다리는 특별한 흐름이 준비되어 있어요."}
          </p>
        </div>

        {/* Unlocked Weekly Detail Cards */}
        {!isLocked && weeklyData?.loveLuck && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#FFD9E0]/50">
              <h4 className="font-bold text-sm text-coral mb-2 flex items-center gap-1.5">
                <Heart className="w-4 h-4" />
                <span>이번 주 애정운</span>
              </h4>
              <p className="text-xs text-ink leading-relaxed font-medium">{weeklyData.loveLuck}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#FFD9E0]/50">
              <h4 className="font-bold text-sm text-[#FFC24B] mb-2 flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                <span>이번 주 금전운</span>
              </h4>
              <p className="text-xs text-ink leading-relaxed font-medium">{weeklyData.wealthLuck}</p>
            </div>
            {weeklyData.bestDay && (
              <div className="bg-cream p-5 rounded-2xl border border-[#FFD9E0]/50">
                <h4 className="font-bold text-sm text-[#6A2C70] mb-1.5">
                  🌟 가장 좋은 요일: {weeklyData.bestDay.day}
                </h4>
                <p className="text-xs text-ink leading-relaxed font-medium">{weeklyData.bestDay.reason}</p>
              </div>
            )}
            {weeklyData.caution && (
              <div className="bg-red-50/70 p-5 rounded-2xl border border-red-100">
                <h4 className="font-bold text-sm text-red-500 mb-1.5">
                  ⚠️ 주의할 타이밍
                </h4>
                <p className="text-xs text-ink leading-relaxed font-medium">{weeklyData.caution}</p>
              </div>
            )}
          </div>
        )}

        {/* Locked Weekly Detail Preview with Blur */}
        {isLocked && (
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 blur-[4px] select-none pointer-events-none opacity-40">
              <div className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/40">
                <h4 className="font-bold text-xs text-coral mb-1">애정운</h4>
                <p className="text-xs text-[#8A8291]">이번 주 연애와 연락 타이밍 흐름...</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/40">
                <h4 className="font-bold text-xs text-[#FFC24B] mb-1">금전운</h4>
                <p className="text-xs text-[#8A8291]">소비와 수익이 생기는 길일...</p>
              </div>
              <div className="bg-cream p-4 rounded-2xl border border-[#FFD9E0]/40">
                <h4 className="font-bold text-xs text-[#6A2C70] mb-1">가장 좋은 요일: 수요일</h4>
                <p className="text-xs text-[#8A8291]">중요한 만남을 갖기 좋은 날...</p>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                <h4 className="font-bold text-xs text-red-500 mb-1">주의할 점</h4>
                <p className="text-xs text-[#8A8291]">감정 소모를 피해야 할 순간...</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 5. Pass Subscription Info (When Locked) */}
      {isLocked && (
        <div className="bg-white border-2 border-coral/30 rounded-3xl p-6 sm:p-7 shadow-md text-center mt-2">
          <div className="inline-flex items-center gap-1.5 bg-coral/10 text-coral px-3 py-0.5 rounded-full text-xs font-bold mb-3">
            <span>주간 운세 안내</span>
          </div>

          <h3 className="text-xl font-black text-ink mb-2">
            주간 운세는 기존 콩닥 플러스 패스 회원 전용이에요.
          </h3>

          <p className="text-xs sm:text-sm text-[#6A5E72] leading-relaxed mb-6">
            현재 주간 운세 및 데일리 코칭은 기존 패스권을 보유하신 회원님께만 제공되고 있어요.
          </p>

          <div className="max-w-xs mx-auto flex flex-col gap-3">
            <Link
              href={`/${locale}/fortune/new?productId=annual_2026`}
              className="w-full bg-coral hover:bg-[#ff4766] active:scale-[0.97] text-white py-3.5 px-5 rounded-2xl font-bold text-sm shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all duration-150 flex items-center justify-center gap-2"
            >
              <span>2026 총운 보러 가기</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={`/${locale}#products`}
              className="text-xs font-semibold text-[#8A8291] hover:text-ink py-1 transition-colors"
            >
              전체 상품 보기 →
            </Link>
          </div>
        </div>
      )}

      {/* [D4] 기간권 구매 UI 동면
      <GuestCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title="콩닥 플러스 30일 패스"
        orderName="콩닥 플러스 1개월 이용권"
        priceLabel="9,900원 (30일 무제한 · 자동결제 없음)"
        initialName={session?.user?.name || ""}
        initialEmail={session?.user?.email || ""}
        initialPhone=""
        isLoading={isProcessingPayment}
        onSubmit={async (buyer) => {
          try {
            setIsProcessingPayment(true);
            await requestPortOnePayment({
              productId: "annual_2026",
              buyer,
              locale,
            });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "결제 진행 중 오류가 발생했습니다.";
            alert(msg);
          } finally {
            setIsProcessingPayment(false);
            setCheckoutModalOpen(false);
          }
        }}
      />
      <InAppBrowserModal isOpen={inAppOpen} onClose={() => setInAppOpen(false)} />
      */}
    </div>
  );
}
