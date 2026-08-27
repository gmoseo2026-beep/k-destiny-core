"use client";

import React, { useEffect, useState } from "react";
import KongdakMascot from "@/components/KongdakMascot";
import { useSession } from "next-auth/react";

interface WeeklyFortuneClientProps {
  locale: string;
  compatId?: string;
}

export default function WeeklyFortuneClient({ locale, compatId }: WeeklyFortuneClientProps) {
  const { data: session } = useSession();
  const isPremium = session && ((session.user as any)?.isPremium || (session.user as any)?.role === 'ADMIN');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFortune() {
      try {
        const res = await fetch("/api/fortune/weekly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetCompatId: compatId, locale })
        });
        
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to fetch fortune");
        
        setData(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchFortune();
  }, [compatId, locale]);

  if (loading) {
    return (
      <div className="w-full max-w-md flex flex-col items-center justify-center py-20">
        <KongdakMascot size={80} animate="bounce" />
        <p className="mt-4 text-sm font-bold text-[#6A2C70] animate-pulse">콩닥콩닥... 이번 주 운세를 불러오고 있어요!</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-sm border border-red-200 text-center">
        <p className="text-red-500 font-bold mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#FFF6F1] text-[#6A2C70] rounded-xl font-bold text-sm">다시 시도</button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="w-full max-w-md md:max-w-3xl flex flex-col gap-6 pb-12">
      {/* Summary */}
      <div className="relative bg-gradient-to-br from-[#FF8AA1] to-[#FF5C77] p-6 rounded-3xl shadow-md text-white overflow-hidden">
        <h2 className="text-xl font-black mb-3">이번 주 총평 📝</h2>
        <p className={`text-sm leading-relaxed opacity-95 ${!isPremium ? "line-clamp-2" : ""}`}>
          {data.summary}
        </p>
        {!isPremium && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#FF5C77] to-transparent pointer-events-none"></div>
        )}
      </div>

      {/* Detailed Content (Blurred for non-premium) */}
      <div className={`relative flex flex-col gap-6 ${!isPremium ? "overflow-hidden pb-12" : ""}`}>
        
        {/* Actual Content Wrapper */}
        <div className={`flex flex-col gap-6 transition-all duration-500 ${!isPremium ? "blur-[6px] opacity-40 select-none pointer-events-none" : ""}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Love Luck */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#FFD9E0]/50">
              <h3 className="font-bold text-[#6A2C70] mb-2 flex items-center gap-2">
                <span>❤️</span> 애정운
              </h3>
              <p className="text-sm text-[#2B2430] leading-relaxed">{data.loveLuck}</p>
            </div>

            {/* Wealth Luck */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#FFD9E0]/50">
              <h3 className="font-bold text-[#6A2C70] mb-2 flex items-center gap-2">
                <span>💰</span> 금전운
              </h3>
              <p className="text-sm text-[#2B2430] leading-relaxed">{data.wealthLuck}</p>
            </div>
          </div>

          {/* Best Day & Caution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#FFF6F1] p-5 rounded-2xl border border-[#FFD9E0]/30">
              <h3 className="font-bold text-[#6A2C70] mb-2 flex items-center gap-2">
                <span>🌟</span> 가장 좋은 요일: {data.bestDay?.day}
              </h3>
              <p className="text-sm text-[#2B2430] leading-relaxed">{data.bestDay?.reason}</p>
            </div>
            <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
              <h3 className="font-bold text-red-500 mb-2 flex items-center gap-2">
                <span>⚠️</span> 주의할 점
              </h3>
              <p className="text-sm text-[#2B2430] leading-relaxed">{data.caution}</p>
            </div>
          </div>

          {/* Couple specifics */}
          {compatId && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#FFD9E0]/50 mt-2">
              <h2 className="text-lg font-black text-[#6A2C70] mb-4">커플 맞춤 팁 💑</h2>
              
              {data.partnerStatus && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#8A8291] mb-1">상대방의 이번 주 기운</h3>
                  <p className="text-sm text-[#2B2430] leading-relaxed">{data.partnerStatus}</p>
                </div>
              )}
              
              {data.communicationTip && (
                <div>
                  <h3 className="text-sm font-bold text-[#8A8291] mb-1">이렇게 다가가보세요</h3>
                  <p className="text-sm text-[#2B2430] leading-relaxed">{data.communicationTip}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Paywall Overlay */}
        {!isPremium && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4">
            <div className="bg-[#2B2430]/95 backdrop-blur-sm text-[#FFF6F1] p-8 rounded-3xl text-center shadow-2xl w-full max-w-sm border border-white/10 mt-10">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="font-bold text-xl mb-3 text-[#FFC24B]">콩닥 플러스 전용</h3>
              <p className="text-sm text-[#8A8291] mb-6 leading-relaxed">
                나의 상세 애정운, 금전운, 데이트 길일은<br/>플러스 회원에게만 공개됩니다.
              </p>
              <button className="w-full bg-[#FF5C77] text-white font-bold py-3.5 px-6 rounded-xl hover:bg-[#ff4766] active:scale-95 transition-all shadow-lg">
                무제한 패스 알아보기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
