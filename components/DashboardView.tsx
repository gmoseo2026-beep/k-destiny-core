"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/routing";
import { Heart, ArrowRight, BookOpen, Sparkles, Bell, Check } from "lucide-react";
import KongdakMascot from "@/components/KongdakMascot";
import { subscribeToPush } from "@/lib/push";

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

interface CompatItem {
  id: string;
  shareToken: string;
  relation: string;
  score: number;
  keywords: string[];
  createdAt: string;
  personA: { name: string; gender: string };
  personB: { name: string; gender: string };
}

export default function DashboardView() {
  const t = useTranslations("Dashboard");
  const { data: session } = useSession();
  const [historyItems, setHistoryItems] = useState<CompatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
      if (Notification.permission === "granted") {
        subscribeToPush();
      }
    }
  }, [session]);

  const handleEnableNotif = async () => {
    const res = await subscribeToPush();
    if (res.success && typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  };

  useEffect(() => {
    if (session?.user) {
      setLoading(true);
      fetch("/api/compat")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data?.items)) {
            setHistoryItems(data.items);
          }
        })
        .catch((err) => {
          console.error("Failed to load compat history:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [session]);

  const firstName = session?.user?.name?.split(" ")[0] || t("guest_name");

  return (
    <main className="min-h-[70vh] w-full bg-background px-4 sm:px-6 py-10 sm:py-14">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-3xl mx-auto"
      >
        {/* Greeting */}
        <motion.div variants={itemVariants} className="flex items-center gap-4 mb-8">
          <KongdakMascot size={56} animate="none" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-ink">
              {t("welcome", { name: firstName })}
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">{t("subtitle")}</p>
          </div>
        </motion.div>

        {/* Primary action — new compatibility reading */}
        <motion.div variants={itemVariants}>
          <Link href="/compat/new" className="block group">
            <div className="rounded-3xl bg-gradient-to-br from-coral-light via-coral to-plum p-6 sm:p-8 text-white shadow-lg shadow-coral/25 border border-white/30">
              <div className="flex items-center gap-2 text-white/90 text-xs font-bold mb-3">
                <Sparkles className="w-4 h-4" />
                <span>{t("cta_badge")}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2">
                {t("cta_title")}
              </h2>
              <p className="text-sm text-white/85 leading-relaxed mb-5">
                {t("cta_desc")}
              </p>
              <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2.5 text-sm font-bold border border-white/25">
                <Heart className="w-4 h-4 fill-white" />
                {t("cta_button")}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>
        </motion.div>

        {/* Notification card if not granted */}
        {notifPermission === "default" && (
          <motion.div variants={itemVariants} className="mt-4">
            <div className="flex items-center justify-between rounded-2xl bg-white border border-[#FF8AA1]/30 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF6F1] flex items-center justify-center text-[#FF5C77] flex-shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-[#2B2430]">운세 & 궁합 알림 받기</p>
                  <p className="text-[11px] text-gray-500">새로운 운세 소식을 실시간 푸시로 받아보세요 💘</p>
                </div>
              </div>
              <button
                onClick={handleEnableNotif}
                className="bg-[#FF5C77] text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform flex-shrink-0"
              >
                알림 켜기
              </button>
            </div>
          </motion.div>
        )}

        {/* History section */}
        <motion.div
          variants={itemVariants}
          className="mt-6 rounded-3xl bg-white border border-[#FFD9E0]/50 p-6 sm:p-8 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-ink">{t("history_title")}</h3>
            {historyItems.length > 0 && (
              <span className="text-xs text-[#6A2C70] font-semibold bg-[#FFD9E0]/40 px-2.5 py-0.5 rounded-full">
                {historyItems.length}개
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-4 text-center text-xs text-gray-400">궁합 기록을 불러오는 중...</div>
          ) : historyItems.length > 0 ? (
            <div className="space-y-3 mt-4">
              {historyItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/compat/${item.shareToken}`}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#FFF6F1]/60 border border-[#FFD9E0]/40 hover:bg-[#FFF6F1] hover:border-coral/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-coral-light to-coral flex items-center justify-center text-white font-black text-sm shadow-sm flex-shrink-0">
                      {item.score}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-ink group-hover:text-coral transition-colors flex items-center gap-1.5">
                        <span>{item.personA.name}</span>
                        <span className="text-coral text-xs">❤️</span>
                        <span>{item.personB.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{item.keywords.slice(0, 2).join(" · ")}</span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 group-hover:text-coral transition-all flex-shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 leading-relaxed">{t("history_desc")}</p>
          )}
        </motion.div>

        {/* Guide link */}
        <motion.div variants={itemVariants} className="mt-6">
          <Link
            href="/guide"
            className="flex items-center justify-between rounded-2xl bg-white border border-[#2B2430]/8 px-5 py-4 shadow-sm hover:border-coral/40 hover:bg-coral/[0.03] transition-colors group"
          >
            <span className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-coral" />
              <span className="text-sm font-semibold text-ink">{t("guide_link")}</span>
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 group-hover:text-coral transition-all" />
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
