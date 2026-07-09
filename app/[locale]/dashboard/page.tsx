"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { Sparkles, Calendar, ArrowRight, FileText, Home, MessageCircle, Compass, Activity, Loader2, User, BookOpen, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { getLastResult, getMaster, getProfile, hasCompletedOnboarding, updateKarmaForPlan, saveExpiryDate, saveProfile } from "@/lib/userStateManager";
import { MASTERS } from "@/lib/masters";
import type { SavedResult } from "@/lib/userStateManager";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const tBlueprint = useTranslations("Blueprint");
  const searchParams = useSearchParams();

  const [userName, setUserName] = useState("Traveler");
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null);
  const [savedMasterId, setSavedMasterId] = useState<number | null>(null);
  const [selectedChatReport, setSelectedChatReport] = useState<any | null>(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const { data: session } = useSession();
  const router = useRouter();

  // Save premium status to localStorage when checkout succeeds
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      localStorage.setItem("kdestiny_premium", "true");
      const planId = searchParams.get("planId");
      if (planId) {
        updateKarmaForPlan(planId);
        saveExpiryDate(planId);
      }
      // Clean up URL to prevent re-triggering on back navigation
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    // Load locally saved data as initial state
    setSavedResult(getLastResult());
    setSavedMasterId(getMaster());

    async function fetchReports() {
      let dbReports: any[] = [];
      let profileLoaded = false;

      // 1. Try loading profile from DB (logged-in users) with no-cache
      if (session?.user?.id) {
        try {
          const res = await fetch('/api/user/saju-profile', { cache: 'no-store' });
          if (res.ok) {
            const { profile: dbProfile } = await res.json();
            if (dbProfile && dbProfile.name) {
              setUserName(dbProfile.name);
              // Sync to localStorage
              saveProfile({
                name: dbProfile.name || '',
                year: dbProfile.birthYear || '',
                month: dbProfile.birthMonth || '',
                day: dbProfile.birthDay || '',
                time: dbProfile.birthTime || '',
                unknownTime: dbProfile.unknownTime ?? false,
                country: dbProfile.country || '',
                city: dbProfile.city || '',
                gender: dbProfile.gender || '',
              });
              profileLoaded = true;
            }
          }
        } catch (err) {
          console.log('[dashboard] DB profile fetch failed', err);
        }
      }

      // 2. Fallback: localStorage profile
      if (!profileLoaded) {
        const profile = getProfile();
        if (profile) {
          setUserName(profile.name || "Traveler");
        } else if (session?.user) {
          setUserName(session.user.name?.split(' ')[0] || session.user.email?.split("@")[0] || "Traveler");
        }
      }

      // ─── Merge localStorage chat reports (works in mock/local env) ───
      try {
        const localChatReports = JSON.parse(localStorage.getItem("kdestiny_chat_reports") || "[]");
        // Combine DB reports with local chat reports, avoiding duplicates by id
        const existingIds = new Set(dbReports.map((r: any) => r.id));
        const uniqueLocalReports = localChatReports.filter((r: any) => !existingIds.has(r.id));
        const merged = [...dbReports, ...uniqueLocalReports];

        // ─── Also inject savedResult (Blueprint) from localStorage ───
        const localSavedResult = getLastResult();
        if (localSavedResult) {
          const hasBlueprintInDb = merged.some((r: any) => r.type === "Blueprint");
          if (!hasBlueprintInDb) {
            merged.push({
              id: "local-blueprint",
              user_id: "local-user",
              type: "Blueprint",
              content: localSavedResult,
              created_at: localSavedResult.savedAt || new Date().toISOString(),
            });
          }
        }

        // Sort all by created_at descending
        merged.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setReports(merged);
      } catch (e) {
        setReports(dbReports);
      }

      setIsLoading(false);
    }
    
    fetchReports();
  }, [session]);

  // Element energy data — use saved result's element_analysis or latest report's
  const elements = useMemo(() => {
    const baseElements = [
      { id: "wood", name: tBlueprint("wood"), value: 50, color: "from-green-500 to-emerald-600" },
      { id: "fire", name: tBlueprint("fire"), value: 50, color: "from-red-500 to-orange-600" },
      { id: "earth", name: tBlueprint("earth"), value: 50, color: "from-yellow-500 to-amber-600" },
      { id: "metal", name: tBlueprint("metal"), value: 50, color: "from-gray-300 to-gray-500" },
      { id: "water", name: tBlueprint("water"), value: 50, color: "from-blue-500 to-cyan-600" },
    ];

    const latestAnalysis = savedResult?.element_analysis || (reports.length > 0 ? reports[0].content?.element_analysis : null);

    if (latestAnalysis) {
      return baseElements.map((el) => {
        return { ...el, value: latestAnalysis[el.id] || 0 };
      });
    }

    const latestLucky = savedResult?.lucky_elements || (reports.length > 0 ? reports[0].content?.lucky_elements : null);

    if (latestLucky) {
      const lucky = latestLucky.map((e: string) => e.toLowerCase());
      
      const elementSynonyms: Record<string, string[]> = {
        "wood": ["wood", "목", "나무", "bois", "holz", "madera"],
        "fire": ["fire", "화", "불", "feu", "feuer", "fuego"],
        "earth": ["earth", "토", "흙", "terre", "erde", "tierra"],
        "metal": ["metal", "금", "쇠", "métal", "metall"],
        "water": ["water", "수", "물", "eau", "wasser", "agua"]
      };

      return baseElements.map((el) => {
        const nameLC = el.name.toLowerCase();
        const synonyms = elementSynonyms[el.id] || [];
        
        const isLucky = lucky.some((l: string) => 
          nameLC.includes(l) || 
          l.includes(nameLC) ||
          synonyms.some(syn => l.includes(syn) || syn.includes(l))
        );
        
        // Stable deterministic values instead of Math.random()
        return { ...el, value: isLucky ? 85 : 35 };
      });
    }
    return baseElements;
  }, [savedResult, reports, tBlueprint]);

  const selectedMaster = savedMasterId ? MASTERS.find((m) => m.id === savedMasterId) : null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants}>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">
          {t("welcome")}, <span className="text-gold">{userName}</span>
        </h1>
        <p className="font-sans text-gray-400 text-sm sm:text-base">
          {t("subtitle")}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Energy Status Card */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-7 bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)]"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold/70" />
              {t("energy_balance")}
            </h2>
          </div>

          {(() => {
            // Sort elements by value descending
            const sortedElements = [...elements].sort((a, b) => b.value - a.value);
            const maxVal = sortedElements[0].value || 1; // Prevent division by zero

            const renderElement = (el: any, rank: number) => {
              const isCenter = rank === 0;
              
              // Map rank to responsive Tailwind size classes
              // Center is largest, 2&3 are medium, 4&5 are smallest
              let sizeClasses = "";
              if (isCenter) {
                sizeClasses = "w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40";
              } else if (rank === 1 || rank === 2) {
                sizeClasses = "w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28";
              } else {
                sizeClasses = "w-14 h-14 sm:w-16 sm:h-16 md:w-24 md:h-24";
              }

              return (
                <motion.div 
                  key={el.id} 
                  className={`flex flex-col items-center group cursor-pointer ${isCenter ? 'z-30' : 'z-10 hover:z-40'}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.2 + rank * 0.1 }}
                >
                  <div
                    className={`relative rounded-full overflow-hidden border-2 ${isCenter ? 'border-gold shadow-[0_0_30px_rgba(212,175,55,0.4)]' : 'border-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.15)]'} mb-2 transition-transform duration-300 group-hover:scale-110 ${sizeClasses}`}
                  >
                    <Image 
                      src={`/images/element_${el.id}.webp.jpg`} 
                      alt={el.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 160px, 160px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
                    
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isCenter ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 bg-black/50 backdrop-blur-[2px]'}`}>
                      <span className={`text-white font-mono font-bold shadow-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${isCenter ? 'text-lg sm:text-xl md:text-2xl' : 'text-xs sm:text-sm'}`}>
                        {el.value}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <span className={`block text-gray-200 font-sans font-semibold tracking-wide ${isCenter ? 'text-base sm:text-lg text-gold' : 'text-[10px] sm:text-xs'}`}>
                      {el.name}
                    </span>
                    {!isCenter && (
                      <span className="block text-gold/80 font-mono text-[10px] mt-0.5">{el.value}%</span>
                    )}
                  </div>
                </motion.div>
              );
            };

            return (
              <div className="relative flex flex-col items-center justify-center min-h-[300px] py-6 overflow-hidden">
                {/* Top Row: Rank 2 and 3 */}
                <div className="flex justify-center gap-8 sm:gap-16 md:gap-24 mb-[-20px] sm:mb-[-40px]">
                  {renderElement(sortedElements[1], 1)}
                  {renderElement(sortedElements[2], 2)}
                </div>
                
                {/* Center Row: Rank 1 (Largest) */}
                <div className="relative z-30">
                  {renderElement(sortedElements[0], 0)}
                </div>

                {/* Bottom Row: Rank 4 and 5 */}
                <div className="flex justify-center gap-6 sm:gap-12 md:gap-20 mt-[-20px] sm:mt-[-40px]">
                  {renderElement(sortedElements[3], 3)}
                  {renderElement(sortedElements[4], 4)}
                </div>
              </div>
            );
          })()}
        </motion.div>

        {/* Recent Reports Grid */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-5 flex flex-col gap-6"
        >
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)] flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-gold/70" />
                {t("recent_reports")}
              </h2>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-gold">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <span className="text-sm font-sans">{t("loading_text")}</span>
                </div>
              ) : reports.length === 0 ? (
                savedResult ? (
                  <Link href="/result" className="block w-full">
                    <motion.div
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
                      className="p-4 rounded-2xl bg-black/40 border border-white/5 cursor-pointer transition-colors group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-sans uppercase tracking-wider font-semibold text-gold bg-white/5 px-2 py-0.5 rounded-full">
                          Blueprint
                        </span>
                        <div className="flex items-center gap-1 text-gray-500 text-[10px] font-mono">
                          <Calendar className="w-3 h-3" />
                          {savedResult.savedAt ? new Date(savedResult.savedAt).toLocaleDateString() : t("recent")}
                        </div>
                      </div>
                      <h3 className="font-serif text-lg text-white group-hover:text-gold transition-colors">
                        {t("report_title") || "Destiny Blueprint"}
                      </h3>
                      <div className="mt-3 flex items-center text-xs font-sans text-gray-400 group-hover:text-gold/80 transition-colors">
                        {t("view_report")} <ArrowRight className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                      </div>
                    </motion.div>
                  </Link>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center p-8 rounded-2xl bg-black/40 border border-white/5 text-center"
                  >
                    <Compass className="w-10 h-10 text-gold/30 mb-3" />
                    <h3 className="font-serif text-lg text-white mb-1">{t("empty_title")}</h3>
                    <p className="font-sans text-xs sm:text-sm text-gray-400 mb-4">
                      {t("empty_desc")}
                    </p>
                    <Link href="/input-destiny">
                      <button className="px-5 py-2 rounded-full bg-gold/10 border border-gold/40 text-gold text-sm font-sans hover:bg-gold/20 transition-colors">
                        {t("empty_cta")}
                      </button>
                    </Link>
                  </motion.div>
                )
              ) : (
                reports.slice(0, visibleCount).map((report) => {
                  const date = new Date(report.created_at).toLocaleDateString();
                  const isChat = report.type === "Chat";
                  const reportTitle = isChat 
                    ? t("chat_report_title", { masterName: report.content?.masterName || "Master" })
                    : t("report_title") || "Destiny Blueprint";
                  
                  const cardContent = (
                    <motion.div
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
                      className="p-4 rounded-2xl bg-black/40 border border-white/5 cursor-pointer transition-colors group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-sans uppercase tracking-wider font-semibold text-gold bg-white/5 px-2.5 py-0.5 rounded-full">
                          {isChat ? <MessageCircle className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          {report.type}
                        </span>
                        <div className="flex items-center gap-1 text-gray-500 text-[10px] font-mono">
                          <Calendar className="w-3 h-3" />
                          {date}
                        </div>
                      </div>
                      <h3 className="font-serif text-lg text-white group-hover:text-gold transition-colors">
                        {reportTitle}
                      </h3>
                      {isChat && report.content?.userMessage && (
                        <p className="mt-1.5 text-xs font-sans text-gray-400 line-clamp-1 italic">
                          "{report.content.userMessage}"
                        </p>
                      )}
                      <div className="mt-3 flex items-center text-xs font-sans text-gray-400 group-hover:text-gold/80 transition-colors">
                        {isChat ? t("read_whisper") : t("view_report")} <ArrowRight className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                      </div>
                    </motion.div>
                  );

                  if (isChat) {
                    return (
                      <div key={report.id} onClick={() => setSelectedChatReport(report)} className="block w-full">
                        {cardContent}
                      </div>
                    );
                  }

                  return (
                    <Link key={report.id} href="/result" className="block w-full">
                      {cardContent}
                    </Link>
                  );
                })
              )}
            </div>
            
            {reports.length > 3 && (
              <div className="flex gap-3 mt-6">
                {visibleCount < reports.length && (
                  <button 
                    onClick={() => setVisibleCount(prev => prev + 5)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-sans text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {t("load_more", { count: reports.length - visibleCount })}
                  </button>
                )}
                {visibleCount > 3 && (
                  <button 
                    onClick={() => setVisibleCount(3)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-sans text-gray-400 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {t("collapse")}
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>

      </div>

      {/* Quick Actions — 1:1 match with sidebar order */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {/* ① 나의 운명 (홈) */}
        <Link href="/dashboard" className="block">
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-5 hover:bg-white/[0.06] hover:border-gold/20 transition-all group cursor-pointer flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gold/5 text-gold group-hover:bg-gold/10 transition-colors">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <p className="font-sans text-sm font-bold text-white">{t("nav_destiny")}</p>
              <p className="font-sans text-xs text-gray-500 mt-0.5">{t("sub_home")}</p>
            </div>
          </div>
        </Link>
        {/* ② 사주 분석 (새 리딩) */}
        <Link href="/select-master" className="block">
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-5 hover:bg-white/[0.06] hover:border-gold/20 transition-all group cursor-pointer flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/5 text-purple-400 group-hover:bg-purple-500/10 transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-sans text-sm font-bold text-white">{t("nav_new_reading")}</p>
              <p className="font-sans text-xs text-gray-500 mt-0.5">{t("sub_new_reading")}</p>
            </div>
          </div>
        </Link>
        {/* ③ 마스터 상담 (채팅) */}
        <Link href={savedMasterId ? `/chat?masterId=${savedMasterId}` : "/select-master?mode=chat"} className="block">
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-5 hover:bg-white/[0.06] hover:border-gold/20 transition-all group cursor-pointer flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/5 text-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-sans text-sm font-bold text-white">{t("nav_chat")}</p>
              <p className="font-sans text-xs text-gray-500 mt-0.5">{t("sub_chat")}</p>
            </div>
          </div>
        </Link>
        {/* ④ 에너지 싱크 (궁합 분석) */}
        <Link href="/sync" className="block">
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-5 hover:bg-white/[0.06] hover:border-gold/20 transition-all group cursor-pointer flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/5 text-blue-400 group-hover:bg-blue-500/10 transition-colors">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="font-sans text-sm font-bold text-white">{t("nav_sync")}</p>
              <p className="font-sans text-xs text-gray-500 mt-0.5">{t("sub_sync")}</p>
            </div>
          </div>
        </Link>
        {/* ⑤ 내 정보관리 */}
        <Link href="/dashboard/profile" className="block">
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-5 hover:bg-white/[0.06] hover:border-gold/20 transition-all group cursor-pointer flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-500/5 text-violet-400 group-hover:bg-violet-500/10 transition-colors">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-sans text-sm font-bold text-white">{t("nav_profile")}</p>
              <p className="font-sans text-xs text-gray-500 mt-0.5">{t("sub_profile")}</p>
            </div>
          </div>
        </Link>
        {/* ⑥ 이용 가이드 */}
        <Link href="/guide" className="block">
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-5 hover:bg-white/[0.06] hover:border-gold/20 transition-all group cursor-pointer flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/5 text-amber-400 group-hover:bg-amber-500/10 transition-colors">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="font-sans text-sm font-bold text-white">{t("nav_guide")}</p>
              <p className="font-sans text-xs text-gray-500 mt-0.5">{t("sub_guide")}</p>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Chat Report Modal */}
      {selectedChatReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl bg-[#0a0a0a] border border-gold/20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col max-h-[90dvh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold/10 rounded-full">
                  <MessageCircle className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-white leading-tight">
                    Whisper with {selectedChatReport.content?.masterName || "Master"}
                  </h3>
                  <p className="text-xs font-mono text-gray-500 mt-0.5">
                    {new Date(selectedChatReport.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedChatReport(null)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {/* User Question */}
              {selectedChatReport.content?.userMessage && (
                <div className="flex w-full justify-end">
                  <div className="max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl leading-relaxed text-sm sm:text-base font-sans bg-gradient-to-r from-gold/10 to-gold/5 border border-gold/30 text-white rounded-tr-none shadow-[0_4px_15px_rgba(212,175,55,0.05)]">
                    {selectedChatReport.content.userMessage}
                  </div>
                </div>
              )}

              {/* Master Response */}
              {selectedChatReport.content?.aiResponse && (
                <div className="flex w-full justify-start">
                  <div className="max-w-[95%] sm:max-w-[85%] p-5 rounded-2xl leading-relaxed text-sm sm:text-base font-sans bg-white/[0.03] backdrop-blur-xl border border-white/5 text-gray-300 rounded-tl-none shadow-[0_8px_32px_rgba(0,0,0,0.2)] whitespace-pre-wrap">
                    {/* Render basic markdown-like formatting if present */}
                    {selectedChatReport.content.aiResponse.split('\n').map((line: string, i: number) => {
                      if (line.startsWith('## ')) {
                        return <h4 key={i} className="text-gold font-serif text-base sm:text-lg font-bold mt-4 mb-2">{line.replace('## ', '')}</h4>;
                      } else if (line.startsWith('### ')) {
                        return <h5 key={i} className="text-white/90 font-serif text-sm sm:text-base font-semibold mt-3 mb-1">{line.replace('### ', '')}</h5>;
                      } else if (line.startsWith('- ') || line.startsWith('• ')) {
                        return (
                          <div key={i} className="flex items-start gap-2 ml-1 my-1">
                            <span className="text-gold/60 mt-1 flex-shrink-0 text-[10px]">◆</span>
                            <span className="text-gray-300">{line.substring(2)}</span>
                          </div>
                        );
                      } else if (line.trim() === '') {
                        return <div key={i} className="h-2" />;
                      }
                      return <p key={i} className="my-1">{line}</p>;
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
              <Link href={`/chat?masterId=${MASTERS.find(m => m.name === selectedChatReport.content?.masterName)?.id || 5}`}>
                <button className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-gold to-[#a68625] text-black font-sans font-bold text-sm rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-[1.02] transition-transform">
                  <MessageCircle className="w-4 h-4" />
                  Continue Chatting
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
}
