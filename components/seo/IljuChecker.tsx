"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/gtag";
import {
  CalendarTypeToggle,
  getDaysInMonth,
  resolveRawDateToSolar,
} from "@/components/forms/BirthFields";
import { saveLastPerson } from "@/lib/reportHandoff";

export interface IljuCheckerProps {
  locale: string;
  source: string;
}

export interface SubmitIljuCheckArgs {
  year: string;
  month: string;
  day: string;
  isLunar: boolean;
  isLeapMonth: boolean;
  gender: "F" | "M" | null;
  locale: string;
  source: string;
  fetchFn?: typeof fetch;
}

export type SubmitIljuCheckResult =
  | {
      ok: true;
      slug: string;
      solarDob: string;
      redirectTo: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function submitIljuCheck({
  year,
  month,
  day,
  isLunar,
  isLeapMonth,
  gender,
  locale,
  source,
  fetchFn = fetch,
}: SubmitIljuCheckArgs): Promise<SubmitIljuCheckResult> {
  if (!year || !month || !day) {
    return { ok: false, error: "태어난 연도·월·일을 모두 선택해 주세요." };
  }
  if (gender !== "F" && gender !== "M") {
    return { ok: false, error: "성별을 선택해 주세요." };
  }

  const resolved = await resolveRawDateToSolar({
    year,
    month,
    day,
    isLunar,
    isLeapMonth,
  });
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const dob = resolved.solarDob;
  try {
    const res = await fetchFn("/api/ilju/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dob }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || typeof json?.slug !== "string") {
      return {
        ok: false,
        error: json?.error || "일주를 확인하지 못했어요. 날짜를 다시 확인해 주세요.",
      };
    }

    // 이동 직전 같은 탭(sessionStorage)에만 내 정보를 저장해 궁합 입력 시 재입력을 덜어 준다
    saveLastPerson({ name: "나", dob, time: null, gender });

    // [PII 보호] GA 이벤트와 이동 주소 어디에도 생년월일(dob)을 넣지 않는다
    trackEvent("ilju_check", {
      ilju: json.slug,
      source,
      lunar: Boolean(isLunar),
    });

    return {
      ok: true,
      slug: json.slug,
      solarDob: dob,
      redirectTo: `/${locale}/ilju/${encodeURIComponent(json.slug)}`,
    };
  } catch {
    return {
      ok: false,
      error: "일주 확인 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
}

export default function IljuChecker({ locale, source }: IljuCheckerProps) {
  const router = useRouter();
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [isLunar, setIsLunar] = useState(false);
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [gender, setGender] = useState<"F" | "M" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const maxDays = getDaysInMonth(year, month, isLunar);
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const result = await submitIljuCheck({
      year,
      month,
      day,
      isLunar,
      isLeapMonth,
      gender,
      locale,
      source,
    });

    if (!result.ok) {
      setErrorMsg(result.error);
      setIsLoading(false);
      return;
    }

    router.push(result.redirectTo);
  };

  return (
    <section
      aria-label="내 일주 확인하기"
      className="w-full rounded-2xl border border-coral/35 bg-white p-5 shadow-[0_4px_16px_rgba(255,92,119,0.12)]"
    >
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-coral" />
        <h2 className="text-base font-black text-ink">내 일주 확인하기</h2>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-text-2 break-keep">
        생년월일을 넣으면 내 일주 연애 성향 페이지로 바로 이동해요. 입력한 생년월일은 서버에 저장하지 않고, 이 창을 닫으면 지워져요
      </p>

      <form onSubmit={handleSubmit} className="mt-3.5 flex flex-col gap-3">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-text-2">
              생년월일 <span className="text-coral">*</span>
            </span>
            <CalendarTypeToggle
              isLunar={isLunar}
              isLeapMonth={isLeapMonth}
              disabled={isLoading}
              currentDay={day}
              onChange={(patch) => {
                setIsLunar(patch.isLunar);
                setIsLeapMonth(patch.isLeapMonth);
                if (patch.day !== undefined) setDay(patch.day);
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <select
              aria-label="출생 연도"
              value={year}
              disabled={isLoading}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-xl border border-white/[0.12] bg-[#140B18] p-2.5 text-sm text-[#F6EEF3] [color-scheme:dark] focus:border-coral focus:outline-none"
            >
              <option value="">연도</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              aria-label="출생 월"
              value={month}
              disabled={isLoading}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-xl border border-white/[0.12] bg-[#140B18] p-2.5 text-sm text-[#F6EEF3] [color-scheme:dark] focus:border-coral focus:outline-none"
            >
              <option value="">월</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
            <select
              aria-label="출생 일"
              value={day}
              disabled={isLoading}
              onChange={(e) => setDay(e.target.value)}
              className="w-full rounded-xl border border-white/[0.12] bg-[#140B18] p-2.5 text-sm text-[#F6EEF3] [color-scheme:dark] focus:border-coral focus:outline-none"
            >
              <option value="">일</option>
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}일
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-text-2">
            성별 <span className="text-coral">*</span>
          </span>
          <div
            role="group"
            aria-label="성별 선택"
            className="grid grid-cols-2 gap-2"
          >
            <button
              type="button"
              disabled={isLoading}
              aria-pressed={gender === "F"}
              onClick={() => {
                setGender("F");
                if (errorMsg === "성별을 선택해 주세요.") setErrorMsg(null);
              }}
              className={`rounded-xl border py-2.5 text-sm font-bold transition-all active:scale-[0.96] disabled:opacity-50 ${
                gender === "F"
                  ? "border-coral bg-coral text-white shadow-2xs"
                  : "border-white/[0.12] bg-[#140B18] text-[#B9A9BF] hover:border-coral/50 hover:text-[#F6EEF3]"
              }`}
            >
              여자
            </button>
            <button
              type="button"
              disabled={isLoading}
              aria-pressed={gender === "M"}
              onClick={() => {
                setGender("M");
                if (errorMsg === "성별을 선택해 주세요.") setErrorMsg(null);
              }}
              className={`rounded-xl border py-2.5 text-sm font-bold transition-all active:scale-[0.96] disabled:opacity-50 ${
                gender === "M"
                  ? "border-coral bg-coral text-white shadow-2xs"
                  : "border-white/[0.12] bg-[#140B18] text-[#B9A9BF] hover:border-coral/50 hover:text-[#F6EEF3]"
              }`}
            >
              남자
            </button>
          </div>
        </div>

        {errorMsg && (
          <p role="alert" className="text-xs font-semibold text-coral">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-coral px-4 py-3 text-sm font-extrabold text-white shadow-xs transition-all hover:bg-coral-deep active:scale-[0.96] disabled:opacity-60"
        >
          <span>{isLoading ? "확인하는 중…" : "내 일주 바로 보기"}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
