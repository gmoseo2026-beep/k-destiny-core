"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import KongdakMascot from "@/components/KongdakMascot";
import FortuneLoading from "@/components/FortuneLoading";
import dynamic from "next/dynamic";
import { requestPortOnePayment, BuyerInfo } from "@/lib/payments/client";
import { getProduct, priceLabel } from "@/lib/catalog";

const GuestCheckoutModal = dynamic(() => import("@/components/GuestCheckoutModal"), { ssr: false });
import InAppBrowserModal from "@/components/InAppBrowserModal";
import { blockPaymentIfInApp, isInAppBrowser } from "@/lib/inAppBrowser";
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
  year?: number;
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
  hooks?: {
    love?: string;
    money?: string;
    career?: string;
    health?: string;
    relationship?: string;
  };
  teasers?: {
    bestMonth?: string;
    cautionMonth?: string;
  };
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
  { key: "love", title: "연애 & 애정운", icon: Heart, color: "text-coral", bg: "bg-coral/10" },
  { key: "money", title: "재물 & 금전운", icon: Coins, color: "text-[#FFC24B]", bg: "bg-[#FFC24B]/10" },
  { key: "career", title: "직업 & 학업운", icon: Briefcase, color: "text-[#6A2C70]", bg: "bg-[#6A2C70]/10" },
  { key: "health", title: "건강 & 활력운", icon: Leaf, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "relationship", title: "인간관계 & 사교운", icon: Users, color: "text-indigo-500", bg: "bg-indigo-500/10" },
] as const;

export default function AnnualFortuneClient({
  locale,
  year = 2026,
  initialHasProfile = false,
}: AnnualFortuneClientProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [data, setData] = useState<AnnualFortuneData | null>(null);
  const [loading, setLoading] = useState(initialHasProfile);
  const [error, setError] = useState<string | null>(null);

  const annualProduct = getProduct(`annual_${year}`);
  const annualPrice = annualProduct ? priceLabel(annualProduct) : "6,900원 · 회원 첫 결제 4,900원";

  // Input form state (for guests or users without profile)
  const [showInputForm, setShowInputForm] = useState(!initialHasProfile);
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [gender, setGender] = useState<"F" | "M">("F");
  const [ampm, setAmpm] = useState("");
  const [hour, setHour] = useState("1");
  const [min, setMin] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);

  // Optional input toggle states (collapsed by default for ultra-compact first impression)
  const [showNameInput, setShowNameInput] = useState(false);
  const [showTimeInput, setShowTimeInput] = useState(false);
  const yearSelectRef = React.useRef<HTMLSelectElement>(null);

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
        queueMicrotask(() => {
          if (parsed.name) {
            setName(parsed.name);
            setShowNameInput(true);
          }
          if (parsed.birthYear) setBirthYear(String(parsed.birthYear));
          if (parsed.birthMonth) setMonth(String(parsed.birthMonth));
          if (parsed.birthDay) setDay(String(parsed.birthDay));
          if (parsed.gender) setGender(parsed.gender);
          if (parsed.ampm) {
            setAmpm(parsed.ampm);
            setShowTimeInput(true);
          }
          if (parsed.hour) setHour(String(parsed.hour));
          if (parsed.min) setMin(String(parsed.min));
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // Autofocus year select on mount for instant interaction
  useEffect(() => {
    if (showInputForm && !data) {
      const timer = setTimeout(() => {
        yearSelectRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showInputForm, data]);

  // Payment modal state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // In-app Browser Guard & Notice State
  const [inAppOpen, setInAppOpen] = useState(false);
  const [isInApp, setIsInApp] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setIsInApp(isInAppBrowser()));
  }, []);

  const handleOpenCheckout = (_product?: "SINGLE" | "PERIOD_PASS") => {
    void _product;
    if (blockPaymentIfInApp(() => setInAppOpen(true))) return;
    if (!session?.user?.id) {
      // Save current input to sessionStorage so user doesn't lose it upon returning
      try {
        const guestInput = {
          name,
          birthYear,
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

      alert(`${year} 총운 전체 리포트 열람과 결제는 로그인이 필요합니다.\n로그인 후 즉시 전체 운세를 확인하실 수 있어요.`);
      const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/${locale}/fortune/annual`;
      router.push(`/${locale}/login?callbackUrl=${encodeURIComponent(currentPath)}`);
      return;
    }
    setCheckoutModalOpen(true);
  };

  const fetchFortune = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/fortune/annual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, productId: `annual_${year}` }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `${year} 총운을 불러오지 못했습니다.`);
      }

      setData(json.data);
      setShowInputForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `${year} 총운을 불러오는데 실패했습니다.`);
    } finally {
      setLoading(false);
    }
  }, [locale, year]);

  useEffect(() => {
    if (initialHasProfile) {
      queueMicrotask(() => {
        void fetchFortune();
      });
    }
  }, [initialHasProfile, fetchFortune]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!birthYear || !month || !day) {
      setFormError("생년월일을 모두 선택해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dob = `${birthYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
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
          birthYear,
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
          birthYear: parseInt(birthYear, 10),
          birthMonth: parseInt(month, 10),
          birthDay: parseInt(day, 10),
          time: finalTime,
          gender,
          name: name.trim() || "나",
          locale,
          productId: `annual_${year}`,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `${year} 총운을 분석하지 못했습니다.`);
      }

      setData(json.data);
      setShowInputForm(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : `${year} 총운을 분석하는 중 오류가 발생했습니다.`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <FortuneLoading
        steps={[
          "사주 여덟 글자를 세우는 중…",
          `${year}년 기운과 대조하는 중…`,
          "올해 12개월 흐름을 계산하는 중…",
          "리포트를 정리하는 중…",
        ]}
        durationSec={15}
        subMessage={`${year}년 당신의 사주 기운을 심층 분석하고 있어요`}
        skeletonVariant="annual"
      />
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
          className="px-5 py-2.5 bg-coral text-white rounded-xl font-bold text-sm shadow-xs active:scale-95 transition-all"
        >
          다시 시도하기
        </button>
      </div>
    );
  }

  if (showInputForm && !data) {
    return (
      <div className="w-full max-w-md md:max-w-xl flex flex-col items-center">
        {/* Intro banner - Compact for zero scroll */}
        <div className="text-center mb-4 sm:mb-5">
          <div className="inline-flex items-center gap-1.5 bg-coral/10 text-coral px-3.5 py-1 rounded-full text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{year}년 특별 운세</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
            {year} 나의 총운 무료 맛보기
          </h1>
          <p className="text-xs sm:text-sm text-[#6A5E72] mt-1.5 leading-relaxed font-medium">
            생년월일만 넣으면 3초 만에 무료로 총운 점수와 연애운 확인
          </p>
        </div>

        {/* Input Card */}
        <div className="w-full bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-[#FFD9E0]/60">
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-3.5">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold">
                {formError}
              </div>
            )}

            {/* 1. 생년월일 (맨 위 기본 노출) */}
            <div>
              <label className="block text-xs font-bold text-[#6A2C70] mb-1.5">
                생년월일 (양력) <span className="text-coral">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  ref={yearSelectRef}
                  autoFocus
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
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
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
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
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
                  required
                >
                  <option value="">일</option>
                  {Array.from({ length: getDaysInMonth(birthYear, month) }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}일</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. 성별 (원터치 2버튼 토글) */}
            <div>
              <label className="block text-xs font-bold text-[#6A2C70] mb-1.5">
                성별 <span className="text-coral">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender("F")}
                  className={`py-2.5 sm:py-3 rounded-xl text-sm font-bold border transition-all active:scale-[0.96] ${
                    gender === "F"
                      ? "bg-coral text-white border-coral shadow-xs"
                      : "bg-cream/40 text-[#6A5E72] border-gray-200 hover:border-coral/40"
                  }`}
                >
                  여성
                </button>
                <button
                  type="button"
                  onClick={() => setGender("M")}
                  className={`py-2.5 sm:py-3 rounded-xl text-sm font-bold border transition-all active:scale-[0.96] ${
                    gender === "M"
                      ? "bg-coral text-white border-coral shadow-xs"
                      : "bg-cream/40 text-[#6A5E72] border-gray-200 hover:border-coral/40"
                  }`}
                >
                  남성
                </button>
              </div>
            </div>

            {/* 3. 선택 항목 접기/펼치기 (이름 & 태어난 시간) */}
            <div className="pt-1 flex flex-col gap-2 border-t border-gray-100">
              {/* 이름 필드 토글 */}
              {!showNameInput ? (
                <button
                  type="button"
                  onClick={() => setShowNameInput(true)}
                  className="self-start text-xs font-semibold text-[#8A8291] hover:text-coral transition-colors py-0.5 flex items-center gap-1 active:scale-[0.96]"
                >
                  <span>+ 이름 넣기 (선택)</span>
                </button>
              ) : (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#6A2C70]">
                      이름 또는 닉네임 (선택)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNameInput(false);
                        setName("");
                      }}
                      className="text-[11px] text-[#8A8291] hover:text-coral"
                    >
                      접기
                    </button>
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 김콩닥 (미입력 시 '나')"
                    maxLength={20}
                    className="w-full border border-gray-200 rounded-xl p-2.5 sm:p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
                  />
                </div>
              )}

              {/* 태어난 시간 필드 토글 */}
              {!showTimeInput ? (
                <button
                  type="button"
                  onClick={() => setShowTimeInput(true)}
                  className="self-start text-xs font-semibold text-[#8A8291] hover:text-coral transition-colors py-0.5 flex items-center gap-1 active:scale-[0.96]"
                >
                  <span>+ 태어난 시간 넣기 (선택, 더 정밀한 사주)</span>
                </button>
              ) : (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#6A2C70]">
                      태어난 시간 (선택)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTimeInput(false);
                        setAmpm("");
                      }}
                      className="text-[11px] text-[#8A8291] hover:text-coral"
                    >
                      접기
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={ampm}
                      onChange={(e) => setAmpm(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-2.5 sm:p-3 text-sm focus:outline-none focus:border-coral bg-cream/40"
                    >
                      <option value="">시간 모름</option>
                      <option value="AM">오전</option>
                      <option value="PM">오후</option>
                    </select>
                    <select
                      value={hour}
                      onChange={(e) => setHour(e.target.value)}
                      disabled={!ampm}
                      className="w-full border border-gray-200 rounded-xl p-2.5 sm:p-3 text-sm focus:outline-none focus:border-coral bg-cream/40 disabled:opacity-40"
                    >
                      {hours.map((h) => (
                        <option key={h} value={h}>{h}시</option>
                      ))}
                    </select>
                    <select
                      value={min}
                      onChange={(e) => setMin(e.target.value)}
                      disabled={!ampm}
                      className="w-full border border-gray-200 rounded-xl p-2.5 sm:p-3 text-sm focus:outline-none focus:border-coral bg-cream/40 disabled:opacity-40"
                    >
                      {minutes.map((m) => (
                        <option key={m} value={m}>{m}분</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 4. CTA 버튼 (행동형 문구, 전역 active scale 애니메이션) */}
            <button
              type="submit"
              className="w-full mt-2 bg-coral hover:bg-[#ff4766] active:scale-[0.96] text-white py-3.5 sm:py-4 px-6 rounded-2xl font-bold text-base shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all duration-150 flex items-center justify-center gap-2"
            >
              <span>무료로 내 {year} 총운 보기</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* 5. 개인정보 안내 (버튼 아래로 이동하여 폼을 컴팩트하게 유지) */}
            <div className="p-2.5 bg-cream rounded-xl border border-[#FFD9E0]/40 text-[11px] text-[#8A8291] flex items-center justify-center gap-1.5 mt-0.5 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-coral shrink-0" />
              <span>비회원 입력 정보는 계산에만 사용되며 저장되지 않습니다.</span>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isLocked = Boolean(data.locked);

  const getScoreRating = (score: number) => {
    if (score >= 90) return { label: "대길 · 최고의 상승운", badgeBg: "bg-coral text-white" };
    if (score >= 80) return { label: "길함 · 안정된 도약", badgeBg: "bg-[#FFC24B] text-ink" };
    if (score >= 70) return { label: "평탄 · 노력 결실의 해", badgeBg: "bg-emerald-500 text-white" };
    return { label: "변화 · 지혜로운 대비", badgeBg: "bg-[#6A2C70] text-white" };
  };

  const scoreRating = getScoreRating(data.yearScore);

  return (
    <div className="w-full max-w-md md:max-w-2xl flex flex-col gap-6 pb-32 sm:pb-36 pt-2">
      {/* 1. Header & Free Teaser Card */}
      <div className="relative bg-gradient-to-br from-[#FF8AA1] via-coral to-[#6A2C70] rounded-3xl p-6 sm:p-8 text-white shadow-[0_8px_24px_rgba(181,71,96,0.15)] overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-0.5 rounded-full text-xs font-bold text-white mb-3 border border-white/25 shadow-xs">
            <span>{year}년 {year === 2027 ? "정미년(丁未年)" : "병오년(丙午年)"}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            나의 {year}년 종합 총운
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
            <h3 className="text-xs font-bold text-white/80 mb-1">{year}년 총평</h3>
            <p className="text-xs sm:text-sm text-white/95 leading-relaxed">
              {data.summary}
            </p>
          </div>
        </div>
      </div>

      {/* 2-B. Top Primary CTA Banner (미결제 시 점수 직후 노출) */}
      {isLocked && (
        <>
          <button
            type="button"
            onClick={() => handleOpenCheckout("SINGLE")}
            className="w-full bg-white/95 hover:bg-white border-2 border-[#FF8AA1]/60 rounded-2xl p-3.5 shadow-xs transition-all duration-150 active:scale-[0.98] flex items-center justify-between gap-2 group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-coral/10 flex items-center justify-center text-coral shrink-0">
                <Lock className="w-4 h-4" />
              </span>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-ink group-hover:text-coral transition-colors">
                    결정적인 건 잠겨 있어요 — 전체 리포트 열기
                  </span>
                  <span className="text-[10px] font-black text-coral bg-cream border border-[#FFD9E0] px-1.5 py-0.5 rounded-md">
                    {annualPrice}
                  </span>
                </div>
                <span className="text-[11px] text-[#8A8291] truncate">
                  5대 영역 심층 분석 & 12개월 타임라인 즉시 확인
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-coral shrink-0 flex items-center gap-0.5 bg-cream px-2.5 py-1.5 rounded-xl border border-[#FFD9E0] shadow-2xs group-hover:bg-coral group-hover:text-white transition-all">
              열기 <ArrowRight className="w-3 h-3" />
            </span>
          </button>

          {/* In-app Browser Notice Banner (인앱 결제 오류 사전 탈출 유도) */}
          {isInApp && (
            <div
              onClick={() => blockPaymentIfInApp(() => setInAppOpen(true))}
              className="w-full bg-coral/10 hover:bg-coral/15 border border-coral/30 rounded-2xl p-3 text-xs text-[#6A2C70] flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <span className="font-semibold text-left">
                🔒 원활한 결제를 위해 오른쪽 위 메뉴(⋮)에서 <strong>‘다른 브라우저로 열기’</strong>를 눌러주세요.
              </span>
              <span className="text-[11px] font-bold text-coral shrink-0 underline whitespace-nowrap">
                외부 브라우저 열기
              </span>
            </div>
          )}
        </>
      )}

      {/* 2. 5 Key Life Sections (궁금증-갭 미리보기: 각 영역 한 줄 훅 + 블러 실루엣 + 자물쇠) */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-black text-ink flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-coral" />
            <span>5대 영역별 운세 분석</span>
          </h2>
          {isLocked && (
            <span className="text-xs font-bold text-coral bg-cream border border-[#FFD9E0] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
              <Lock className="w-3 h-3" />
              <span>미리보기</span>
            </span>
          )}
        </div>

        {/* 미결제 상태: 5개 영역 각각 선명한 1줄 훅(cliffhanger) + CSS 블러 더미 텍스트 + 자물쇠 */}
        {isLocked && (
          <div className="flex flex-col gap-3.5">
            {SECTION_CONFIG.map(({ key, title, icon: Icon, color, bg }) => {
              const hookText = (data.hooks as Record<string, string> | undefined)?.[key] || "2026년 이 영역에서 당신에게 결정적인 순간이 찾아옵니다 —";
              return (
                <div
                  key={key}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-[#FFD9E0]/70 shadow-xs flex flex-col gap-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-extrabold text-sm sm:text-base text-ink">{title}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-cream px-2.5 py-0.5 rounded-xl border border-[#FFD9E0]/50 text-xs font-bold text-[#8A8291]">
                      <Lock className="w-3 h-3 text-coral" />
                      <span>심층 분석</span>
                    </div>
                  </div>

                  {/* 선명한 한 줄 훅 (결론 직전 끊기) */}
                  <div className="bg-cream/80 rounded-xl p-3 border border-[#FFD9E0]/50 text-xs sm:text-sm font-bold text-ink leading-snug">
                    &ldquo;{hookText}&rdquo;
                  </div>

                  {/* CSS 블러 처리된 더미/실루엣 텍스트 (서버에서 유료 본문 미전송 = 유출 0) */}
                  <div className="relative">
                    <p className="text-xs text-[#8A8291] leading-relaxed blur-[4px] select-none pointer-events-none opacity-40">
                      2026년 이 영역에서 펼쳐지는 구체적 기회의 시기와 피해야 할 함정, 그리고 사주 기운이 가리키는 실전 행동 조언이 상세 리포트에 모두 담겨 있습니다.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 결제 완료 시: 5대 영역 상세 본문 전체 정상 노출 */}
        {!isLocked && data.sections && (
          <div className="grid grid-cols-1 gap-3.5">
            {SECTION_CONFIG.map(({ key, title, icon: Icon, color, bg }) => {
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
                      <span className="font-extrabold text-sm sm:text-base text-ink">{title}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-cream px-2.5 py-0.5 rounded-xl border border-[#FFD9E0]/50">
                      <span className="text-xs font-semibold text-[#8A8291]">운세 지수</span>
                      <span className="text-sm font-black text-coral">{sec.score}점</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-ink leading-relaxed">
                    {sec.text}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. 12 Months Highlights (월별 운세 타임라인 + 가장 좋은 달/조심할 달 티저) */}
      <section className="flex flex-col gap-3.5 mt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-black text-ink flex items-center gap-2">
            <Calendar className="w-4 h-4 text-coral" />
            <span>12개월 월별 운세 타임라인</span>
          </h2>
          {isLocked && (
            <span className="text-xs font-bold text-[#8A8291] bg-white border border-[#FFD9E0] px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>미리보기</span>
            </span>
          )}
        </div>

        {/* 미결제 시: 올해 가장 좋은 달 · 조심할 달 티저 pill + 12개월 타임라인 실루엣 */}
        {isLocked && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-white p-3.5 rounded-2xl border border-[#FFD9E0]/70 flex items-center justify-between shadow-2xs">
                <span className="text-xs font-bold text-[#6A5E72]">올해 가장 빛나는 달</span>
                <span className="text-xs font-black text-coral bg-cream border border-[#FFD9E0] px-2.5 py-1 rounded-xl flex items-center gap-1">
                  <span>{data.teasers?.bestMonth || "올해 가장 빛나는 달은 ●월"}</span>
                  <Lock className="w-3 h-3 text-coral" />
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-[#FFD9E0]/70 flex items-center justify-between shadow-2xs">
                <span className="text-xs font-bold text-[#6A5E72]">조심하면 좋은 달</span>
                <span className="text-xs font-black text-[#6A2C70] bg-cream border border-[#FFD9E0] px-2.5 py-1 rounded-xl flex items-center gap-1">
                  <span>{data.teasers?.cautionMonth || "딱 한 달, 감정·선택 조심"}</span>
                  <Lock className="w-3 h-3 text-[#6A2C70]" />
                </span>
              </div>
            </div>

            {/* 12개월 타임라인 실루엣 (CSS 블러 더미) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 blur-[4px] select-none pointer-events-none opacity-40">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <div key={m} className="bg-white p-3 rounded-xl border border-[#FFD9E0]/40 shadow-xs">
                  <span className="text-xs font-bold text-coral">{m}월</span>
                  <p className="text-[11px] text-[#8A8291] mt-0.5 line-clamp-1">기회의 달...</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLocked && data.monthlyHighlights && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.monthlyHighlights.map(({ month, note }) => (
              <div
                key={month}
                className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/50 shadow-xs flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-coral bg-cream border border-[#FFD9E0] px-2 py-0.5 rounded-md">
                    {month}월
                  </span>
                </div>
                <p className="text-xs text-ink leading-relaxed">
                  {note}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Lucky Points (행운의 포인트) */}
      <section className="flex flex-col gap-3 mt-2">
        <h2 className="text-base sm:text-lg font-black text-ink flex items-center gap-2 px-1">
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
              <span className="text-xs sm:text-sm font-black text-coral">{data.luckyPoints.item}</span>
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
              <span className="text-xs font-bold text-coral">원석 팔찌</span>
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
          <div className="inline-flex items-center gap-1.5 bg-coral/10 text-coral px-3 py-0.5 rounded-full text-xs font-bold mb-3">
            <span>2026 신년 총운 전체 열람</span>
          </div>

          <h3 className="text-xl font-black text-ink mb-2">
            2026 나의 총운 전체 리포트 열기
          </h3>

          <p className="text-xs sm:text-sm text-[#6A5E72] leading-relaxed mb-4">
            심층 5영역 · 12개월 타임라인 · 행운 포인트<br />
            <strong>결제일로부터 90일간 언제든 다시 열람</strong>하세요.
          </p>

          {/* Trust elements */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-[#8A8291] mb-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>PortOne 안전결제</span>
            </span>
            <span>·</span>
            <span>결제 즉시 열람</span>
            <span>·</span>
            <span>자동 결제 없음</span>
          </div>

          {/* 단건 리포트 안내 카드 — 기간권 UI 동면(D4) */}
          <div className="mb-5 text-left max-w-sm mx-auto">
            <div className="bg-cream p-3 rounded-2xl border border-[#FFD9E0]/60">
              <span className="text-[10px] font-extrabold text-coral block mb-0.5">단건 리포트</span>
              <span className="text-xs font-black text-ink block">2026 총운 1회</span>
              <span className="text-[10px] text-[#8A8291] leading-tight block mt-0.5">{annualPrice} · 90일 보관</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 max-w-sm mx-auto">
            {/* Primary: 2026 Annual Fortune Single Purchase */}
            <button
              type="button"
              onClick={() => handleOpenCheckout("SINGLE")}
              disabled={isProcessingPayment}
              className="w-full bg-coral hover:bg-[#ff4766] active:scale-[0.97] text-white py-4 px-6 rounded-2xl font-bold text-sm sm:text-base shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all duration-150 flex items-center justify-center gap-2"
            >
              <span>2026 총운 전체 열기 ({annualPrice})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* [D4] 30일 패스 버튼 동면
            <button
              type="button"
              onClick={() => handleOpenCheckout("PERIOD_PASS")}
              disabled={isProcessingPayment}
              className="w-full bg-cream hover:bg-[#FFD9E0]/50 active:scale-[0.97] text-[#6A2C70] border border-[#FFD9E0] py-3.5 px-5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-1.5"
            >
              <span>30일 패스 (매일 코치 + 무제한 9,900원) →</span>
            </button>
            */}

            <Link
              href={`/${locale}#products`}
              className="text-xs font-semibold text-[#8A8291] hover:text-ink py-1.5 transition-colors text-center"
            >
              상품 전체 보기 →
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

      {/* 2-A. Sticky Bottom CTA (미결제 시 뷰포트 하단 고정) */}
      {isLocked && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#FFD9E0] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-3 px-4">
          <div className="max-w-md md:max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="flex flex-col text-left">
              <span className="text-[10px] sm:text-xs font-bold text-[#8A8291] flex items-center gap-1">
                <Lock className="w-3 h-3 text-coral" />
                {year} 총운 전체 열기
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-sm sm:text-base font-black text-coral">{annualPrice}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenCheckout("SINGLE")}
              disabled={isProcessingPayment}
              className="bg-coral hover:bg-[#ff4766] active:scale-[0.96] text-white px-5 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm shadow-[0_4px_12px_rgba(255,92,119,0.3)] transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>지금 열기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Guest Checkout Modal */}
      <GuestCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title={`${year} 총운 리포트 열람`}
        orderName={annualProduct?.name || `콩닥 ${year} 신년 총운 리포트`}
        priceLabel={annualPrice}
        initialName={session?.user?.name || ""}
        initialEmail={session?.user?.email || ""}
        initialPhone=""
        isLoading={isProcessingPayment}
        onSubmit={async (buyer: BuyerInfo) => {
          try {
            setIsProcessingPayment(true);
            const res = await requestPortOnePayment({
              productId: `annual_${year}`,
              buyer,
              locale,
            });
            if (res.ok) {
              fetchFortune();
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "결제 진행 중 오류가 발생했습니다.";
            alert(msg);
          } finally {
            setIsProcessingPayment(false);
            setCheckoutModalOpen(false);
          }
        }}
      />
      {/* InApp Browser Manual Escape Modal */}
      <InAppBrowserModal isOpen={inAppOpen} onClose={() => setInAppOpen(false)} />
    </div>
  );
}
