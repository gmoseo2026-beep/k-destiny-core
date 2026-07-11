"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { User, Calendar, Clock, MapPin, Sparkles, ArrowRight, Settings, Crown, Shield, AlertTriangle, X } from "lucide-react";
import { getProfile, getMaster, isPremium, getExpiryStatus, clearProfile, saveProfile } from "@/lib/userStateManager";
import { MASTERS } from "@/lib/masters";
import type { UserProfile } from "@/lib/userStateManager";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
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

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [masterId, setMasterId] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [premium, setPremium] = useState(false);
  const [expiryStatus, setExpiryStatus] = useState<{ isExpired: boolean; expiryDate: string | null; remainingDays: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);

    async function loadProfileData() {
      // ── Phase 1: localStorage 스켈레톤 (즉시 렌더링용) ──
      setProfile(getProfile());
      setMasterId(getMaster());
      setExpiryStatus(getExpiryStatus());

      // ── Phase 2: DB가 Source of Truth (로그인 사용자) ──
      if (session?.user?.id) {
        try {
          const res = await fetch('/api/user/saju-profile', { cache: 'no-store' });
          if (res.ok) {
            const { profile: dbProfile } = await res.json();
            if (dbProfile && (dbProfile.birthYear || dbProfile.name)) {
              const dbData: UserProfile = {
                name: dbProfile.name || '',
                year: dbProfile.birthYear || '',
                month: dbProfile.birthMonth || '',
                day: dbProfile.birthDay || '',
                time: dbProfile.birthTime || '',
                unknownTime: dbProfile.unknownTime ?? false,
                country: dbProfile.country || '',
                city: dbProfile.city || '',
                gender: dbProfile.gender || '',
                savedAt: dbProfile.updatedAt || dbProfile.createdAt || '',
              };
              // ✅ 화면 상태를 DB 데이터로 즉시 교체
              setProfile(dbData);
              // ✅ localStorage 강제 동기화 (DB → localStorage 단방향)
              saveProfile({
                name: dbData.name,
                year: dbData.year,
                month: dbData.month,
                day: dbData.day,
                time: dbData.time,
                unknownTime: dbData.unknownTime,
                country: dbData.country,
                city: dbData.city,
                gender: dbData.gender,
              });
            }
          }
        } catch (err) {
          console.log('[profile] DB fetch failed, using localStorage fallback', err);
        }
      }
      // Phase 3: 비로그인 → localStorage 그대로 유지 (이미 Phase 1에서 로드됨)
    }

    loadProfileData();

    // Derive premium status from NextAuth session (DB-synced), not localStorage
    if (session?.user) {
      setPremium((session.user as any).tier === 'PREMIUM');
      if (session.user.email) {
        setUserEmail(session.user.email);
      }
    }
  }, [session]);

  if (!mounted) return null;

  const selectedMaster = masterId ? MASTERS.find((m) => m.id === masterId) : null;

  const handleResetConfirm = async () => {
    // Clear localStorage
    clearProfile();
    // Clear DB profile too (fire-and-forget)
    if (session?.user?.id) {
      fetch('/api/user/saju-profile', { method: 'DELETE' }).catch(() => {});
    }
    setIsResetModalOpen(false);
    router.push("/input-destiny");
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-gold/70" />
          <span className="text-xs font-sans tracking-widest text-gold/70 uppercase">{t("title")}</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
          {t("title")}
        </h1>
        <p className="font-sans text-gray-400 text-sm sm:text-base">{t("subtitle")}</p>
      </motion.div>

      {/* Section 1: Saju Information */}
      <motion.div
        variants={itemVariants}
        className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)]"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold/70" />
            {t("section_saju")}
          </h2>
          {profile ? (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/40 text-gold text-sm font-sans hover:bg-gold/20 transition-colors"
            >
              {t("btn_change_saju")}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <Link href="/select-master">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/40 text-gold text-sm font-sans hover:bg-gold/20 transition-colors"
              >
                {t("btn_set_saju")}
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          )}
        </div>

        {profile ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={<User className="w-4 h-4" />} label={t("label_name")} value={profile.name} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label={t("label_dob")} value={`${profile.year}. ${profile.month}. ${profile.day}`} />
            <InfoRow icon={<Clock className="w-4 h-4" />} label={t("label_time")} value={profile.unknownTime ? t("unknown_time") : profile.time} />
            <InfoRow icon={<User className="w-4 h-4" />} label={t("label_gender")} value={profile.gender === "Male" ? t("gender_male") : t("gender_female")} />
            <InfoRow icon={<MapPin className="w-4 h-4" />} label={t("label_location")} value={`${profile.city}, ${profile.country}`} />
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 font-sans text-sm">{t("no_saju")}</p>
          </div>
        )}
      </motion.div>

      {/* Section 2: Selected Master */}
      <motion.div
        variants={itemVariants}
        className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)]"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold/70" />
            {t("section_master")}
          </h2>
          <Link href="/select-master?change=true">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/40 text-purple-400 text-sm font-sans hover:bg-purple-500/20 transition-colors"
            >
              {selectedMaster ? t("btn_change_master") : t("btn_set_master")}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </div>

        {selectedMaster ? (
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-gold/30 shadow-[0_0_20px_rgba(212,175,55,0.2)] flex-shrink-0">
              <Image
                src={selectedMaster.imageChecked}
                alt={selectedMaster.name}
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="font-serif text-2xl text-white font-bold mb-1">{selectedMaster.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-sans tracking-widest text-gold/70 uppercase">{t("specialty")}</span>
                <span className="px-3 py-1 rounded-full bg-gold/5 border border-gold/20 text-gold text-xs font-sans">
                  {selectedMaster.specialty}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 font-sans text-sm">{t("no_master")}</p>
          </div>
        )}
      </motion.div>

      {/* Section 3: Account Info */}
      <motion.div
        variants={itemVariants}
        className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)]"
      >
        <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-gold/70" />
          {t("section_account")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon={<User className="w-4 h-4" />} label={t("label_email")} value={userEmail || "—"} />
          <InfoRow
            icon={<Crown className="w-4 h-4" />}
            label={t("label_plan")}
            value={premium ? t("plan_premium") : t("plan_free")}
            highlight={premium}
          />
          {premium && expiryStatus?.expiryDate && (
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label={t("label_expiry")}
              value={`${new Date(expiryStatus.expiryDate).toLocaleDateString()} (D${expiryStatus.remainingDays > 0 ? `-${expiryStatus.remainingDays}` : `+${Math.abs(expiryStatus.remainingDays)}`})`}
              highlight={expiryStatus.remainingDays <= 10}
            />
          )}
        </div>
      </motion.div>

      {/* Saju Reset Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResetModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0f] border border-gold/30 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.15)] overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gold/20 blur-[50px] pointer-events-none" />
              
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-10 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-gold" />
                </div>
                
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white mb-2">
                  {t("reset_saju_title")}
                </h2>
                <p className="text-gray-400 text-sm font-sans mb-6 leading-relaxed">
                  {t("reset_saju_desc")}
                </p>

                <div className="w-full space-y-3">
                  <button
                    onClick={handleResetConfirm}
                    className="w-full py-3 rounded-xl bg-gold text-background font-sans font-bold hover:bg-gold-light transition-colors"
                  >
                    {t("btn_agree_reset")}
                  </button>
                  <button
                    onClick={() => setIsResetModalOpen(false)}
                    className="w-full py-3 rounded-xl border border-white/20 text-white font-sans hover:bg-white/5 transition-colors"
                  >
                    {t("btn_cancel")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Reusable info row component
function InfoRow({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
      <div className="p-2 rounded-lg bg-white/5 text-gold/60 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-sans text-gray-500 uppercase tracking-widest mb-0.5">{label}</p>
        <p className={`text-sm font-sans truncate ${highlight ? "text-gold font-semibold" : "text-white"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
