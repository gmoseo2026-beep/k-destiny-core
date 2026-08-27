"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/gtag";
import KongdakMascot from "@/components/KongdakMascot";

interface CompatNewClientProps {
  locale: string;
  refToken?: string;
  initialProfile?: any;
}

export default function CompatNewClient({ locale, refToken, initialProfile }: CompatNewClientProps) {
  const router = useRouter();

  const [nameA, setNameA] = useState(initialProfile?.name || "");
  const [yearA, setYearA] = useState(initialProfile?.birthYear || "");
  const [monthA, setMonthA] = useState(initialProfile?.birthMonth || "");
  const [dayA, setDayA] = useState(initialProfile?.birthDay || "");
  const [genderA, setGenderA] = useState<"F" | "M">(initialProfile?.gender || "F");
  
  let defaultAmpmA = "";
  let defaultHourA = "1";
  let defaultMinA = "0";
  if (initialProfile && !initialProfile.unknownTime && initialProfile.birthTime) {
    const [hStr, mStr] = initialProfile.birthTime.split(":");
    let h = parseInt(hStr);
    defaultMinA = parseInt(mStr).toString();
    if (h >= 12) {
      defaultAmpmA = "PM";
      if (h > 12) h -= 12;
    } else {
      defaultAmpmA = "AM";
      if (h === 0) h = 12;
    }
    defaultHourA = h.toString();
  }

  const [ampmA, setAmpmA] = useState(defaultAmpmA);
  const [hourA, setHourA] = useState(defaultHourA);
  const [minA, setMinA] = useState(defaultMinA);

  const [nameB, setNameB] = useState("");
  const [yearB, setYearB] = useState("");
  const [monthB, setMonthB] = useState("");
  const [dayB, setDayB] = useState("");
  const [genderB, setGenderB] = useState<"M" | "F">("M");
  const [ampmB, setAmpmB] = useState("");
  const [hourB, setHourB] = useState("1");
  const [minB, setMinB] = useState("0");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const getDaysInMonth = (y: string, m: string) => {
    if (!y || !m) return 31;
    return new Date(parseInt(y), parseInt(m), 0).getDate();
  };
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const [relation, setRelation] = useState<"love" | "crush" | "friend">("love");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!yearA || !monthA || !dayA) {
      setErrorMsg("내 생년월일을 입력해주세요.");
      return;
    }
    if (!yearB || !monthB || !dayB) {
      setErrorMsg("상대방의 생년월일을 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const dobA = `${yearA}-${monthA.padStart(2, '0')}-${dayA.padStart(2, '0')}`;
      const dobB = `${yearB}-${monthB.padStart(2, '0')}-${dayB.padStart(2, '0')}`;

      let finalTimeA = null;
      if (ampmA) {
        let h = parseInt(hourA);
        if (ampmA === "PM" && h !== 12) h += 12;
        if (ampmA === "AM" && h === 12) h = 0;
        finalTimeA = `${h.toString().padStart(2, '0')}:${minA.padStart(2, '0')}`;
      }

      let finalTimeB = null;
      if (ampmB) {
        let h = parseInt(hourB);
        if (ampmB === "PM" && h !== 12) h += 12;
        if (ampmB === "AM" && h === 12) h = 0;
        finalTimeB = `${h.toString().padStart(2, '0')}:${minB.padStart(2, '0')}`;
      }

      const payload = {
        personA: {
          name: nameA.trim() || "나",
          dob: dobA,
          gender: genderA,
          time: finalTimeA,
        },
        personB: {
          name: nameB.trim() || "상대방",
          dob: dobB,
          gender: genderB,
          time: finalTimeB,
        },
        relation,
        ref: refToken || null,
      };

      const res = await fetch("/api/compat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.shareToken) {
        throw new Error(json.error || "궁합 계산 중 오류가 발생했습니다.");
      }

      // GA4 측정 이벤트 발사
      trackEvent("compat_created", {
        relation,
        has_ref: Boolean(refToken),
      });

      // 결과 화면으로 이동. 작성자 본인의 진입에는 ref 를 붙이지 않는다 —
      // 붙이면 본인이 share_visit(유입)으로 잡히고, 이어서 만드는 궁합이
      // compat_created{has_ref:true} + sourceCompatId=본인 으로 기록되어 K 가 자기참조로 부풀려진다.
      // 주소창 복사용 ref 는 결과 화면이 replaceState 로 따로 붙인다.
      router.push(`/${locale}/compat/${json.shareToken}`);
    } catch (err) {
      console.error("궁합 생성 실패:", err);
      setErrorMsg(err instanceof Error ? err.message : "궁합 계산 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md md:max-w-3xl flex flex-col gap-6 pb-12 mx-auto">
      {/* Kongdak Mascot Header */}
      <div className="flex flex-col items-center justify-center -mb-2">
        <KongdakMascot size={64} animate={isLoading ? "bounce" : "heartbeat"} />
      </div>

      {errorMsg && (
        <div className="bg-[#FF5C77]/10 border border-[#FF5C77] text-[#FF5C77] p-3.5 rounded-xl text-sm font-semibold text-center">
          {errorMsg}
        </div>
      )}

      {/* Relation Type Selector */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#FFD9E0]/40">
        <label className="block text-xs font-bold text-[#8A8291] mb-2">우리의 관계</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "love", label: "연인 · 커플", icon: "❤️" },
            { key: "crush", label: "썸 · 호감", icon: "💌" },
            { key: "friend", label: "친구 · 지인", icon: "✨" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setRelation(item.key as "love" | "crush" | "friend")}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 border ${
                relation === item.key
                  ? "bg-gradient-to-br from-[#FF8AA1] to-[#FF5C77] text-white border-transparent shadow-sm"
                  : "bg-[#FFF6F1] text-[#2B2430] border-[#FFD9E0]/50 hover:bg-[#FFD9E0]/30"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Person A (Me) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#FFD9E0]/40 flex flex-col gap-3.5 h-full">
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
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
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
                  value={yearA}
                  onChange={(e) => setYearA(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
                >
                  <option value="">년도</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  value={monthA}
                  onChange={(e) => setMonthA(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
                >
                  <option value="">월</option>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={dayA}
                  onChange={(e) => setDayA(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
                >
                  <option value="">일</option>
                  {Array.from({ length: getDaysInMonth(yearA, monthA) }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-[#8A8291] mb-1">성별</label>
                <select
                  value={genderA}
                  onChange={(e) => setGenderA(e.target.value as "F" | "M")}
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
                    value={ampmA}
                    onChange={(e) => setAmpmA(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
                  >
                    <option value="">모름</option>
                    <option value="AM">오전</option>
                    <option value="PM">오후</option>
                  </select>
                  <select
                    value={hourA}
                    onChange={(e) => setHourA(e.target.value)}
                    disabled={!ampmA}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40 disabled:opacity-50"
                  >
                    {hours.map(h => <option key={h} value={h}>{h}시</option>)}
                  </select>
                  <select
                    value={minA}
                    onChange={(e) => setMinA(e.target.value)}
                    disabled={!ampmA}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40 disabled:opacity-50"
                  >
                    {minutes.map(m => <option key={m} value={m}>{m}분</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Person B (Partner) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#FFD9E0]/40 flex flex-col gap-3.5 h-full">
          <div className="flex items-center gap-2 border-b border-[#FFF6F1] pb-2">
            <span className="text-base">💖</span>
            <h3 className="font-bold text-sm text-[#2B2430]">상대방 정보</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8A8291] mb-1">상대방 이름 또는 애칭 (선택)</label>
            <input
              type="text"
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              placeholder="예: 이설렘"
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
                  value={yearB}
                  onChange={(e) => setYearB(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
                >
                  <option value="">년도</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  value={monthB}
                  onChange={(e) => setMonthB(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
                >
                  <option value="">월</option>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={dayB}
                  onChange={(e) => setDayB(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
                >
                  <option value="">일</option>
                  {Array.from({ length: getDaysInMonth(yearB, monthB) }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-[#8A8291] mb-1">성별</label>
                <select
                  value={genderB}
                  onChange={(e) => setGenderB(e.target.value as "M" | "F")}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
                >
                  <option value="M">남성</option>
                  <option value="F">여성</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-[#8A8291] mb-1">태어난 시간 (선택)</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={ampmB}
                    onChange={(e) => setAmpmB(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40"
                  >
                    <option value="">모름</option>
                    <option value="AM">오전</option>
                    <option value="PM">오후</option>
                  </select>
                  <select
                    value={hourB}
                    onChange={(e) => setHourB(e.target.value)}
                    disabled={!ampmB}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40 disabled:opacity-50"
                  >
                    {hours.map(h => <option key={h} value={h}>{h}시</option>)}
                  </select>
                  <select
                    value={minB}
                    onChange={(e) => setMinB(e.target.value)}
                    disabled={!ampmB}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF5C77] bg-[#FFF6F1]/40 disabled:opacity-50"
                  >
                    {minutes.map(m => <option key={m} value={m}>{m}분</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] hover:opacity-95 active:scale-[0.99] text-white py-4 rounded-xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>궁합 점수와 케미 분석 중...</span>
          </div>
        ) : (
          <span>우리 궁합 점수 확인하기 (무료) ✨</span>
        )}
      </button>
    </form>
  );
}
