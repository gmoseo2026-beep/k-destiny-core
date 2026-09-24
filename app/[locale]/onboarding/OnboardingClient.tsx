"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface UserProfileData {
  name?: string | null;
  gender?: string | null;
  birthYear?: string | number | null;
  birthMonth?: string | number | null;
  birthDay?: string | number | null;
  birthTime?: string | null;
  unknownTime?: boolean | null;
  city?: string | null;
  country?: string | null;
  [key: string]: unknown;
}

export default function OnboardingClient({
  initialProfile,
  locale,
}: {
  initialProfile: UserProfileData | null;
  locale: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: initialProfile?.name || "",
    gender: initialProfile?.gender || "F",
    birthYear: initialProfile?.birthYear || "1998",
    birthMonth: initialProfile?.birthMonth || "05",
    birthDay: initialProfile?.birthDay || "12",
    birthTime: initialProfile?.birthTime || "12:00",
    unknownTime: initialProfile?.unknownTime || false,
    city: initialProfile?.city || "Seoul",
    country: initialProfile?.country || "Korea",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "프로필 저장에 실패했습니다.");
      }

      router.push(`/${locale}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "프로필 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-bold text-ink mb-1.5">이름 또는 닉네임</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="이름을 입력해주세요"
          className="w-full bg-white border border-line rounded-xl px-3.5 py-3 text-sm text-ink outline-none focus:border-coral transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-ink mb-1.5">성별</label>
        <div className="grid grid-cols-2 gap-2">
          <label
            className={`text-center py-2.5 rounded-xl cursor-pointer font-bold text-xs sm:text-sm border transition-all active:scale-[0.96] ${
              formData.gender === "M"
                ? "bg-coral text-white border-coral shadow-2xs"
                : "bg-white text-caption border-line hover:bg-surface-soft"
            }`}
          >
            <input
              type="radio"
              name="gender"
              value="M"
              checked={formData.gender === "M"}
              onChange={handleChange}
              className="hidden"
            />
            남성
          </label>
          <label
            className={`text-center py-2.5 rounded-xl cursor-pointer font-bold text-xs sm:text-sm border transition-all active:scale-[0.96] ${
              formData.gender === "F"
                ? "bg-coral text-white border-coral shadow-2xs"
                : "bg-white text-caption border-line hover:bg-surface-soft"
            }`}
          >
            <input
              type="radio"
              name="gender"
              value="F"
              checked={formData.gender === "F"}
              onChange={handleChange}
              className="hidden"
            />
            여성
          </label>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-ink mb-1.5">생년월일 (양력)</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <input
              type="number"
              name="birthYear"
              value={formData.birthYear}
              onChange={handleChange}
              placeholder="년도 (4자리)"
              required
              className="w-full bg-white border border-line rounded-xl px-3 py-2.5 text-xs sm:text-sm text-ink outline-none focus:border-coral transition-colors text-center"
            />
          </div>
          <div>
            <input
              type="number"
              name="birthMonth"
              value={formData.birthMonth}
              min="1"
              max="12"
              onChange={handleChange}
              placeholder="월"
              required
              className="w-full bg-white border border-line rounded-xl px-3 py-2.5 text-xs sm:text-sm text-ink outline-none focus:border-coral transition-colors text-center"
            />
          </div>
          <div>
            <input
              type="number"
              name="birthDay"
              value={formData.birthDay}
              min="1"
              max="31"
              onChange={handleChange}
              placeholder="일"
              required
              className="w-full bg-white border border-line rounded-xl px-3 py-2.5 text-xs sm:text-sm text-ink outline-none focus:border-coral transition-colors text-center"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-ink mb-1.5">태어난 시간</label>
        <input
          type="time"
          name="birthTime"
          value={formData.birthTime}
          onChange={handleChange}
          disabled={formData.unknownTime}
          className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-ink outline-none focus:border-coral transition-colors disabled:opacity-40 disabled:bg-surface-soft"
        />
        <label className="inline-flex items-center gap-2 mt-2 text-xs text-caption cursor-pointer">
          <input
            type="checkbox"
            name="unknownTime"
            checked={formData.unknownTime}
            onChange={handleChange}
            className="w-4 h-4 accent-coral rounded"
          />
          <span>태어난 시간을 모릅니다</span>
        </label>
      </div>

      {error && (
        <div className="text-red-500 text-xs font-bold text-center bg-red-50 p-2.5 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-coral hover:bg-coral-deep text-white font-bold text-sm py-3.5 rounded-2xl mt-2 shadow-xs transition-all active:scale-[0.96] disabled:opacity-60"
      >
        {loading ? "저장 중..." : "내 사주 정보 저장하기"}
      </button>
    </form>
  );
}
