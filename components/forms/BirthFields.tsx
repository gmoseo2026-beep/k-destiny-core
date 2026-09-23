"use client";

import React from "react";

export interface BirthValues {
  name: string;
  year: string;
  month: string;
  day: string;
  gender: "F" | "M";
  ampm: string;
  hour: string;
  min: string;
}

interface BirthFieldsProps {
  values: BirthValues;
  onChange: (patch: Partial<BirthValues>) => void;
  disabled?: boolean;
  showName?: boolean;
}

export function getDaysInMonth(y: string, m: string): number {
  if (!y || !m) return 31;
  return new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
}

export function formatBirthInput(v: BirthValues): { name: string; dob: string; time: string | null; gender: "F" | "M" } {
  const mStr = v.month.padStart(2, "0");
  const dStr = v.day.padStart(2, "0");
  const dob = `${v.year}-${mStr}-${dStr}`;
  let time: string | null = null;
  if (v.ampm) {
    let h = parseInt(v.hour, 10) || 0;
    if (v.ampm === "PM" && h < 12) h += 12;
    if (v.ampm === "AM" && h === 12) h = 0;
    time = `${String(h).padStart(2, "0")}:${v.min.padStart(2, "0")}`;
  }
  return { name: v.name.trim() || "나", dob, time, gender: v.gender };
}

export function parseBirthInput(input: {
  name?: string | null;
  dob?: string | null;
  time?: string | null;
  gender?: string | null;
}): BirthValues {
  const [y = "", m = "", d = ""] = (input.dob || "").split("-");
  let ampm = "";
  let hour = "1";
  let min = "00";

  if (input.time) {
    const [hStr, mStr] = input.time.split(":");
    const h = parseInt(hStr, 10);
    if (!isNaN(h)) {
      if (h >= 12) {
        ampm = "PM";
        hour = String(h === 12 ? 12 : h - 12);
      } else {
        ampm = "AM";
        hour = String(h === 0 ? 12 : h);
      }
    }
    if (mStr) {
      min = mStr;
    }
  }

  return {
    name: input.name === "나" ? "" : (input.name || ""),
    year: y,
    month: m ? String(parseInt(m, 10)) : "",
    day: d ? String(parseInt(d, 10)) : "",
    gender: input.gender === "M" ? "M" : "F",
    ampm,
    hour,
    min,
  };
}

export default function BirthFields({
  values,
  onChange,
  disabled = false,
  showName = true,
}: BirthFieldsProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = ["00", "15", "30", "45"];

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {showName && (
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">
            이름 또는 닉네임 (선택)
          </label>
          <input
            type="text"
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="예: 김콩닥"
            disabled={disabled}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40 focus-visible:ring-2 ring-coral"
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">
            생년월일 <span className="text-coral">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={values.year}
              onChange={(e) => onChange({ year: e.target.value })}
              disabled={disabled}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40 focus-visible:ring-2 ring-coral"
            >
              <option value="">년도</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              value={values.month}
              onChange={(e) => onChange({ month: e.target.value })}
              disabled={disabled}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40 focus-visible:ring-2 ring-coral"
            >
              <option value="">월</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
            <select
              value={values.day}
              onChange={(e) => onChange({ day: e.target.value })}
              disabled={disabled}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40 focus-visible:ring-2 ring-coral"
            >
              <option value="">일</option>
              {Array.from(
                { length: getDaysInMonth(values.year, values.month) },
                (_, i) => i + 1
              ).map((d) => (
                <option key={d} value={d}>
                  {d}일
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-muted mb-1">성별</label>
            <select
              value={values.gender}
              onChange={(e) => onChange({ gender: e.target.value as "F" | "M" })}
              disabled={disabled}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40 focus-visible:ring-2 ring-coral"
            >
              <option value="F">여성</option>
              <option value="M">남성</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-muted mb-1">
              태어난 시간 (선택)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={values.ampm}
                onChange={(e) => onChange({ ampm: e.target.value })}
                disabled={disabled}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40 focus-visible:ring-2 ring-coral"
              >
                <option value="">모름</option>
                <option value="AM">오전</option>
                <option value="PM">오후</option>
              </select>
              <select
                value={values.hour}
                onChange={(e) => onChange({ hour: e.target.value })}
                disabled={disabled || !values.ampm}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40 disabled:opacity-50 focus-visible:ring-2 ring-coral"
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {h}시
                  </option>
                ))}
              </select>
              <select
                value={values.min}
                onChange={(e) => onChange({ min: e.target.value })}
                disabled={disabled || !values.ampm}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-cream/40 disabled:opacity-50 focus-visible:ring-2 ring-coral"
              >
                {minutes.map((m) => (
                  <option key={m} value={m}>
                    {m}분
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
