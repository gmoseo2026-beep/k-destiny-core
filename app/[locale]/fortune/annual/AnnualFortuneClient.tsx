"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import KongdakMascot from "@/components/KongdakMascot";
import dynamic from "next/dynamic";
import { requestPortOnePayment, BuyerInfo } from "@/lib/payments/client";

const GuestCheckoutModal = dynamic(() => import("@/components/GuestCheckoutModal"), { ssr: false });
import {
  Lock,
  Heart,
  Coins,
  Briefcase,
  Leaf,
  Users,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

interface AnnualFortuneClientProps {
  locale: string;
  initialHasProfile?: boolean;
  isLoggedIn?: boolean;
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
    love?: SectionItem;
    money?: SectionItem;
    career?: SectionItem;
    health?: SectionItem;
    relationship?: SectionItem;
  };
  monthlyHighlights?: Array<{ month: number; note: string }>;
  luckyPoints?: { color: string; item: string; month: number };
  locked: boolean;
  isGuest?: boolean;
}

const SECTION_CONFIG = [
  { key: "love", title: "연애 & 애정운", icon: Heart, color: "text-[#FF5C77]", bg: "bg-[#FF5C77]/10" },
  { key: "money", title: "재물 & 금전운", icon: Coins, color: "text-[#FFC24B]", bg: "bg-[#FFC24B]/10" },
  { key: "career", title: "직업 & 학업운", icon: Briefcase, color: "text-[#6A2C70]", bg: "bg-[#6A2C70]/10" },
  { key: "health", title: "건강 & 활력운", icon: Leaf, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "relationship", title: "인간관계 & 사교운", icon: Users, color: "text-indigo-500", bg: "bg-indigo-500/10" },
] as const;

// 로딩 중 단계별 순환 안내 문구 (2.5초 간격)
const LOADING_STEPS = [
  "사주 여덟 글자를 세우는 중…",
  "2026 병오년(붉은 말의 해) 기운과 대조하는 중…",
  "올해 12개월 흐름을 계산하는 중…",
  "리포트를 정리하는 중…",
];

export default function AnnualFortuneClient({
  locale,
  initialHasProfile = false,
  isLoggedIn = false,
}: AnnualFortuneClientProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [data, setData] = useState<AnnualFortuneData | null>(null);
  const [loading, setLoading] = useState(initialHasProfile);
  const [error, setError] = useState<string | null>(null);

  // 로딩 체감 향상 state (단계 문구 순환 + 15초 90% 프로그레스 바)
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    if (!loading) {
      setProgress(12);
      setLoadingStepIndex(0);
      return;
    }

    // 2.5초 간격으로 단계 문구 순환
    const stepInterval = setInterval(() => {
      setLoadingStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2500);

    // 약 15초에 걸쳐 90%까지 서서히 차오르는 프로그레스 바
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(1, elapsed / 15000);
      // 부드러운 감속 곡선으로 12%에서 90%까지 도달
      const targetProgress = 12 + (90 - 12) * Math.sin((ratio * Math.PI) / 2);
      setProgress(targetProgress);
    }, 200);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [loading]);

  // Input form state (for guests or users without profile)
  const [showInputForm, setShowInputForm] = useState(!initialHasProfile);
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [gender, setGender] = useState<"F" | "M">("F");
  const [ampm, setAmpm] = useState("");
  const [hour, setHour] = useState("1");
  const [min, setMin] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const getDaysInMonth = (y: string, m: string) => {
    if (!y || !m) return 31;
    return new Date(parseInt(y), parseInt(m), 0).getDate();
  };
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  // Restore guest input from sessionStorage if available
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("kongdak_guest_fortune_input");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) setName(parsed.name);
        if (parsed.birthYear) setYear(String(parsed.birthYear));
        if (parsed.birthMonth) setMonth(String(parsed.birthMonth));
        if (parsed.birthDay) setDay(String(parsed.birthDay));
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.ampm) setAmpm(parsed.ampm);
        if (parsed.hour) setHour(String(parsed.hour));
        if (parsed.min) setMin(String(parsed.min));
      }
    } catch {
      // ignore
    }
  }, []);

  // Payment modal state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<"SINGLE" | "PERIOD_PASS">("SINGLE");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleOpenCheckout = (product: "SINGLE" | "PERIOD_PASS") => {
    if (!session?.user?.id) {
      // Save current input to sessionStorage so user doesn't lose it upon returning
      try {
        const guestInput = {
          name,
          birthYear: year,
          birthMonth: month,
          birthDay: day,
          gender,
          ampm,
          hour,
          min,
        };
        sessionStorage.setItem("kongdak_guest_fortune_input", JSON.stringify(guestInput));
      } catch {
        // ignore
      }

      alert("2026 총운 전체 리포트 열람과 결제는 로그인이 필요합니다.\n로그인 후 즉시 전체 운세를 확인하실 수 있어요.");
      const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/${locale}/fortune/annual`;
      router.push(`/${locale}/login?callbackUrl=${encodeURIComponent(currentPath)}`);
      return;
    }
    setCheckoutProduct(product);
    setCheckoutModalOpen(true);
  };

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
      setShowInputForm(false);
    } catch (err: any) {
      setError(err?.message || "2026 총운을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (initialHasProfile) {
      fetchFortune();
    }
  }, [initialHasProfile, fetchFortune]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!year || !month || !day) {
      setFormError("생년월일을 모두 선택해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dob = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      let finalTime: string | null = null;
      if (ampm) {
        let h = parseInt(hour, 10);
        if (ampm === "PM" && h !== 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        finalTime = `${h.toString().padStart(2, "0")}:${min.padStart(2, "0")}`;
      }

      // Save input in sessionStorage for convenience
      try {
        sessionStorage.setItem("kongdak_guest_fortune_input", JSON.stringify({
          name: name.trim(),
          birthYear: year,
          birthMonth: month,
          birthDay: day,
          gender,
          ampm,
          hour,
          min,
          dob,
          time: finalTime,
        }));
      } catch {
        // ignore
      }

      const res = await fetch("/api/fortune/annual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dob,
          birthYear: parseInt(year, 10),
          birthMonth: parseInt(month, 10),
          birthDay: parseInt(day, 10),
          time: finalTime,
          gender,
          name: name.trim() || "나",
          locale,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "2026 총운을 분석하지 못했습니다.");
      }

      setData(json.data);
      setShowInputForm(false);
    } catch (err: any) {
      setFormError(err?.message || "2026 총운을 분석하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-md md:max-w-2xl flex flex-col items-center justify-center py-6 sm:py-10 gap-6">
        {/* Mascot & Cycling Step Message */}
        <div className="flex flex-col items-center text-center px-4">
          <KongdakMascot size={76} animate="bounce" />
          <h2 className="mt-4 text-base sm:text-lg font-black text-[#2B2430] min-h-[28px] flex items-center justify-center transition-all duration-300">
            {LOADING_STEPS[loadingStepIndex]}
          </h2>
          <p className="text-xs text-[#8A8291] mt-1 font-medium">
            2026년 병오년 당신의 사주 기운을 심층 분석하고 있어요
          </p>

          {/* Smooth Progress Bar (15s -> 90%) */}
          <div className="w-64 sm:w-80 mt-4">
            <div className="w-full bg-[#FFF6F1] border border-[#FFD9E0] h-2.5 rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.round(progress)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-[#8A8291] mt-1.5 font-bold px-0.5">
              <span>운세 리포트 분석 중</span>
              <span className="text-[#FF5C77] font-extrabold">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>

        {/* Skeleton Preview Cards Placeholder */}
        <div className="w-full flex flex-col gap-4 animate-pulse pointer-events-none mt-1 px-1">
          {/* Skeleton Hero Card */}
          <div className="relative bg-gradient-to-br from-[#FFD9E0]/40 via-[#FFF6F1] to-[#EAD4ED]/30 rounded-3xl p-6 sm:p-8 border border-[#FFD9E0]/60 flex flex-col items-center gap-3 shadow-xs">
            <div className="w-36 h-5 bg-gray-200/80 rounded-full" />
            <div className="w-52 h-7 bg-gray-200/90 rounded-xl mt-1" />
            <div className="w-28 h-16 bg-gray-200 rounded-2xl my-2" />
            <div className="w-40 h-6 bg-gray-200/70 rounded-full" />
            <div className="w-full h-16 bg-gray-200/60 rounded-2xl mt-2" />
          </div>

          {/* Skeleton Section Cards */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="w-32 h-5 bg-gray-200/80 rounded-lg" />
              <div className="w-16 h-5 bg-gray-200/60 rounded-full" />
            </div>
            <div className="w-full h-12 bg-gray-100 rounded-xl" />
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="w-32 h-5 bg-gray-200/80 rounded-lg" />
              <div className="w-16 h-5 bg-gray-200/60 rounded-full" />
            </div>
            <div className="w-full h-12 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="w-full max-w-md md:max-w-2xl bg-white p-7 rounded-3xl shadow-sm border border-red-200 text-center">
        <p className="text-red-500 font-bold mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            if (initialHasProfile) {
              fetchFortune();
            } else {
              setShowInputForm(true);
            }
          }}
          className="px-5 py-2.5 bg-[#FF5C77] text-white rounded-xl font-bold text-sm shadow-xs active:scale-95 transition-all"
        >
          다시 시도하기
        </button>
      </div>
    );
  }

  if (showInputForm && !data) {
    return (
      <div className="w-full max-w-md md:max-w-xl flex flex-col items-center">
        {/* Intro banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-[#FF5C77]/10 text-[#FF5C77] px-3.5 py-1 rounded-full text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>2026 병오년(붉은 말의 해) 특별 운세</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#2B2430] tracking-tight">
            2026 나의 총운 무료 맛보기
          </h1>
          <p className="text-xs sm:text-sm text-[#6A5E72] mt-2 leading-relaxed">
            생년월일만 입력하면 나의 <strong>올해 총운 점수와 연애운</strong>을<br className="hidden sm:inline" />
            즉시 무료로 분석해 드려요.
          </p>
        </div>

        {/* Input Card */}
        <div className="w-full bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-[#FFD9E0]/60">
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#6A2C70] mb-1.5">
                이름 또는 닉네임 (선택)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 김콩닥"
                maxLength={20}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6A2C70] mb-1.5">
                생년월일 (양력) <span className="text-[#FF5C77]">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
                  required
                >
                  <option value="">년도</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
                  required
                >
                  <option value="">월</option>
                  {months.map((m) => (
                    <option key={m} value={m}>{m}월</option>
                  ))}
                </select>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
                  required
                >
                  <option value="">일</option>
                  {Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}일</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-[#6A2C70] mb-1.5">
                  성별 <span className="text-[#FF5C77]">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "F" | "M")}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40 font-medium"
                >
                  <option value="F">여성</option>
                  <option value="M">남성</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-[#6A2C70] mb-1.5">
                  태어난 시간 (선택)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={ampm}
                    onChange={(e) => setAmpm(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
                  >
                    <option value="">시간 모름</option>
                    <option value="AM">오전</option>
                    <option value="PM">오후</option>
                  </select>
                  <select
                    value={hour}
                    onChange={(e) => setHour(e.target.value)}
                    disabled={!ampm}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40 disabled:opacity-40"
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>{h}시</option>
                    ))}
                  </select>
                  <select
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                    disabled={!ampm}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40 disabled:opacity-40"
                  >
                    {minutes.map((m) => (
                      <option key={m} value={m}>{m}분</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Privacy note */}
            <div className="p-3 bg-[#FFF6F1] rounded-xl border border-[#FFD9E0]/40 text-[11px] text-[#8A8291] flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-4 h-4 text-[#FF5C77] shrink-0" />
              <span>비회원 입력 정보는 계산에만 사용되며 절대 서버에 저장되지 않습니다.</span>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-[#FF5C77] hover:bg-[#ff4766] active:scale-[0.97] text-white py-4 px-6 rounded-2xl font-bold text-base shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all duration-150 flex items-center justify-center gap-2"
            >
              <span>2026 총운 무료로 맛보기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isLocked = Boolean(data.locked);

  const getScoreRating = (score: number) => {
    if (score >= 90) return { label: "대길 · 최고의 상승운", badgeBg: "bg-[#FF5C77] text-white" };
    if (score >= 80) return { label: "길함 · 안정된 도약", badgeBg: "bg-[#FFC24B] text-[#2B2430]" };
    if (score >= 70) return { label: "평탄 · 노력 결실의 해", badgeBg: "bg-emerald-500 text-white" };
    return { label: "변화 · 지혜로운 대비", badgeBg: "bg-[#6A2C70] text-white" };
  };

  const scoreRating = getScoreRating(data.yearScore);

  return (
    <div className="w-full max-w-md md:max-w-2xl flex flex-col gap-6 pb-16 pt-2">
      {/* 1. Header & Free Teaser Card */}
      <div className="relative bg-gradient-to-br from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] rounded-3xl p-6 sm:p-8 text-white shadow-[0_8px_24px_rgba(181,71,96,0.15)] overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-0.5 rounded-full text-xs font-bold text-white mb-3 border border-white/25 shadow-xs">
            <span>2026 병오년(丙午年) 붉은 말의 해</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            나의 2026년 종합 총운
          </h1>

          {/* Big Score Display */}
          <div className="flex items-baseline justify-center gap-1 my-2">
            <span className="text-6xl sm:text-7xl font-black tracking-tight drop-shadow-sm">
              {data.yearScore}
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-[#FFC24B]">점</span>
          </div>

          <div className={`text-xs font-bold px-3 py-1 rounded-full shadow-xs mb-4 ${scoreRating.badgeBg}`}>
            {scoreRating.label}
          </div>

          {/* Headline Balloon */}
          <div className="w-full bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 sm:p-5 text-left mb-3.5 shadow-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <KongdakMascot size={24} animate="none" />
              <span className="text-xs font-bold text-white/90">두근이의 한 줄 요약</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white leading-snug">
              &ldquo;{data.headline}&rdquo;
            </p>
          </div>

          {/* Free Summary Overview */}
          <div className="w-full bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-left border border-white/15">
            <h3 className="text-xs font-bold text-white/80 mb-1">2026년 총평</h3>
            <p className="text-xs sm:text-sm text-white/95 leading-relaxed">
              {data.summary}
            </p>
          </div>
        </div>
      </div>

      {/* 2. 5 Key Life Sections (3-A: 샘플 1개 완전 공개 + 나머지 4개 잠금) */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-black text-[#2B2430] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#FF5C77]" />
            <span>5대 영역별 상세 운세</span>
          </h2>
          {isLocked && (
            <span className="text-xs font-bold text-[#FF5C77] bg-[#FFF6F1] border border-[#FFD9E0] px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>일부 잠김</span>
            </span>
          )}
        </div>

        {/* 3-A Pattern: Love Section as FREE SAMPLE */}
        {data.sections?.love && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#FF8AA1] shadow-xs flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#FF5C77] text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-xl shadow-xs">
              무료 맛보기 공개
            </div>
            <div className="flex items-center justify-between pr-24">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FF5C77]/10 flex items-center justify-center text-[#FF5C77]">
                  <Heart className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm sm:text-base text-[#2B2430]">연애 & 애정운</span>
              </div>
              <div className="flex items-center gap-1 bg-[#FFF6F1] px-2.5 py-0.5 rounded-xl border border-[#FFD9E0]/50">
                <span className="text-xs font-semibold text-[#8A8291]">운세 지수</span>
                <span className="text-sm font-black text-[#FF5C77]">{data.sections.love.score}점</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#2B2430] leading-relaxed">
              {data.sections.love.text}
            </p>
          </div>
        )}

        {/* Remaining Unlocked Sections (When fully entitled) */}
        {!isLocked && data.sections && (
          <div className="grid grid-cols-1 gap-3.5">
            {SECTION_CONFIG.filter((s) => s.key !== "love").map(({ key, title, icon: Icon, color, bg }) => {
              const sec = data.sections![key as keyof typeof data.sections];
              if (!sec) return null;
              return (
                <div
                  key={key}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-[#FFD9E0]/50 shadow-xs flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-extrabold text-sm sm:text-base text-[#2B2430]">{title}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-[#FFF6F1] px-2.5 py-0.5 rounded-xl border border-[#FFD9E0]/50">
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
        )}

        {/* Locked Remaining 4 Sections with Blur Preview */}
        {isLocked && (
          <div className="relative flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 blur-[5px] select-none pointer-events-none opacity-45">
              {SECTION_CONFIG.filter((s) => s.key !== "love").map(({ key, title, icon: Icon, color, bg }, index) => (
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
                    <span className="text-xs font-bold text-[#FF5C77]">{82 + index * 3}점</span>
                  </div>
                  <p className="text-xs text-[#8A8291] line-clamp-2">
                    2026년 이 영역에서 당신에게 다가오는 기회와 중요한 인연의 타이밍, 조심해야 할 순간을 구체적으로 알려드립니다...
                  </p>
                </div>
              ))}
            </div>

            {/* In-place Lock Prompt */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4">
              <div className="bg-[#2B2430]/95 backdrop-blur-md text-white p-6 sm:p-7 rounded-3xl text-center shadow-xl border border-white/10 max-w-sm w-full">
                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3 text-[#FFC24B]">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base sm:text-lg text-white mb-1.5">
                  나머지 4대 영역 상세 리포트
                </h3>
                <p className="text-xs text-[#C5BFC9] mb-4 leading-relaxed">
                  재물·직업·건강·인간관계의 구체적 기회와<br />주의할 시기를 모두 잠금 해제하세요.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenCheckout("SINGLE")}
                  className="w-full bg-[#FF5C77] hover:bg-[#ff4766] text-white font-bold py-3 px-5 rounded-xl active:scale-[0.97] transition-all duration-150 shadow-sm text-xs sm:text-sm flex items-center justify-center gap-1.5"
                >
                  <span>2026 총운 열기 · 첫 결제 1,900원</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCheckout("PERIOD_PASS")}
                  className="w-full mt-2 text-[11px] font-semibold text-white/80 hover:text-white py-1 transition-colors"
                >
                  또는 30일 무제한 패스 (9,900원) →
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. 12 Months Highlights (월별 운세 타임라인) */}
      <section className="flex flex-col gap-3.5 mt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-black text-[#2B2430] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#FF5C77]" />
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
                  <p className="text-xs text-[#8A8291] mt-1">이 달에는 새로운 흐름과 기회가 찾아옵니다...</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. Lucky Points (행운의 포인트) */}
      <section className="flex flex-col gap-3 mt-2">
        <h2 className="text-base sm:text-lg font-black text-[#2B2430] flex items-center gap-2 px-1">
          <Sparkles className="w-4 h-4 text-[#FFC24B]" />
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
        <div className="bg-white border-2 border-[#FF8AA1] rounded-3xl p-6 sm:p-7 shadow-md text-center mt-3">
          <div className="inline-flex items-center gap-1.5 bg-[#FF5C77]/10 text-[#FF5C77] px-3 py-0.5 rounded-full text-xs font-bold mb-3">
            <span>2026 신년 총운 전체 열람</span>
          </div>

          <h3 className="text-xl font-black text-[#2B2430] mb-2">
            2026 나의 총운 전체 리포트 열기
          </h3>

          <p className="text-xs sm:text-sm text-[#6A5E72] leading-relaxed mb-4">
            심층 5영역 · 12개월 타임라인 · 행운 포인트<br />
            <strong>결제일로부터 90일간 언제든 다시 열람</strong>하세요.
          </p>

          {/* Trust elements */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-[#8A8291] mb-5">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>PortOne 안전결제</span>
            </span>
            <span>·</span>
            <span>결제 즉시 열람</span>
            <span>·</span>
            <span>자동 결제 없음</span>
          </div>

          <div className="flex flex-col gap-2.5 max-w-sm mx-auto">
            {/* Primary: 2026 Annual Fortune Single Purchase */}
            <button
              type="button"
              onClick={() => handleOpenCheckout("SINGLE")}
              disabled={isProcessingPayment}
              className="w-full bg-[#FF5C77] hover:bg-[#ff4766] active:scale-[0.97] text-white py-4 px-6 rounded-2xl font-bold text-sm sm:text-base shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all duration-150 flex items-center justify-center gap-2"
            >
              <span>2026 총운 전체 열기 · 첫 결제 1,900원</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Secondary: 1 Month Unlimited Pass */}
            <button
              type="button"
              onClick={() => handleOpenCheckout("PERIOD_PASS")}
              disabled={isProcessingPayment}
              className="w-full bg-[#FFF6F1] hover:bg-[#FFD9E0]/50 active:scale-[0.97] text-[#6A2C70] border border-[#FFD9E0] py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-1.5"
            >
              <span>30일 무제한 패스로 모든 궁합까지 열기 (9,900원)</span>
            </button>

            <Link
              href={`/${locale}/pricing`}
              className="text-xs font-semibold text-[#8A8291] hover:text-[#2B2430] py-1.5 transition-colors"
            >
              다른 요금제 알아보기 →
            </Link>
          </div>
        </div>
      )}

      {/* Re-calculate with another birth date */}
      <div className="flex justify-center mt-4">
        <button
          type="button"
          onClick={() => {
            setData(null);
            setShowInputForm(true);
          }}
          className="text-xs text-[#8A8291] hover:text-[#6A2C70] font-bold flex items-center gap-1.5 py-2 px-4 rounded-full bg-white/80 hover:bg-white border border-[#FFD9E0]/60 transition-all shadow-2xs active:scale-95"
        >
          <span>🔄 다른 생년월일로 다시 보기</span>
        </button>
      </div>

      {/* 6. Friendly Disclaimer */}
      <footer className="text-center mt-3 px-4">
        <p className="text-[11px] text-[#8A8291] leading-relaxed">
          ※ 콩닥의 2026 총운 리포트는 정통 사주 데이터를 바탕으로 오락 및 자기이해를 위해 다정하게 제공되는 참고 정보이며, 단정적 미래를 보장하지 않습니다.
        </p>
      </footer>

      {/* Guest & Pass Checkout Modal */}
      <GuestCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title={checkoutProduct === "SINGLE" ? "2026 총운 리포트 열람" : "콩닥 플러스 무제한 이용권"}
        orderName={checkoutProduct === "SINGLE" ? "콩닥 2026 신년 총운 리포트" : "콩닥 플러스 1개월 이용권"}
        priceLabel={checkoutProduct === "SINGLE" ? "첫 결제 1,900원 (이후 2,900원) · 90일 열람" : "9,900원 (30일 무제한)"}
        initialName={session?.user?.name || ""}
        initialEmail={session?.user?.email || ""}
        initialPhone=""
        isLoading={isProcessingPayment}
        onSubmit={async (buyer: BuyerInfo) => {
          try {
            setIsProcessingPayment(true);
            if (checkoutProduct === "SINGLE") {
              await requestPortOnePayment({
                type: "SINGLE",
                product: "ANNUAL_2026",
                buyer,
                locale,
              });
            } else {
              await requestPortOnePayment({
                type: "PERIOD_PASS",
                planId: "1_MONTH",
                compatId: undefined,
                buyer,
                locale,
              });
            }
          } catch (e: any) {
            alert(e?.message || "결제 진행 중 오류가 발생했습니다.");
          } finally {
            setIsProcessingPayment(false);
            setCheckoutModalOpen(false);
            fetchFortune();
          }
        }}
      />
    </div>
  );
}
