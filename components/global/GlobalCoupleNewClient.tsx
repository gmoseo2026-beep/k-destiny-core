"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Heart } from "lucide-react";
import KongdakMascot from "@/components/KongdakMascot";
import GlobalChrome from "@/components/global/GlobalChrome";
import type { GlobalCoupleLocale } from "@/lib/globalCoupleLocale";
import { trackEvent } from "@/lib/gtag";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface GlobalCoupleNewClientProps {
  locale: GlobalCoupleLocale;
  refToken?: string;
}

export default function GlobalCoupleNewClient({
  locale,
  refToken,
}: GlobalCoupleNewClientProps) {
  const t = useTranslations("Couple");
  const router = useRouter();

  const [nameA, setNameA] = useState("");
  const [yearA, setYearA] = useState("");
  const [monthA, setMonthA] = useState("");
  const [dayA, setDayA] = useState("");
  const [genderA, setGenderA] = useState<"F" | "M">("F");
  const [showTimeA, setShowTimeA] = useState(false);
  const [ampmA, setAmpmA] = useState("");
  const [hourA, setHourA] = useState("1");
  const [minA, setMinA] = useState("0");

  const [nameB, setNameB] = useState("");
  const [yearB, setYearB] = useState("");
  const [monthB, setMonthB] = useState("");
  const [dayB, setDayB] = useState("");
  const [genderB, setGenderB] = useState<"F" | "M">("M");
  const [showTimeB, setShowTimeB] = useState(false);
  const [ampmB, setAmpmB] = useState("");
  const [hourB, setHourB] = useState("1");
  const [minB, setMinB] = useState("0");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1930 + 1 },
    (_, i) => currentYear - i
  );
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const getDaysInMonth = (y: string, m: string) => {
    if (!y || !m) return 31;
    return new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
  };
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const formatTime24 = (ampm: string, hour: string, min: string) => {
    if (!ampm) return "";
    let h = parseInt(hour, 10);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(parseInt(min, 10)).padStart(
      2,
      "0"
    )}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!yearA || !monthA || !dayA || !yearB || !monthB || !dayB) {
      setErrorMsg(t("error_dob"));
      return;
    }

    setIsLoading(true);
    try {
      const dobA = `${yearA}-${String(monthA).padStart(2, "0")}-${String(
        dayA
      ).padStart(2, "0")}`;
      const dobB = `${yearB}-${String(monthB).padStart(2, "0")}-${String(
        dayB
      ).padStart(2, "0")}`;

      const timeA = showTimeA ? formatTime24(ampmA, hourA, minA) : "";
      const timeB = showTimeB ? formatTime24(ampmB, hourB, minB) : "";

      const res = await fetch("/api/compat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          relation: "love",
          ref: refToken || undefined,
          personA: {
            name: nameA.trim() || t("default_name_a"),
            dob: dobA,
            time: timeA,
            gender: genderA,
          },
          personB: {
            name: nameB.trim() || t("default_name_b"),
            dob: dobB,
            time: timeB,
            gender: genderB,
          },
        }),
      });

      if (!res.ok) {
        setErrorMsg(t("error_general"));
        setIsLoading(false);
        return;
      }

      const json = (await res.json()) as {
        shareToken?: string;
        score?: number;
      };
      if (!json.shareToken) {
        setErrorMsg(t("error_general"));
        setIsLoading(false);
        return;
      }

      trackEvent("compat_created", {
        relation: "love",
        score: json.score ?? 0,
        locale,
        flow: "global",
      });

      router.push(`/${locale}/couple/${json.shareToken}`);
    } catch {
      setErrorMsg(t("error_general"));
      setIsLoading(false);
    }
  };

  const renderPersonSection = (
    which: "A" | "B",
    title: string,
    placeholder: string,
    name: string,
    setName: (v: string) => void,
    year: string,
    setYear: (v: string) => void,
    month: string,
    setMonth: (v: string) => void,
    day: string,
    setDay: (v: string) => void,
    gender: "F" | "M",
    setGender: (v: "F" | "M") => void,
    showTime: boolean,
    setShowTime: (v: boolean) => void,
    ampm: string,
    setAmpm: (v: string) => void,
    hour: string,
    setHour: (v: string) => void,
    min: string,
    setMin: (v: string) => void
  ) => {
    const maxDay = getDaysInMonth(year, month);
    const days = Array.from({ length: maxDay }, (_, i) => i + 1);

    return (
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          {/* 한국어판 결과 카드와 같은 짝: A = 콩이(빨강), B = 닥이(하양) */}
          <span
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              which === "A" ? "bg-[#FFE8EE]" : "bg-[#F3E8F5]"
            }`}
          >
            <KongdakMascot size={34} expression={which === "A" ? "canon" : "canon_white"} alt="" />
          </span>
          <h2 className="text-sm font-black text-[#2B2430]">
            {title} <span aria-hidden>{which === "A" ? "💗" : "💜"}</span>
          </h2>
        </div>

        {/* Name (Optional) */}
        <div>
          <label className="block text-xs font-bold text-text-2 mb-1.5">
            {t("name_label")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholder}
            maxLength={24}
            className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-medium text-[#2B2430] placeholder:text-text-3 focus:outline-none focus:border-[#FF5C77]"
          />
        </div>

        {/* Solar Date of Birth */}
        <div>
          <label className="block text-xs font-bold text-text-2 mb-1.5">
            <span aria-hidden>🎂 </span>{t("dob_label")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              aria-label={`${title} ${t("year_placeholder")}`}
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-[#2B2430] focus:outline-none focus:border-[#FF5C77]"
            >
              <option value="">{t("year_placeholder")}</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label={`${title} ${t("month_placeholder")}`}
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-[#2B2430] focus:outline-none focus:border-[#FF5C77]"
            >
              <option value="">{t("month_placeholder")}</option>
              {months.map((m) => (
                <option key={m} value={String(m)}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              aria-label={`${title} ${t("day_placeholder")}`}
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-[#2B2430] focus:outline-none focus:border-[#FF5C77]"
            >
              <option value="">{t("day_placeholder")}</option>
              {days.map((d) => (
                <option key={d} value={String(d)}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-xs font-bold text-text-2 mb-1.5">
            {t("gender_label")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGender("F")}
              className={`py-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                gender === "F"
                  ? "bg-[#FFF0F3] border-[#FF5C77] text-[#FF5C77]"
                  : "bg-white border-line text-text-2"
              }`}
            >
              <span aria-hidden>👩 </span>{t("gender_female")}
            </button>
            <button
              type="button"
              onClick={() => setGender("M")}
              className={`py-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                gender === "M"
                  ? "bg-[#FFF0F3] border-[#FF5C77] text-[#FF5C77]"
                  : "bg-white border-line text-text-2"
              }`}
            >
              <span aria-hidden>👨 </span>{t("gender_male")}
            </button>
          </div>
        </div>

        {/* Collapsible Optional Birth Time */}
        <div className="pt-1 border-t border-line/60">
          <button
            type="button"
            onClick={() => {
              const next = !showTime;
              setShowTime(next);
              if (!next) setAmpm("");
            }}
            className="w-full flex items-center justify-between py-1 text-xs font-bold text-text-3 hover:text-[#2B2430]"
          >
            <span>
              <span aria-hidden>⏰ </span>
              {showTime ? t("time_toggle_close") : t("time_toggle_open")}
            </span>
            {showTime ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showTime && (
            <div className="mt-2.5 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={ampm}
                  onChange={(e) => setAmpm(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-2.5 py-2 text-xs font-semibold text-[#2B2430]"
                >
                  <option value="">{t("time_unknown")}</option>
                  <option value="AM">{t("time_am")}</option>
                  <option value="PM">{t("time_pm")}</option>
                </select>
                <select
                  value={hour}
                  disabled={!ampm}
                  onChange={(e) => setHour(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-2.5 py-2 text-xs font-semibold text-[#2B2430] disabled:opacity-40"
                >
                  {hours.map((h) => (
                    <option key={h} value={String(h)}>
                      {h}
                      {t("time_hour_unit")}
                    </option>
                  ))}
                </select>
                <select
                  value={min}
                  disabled={!ampm}
                  onChange={(e) => setMin(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-2.5 py-2 text-xs font-semibold text-[#2B2430] disabled:opacity-40"
                >
                  {minutes.map((m) => (
                    <option key={m} value={String(m)}>
                      {String(m).padStart(2, "0")}
                      {t("time_min_unit")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <p className="mt-2 text-[11px] text-text-3 leading-relaxed">
            {t("timezone_note")}
          </p>
        </div>
      </Card>
    );
  };

  return (
    <GlobalChrome locale={locale}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hero — 한국어판처럼 콩이·닥이 캐릭터가 먼저 반긴다 */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-[#FFD9E0] px-5 pt-5 pb-4 text-center shadow-[0_6px_20px_rgba(255,92,119,0.12)]">
          <span aria-hidden className="absolute left-4 top-4 text-lg">✨</span>
          <span aria-hidden className="absolute right-5 top-6 text-base">💕</span>
          <div className="flex justify-center">
            <KongdakMascot size={96} expression="couple" animate="bounce" priority alt="" />
          </div>
          <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full bg-[#FFE8EE] text-[11px] font-extrabold text-[#E0245A]">
            <span aria-hidden>💞</span>
            <span>K-SAJU COUPLE CHEMISTRY</span>
          </div>
          <h1 className="mt-2 text-xl font-black leading-snug text-[#2B2430] break-keep">
            {t("title")}
          </h1>
          <p className="text-xs text-text-2 mt-1.5 leading-relaxed">
            {t("saju_intro")}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-bold text-[#6A2C70]">
            <span className="rounded-full bg-[#FFF6F1] border border-[#FFE0D2] px-2.5 py-1">⏱️ {t("hero_chip_time")}</span>
            <span className="rounded-full bg-[#FFF6F1] border border-[#FFE0D2] px-2.5 py-1">🎁 {t("hero_chip_free")}</span>
            <span className="rounded-full bg-[#FFF6F1] border border-[#FFE0D2] px-2.5 py-1">🙌 {t("hero_chip_signup")}</span>
          </div>
        </div>

        {/* Person A */}
        {renderPersonSection(
          "A",
          t("person_a_title"),
          t("name_placeholder_a"),
          nameA,
          setNameA,
          yearA,
          setYearA,
          monthA,
          setMonthA,
          dayA,
          setDayA,
          genderA,
          setGenderA,
          showTimeA,
          setShowTimeA,
          ampmA,
          setAmpmA,
          hourA,
          setHourA,
          minA,
          setMinA
        )}

        {/* Person B */}
        {renderPersonSection(
          "B",
          t("person_b_title"),
          t("name_placeholder_b"),
          nameB,
          setNameB,
          yearB,
          setYearB,
          monthB,
          setMonthB,
          dayB,
          setDayB,
          genderB,
          setGenderB,
          showTimeB,
          setShowTimeB,
          ampmB,
          setAmpmB,
          hourB,
          setHourB,
          minB,
          setMinB
        )}

        {errorMsg && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-bold text-red-600 text-center">
            {errorMsg}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          isLoading={isLoading}
          className="w-full py-4 rounded-2xl text-base font-extrabold bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] text-white shadow-md flex items-center justify-center gap-2"
        >
          <Heart className="w-4 h-4 fill-current" />
          <span>{isLoading ? t("submitting_btn") : t("submit_btn")}</span>
          {!isLoading && <span aria-hidden>💞</span>}
        </Button>

        <p className="text-center text-[11px] text-text-3 pt-1">
          {t("disclaimer")}
        </p>
      </form>
    </GlobalChrome>
  );
}
