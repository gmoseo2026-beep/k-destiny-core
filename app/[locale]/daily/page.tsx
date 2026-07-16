"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Sun, Moon, ArrowLeft, Lock, Compass } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { getProfile } from "@/lib/userStateManager";
import { DAY_MASTER_SIGN_MAP } from "@/lib/saju";

interface FortuneData {
  summary: string;
  fullContent: string;
  luckyColor: string;
  luckyNumber: string;
  luckyDir: string;
  date: string;
}

const LABELS: Record<string, Record<string, string>> = {
  ko: { title: "오늘의 운세", subtitle: "매일 바뀌는 당신의 우주적 에너지", loading: "별들의 에너지를 읽는 중...",
    lucky: "오늘의 행운", color: "행운의 색", number: "행운의 숫자", direction: "행운의 방향",
    premium: "더 자세한 분석은 프리미엄에서", upgrade: "프리미엄 업그레이드", noProfile: "사주 정보를 먼저 입력해주세요", enterInfo: "사주 입력하기" },
  en: { title: "Daily Fortune", subtitle: "Your cosmic energy shifts every day", loading: "Reading stellar energies...",
    lucky: "Today's Fortune", color: "Lucky Color", number: "Lucky Number", direction: "Lucky Direction",
    premium: "Get detailed analysis with Premium", upgrade: "Upgrade to Premium", noProfile: "Please enter your birth data first", enterInfo: "Enter Birth Data" },
  ja: { title: "今日の運勢", subtitle: "毎日変わるあなたの宇宙エネルギー", loading: "星のエネルギーを読み取り中...",
    lucky: "今日の幸運", color: "ラッキーカラー", number: "ラッキーナンバー", direction: "ラッキー方角",
    premium: "プレミアムで詳細分析", upgrade: "プレミアムへ", noProfile: "生年月日を先に入力してください", enterInfo: "入力する" },
};

export default function DailyPage() {
  const locale = useLocale();
  const { data: session } = useSession();
  const isPremium = session?.user?.tier === "PREMIUM" || session?.user?.role === "ADMIN";
  const [fortune, setFortune] = useState<FortuneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const labels = LABELS[locale] || LABELS.en;

  useEffect(() => {
    async function fetchFortune() {
      const profile = getProfile();
      if (!profile) { setLoading(false); setError("no_profile"); return; }
      // Day Master 키를 로컬 프로필에서 추출 (saju 계산은 서버에서 했으므로 localStorage에서 읽기)
      const lastResult = localStorage.getItem("kdestiny_last_result");
      let dayMasterKey = "WOOD_YANG";
      if (lastResult) {
        try {
          const parsed = JSON.parse(lastResult);
          if (parsed.dayMaster && DAY_MASTER_SIGN_MAP[parsed.dayMaster]) {
            dayMasterKey = DAY_MASTER_SIGN_MAP[parsed.dayMaster];
          }
        } catch { /* use default */ }
      }
      try {
        const res = await fetch(`/api/daily-fortune?dayMasterKey=${dayMasterKey}&locale=${locale}`);
        if (!res.ok) throw new Error("API failed");
        const data = await res.json();
        setFortune(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchFortune();
  }, [locale]);

  return (
    <main className="relative min-h-[100dvh] w-full bg-background overflow-hidden flex flex-col items-center py-12 px-4 sm:px-6">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[70vw] h-[50vh] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-900/15 via-transparent to-transparent blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-gold/80 transition-colors text-xs font-sans tracking-widest uppercase mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sun className="w-5 h-5 text-amber-400" />
            <Sparkles className="w-5 h-5 text-gold" />
            <Moon className="w-5 h-5 text-purple-400" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">{labels.title}</h1>
          <p className="font-sans text-gray-500 text-sm">{labels.subtitle}</p>
          {fortune?.date && <p className="font-mono text-gold/50 text-xs mt-2">{fortune.date}</p>}
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Sparkles className="w-8 h-8 text-gold animate-pulse mb-4" />
            <p className="font-sans text-gray-400 text-sm">{labels.loading}</p>
          </div>
        ) : error === "no_profile" ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Compass className="w-12 h-12 text-gold/30 mb-4" />
            <p className="text-gray-400 mb-4">{labels.noProfile}</p>
            <Link href="/input-destiny">
              <button className="px-6 py-3 bg-gold/10 border border-gold/40 text-gold rounded-xl font-sans text-sm hover:bg-gold/20 transition-colors">{labels.enterInfo}</button>
            </Link>
          </div>
        ) : fortune ? (
          <div className="space-y-6">
            {/* Summary Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-xl border border-amber-500/20 rounded-3xl p-6 sm:p-8">
              <h2 className="font-serif text-xl text-gold mb-3">{labels.lucky}</h2>
              <p className="font-sans text-white text-lg leading-relaxed italic">&ldquo;{fortune.summary}&rdquo;</p>
            </motion.div>

            {/* Lucky Elements */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="grid grid-cols-3 gap-3">
              {[
                { label: labels.color, value: fortune.luckyColor, emoji: "🎨" },
                { label: labels.number, value: fortune.luckyNumber, emoji: "🔢" },
                { label: labels.direction, value: fortune.luckyDir, emoji: "🧭" },
              ].map((item) => (
                <div key={item.label} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-2xl mb-2 block">{item.emoji}</span>
                  <p className="text-[10px] font-sans tracking-widest text-gray-500 uppercase mb-1">{item.label}</p>
                  <p className="font-serif text-white text-sm">{item.value || "—"}</p>
                </div>
              ))}
            </motion.div>

            {/* Full Content */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className={`relative bg-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-8 overflow-hidden ${!isPremium ? '' : ''}`}>
              <h2 className="font-serif text-xl text-white mb-4 flex items-center gap-2">
                {isPremium ? <Sparkles className="w-5 h-5 text-gold" /> : <Lock className="w-5 h-5 text-gold" />}
                Detailed Analysis
              </h2>
              <div className={`font-sans text-gray-300 leading-relaxed text-sm whitespace-pre-wrap ${!isPremium ? 'blur-[6px] select-none' : ''}`}>
                {fortune.fullContent}
              </div>
              {!isPremium && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/30">
                  <Lock className="w-8 h-8 text-gold mb-3" />
                  <p className="text-gray-400 text-sm mb-4">{labels.premium}</p>
                  <Link href="/pricing">
                    <button className="px-6 py-3 bg-gradient-to-r from-gold to-amber-500 text-black font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.02] transition-transform">
                      {labels.upgrade}
                    </button>
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          <p className="text-center text-gray-500">Something went wrong. Please try again.</p>
        )}
      </div>
    </main>
  );
}
