"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import KongdakMascot from "@/components/KongdakMascot";

interface FortuneNewClientProps {
  locale: string;
  productId?: string;
  initialProfile?: any;
}

export default function FortuneNewClient({ locale, productId, initialProfile }: FortuneNewClientProps) {
  const router = useRouter();

  const [name, setName] = useState(initialProfile?.name || "");
  const [year, setYear] = useState(initialProfile?.birthYear || "");
  const [month, setMonth] = useState(initialProfile?.birthMonth || "");
  const [day, setDay] = useState(initialProfile?.birthDay || "");
  const [gender, setGender] = useState<"F" | "M">(initialProfile?.gender || "F");
  
  let defaultAmpm = "";
  let defaultHour = "1";
  let defaultMin = "0";
  if (initialProfile && !initialProfile.unknownTime && initialProfile.birthTime) {
    const [hStr, mStr] = initialProfile.birthTime.split(":");
    let h = parseInt(hStr);
    defaultMin = parseInt(mStr).toString();
    if (h >= 12) {
      defaultAmpm = "PM";
      if (h > 12) h -= 12;
    } else {
      defaultAmpm = "AM";
      if (h === 0) h = 12;
    }
    defaultHour = h.toString();
  }

  const [ampm, setAmpm] = useState(defaultAmpm);
  const [hour, setHour] = useState(defaultHour);
  const [min, setMin] = useState(defaultMin);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const getDaysInMonth = (y: string, m: string) => {
    if (!y || !m) return 31;
    return new Date(parseInt(y), parseInt(m), 0).getDate();
  };
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any | null>(null);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!year || !month || !day) {
      setErrorMsg("생년월일을 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const dob = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      let finalTime = null;
      if (ampm) {
        let h = parseInt(hour);
        if (ampm === "PM" && h !== 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        finalTime = `${h.toString().padStart(2, '0')}:${min.padStart(2, '0')}`;
      }

      const payload = {
        name: name.trim() || "나",
        dob,
        gender,
        time: finalTime,
        productId,
      };

      if (productId === "annual_2026" || productId === "annual_2027" || !productId) {
        // Use the existing annual API
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
        if (!res.ok) throw new Error(json.error || "결과 생성 중 오류가 발생했습니다.");
        setResultData(json.data);
      } else {
        throw new Error("준비 중인 상품입니다.");
      }
      
    } catch (err) {
      console.error("생성 실패:", err);
      setErrorMsg(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (resultData) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">내 사주 분석 결과</h2>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#FFD9E0]/40 text-left">
          <div className="text-4xl font-black text-[#FF5C77] text-center mb-4">{resultData.yearScore}점</div>
          <h3 className="font-bold text-lg mb-2 text-[#2B2430]">"{resultData.headline}"</h3>
          <p className="text-sm text-gray-600 mb-4">{resultData.summary}</p>
          
          <div className="bg-[#FFF6F1] p-4 rounded-xl border border-[#FFD9E0]/50 mt-4">
            <h4 className="font-bold text-[#FF5C77] text-sm mb-2">무료 맛보기</h4>
            <p className="text-sm">{resultData.freeSection?.text}</p>
          </div>

          <button
            onClick={() => alert("로그인 및 결제 후 전체 리포트를 볼 수 있습니다.")}
            className="w-full mt-6 bg-[#2B2430] text-white py-3 rounded-xl font-bold"
          >
            전체 리포트 열람하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-6 pb-12 mx-auto">
      {/* Kongdak Mascot Header */}
      <div className="flex flex-col items-center justify-center -mb-2">
        <KongdakMascot size={64} animate={isLoading ? "bounce" : "none"} />
      </div>

      {errorMsg && (
        <div className="bg-[#FF5C77]/10 border border-[#FF5C77] text-[#FF5C77] p-3.5 rounded-xl text-sm font-semibold text-center">
          {errorMsg}
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#FFD9E0]/40 flex flex-col gap-3.5 w-full">
        <div className="flex items-center justify-between border-b border-[#FFF6F1] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">👤</span>
            <h3 className="font-bold text-sm text-[#2B2430]">내 정보</h3>
          </div>
          {initialProfile && (
            <span className="text-[10px] bg-[#FF5C77]/10 text-[#FF5C77] px-2 py-0.5 rounded-full font-bold">
              저장된 프로필 불러옴
            </span>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8A8291] mb-1">내 이름 또는 닉네임 (선택)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 김콩닥"
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
          />
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#8A8291] mb-1">
              생년월일 <span className="text-[#FF5C77]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
              >
                <option value="">년도</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
              >
                <option value="">월</option>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
              >
                <option value="">일</option>
                {Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-[#8A8291] mb-1">성별</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as "F" | "M")}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
              >
                <option value="F">여성</option>
                <option value="M">남성</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-[#8A8291] mb-1">태어난 시간 (선택)</label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={ampm}
                  onChange={(e) => setAmpm(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
                >
                  <option value="">모름</option>
                  <option value="AM">오전</option>
                  <option value="PM">오후</option>
                </select>
                <select
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  disabled={!ampm}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40 disabled:opacity-50"
                >
                  {hours.map(h => <option key={h} value={h}>{h}시</option>)}
                </select>
                <select
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  disabled={!ampm}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40 disabled:opacity-50"
                >
                  {minutes.map(m => <option key={m} value={m}>{m}분</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#FF5C77] hover:bg-[#ff4766] active:scale-[0.97] text-white py-4 rounded-2xl font-bold text-base shadow-[0_4px_16px_rgba(255,92,119,0.25)] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>결과 분석 중...</span>
          </div>
        ) : (
          <span>결과 확인하기 ✨</span>
        )}
      </button>
    </form>
  );
}
