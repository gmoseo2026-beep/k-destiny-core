"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/gtag";

interface IljuCheckerProps {
  locale: string;
  source: string;
}

export default function IljuChecker({ locale, source }: IljuCheckerProps) {
  const router = useRouter();
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const maxDays =
    year && month ? new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate() : 31;
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!year || !month || !day) {
      setErrorMsg("태어난 연도·월·일을 모두 선택해 주세요.");
      return;
    }

    const dob = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setIsLoading(true);
    try {
      const res = await fetch("/api/ilju/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dob }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || typeof json?.slug !== "string") {
        setErrorMsg(json?.error || "일주를 확인하지 못했어요. 날짜를 다시 확인해 주세요.");
        setIsLoading(false);
        return;
      }

      // [PII 보호] GA 이벤트와 이동 주소 어디에도 생년월일(dob)을 넣지 않는다
      trackEvent("ilju_check", { ilju: json.slug, source });
      router.push(`/${locale}/ilju/${encodeURIComponent(json.slug)}`);
    } catch {
      setErrorMsg("일주 확인 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
      setIsLoading(false);
    }
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
      <p className="mt-1 text-xs leading-relaxed text-text-2">
        양력 생년월일을 넣으면 내 일주 연애 성향 페이지로 바로 이동해요. 입력한 생년월일은 저장되지 않아요.
      </p>

      <form onSubmit={handleSubmit} className="mt-3.5 flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <select
            aria-label="출생 연도"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink focus:border-coral focus:outline-none"
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
            onChange={(e) => setMonth(e.target.value)}
            className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink focus:border-coral focus:outline-none"
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
            onChange={(e) => setDay(e.target.value)}
            className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink focus:border-coral focus:outline-none"
          >
            <option value="">일</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {d}일
              </option>
            ))}
          </select>
        </div>

        {errorMsg && (
          <p className="text-xs font-semibold text-coral">{errorMsg}</p>
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
