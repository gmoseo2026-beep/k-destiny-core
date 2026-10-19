"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Heart, Sparkles } from "lucide-react";
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
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center text-white ${
              which === "A" ? "bg-[#FF5C77]" : "bg-[#6A2C70]"
            }`}
          >
            {which}
          </span>
          <h2 className="text-sm font-black text-[#2B2430]">{title}</h2>
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
            {t("dob_label")}
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
              {t("gender_female")}
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
              {t("gender_male")}
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
        {/* Hero Intro Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] p-5 text-white text-center shadow-md">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-extrabold mb-2">
            <Sparkles className="w-3 h-3" />
            <span>K-SAJU COUPLE CHEMISTRY</span>
          </div>
          <h1 className="text-lg sm:text-xl font-black leading-snug">
            {t("title")}
          </h1>
          <p className="text-xs text-white/90 mt-1.5 leading-relaxed">
            {t("saju_intro")}
          </p>
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
        </Button>

        <p className="text-center text-[11px] text-text-3 pt-1">
          {t("disclaimer")}
        </p>
      </form>
    </GlobalChrome>
  );
}
