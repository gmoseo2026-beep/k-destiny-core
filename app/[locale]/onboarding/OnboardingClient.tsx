"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingClient({ initialProfile, locale }: { initialProfile: any, locale: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: initialProfile?.name || "",
    gender: initialProfile?.gender || "F",
    birthYear: initialProfile?.birthYear || "1990",
    birthMonth: initialProfile?.birthMonth || "01",
    birthDay: initialProfile?.birthDay || "01",
    birthTime: initialProfile?.birthTime || "12:00",
    unknownTime: initialProfile?.unknownTime || false,
    city: initialProfile?.city || "Seoul",
    country: initialProfile?.country || "Korea"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
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
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }

      // Success, redirect back to home or dashboard
      router.push(`/${locale}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="block text-xs font-bold text-[#6A2C70] mb-1">이름 또는 닉네임</label>
        <input 
          type="text" 
          name="name" 
          value={formData.name} 
          onChange={handleChange} 
          required
          className="w-full bg-[#FFF6F1] border-none rounded-xl p-3 text-sm text-[#2B2430] outline-none focus:ring-2 focus:ring-[#FF8AA1]"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-[#6A2C70] mb-1">성별</label>
        <div className="flex gap-2">
          <label className={`flex-1 text-center p-3 rounded-xl cursor-pointer font-bold text-sm transition-colors ${formData.gender === 'M' ? 'bg-[#FF8AA1] text-white' : 'bg-[#FFF6F1] text-[#8A8291]'}`}>
            <input type="radio" name="gender" value="M" checked={formData.gender === 'M'} onChange={handleChange} className="hidden" />
            남성
          </label>
          <label className={`flex-1 text-center p-3 rounded-xl cursor-pointer font-bold text-sm transition-colors ${formData.gender === 'F' ? 'bg-[#FF8AA1] text-white' : 'bg-[#FFF6F1] text-[#8A8291]'}`}>
            <input type="radio" name="gender" value="F" checked={formData.gender === 'F'} onChange={handleChange} className="hidden" />
            여성
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs font-bold text-[#6A2C70] mb-1">태어난 년도</label>
          <input type="number" name="birthYear" value={formData.birthYear} onChange={handleChange} required className="w-full bg-[#FFF6F1] border-none rounded-xl p-3 text-sm text-[#2B2430] outline-none focus:ring-2 focus:ring-[#FF8AA1]" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-[#6A2C70] mb-1">월</label>
          <input type="number" name="birthMonth" value={formData.birthMonth} min="1" max="12" onChange={handleChange} required className="w-full bg-[#FFF6F1] border-none rounded-xl p-3 text-sm text-[#2B2430] outline-none focus:ring-2 focus:ring-[#FF8AA1]" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-[#6A2C70] mb-1">일</label>
          <input type="number" name="birthDay" value={formData.birthDay} min="1" max="31" onChange={handleChange} required className="w-full bg-[#FFF6F1] border-none rounded-xl p-3 text-sm text-[#2B2430] outline-none focus:ring-2 focus:ring-[#FF8AA1]" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-[#6A2C70] mb-1">태어난 시간</label>
        <input 
          type="time" 
          name="birthTime" 
          value={formData.birthTime} 
          onChange={handleChange}
          disabled={formData.unknownTime}
          className="w-full bg-[#FFF6F1] border-none rounded-xl p-3 text-sm text-[#2B2430] outline-none focus:ring-2 focus:ring-[#FF8AA1] disabled:opacity-50"
        />
        <label className="flex items-center gap-2 mt-2 text-xs text-[#8A8291] cursor-pointer">
          <input type="checkbox" name="unknownTime" checked={formData.unknownTime} onChange={handleChange} className="accent-[#FF5C77]" />
          태어난 시간을 모릅니다
        </label>
      </div>

      {error && <div className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded-lg">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#FF5C77] text-white font-black text-sm py-4 rounded-xl mt-4 shadow-md hover:bg-[#ff4766] transition-all disabled:opacity-70"
      >
        {loading ? "저장 중..." : "내 사주 정보 저장하기"}
      </button>
    </form>
  );
}
