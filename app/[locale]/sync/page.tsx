"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Activity, Share2, Check, User, Heart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { getProfile, type UserProfile } from "@/lib/userStateManager";

const INPUT_BASE = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 sm:py-4 text-white focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all font-sans text-base shadow-inner";
const SELECT_COMPACT = "w-full bg-black/40 border border-white/10 rounded-xl px-2 sm:px-4 py-3 sm:py-4 text-white focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all font-sans text-base shadow-inner appearance-none";
const LABEL_BASE = "text-xs sm:text-sm font-sans font-medium text-gray-300 tracking-wide uppercase flex items-center gap-2 mb-2";

function getInterpretationTier(score: number) {
  if (score >= 90) return "soulmate";
  if (score >= 70) return "harmony";
  return "growth";
}

function getTierGradient(tier: string) {
  if (tier === "soulmate") return "from-gold/20 via-amber-500/10 to-gold/20";
  if (tier === "harmony") return "from-blue-500/15 via-purple-500/10 to-blue-500/15";
  return "from-emerald-500/15 via-teal-500/10 to-emerald-500/15";
}

function getTierBorderColor(tier: string) {
  if (tier === "soulmate") return "border-gold/40";
  if (tier === "harmony") return "border-blue-400/30";
  return "border-emerald-400/30";
}

function SharedResultView({ u, g, score }: { u: string, g: string, score: string }) {
  const t = useTranslations("Sync");
  const numScore = parseInt(score) || 0;
  const tier = getInterpretationTier(numScore);

  return (
    <main className="relative min-h-[100dvh] w-full bg-[#06050e] overflow-hidden flex flex-col items-center justify-center py-20 px-4 sm:px-6">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity className="w-6 h-6 text-gold animate-pulse" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">
            <span className="text-blue-400">{u}</span>
            <span className="text-gray-400 text-2xl mx-3">&times;</span>
            <span className="text-purple-400">{g}</span>
          </h1>
          <p className="font-sans text-gray-400 text-base max-w-xl mx-auto">
            {t("share_cosmic_sync")}
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full bg-white/[0.03] backdrop-blur-2xl border border-gold/30 rounded-3xl p-8 sm:p-12 shadow-[0_0_60px_rgba(212,175,55,0.15)] text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
          
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 15, delay: 0.2 }}
            className="w-32 h-32 mx-auto mb-8 rounded-full border-4 border-gold flex items-center justify-center bg-black/50 shadow-[0_0_40px_rgba(212,175,55,0.4)]"
          >
            <span className="font-serif text-5xl font-bold text-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]">
              {score}
            </span>
          </motion.div>

          <h2 className="font-serif text-xl sm:text-2xl text-white font-bold mb-4">
            {t("share_resonance")}
          </h2>

          {/* Compatibility Interpretation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`mt-6 mb-10 p-5 sm:p-6 rounded-2xl bg-gradient-to-br ${getTierGradient(tier)} border ${getTierBorderColor(tier)} text-left`}
          >
            <h3 className="font-serif text-lg sm:text-xl font-bold text-white mb-3">
              {t(`tier_${tier}_title`)}
            </h3>
            <p className="font-sans text-sm sm:text-base text-gray-300 leading-relaxed">
              {t(`tier_${tier}_desc`)}
            </p>
          </motion.div>

          <Link href="/" className="relative group w-full flex items-center justify-center py-5 rounded-2xl font-sans text-background bg-gradient-to-r from-[#D4AF37] via-[#FFF5C3] to-[#D4AF37] font-bold text-lg tracking-wide overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_50px_rgba(212,175,55,0.6)] transition-all">
            <div className="relative z-10 flex items-center justify-center gap-3">
               <span>{t("share_cta")}</span>
            </div>
            {/* Shimmer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent z-0 w-1/2"
            />
          </Link>
        </motion.div>
      </div>
    </main>
  );
}

function EnergySyncContent() {
  const searchParams = useSearchParams();
  const sharedU = searchParams.get('u');
  const sharedG = searchParams.get('g');
  const sharedScore = searchParams.get('score');

  const locale = useLocale();
  const t = useTranslations("Sync");
  const tInput = useTranslations("InputDestiny");

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; vibe: string; analysis: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [guestData, setGuestData] = useState({ name: "", year: "", month: "", day: "", time: "", gender: "" });
  const [guestUnknownTime, setGuestUnknownTime] = useState(false);
  const router = useRouter();

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 100 }, (_, i) => currentYear - i), [currentYear]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  useEffect(() => {
    if (sharedU && sharedG && sharedScore) return;
    const profile = getProfile();
    if (!profile) {
      router.push("/input-destiny");
    } else {
      setUserProfile(profile);
    }
  }, [router, sharedU, sharedG, sharedScore]);

  if (sharedU && sharedG && sharedScore) {
    return <SharedResultView u={sharedU} g={sharedG} score={sharedScore} />;
  }

  const handleSync = async () => {
    if (!userProfile || !guestData.name || !guestData.year || !guestData.month || !guestData.day || !guestData.gender || (!guestData.time && !guestUnknownTime)) {
      alert(t("validation_msg"));
      return;
    }

    setIsLoading(true);
    setResult(null);

    const userDob = `${userProfile.year}-${userProfile.month.toString().padStart(2, '0')}-${userProfile.day.toString().padStart(2, '0')}`;
    const guestDob = `${guestData.year}-${guestData.month.toString().padStart(2, '0')}-${guestData.day.toString().padStart(2, '0')}`;

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: userProfile.name,
          userDob,
          userTime: userProfile.unknownTime ? "Unknown" : userProfile.time,
          userGender: userProfile.gender,
          guestName: guestData.name,
          guestDob,
          guestTime: guestUnknownTime ? "Unknown" : guestData.time,
          guestGender: guestData.gender,
          locale
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to sync energies.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    if (!userProfile) return;
    navigator.clipboard.writeText(`https://thekdestiny.com/${locale}/sync?u=${encodeURIComponent(userProfile.name)}&g=${encodeURIComponent(guestData.name)}&score=${result?.score}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const tier = result ? getInterpretationTier(result.score) : null;

  return (
    <main className="relative min-h-[100dvh] w-full bg-[#06050e] overflow-hidden flex flex-col items-center justify-center py-20 px-4 sm:px-6">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity className="w-6 h-6 text-gold animate-pulse" />
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
              {t("title")}
            </span>
          </h1>
          <p className="font-sans text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!result ? (
              <motion.div
              key="input-stage"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg mx-auto flex flex-col gap-6 relative"
            >
              {/* User Energy Badge */}
              <div className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-none">
                <div className="bg-white/[0.05] border border-white/10 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                  <User className="w-3 h-3 text-blue-400" />
                  <span className="font-sans text-xs text-gray-300">
                    {t("your_energy_badge")}: <strong className="text-white ml-1">{userProfile?.name}</strong> ({userProfile?.year}.{userProfile?.month}.{userProfile?.day})
                  </span>
                </div>
              </div>

              {/* Guest Card */}
              <div className="flex-1 bg-white/[0.02] backdrop-blur-2xl border border-purple-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(168,85,247,0.1)]">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                    <Heart className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="font-serif text-2xl text-white">{t("guest_energy")}</h2>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className={LABEL_BASE}>{t("label_name")}</label>
                    <input
                      type="text"
                      value={guestData.name}
                      onChange={(e) => setGuestData({ ...guestData, name: e.target.value })}
                      placeholder={t("placeholder_guest")}
                      className={INPUT_BASE}
                    />
                  </div>
                  <div>
                    <label className={LABEL_BASE}>{t("label_dob")}</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative">
                        <select
                          value={guestData.year}
                          onChange={(e) => setGuestData({ ...guestData, year: e.target.value })}
                          className={SELECT_COMPACT}
                        >
                          <option value="" disabled>{tInput('label_year')}</option>
                          {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gold/50 text-xs">▼</div>
                      </div>
                      <div className="relative">
                        <select
                          value={guestData.month}
                          onChange={(e) => setGuestData({ ...guestData, month: e.target.value })}
                          className={SELECT_COMPACT}
                        >
                          <option value="" disabled>{tInput('label_month')}</option>
                          {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gold/50 text-xs">▼</div>
                      </div>
                      <div className="relative">
                        <select
                          value={guestData.day}
                          onChange={(e) => setGuestData({ ...guestData, day: e.target.value })}
                          className={SELECT_COMPACT}
                        >
                          <option value="" disabled>{tInput('label_day')}</option>
                          {days.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gold/50 text-xs">▼</div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className={`${LABEL_BASE} mb-0`}>{tInput("label_time")}</label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={guestUnknownTime} onChange={(e) => {
                            setGuestUnknownTime(e.target.checked);
                            if(e.target.checked) setGuestData(p => ({...p, time: ""}));
                          }}/>
                          <div className="w-3 h-3 rounded-sm border border-gray-500 peer-checked:bg-gold peer-checked:border-gold flex items-center justify-center transition-all">
                            {guestUnknownTime && <div className="w-1.5 h-1.5 bg-black rounded-[1px]" />}
                          </div>
                          <span className="text-[10px] text-gray-400">{tInput("unknown_time")}</span>
                        </label>
                      </div>
                      <div className="relative">
                        <select
                          value={guestData.time}
                          onChange={(e) => setGuestData({ ...guestData, time: e.target.value })}
                          disabled={guestUnknownTime}
                          className={`${SELECT_COMPACT} disabled:opacity-50`}
                        >
                          <option value="" disabled>{tInput('time_placeholder')}</option>
                          {["00:00-01:30", "01:30-03:30", "03:30-05:30", "05:30-07:30", "07:30-09:30", "09:30-11:30", "11:30-13:30", "13:30-15:30", "15:30-17:30", "17:30-19:30", "19:30-21:30", "21:30-23:30", "23:30-24:00"].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gold/50 text-xs">▼</div>
                      </div>
                    </div>
                    <div>
                      <label className={LABEL_BASE}>{tInput("gender_label")}</label>
                      <div className="grid grid-cols-2 gap-2 h-[48px] sm:h-[52px]">
                        {(["Male", "Female"] as const).map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGuestData({ ...guestData, gender: g })}
                            className={`rounded-xl text-xs sm:text-sm font-bold transition-all border ${guestData.gender === g ? "bg-gold/10 border-gold text-gold" : "bg-black/40 border-white/10 text-gray-400"}`}
                          >
                            {g === "Male" ? tInput("gender_male") : tInput("gender_female")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result-stage"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl bg-white/[0.03] backdrop-blur-2xl border border-gold/30 rounded-3xl p-8 sm:p-12 shadow-[0_0_60px_rgba(212,175,55,0.15)] text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
              
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 15, delay: 0.2 }}
                className="w-32 h-32 mx-auto mb-8 rounded-full border-4 border-gold flex items-center justify-center bg-black/50 shadow-[0_0_40px_rgba(212,175,55,0.4)]"
              >
                <span className="font-serif text-5xl font-bold text-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]">
                  {result.score}
                </span>
              </motion.div>

              <motion.h2 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="font-serif text-3xl sm:text-4xl text-white font-bold mb-4"
              >
                {result.vibe}
              </motion.h2>

              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="font-sans text-base sm:text-lg mb-6 max-w-xl mx-auto text-left"
              >
                {result.analysis
                  .replace(/([.!?]+)\s+/g, "$1\n\n")
                  .split(/\n+/)
                  .map(s => s.trim())
                  .filter(Boolean)
                  .map((sentence, i) => (
                    <span key={i} className="block mb-5 sm:mb-6 leading-[1.8] text-gray-300 last:mb-0">
                      {sentence}
                    </span>
                  ))
                }
              </motion.div>

              {/* Compatibility Interpretation Tier */}
              {tier && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className={`mb-10 p-5 sm:p-6 rounded-2xl bg-gradient-to-br ${getTierGradient(tier)} border ${getTierBorderColor(tier)} text-left`}
                >
                  <h3 className="font-sans text-xs uppercase tracking-widest text-gold/80 mb-2">
                    {t("interpretation_title")}
                  </h3>
                  <h4 className="font-serif text-lg sm:text-xl font-bold text-white mb-3">
                    {t(`tier_${tier}_title`)}
                  </h4>
                  <p className="font-sans text-sm sm:text-base text-gray-300 leading-relaxed">
                    {t(`tier_${tier}_desc`)}
                  </p>
                </motion.div>
              )}

              {/* Viral Hook Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                onClick={handleShare}
                className="relative group w-full py-5 rounded-2xl font-sans text-background bg-gradient-to-r from-[#D4AF37] via-[#FFF5C3] to-[#D4AF37] font-bold text-lg tracking-wide overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_50px_rgba(212,175,55,0.6)] transition-all"
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                  <span>{copied ? t("btn_copied") : t("btn_share")}</span>
                </div>
                {/* Shimmer */}
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent z-0 w-1/2"
                />
              </motion.button>

              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                onClick={() => setResult(null)}
                className="mt-6 text-sm font-sans text-gray-500 hover:text-white transition-colors"
              >
                {t("btn_retry")}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sync Action Button (Only visible during input stage) */}
        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 w-full max-w-md mx-auto"
          >
            <button
              onClick={handleSync}
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-sans font-bold text-lg tracking-wider transition-all border ${
                isLoading 
                  ? "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed" 
                  : "bg-black/60 border-gold text-gold hover:bg-gold/10 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <Sparkles className="w-5 h-5 animate-spin" />
                  {t("btn_syncing")}
                </div>
              ) : (
                t("btn_sync")
              )}
            </button>
          </motion.div>
        )}
      </div>
    </main>
  );
}

export default function EnergySyncPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#06050e]" />}>
      <EnergySyncContent />
    </Suspense>
  );
}
