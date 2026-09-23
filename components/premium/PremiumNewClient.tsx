"use client";

import React, { useState, useEffect, useMemo, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronLeft, Sparkles, AlertCircle, Plus, X, Lock } from "lucide-react";
import type { CatalogItem } from "@/lib/catalog";
import { priceLabel } from "@/lib/catalog";
import { PremiumBadge } from "./PremiumBadge";
import BirthFields, { BirthValues, formatBirthInput, parseBirthInput } from "@/components/forms/BirthFields";
import { blockPaymentIfInApp, isInAppBrowser } from "@/lib/inAppBrowser";
import InAppBrowserModal from "@/components/InAppBrowserModal";
import { requestPortOnePayment, BuyerInfo } from "@/lib/payments/client";
import { savePendingInput, loadPendingInput } from "@/lib/reportHandoff";
import { trackEvent } from "@/lib/gtag";
import surnamesData from "@/data/naming/surnames.json";
import {
  NAMING_TAGS,
  type NamingTag,
  PURPOSES,
  type SelectablePurpose,
  todayKST,
} from "@/lib/validation/inputs";
import type { Daeun2027Teaser, NamingTeaser, DateSelectionTeaser } from "@/lib/premium/teasers";

const GuestCheckoutModal = dynamic(() => import("@/components/GuestCheckoutModal"), { ssr: false });

interface PremiumNewClientProps {
  locale: string;
  product: CatalogItem;
  initialProfile?: {
    name?: string | null;
    birthDate?: string | null;
    birthTime?: string | null;
    gender?: string | null;
  } | null;
  sessionUser?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

const PURPOSE_LABELS: Record<SelectablePurpose, string> = {
  WEDDING: "결혼",
  MOVING: "이사",
  OPENING: "개업",
  CONTRACT: "계약",
};

const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export function PremiumNewClient({
  locale,
  product,
  initialProfile,
  sessionUser,
}: PremiumNewClientProps) {
  const router = useRouter();
  const surnameListId = useId();
  const is2027 = product.id === "premium_2027_daeun";
  const isNaming = product.id === "premium_naming";
  const isDates = product.id === "premium_date_selection";

  // In-app browser detection
  const [isInApp, setIsInApp] = useState(false);
  const [inAppOpen, setInAppOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setIsInApp(isInAppBrowser()));
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 1. Form States
  // ─────────────────────────────────────────────────────────────

  // Case A: 2027 Person
  const initDob = initialProfile?.birthDate?.split("-") || ["", "", ""];
  const [personValues, setPersonValues] = useState<BirthValues>({
    name: initialProfile?.name || "",
    year: initDob[0] || "",
    month: initDob[1] ? String(parseInt(initDob[1], 10)) : "",
    day: initDob[2] ? String(parseInt(initDob[2], 10)) : "",
    gender: (initialProfile?.gender as "F" | "M") || "F",
    ampm: initialProfile?.birthTime ? (parseInt(initialProfile.birthTime.split(":")[0], 10) >= 12 ? "PM" : "AM") : "",
    hour: initialProfile?.birthTime ? String(parseInt(initialProfile.birthTime.split(":")[0], 10) % 12 || 12) : "1",
    min: initialProfile?.birthTime ? initialProfile.birthTime.split(":")[1] || "00" : "00",
  });

  // Case B: Naming
  const [surname, setSurname] = useState("김");
  const [surnameHanja, setSurnameHanja] = useState("金");
  const [namingGender, setNamingGender] = useState<"M" | "F">("M");
  const [namingDobYear, setNamingDobYear] = useState("2026");
  const [namingDobMonth, setNamingDobMonth] = useState("5");
  const [namingDobDay, setNamingDobDay] = useState("10");
  const [hasNamingTime, setHasNamingTime] = useState(true);
  const [namingAmpm, setNamingAmpm] = useState("AM");
  const [namingHour, setNamingHour] = useState("9");
  const [namingMin, setNamingMin] = useState("30");
  const [hasDollim, setHasDollim] = useState(false);
  const [dollimSyllable, setDollimSyllable] = useState("");
  const [dollimPosition, setDollimPosition] = useState<1 | 2>(1);
  const [dollimHanja, setDollimHanja] = useState("");
  const [selectedTags, setSelectedTags] = useState<NamingTag[]>(["지혜", "밝음"]);
  const [avoidInput, setAvoidInput] = useState("");
  const [avoidSyllables, setAvoidSyllables] = useState<string[]>([]);

  // Surnames table lookup
  const availableHanjas = useMemo(() => {
    const list = (surnamesData as Record<string, Array<{ hanja: string; strokes: number }>>)[surname];
    return list || [];
  }, [surname]);

  useEffect(() => {
    if (availableHanjas.length > 0 && !availableHanjas.some((h) => h.hanja === surnameHanja)) {
      queueMicrotask(() => setSurnameHanja(availableHanjas[0].hanja));
    }
  }, [availableHanjas, surnameHanja]);

  // Case C: Date Selection
  const today = useMemo(() => todayKST(), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, [today]);

  const defaultEndStr = useMemo(() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setDate(d.getDate() + 60);
    return d.toISOString().split("T")[0];
  }, [today]);

  const [purpose, setPurpose] = useState<SelectablePurpose>("WEDDING");
  const [startDate, setStartDate] = useState(tomorrowStr);
  const [endDate, setEndDate] = useState(defaultEndStr);
  const [datePerson1, setDatePerson1] = useState<BirthValues>({
    name: "첫 번째 분",
    year: "1994",
    month: "6",
    day: "15",
    gender: "M",
    ampm: "AM",
    hour: "10",
    min: "00",
  });
  const [datePerson2, setDatePerson2] = useState<BirthValues>({
    name: "두 번째 분",
    year: "1996",
    month: "9",
    day: "20",
    gender: "F",
    ampm: "PM",
    hour: "2",
    min: "00",
  });
  const [includePerson2, setIncludePerson2] = useState(true);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([5, 6, 0]); // 금, 토, 일 기본
  const [excludeDateInput, setExcludeDateInput] = useState("");
  const [excludeDates, setExcludeDates] = useState<string[]>([]);

  // ─────────────────────────────────────────────────────────────
  // 2. Pending Input Restoration (e.g. after login redirect)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const pending = loadPendingInput(product.id);
    if (!pending || typeof pending !== "object") return;
    const p = pending as Record<string, unknown>;

    if (is2027 && p.dob) {
      const restored = parseBirthInput(p as { name?: string | null; dob?: string | null; time?: string | null; gender?: string | null });
      if (restored.year && restored.month && restored.day) {
        queueMicrotask(() => setPersonValues(restored));
      }
    } else if (isNaming && p.surnameHangul) {
      queueMicrotask(() => {
        setSurname(String(p.surnameHangul));
        setSurnameHanja(String(p.surnameHanja));
        setNamingGender((p.gender as "M" | "F") || "M");
        if (typeof p.dob === "string") {
          const parts = p.dob.split("-");
          if (parts[0]) setNamingDobYear(parts[0]);
          if (parts[1]) setNamingDobMonth(String(parseInt(parts[1], 10)));
          if (parts[2]) setNamingDobDay(String(parseInt(parts[2], 10)));
        }
        if (p.dollim && typeof p.dollim === "object") {
          const d = p.dollim as { syllable: string; position: 1 | 2; hanja: string | null };
          setHasDollim(true);
          setDollimSyllable(d.syllable || "");
          setDollimPosition(d.position || 1);
          setDollimHanja(d.hanja || "");
        }
        if (Array.isArray(p.tags)) {
          setSelectedTags(p.tags as NamingTag[]);
        }
        if (Array.isArray(p.avoidSyllables)) {
          setAvoidSyllables(p.avoidSyllables as string[]);
        }
      });
    } else if (isDates && p.purpose) {
      queueMicrotask(() => {
        setPurpose(p.purpose as SelectablePurpose);
        if (typeof p.start === "string") setStartDate(p.start);
        if (typeof p.end === "string") setEndDate(p.end);
        if (Array.isArray(p.weekdays)) setSelectedWeekdays(p.weekdays as number[]);
        if (Array.isArray(p.excludeDates)) setExcludeDates(p.excludeDates as string[]);
      });
    }
  }, [product.id, is2027, isNaming, isDates]);

  // ─────────────────────────────────────────────────────────────
  // 3. Teaser Calculation & State
  // ─────────────────────────────────────────────────────────────
  const [isLoadingTeaser, setIsLoadingTeaser] = useState(false);
  const [teaserError, setTeaserError] = useState<string | null>(null);
  const [teaser2027, setTeaser2027] = useState<Daeun2027Teaser | null>(null);
  const [teaserNaming, setTeaserNaming] = useState<NamingTeaser | null>(null);
  const [teaserDates, setTeaserDates] = useState<DateSelectionTeaser | null>(null);

  // Payload builder
  const getFormattedPayload = (): unknown | null => {
    if (is2027) {
      if (!personValues.year || !personValues.month || !personValues.day) return null;
      return formatBirthInput(personValues);
    }
    if (isNaming) {
      if (!surname || !surnameHanja || !namingDobYear || !namingDobMonth || !namingDobDay) return null;
      const mStr = namingDobMonth.padStart(2, "0");
      const dStr = namingDobDay.padStart(2, "0");
      const dob = `${namingDobYear}-${mStr}-${dStr}`;
      let time: string | null = null;
      if (hasNamingTime && namingAmpm) {
        let h = parseInt(namingHour, 10) || 0;
        if (namingAmpm === "PM" && h < 12) h += 12;
        if (namingAmpm === "AM" && h === 12) h = 0;
        time = `${String(h).padStart(2, "0")}:${namingMin.padStart(2, "0")}`;
      }
      const dollim = hasDollim && dollimSyllable.trim().length === 1
        ? {
            syllable: dollimSyllable.trim(),
            position: dollimPosition,
            hanja: dollimHanja.trim() || null,
          }
        : null;

      return {
        surnameHangul: surname.trim(),
        surnameHanja: surnameHanja.trim(),
        gender: namingGender,
        dob,
        time,
        dollim,
        tags: selectedTags,
        avoidSyllables,
      };
    }
    if (isDates) {
      if (!startDate || !endDate) return null;
      const p1 = formatBirthInput(datePerson1);
      const people = [p1];
      if (purpose === "WEDDING" || includePerson2) {
        people.push(formatBirthInput(datePerson2));
      }
      return {
        purpose,
        start: startDate,
        end: endDate,
        people,
        weekdays: selectedWeekdays,
        excludeDates,
      };
    }
    return null;
  };

  const handleComputeTeaser = async () => {
    const payload = getFormattedPayload();
    if (!payload) {
      setTeaserError("필수 항목을 모두 입력해 주세요.");
      return;
    }
    setTeaserError(null);
    setIsLoadingTeaser(true);

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogId: product.id,
          kind: "TEASER",
          input: payload,
          locale,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "맛보기 정보를 불러오지 못했습니다.");
      }

      if (is2027) {
        setTeaser2027(json.teaser as Daeun2027Teaser);
      } else if (isNaming) {
        setTeaserNaming(json.teaser as NamingTeaser);
      } else if (isDates) {
        setTeaserDates(json.teaser as DateSelectionTeaser);
      }

      trackEvent("teaser_created", {
        productId: product.id,
        tier: "premium",
      });
    } catch (err: unknown) {
      setTeaserError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setIsLoadingTeaser(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. Payment Flow
  // ─────────────────────────────────────────────────────────────
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleOpenCheckout = () => {
    if (blockPaymentIfInApp(() => setInAppOpen(true))) return;

    const payload = getFormattedPayload();
    if (!payload) {
      alert("입력 정보를 완성한 후 다시 시도해 주세요.");
      return;
    }

    // Date selection insufficient guard
    if (isDates && teaserDates?.insufficient) {
      alert("조건에 맞는 길일이 부족합니다. 기간을 넓히거나 요일 선택을 조정한 후 다시 시도해 주세요.");
      return;
    }

    // Always require login for premium products
    if (!sessionUser?.id) {
      savePendingInput(product.id, payload);
      alert("프리미엄 리포트는 구매 후 1년간 보관함에서 언제든 열람하실 수 있도록 회원 로그인이 필요합니다.\n로그인 화면으로 이동합니다.");
      const currentPath = `/${locale}/premium/${product.id}/new`;
      router.push(`/${locale}/login?callbackUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    savePendingInput(product.id, payload);
    trackEvent("view_paywall", {
      productId: product.id,
      tier: "premium",
      amountLabel: priceLabel(product),
    });
    setCheckoutModalOpen(true);
  };

  return (
    <div className="w-full max-w-lg mx-auto pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/${locale}/products/${product.id}`}
          className="flex items-center gap-1.5 text-xs text-[#B9AEC4] hover:text-[#F6F1EA] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>상품 소개로</span>
        </Link>
        <PremiumBadge text="PREMIUM" />
      </div>

      <div className="text-center mb-8">
        <h1 className="font-serif-kr text-2xl sm:text-3xl font-bold text-[#F6F1EA] mb-2">
          {product.name}
        </h1>
        <p className="text-xs sm:text-sm text-[#F3E3BF]">
          {is2027
            ? "정확한 10년 대운과 2027년 운세를 읽기 위한 기본 정보입니다"
            : isNaming
            ? "아이의 타고난 사주와 조화를 이루는 최고의 이름을 찾습니다"
            : "인생의 큰일에 하늘과 땅의 복이 닿는 최적의 날을 계산합니다"}
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-[#1E1726] border border-[#3A2E45] rounded-3xl p-6 sm:p-7 shadow-xl mb-6">
        {/* CASE A: 2027 Person */}
        {is2027 && (
          <div className="space-y-4">
            <div className="bg-[#14101A] p-4 rounded-2xl border border-[#3A2E45]/80">
              <BirthFields
                values={personValues}
                onChange={(patch) => setPersonValues((prev) => ({ ...prev, ...patch }))}
                showName={true}
              />
            </div>
          </div>
        )}

        {/* CASE B: Naming */}
        {isNaming && (
          <div className="space-y-5 text-left">
            {/* Surname & Hanja */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#B9AEC4] mb-1.5">
                  성씨 (한글) <span className="text-[#D9B26A]">*</span>
                </label>
                <input
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value.trim())}
                  list={surnameListId}
                  placeholder="예: 김"
                  className="w-full bg-[#14101A] border border-[#3A2E45] rounded-xl px-3.5 py-3 text-sm text-[#F6F1EA] focus:outline-none focus:border-[#D9B26A]"
                />
                <datalist id={surnameListId}>
                  {Object.keys(surnamesData).slice(0, 50).map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#B9AEC4] mb-1.5">
                  성씨 한자 <span className="text-[#D9B26A]">*</span>
                </label>
                <select
                  value={surnameHanja}
                  onChange={(e) => setSurnameHanja(e.target.value)}
                  className="w-full bg-[#14101A] border border-[#3A2E45] rounded-xl px-3 py-3 text-sm text-[#F6F1EA] focus:outline-none focus:border-[#D9B26A]"
                >
                  {availableHanjas.length > 0 ? (
                    availableHanjas.map((h) => (
                      <option key={h.hanja} value={h.hanja}>
                        {h.hanja} ({h.strokes}획)
                      </option>
                    ))
                  ) : (
                    <option value={surnameHanja}>{surnameHanja || "직접 입력"}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-[#B9AEC4] mb-1.5">
                아이 성별 <span className="text-[#D9B26A]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNamingGender("M")}
                  className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                    namingGender === "M"
                      ? "bg-[#D9B26A]/20 border-[#D9B26A] text-[#F3E3BF]"
                      : "bg-[#14101A] border-[#3A2E45] text-[#B9AEC4] hover:text-[#F6F1EA]"
                  }`}
                >
                  남아 (아들)
                </button>
                <button
                  type="button"
                  onClick={() => setNamingGender("F")}
                  className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                    namingGender === "F"
                      ? "bg-[#D9B26A]/20 border-[#D9B26A] text-[#F3E3BF]"
                      : "bg-[#14101A] border-[#3A2E45] text-[#B9AEC4] hover:text-[#F6F1EA]"
                  }`}
                >
                  여아 (딸)
                </button>
              </div>
            </div>

            {/* Birth Date */}
            <div>
              <label className="block text-xs font-semibold text-[#B9AEC4] mb-1.5">
                출생일 (예정일) <span className="text-[#D9B26A]">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={namingDobYear}
                  onChange={(e) => setNamingDobYear(e.target.value)}
                  placeholder="년(2026)"
                  className="bg-[#14101A] border border-[#3A2E45] rounded-xl px-3 py-2.5 text-sm text-[#F6F1EA] text-center focus:outline-none focus:border-[#D9B26A]"
                />
                <input
                  type="number"
                  value={namingDobMonth}
                  onChange={(e) => setNamingDobMonth(e.target.value)}
                  placeholder="월"
                  min="1"
                  max="12"
                  className="bg-[#14101A] border border-[#3A2E45] rounded-xl px-3 py-2.5 text-sm text-[#F6F1EA] text-center focus:outline-none focus:border-[#D9B26A]"
                />
                <input
                  type="number"
                  value={namingDobDay}
                  onChange={(e) => setNamingDobDay(e.target.value)}
                  placeholder="일"
                  min="1"
                  max="31"
                  className="bg-[#14101A] border border-[#3A2E45] rounded-xl px-3 py-2.5 text-sm text-[#F6F1EA] text-center focus:outline-none focus:border-[#D9B26A]"
                />
              </div>
            </div>

            {/* Birth Time (Optional) */}
            <div className="bg-[#14101A] p-3.5 rounded-2xl border border-[#3A2E45]/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#B9AEC4]">태어난 시간</span>
                <button
                  type="button"
                  onClick={() => setHasNamingTime(!hasNamingTime)}
                  className="text-xs text-[#D9B26A] underline"
                >
                  {hasNamingTime ? "시간 모름" : "시간 입력하기"}
                </button>
              </div>
              {hasNamingTime ? (
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={namingAmpm}
                    onChange={(e) => setNamingAmpm(e.target.value)}
                    className="bg-[#1E1726] border border-[#3A2E45] rounded-xl px-2 py-2 text-xs text-[#F6F1EA]"
                  >
                    <option value="AM">오전</option>
                    <option value="PM">오후</option>
                  </select>
                  <select
                    value={namingHour}
                    onChange={(e) => setNamingHour(e.target.value)}
                    className="bg-[#1E1726] border border-[#3A2E45] rounded-xl px-2 py-2 text-xs text-[#F6F1EA]"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={String(h)}>{h}시</option>
                    ))}
                  </select>
                  <select
                    value={namingMin}
                    onChange={(e) => setNamingMin(e.target.value)}
                    className="bg-[#1E1726] border border-[#3A2E45] rounded-xl px-2 py-2 text-xs text-[#F6F1EA]"
                  >
                    {["00", "15", "30", "45"].map((m) => (
                      <option key={m} value={m}>{m}분</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-[#B9AEC4]">출생 시간을 몰라도 삼주를 기반으로 정밀 작명됩니다.</p>
              )}
            </div>

            {/* Dollim (Optional) */}
            <div className="bg-[#14101A] p-3.5 rounded-2xl border border-[#3A2E45]/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#B9AEC4]">돌림자 (선택)</span>
                <button
                  type="button"
                  onClick={() => setHasDollim(!hasDollim)}
                  className="text-xs text-[#D9B26A] underline"
                >
                  {hasDollim ? "돌림자 해제" : "+ 돌림자 지정"}
                </button>
              </div>
              {hasDollim && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <input
                    type="text"
                    maxLength={1}
                    value={dollimSyllable}
                    onChange={(e) => setDollimSyllable(e.target.value)}
                    placeholder="돌림자(음절)"
                    className="bg-[#1E1726] border border-[#3A2E45] rounded-xl px-2 py-2 text-xs text-center text-[#F6F1EA]"
                  />
                  <select
                    value={dollimPosition}
                    onChange={(e) => setDollimPosition(Number(e.target.value) as 1 | 2)}
                    className="bg-[#1E1726] border border-[#3A2E45] rounded-xl px-2 py-2 text-xs text-[#F6F1EA]"
                  >
                    <option value={1}>첫째 글자</option>
                    <option value={2}>둘째 글자</option>
                  </select>
                  <input
                    type="text"
                    maxLength={1}
                    value={dollimHanja}
                    onChange={(e) => setDollimHanja(e.target.value)}
                    placeholder="한자(선택)"
                    className="bg-[#1E1726] border border-[#3A2E45] rounded-xl px-2 py-2 text-xs text-center text-[#F6F1EA]"
                  />
                </div>
              )}
            </div>

            {/* Feeling Tags (Max 3) */}
            <div>
              <label className="block text-xs font-semibold text-[#B9AEC4] mb-1.5">
                바라는 아이의 느낌 (최대 3개)
              </label>
              <div className="flex flex-wrap gap-2">
                {NAMING_TAGS.map((t) => {
                  const active = selectedTags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        if (active) {
                          setSelectedTags(selectedTags.filter((x) => x !== t));
                        } else if (selectedTags.length < 3) {
                          setSelectedTags([...selectedTags, t]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        active
                          ? "bg-[#D9B26A]/20 border-[#D9B26A] text-[#F3E3BF]"
                          : "bg-[#14101A] border-[#3A2E45] text-[#B9AEC4]"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Avoid Syllables (Max 5) */}
            <div>
              <label className="block text-xs font-semibold text-[#B9AEC4] mb-1.5">
                피하고 싶은 음절 (최대 5개)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  maxLength={1}
                  value={avoidInput}
                  onChange={(e) => setAvoidInput(e.target.value.trim())}
                  placeholder="예: 민"
                  className="bg-[#14101A] border border-[#3A2E45] rounded-xl px-3 py-2 text-xs text-[#F6F1EA] w-24 text-center"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (avoidInput && avoidSyllables.length < 5 && !avoidSyllables.includes(avoidInput)) {
                      setAvoidSyllables([...avoidSyllables, avoidInput]);
                      setAvoidInput("");
                    }
                  }}
                  className="bg-[#3A2E45] hover:bg-[#D9B26A]/30 text-xs px-3 py-2 rounded-xl text-[#F6F1EA]"
                >
                  추가
                </button>
              </div>
              {avoidSyllables.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {avoidSyllables.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 bg-[#14101A] border border-[#3A2E45] px-2.5 py-1 rounded-md text-xs text-[#B9AEC4]"
                    >
                      {s}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-rose-400"
                        onClick={() => setAvoidSyllables(avoidSyllables.filter((x) => x !== s))}
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CASE C: Date Selection */}
        {isDates && (
          <div className="space-y-5 text-left">
            {/* Purpose */}
            <div>
              <label className="block text-xs font-semibold text-[#B9AEC4] mb-1.5">
                택일 목적 <span className="text-[#D9B26A]">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PURPOSES.map((p) => {
                  const active = purpose === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPurpose(p)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        active
                          ? "bg-[#D9B26A]/20 border-[#D9B26A] text-[#F3E3BF]"
                          : "bg-[#14101A] border-[#3A2E45] text-[#B9AEC4]"
                      }`}
                    >
                      {PURPOSE_LABELS[p]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-xs font-semibold text-[#B9AEC4] mb-1.5">
                검색 기간 (7일 ~ 180일 이내) <span className="text-[#D9B26A]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[11px] text-[#B9AEC4] mb-1">시작일</span>
                  <input
                    type="date"
                    value={startDate}
                    min={tomorrowStr}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#14101A] border border-[#3A2E45] rounded-xl px-3 py-2 text-xs text-[#F6F1EA]"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-[#B9AEC4] mb-1">종료일</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#14101A] border border-[#3A2E45] rounded-xl px-3 py-2 text-xs text-[#F6F1EA]"
                  />
                </div>
              </div>
            </div>

            {/* People (1 or 2) */}
            <div className="space-y-4">
              <div className="bg-[#14101A] p-4 rounded-2xl border border-[#3A2E45]/80">
                <span className="block text-xs font-bold text-[#F3E3BF] mb-2">
                  {purpose === "WEDDING" ? "신랑 사주 정보" : "주요 대상자 사주 정보"}
                </span>
                <BirthFields
                  values={datePerson1}
                  onChange={(patch) => setDatePerson1((prev) => ({ ...prev, ...patch }))}
                  showName={false}
                />
              </div>

              {(purpose === "WEDDING" || includePerson2) && (
                <div className="bg-[#14101A] p-4 rounded-2xl border border-[#3A2E45]/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#F3E3BF]">
                      {purpose === "WEDDING" ? "신부 사주 정보 (필수)" : "동반 대상자 사주 정보"}
                    </span>
                    {purpose !== "WEDDING" && (
                      <button
                        type="button"
                        onClick={() => setIncludePerson2(false)}
                        className="text-xs text-rose-400"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <BirthFields
                    values={datePerson2}
                    onChange={(patch) => setDatePerson2((prev) => ({ ...prev, ...patch }))}
                    showName={false}
                  />
                </div>
              )}

              {purpose !== "WEDDING" && !includePerson2 && (
                <button
                  type="button"
                  onClick={() => setIncludePerson2(true)}
                  className="w-full py-2.5 border border-dashed border-[#3A2E45] hover:border-[#D9B26A]/50 rounded-2xl text-xs text-[#B9AEC4] flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>동반자 1명 추가 (이사·개업 동반자 궁합 고려)</span>
                </button>
              )}
            </div>

            {/* Weekdays */}
            <div>
              <label className="block text-xs font-semibold text-[#B9AEC4] mb-1.5">
                선호 요일 선택 (전체 미선택 시 모든 요일 탐색)
              </label>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_NAMES.map((name, idx) => {
                  const active = selectedWeekdays.includes(idx);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        if (active) {
                          setSelectedWeekdays(selectedWeekdays.filter((w) => w !== idx));
                        } else {
                          setSelectedWeekdays([...selectedWeekdays, idx]);
                        }
                      }}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        active
                          ? "bg-[#D9B26A]/20 border-[#D9B26A] text-[#F3E3BF]"
                          : "bg-[#14101A] border-[#3A2E45] text-[#B9AEC4]"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exclude Dates */}
            <div>
              <label className="block text-xs font-semibold text-[#B9AEC4] mb-1.5">
                제외할 특정 날짜 (최대 20개)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="date"
                  value={excludeDateInput}
                  onChange={(e) => setExcludeDateInput(e.target.value)}
                  className="bg-[#14101A] border border-[#3A2E45] rounded-xl px-3 py-2 text-xs text-[#F6F1EA] flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (excludeDateInput && excludeDates.length < 20 && !excludeDates.includes(excludeDateInput)) {
                      setExcludeDates([...excludeDates, excludeDateInput]);
                      setExcludeDateInput("");
                    }
                  }}
                  className="bg-[#3A2E45] text-xs px-3 py-2 rounded-xl text-[#F6F1EA]"
                >
                  제외 추가
                </button>
              </div>
              {excludeDates.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {excludeDates.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1 bg-[#14101A] border border-[#3A2E45] px-2 py-0.5 rounded text-[11px] text-[#B9AEC4]"
                    >
                      {d}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-rose-400"
                        onClick={() => setExcludeDates(excludeDates.filter((x) => x !== d))}
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compute Teaser Button */}
        <div className="mt-6 pt-4 border-t border-[#3A2E45]">
          <button
            type="button"
            onClick={handleComputeTeaser}
            disabled={isLoadingTeaser}
            className="w-full py-3.5 bg-gradient-to-r from-[#D9B26A]/20 via-[#D9B26A]/30 to-[#D9B26A]/20 hover:from-[#D9B26A]/30 hover:to-[#D9B26A]/30 border border-[#D9B26A]/50 rounded-2xl font-bold text-sm text-[#F3E3BF] shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#D9B26A]" />
            <span>{isLoadingTeaser ? "사주 기운 분석 중..." : "기운 분석 및 무료 맛보기 확인"}</span>
          </button>
          {teaserError && (
            <p className="text-xs text-rose-400 mt-2 text-center">{teaserError}</p>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. Teaser Results Box */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(teaser2027 || teaserNaming || teaserDates) && (
        <div className="bg-[#1E1726] border border-[#D9B26A]/40 rounded-3xl p-6 shadow-xl mb-6 text-left animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#D9B26A] animate-ping" />
            <h3 className="text-xs font-bold text-[#F3E3BF] tracking-wider uppercase">
              기운 분석 결과 · 맛보기
            </h3>
          </div>

          {/* 2027 Teaser */}
          {teaser2027 && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between border-b border-[#3A2E45] pb-3">
                <span className="text-xs text-[#B9AEC4]">2027 정미년 기운 지수</span>
                <span className="text-2xl font-black text-[#D9B26A]">{teaser2027.yearScore}점</span>
              </div>
              <div className="text-sm">
                <span className="text-xs text-[#B9AEC4] block mb-1">현재 10년의 테마</span>
                <p className="font-serif-kr text-[#F6F1EA] font-semibold">{teaser2027.cycleLabel}</p>
              </div>
              <div className="bg-[#14101A] p-3 rounded-xl border border-[#3A2E45] text-xs text-[#B9AEC4] flex items-center justify-between">
                <span>{teaser2027.bestMonthMasked}</span>
                <span className="text-[#D9B26A] text-[11px] font-semibold">🔒 전체 리포트에서 공개</span>
              </div>
            </div>
          )}

          {/* Naming Teaser */}
          {teaserNaming && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-xs text-[#B9AEC4] block mb-1">아이에게 필요한 오행 기운</span>
                <p className="font-serif-kr text-[#F6F1EA] font-semibold">{teaserNaming.neededElementDescription}</p>
              </div>
              <div className="bg-[#14101A] p-3.5 rounded-xl border border-[#3A2E45] text-xs flex items-center justify-between">
                <span className="text-[#F6F1EA]">엄선된 정통 성명학 후보작</span>
                <span className="font-bold text-[#D9B26A]">{teaserNaming.candidateCount}개 후보 준비 완료</span>
              </div>
            </div>
          )}

          {/* Dates Teaser */}
          {teaserDates && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between border-b border-[#3A2E45] pb-3">
                <span className="text-xs text-[#B9AEC4]">조건에 부합하는 정통 길일</span>
                <span className="text-2xl font-black text-[#D9B26A]">총 {teaserDates.totalFound}일</span>
              </div>

              {teaserDates.insufficient ? (
                <div className="bg-rose-950/40 border border-rose-500/40 p-3.5 rounded-2xl text-xs text-rose-200">
                  <div className="flex items-center gap-1.5 font-bold mb-1 text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>추천 길일 부족 (3개 미만)</span>
                  </div>
                  <p className="leading-relaxed">
                    선택하신 기간 또는 요일 조건 내에서 흉살을 피하고 복이 닿는 길일이 부족합니다.
                    검색 기간을 더 넓히거나 선호 요일 범위를 늘려 다시 분석해 주세요.
                  </p>
                </div>
              ) : (
                <div className="bg-[#14101A] p-3 rounded-xl border border-[#3A2E45] text-xs text-[#B9AEC4]">
                  <span className="font-semibold text-[#F3E3BF] block mb-1">월별 길일 분포</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(teaserDates.monthlyDistribution).map(([ym, cnt]) => (
                      <span key={ym} className="bg-[#1E1726] px-2 py-0.5 rounded border border-[#3A2E45]">
                        {ym}: {cnt}일
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. In-App Browser Warning Banner */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isInApp && (
        <div
          onClick={() => blockPaymentIfInApp(() => setInAppOpen(true))}
          className="w-full mb-4 bg-[#D9B26A]/10 hover:bg-[#D9B26A]/15 border border-[#D9B26A]/30 rounded-2xl p-3.5 text-xs text-[#F3E3BF] flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-[0.98]"
        >
          <span className="font-semibold text-left">
            🔒 원활한 카드 결제를 위해 메뉴에서 <strong>‘다른 브라우저로 열기’</strong>를 눌러주세요.
          </span>
          <span className="text-[11px] font-bold text-[#D9B26A] shrink-0 underline whitespace-nowrap">
            외부 브라우저
          </span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. Action / Checkout CTA */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleOpenCheckout}
          disabled={isDates && teaserDates?.insufficient}
          className={`w-full py-4 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
            isDates && teaserDates?.insufficient
              ? "bg-[#3A2E45] text-[#B9AEC4] cursor-not-allowed opacity-50"
              : "bg-gradient-to-r from-[#F3E3BF] via-[#D9B26A] to-[#A8823C] text-[#14101A] hover:opacity-95"
          }`}
        >
          <Lock className="w-4 h-4 text-[#14101A]" />
          <span>프리미엄 리포트 열람하기 · {priceLabel(product)}</span>
        </button>
        <p className="text-[11px] text-[#B9AEC4] text-center">
          단건 구매 · 구매 후 1년간 언제든 열람 및 PDF 저장이 가능합니다.
        </p>
      </div>

      {/* In-app Browser Manual Guidance Modal */}
      <InAppBrowserModal isOpen={inAppOpen} onClose={() => setInAppOpen(false)} />

      {/* Checkout Modal */}
      <GuestCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title={`${product.name} 결제`}
        orderName={product.name}
        priceLabel={priceLabel(product)}
        productId={product.id}
        tier="premium"
        initialName={sessionUser?.name || ""}
        initialEmail={sessionUser?.email || ""}
        initialPhone=""
        isLoading={isProcessingPayment}
        onSubmit={async (buyer: BuyerInfo) => {
          try {
            setIsProcessingPayment(true);
            const payload = getFormattedPayload();
            savePendingInput(product.id, payload);

            const res = await requestPortOnePayment({
              productId: product.id,
              buyer,
              locale,
            });

            if (res.ok) {
              trackEvent("purchase_confirmed", {
                productId: product.id,
                tier: "premium",
                amount: res.amount,
              });
              router.push(`/${locale}/report/new?c=${product.id}`);
            }
          } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "결제 진행 중 오류가 발생했습니다.");
          } finally {
            setIsProcessingPayment(false);
            setCheckoutModalOpen(false);
          }
        }}
      />
    </div>
  );
}
