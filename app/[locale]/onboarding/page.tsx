"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { saveProfile } from "@/lib/userStateManager";
import {
  Sparkles, Heart, Briefcase, Coins, ArrowRight, MapPin, User2
} from "lucide-react";

/* ─── Types ─── */
type Gender = "male" | "female" | "";
type Concern = "love" | "career" | "wealth";

/* ─── Cosmic Loading Screen ─── */
function CosmicLoading({ concern }: { concern: Concern }) {
  const [progress, setProgress] = useState(0);
  const phrases = [
    "우주의 에너지를 스캔 중...",
    "사주 명식을 분석 중...",
    "오행의 균형을 측정 중...",
    "운명의 흐름을 해독 중...",
    "결과가 거의 준비되었습니다...",
  ];
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15 + 3, 100));
    }, 400);
    const phraseInterval = setInterval(() => {
      setPhraseIdx((i) => Math.min(i + 1, phrases.length - 1));
    }, 1200);
    return () => { clearInterval(interval); clearInterval(phraseInterval); };
  }, []);

  const icons = { love: Heart, career: Briefcase, wealth: Coins };
  const Icon = icons[concern];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-8"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-full border-2 border-gold/30 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border border-gold/50 flex items-center justify-center bg-gold/5">
            <Icon className="w-8 h-8 text-gold" />
          </div>
        </div>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gold shadow-[0_0_10px_rgba(212,175,55,0.8)]"
        />
      </motion.div>

      <div className="w-64">
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold/80 to-amber-400"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <p className="text-center text-gold/60 text-xs font-sans mt-3 tracking-wide">
          {Math.round(progress)}%
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={phraseIdx}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-gray-400 text-sm font-sans tracking-wide"
        >
          {phrases[phraseIdx]}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Onboarding Page ─── */
export default function OnboardingPage() {
  const t = useTranslations("Onboarding");
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [gender, setGender] = useState<Gender>("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [unknownTime, setUnknownTime] = useState(false);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [concern, setConcern] = useState<Concern | "">("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Auto-detect location via IP
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          if (data.country_name) setCountry(data.country_name);
          if (data.city) setCity(data.city);
        }
      } catch { /* silent */ }
    })();
  }, []);

  const totalSteps = 3;

  const handleComplete = () => {
    setIsLoading(true);

    // Save profile to localStorage
    saveProfile({
      name: name || "Seeker",
      year: birthYear,
      month: birthMonth,
      day: birthDay,
      time: unknownTime ? "" : birthTime,
      unknownTime,
      country,
      city,
      gender,
    });

    // Store concern for AI prompt context
    if (concern) {
      localStorage.setItem("kdestiny_concern", concern);
    }

    // After fake loading, go to select-master → input-destiny → result
    setTimeout(() => {
      router.push("/select-master");
    }, 4000);
  };

  const canProceedStep2 = birthYear && birthMonth && birthDay && (birthTime || unknownTime);
  const canProceedStep3 = concern !== "";

  return (
    <main className="relative min-h-[100dvh] w-full bg-[#06050e] overflow-hidden flex flex-col items-center justify-center px-4">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[70vw] h-[50vh] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/15 via-transparent to-transparent blur-[100px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/5 via-transparent to-transparent blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Progress Bar */}
        {!isLoading && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-sans tracking-[0.3em] text-gold/50 uppercase">
                Step {step} of {totalSteps}
              </span>
              <Sparkles className="w-4 h-4 text-gold/40" />
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold"
                animate={{ width: `${(step / totalSteps) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CosmicLoading concern={concern as Concern} />
            </motion.div>
          ) : step === 1 ? (
            /* ═══ Step 1: Gender ═══ */
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h2 className="font-serif text-2xl sm:text-3xl text-white font-bold mb-3">
                  {t("step1_title")}
                </h2>
                <p className="text-gray-500 text-sm font-sans">
                  {t("step1_desc")}
                </p>
              </div>

              {/* Name Input */}
              <div>
                <label className="text-[10px] font-sans tracking-[0.2em] text-gray-500 uppercase mb-2 block">
                  {t("label_name")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("placeholder_name")}
                  className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm focus:border-gold/40 focus:outline-none transition-colors placeholder:text-gray-600"
                />
              </div>

              {/* Gender Selection */}
              <div className="grid grid-cols-2 gap-4">
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`relative p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3 ${
                      gender === g
                        ? "border-gold/50 bg-gold/[0.06] shadow-[0_0_25px_rgba(212,175,55,0.15)]"
                        : "border-white/8 bg-white/[0.02] hover:border-white/15"
                    }`}
                  >
                    <User2 className={`w-8 h-8 ${gender === g ? "text-gold" : "text-gray-600"}`} />
                    <span className={`font-sans text-sm font-medium ${gender === g ? "text-gold" : "text-gray-400"}`}>
                      {t(g === "male" ? "gender_male" : "gender_female")}
                    </span>
                    {gender === g && (
                      <motion.div
                        layoutId="gender-check"
                        className="absolute top-3 right-3 w-5 h-5 rounded-full bg-gold flex items-center justify-center"
                      >
                        <span className="text-black text-xs">✓</span>
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => gender && setStep(2)}
                disabled={!gender}
                className={`w-full py-4 rounded-xl font-sans font-bold text-sm tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                  gender
                    ? "bg-gradient-to-r from-gold to-amber-400 text-black shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_30px_rgba(212,175,55,0.5)] active:scale-95"
                    : "bg-white/[0.04] text-gray-600 cursor-not-allowed"
                }`}
              >
                {t("btn_next")} <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ) : step === 2 ? (
            /* ═══ Step 2: Birth Data ═══ */
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="font-serif text-2xl sm:text-3xl text-white font-bold mb-3">
                  {t("step2_title")}
                </h2>
                <p className="text-gray-500 text-sm font-sans">
                  {t("step2_desc")}
                </p>
              </div>

              {/* DOB */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-sans tracking-[0.2em] text-gray-500 uppercase mb-1.5 block">{t("label_year")}</label>
                  <input type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)}
                    placeholder="1990" min="1920" max="2025"
                    className="w-full px-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm text-center focus:border-gold/40 focus:outline-none transition-colors placeholder:text-gray-600" />
                </div>
                <div>
                  <label className="text-[10px] font-sans tracking-[0.2em] text-gray-500 uppercase mb-1.5 block">{t("label_month")}</label>
                  <input type="number" value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}
                    placeholder="7" min="1" max="12"
                    className="w-full px-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm text-center focus:border-gold/40 focus:outline-none transition-colors placeholder:text-gray-600" />
                </div>
                <div>
                  <label className="text-[10px] font-sans tracking-[0.2em] text-gray-500 uppercase mb-1.5 block">{t("label_day")}</label>
                  <input type="number" value={birthDay} onChange={(e) => setBirthDay(e.target.value)}
                    placeholder="15" min="1" max="31"
                    className="w-full px-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm text-center focus:border-gold/40 focus:outline-none transition-colors placeholder:text-gray-600" />
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="text-[10px] font-sans tracking-[0.2em] text-gray-500 uppercase mb-1.5 block">{t("label_time")}</label>
                <select
                  value={birthTime}
                  onChange={(e) => { setBirthTime(e.target.value); setUnknownTime(false); }}
                  disabled={unknownTime}
                  className="w-full px-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm focus:border-gold/40 focus:outline-none transition-colors disabled:opacity-40"
                >
                  <option value="" className="bg-[#0a0918]">{t("time_placeholder")}</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const startH = (i * 2 + 23) % 24;
                    const endH = (startH + 2) % 24;
                    const label = `${String(startH).padStart(2, "0")}:00 ~ ${String(endH).padStart(2, "0")}:00`;
                    return <option key={i} value={`${String(startH).padStart(2, "0")}:00`} className="bg-[#0a0918]">{label}</option>;
                  })}
                </select>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={unknownTime}
                    onChange={(e) => { setUnknownTime(e.target.checked); if (e.target.checked) setBirthTime(""); }}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-gold accent-[#d4af37]" />
                  <span className="text-gray-500 text-xs font-sans">{t("unknown_time")}</span>
                </label>
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-sans tracking-[0.2em] text-gray-500 uppercase mb-1.5 flex items-center gap-1 block">
                    <MapPin className="w-3 h-3" /> {t("label_country")}
                  </label>
                  <input type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                    placeholder={t("placeholder_country")}
                    className="w-full px-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm focus:border-gold/40 focus:outline-none transition-colors placeholder:text-gray-600" />
                </div>
                <div>
                  <label className="text-[10px] font-sans tracking-[0.2em] text-gray-500 uppercase mb-1.5 block">{t("label_city")}</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                    placeholder={t("placeholder_city")}
                    className="w-full px-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm focus:border-gold/40 focus:outline-none transition-colors placeholder:text-gray-600" />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="px-6 py-4 rounded-xl border border-white/10 text-gray-400 font-sans text-sm hover:border-white/20 transition-colors">
                  ←
                </button>
                <button
                  onClick={() => canProceedStep2 && setStep(3)}
                  disabled={!canProceedStep2}
                  className={`flex-1 py-4 rounded-xl font-sans font-bold text-sm tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                    canProceedStep2
                      ? "bg-gradient-to-r from-gold to-amber-400 text-black shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_30px_rgba(212,175,55,0.5)] active:scale-95"
                      : "bg-white/[0.04] text-gray-600 cursor-not-allowed"
                  }`}
                >
                  {t("btn_next")} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* ═══ Step 3: Primary Concern ═══ */
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h2 className="font-serif text-2xl sm:text-3xl text-white font-bold mb-3">
                  {t("step3_title")}
                </h2>
                <p className="text-gray-500 text-sm font-sans">
                  {t("step3_desc")}
                </p>
              </div>

              <div className="space-y-4">
                {([
                  { id: "love" as Concern, icon: Heart, color: "from-rose-500/20 to-pink-600/5", borderColor: "border-rose-500/40", textColor: "text-rose-400" },
                  { id: "career" as Concern, icon: Briefcase, color: "from-blue-500/20 to-indigo-600/5", borderColor: "border-blue-500/40", textColor: "text-blue-400" },
                  { id: "wealth" as Concern, icon: Coins, color: "from-amber-500/20 to-yellow-600/5", borderColor: "border-amber-500/40", textColor: "text-amber-400" },
                ]).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setConcern(item.id)}
                    className={`w-full relative p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 text-left ${
                      concern === item.id
                        ? `${item.borderColor} bg-gradient-to-r ${item.color} shadow-[0_0_20px_rgba(255,255,255,0.05)]`
                        : "border-white/8 bg-white/[0.02] hover:border-white/15"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      concern === item.id ? `bg-white/10 ${item.textColor}` : "bg-white/5 text-gray-600"
                    }`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`font-sans font-bold text-sm ${concern === item.id ? "text-white" : "text-gray-300"}`}>
                        {t(`concern_${item.id}_title`)}
                      </h3>
                      <p className="text-gray-500 text-xs font-sans mt-0.5">
                        {t(`concern_${item.id}_desc`)}
                      </p>
                    </div>
                    {concern === item.id && (
                      <motion.div
                        layoutId="concern-check"
                        className="absolute right-4 w-6 h-6 rounded-full bg-gold flex items-center justify-center"
                      >
                        <span className="text-black text-xs font-bold">✓</span>
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)}
                  className="px-6 py-4 rounded-xl border border-white/10 text-gray-400 font-sans text-sm hover:border-white/20 transition-colors">
                  ←
                </button>
                <button
                  onClick={() => canProceedStep3 && handleComplete()}
                  disabled={!canProceedStep3}
                  className={`flex-1 py-4 rounded-xl font-sans font-bold text-sm tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                    canProceedStep3
                      ? "bg-gradient-to-r from-gold to-amber-400 text-black shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_30px_rgba(212,175,55,0.5)] active:scale-95"
                      : "bg-white/[0.04] text-gray-600 cursor-not-allowed"
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> {t("btn_reveal")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
