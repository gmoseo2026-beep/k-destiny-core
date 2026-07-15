"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Menu, 
  X, 
  LogOut, 
  Compass, 
  Zap, 
  FileText, 
  Settings,
  MessageSquare,
  User,
  BookOpen,
  Crown,
  Flame,
  Star
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import LanguageSelector from "@/components/LanguageSelector";
import { getMaster, saveMaster, clearAllUserData } from "@/lib/userStateManager";
import LoginButton from "@/components/LoginButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("destiny");
  const [savedMasterId, setSavedMasterId] = useState<number | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    // Phase 1: localStorage 스켈레톤
    setSavedMasterId(getMaster());

    // Phase 2: DB가 Source of Truth (로그인 사용자)
    if (session?.user?.id) {
      fetch('/api/user/saju-profile', { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.profile?.selectedMasterId) {
            setSavedMasterId(data.profile.selectedMasterId);
            saveMaster(data.profile.selectedMasterId);
          }
        })
        .catch(() => { /* localStorage 폴백 유지 */ });
    }
  }, [session]);

  const handleSignOut = async () => {
    // Nuclear cleanup: wipe ALL user-specific client state
    clearAllUserData();
    // Destroy NextAuth server session + cookies, then hard-redirect to home
    await signOut({ callbackUrl: "/", redirect: true });
  };

  const navItems = [
    { id: "destiny", label: t("nav_destiny"), icon: Compass, href: "/dashboard" },
    { id: "new-reading", label: t("nav_new_reading"), icon: Sparkles, href: "/select-master" },
    { id: "chat", label: t("nav_chat"), icon: MessageSquare, href: savedMasterId ? `/chat?masterId=${savedMasterId}` : "/select-master?mode=chat" },
    { id: "energy", label: t("nav_energy_sync"), icon: Zap, href: "/sync" },
    { id: "profile", label: t("nav_profile"), icon: User, href: "/dashboard/profile" },
    { id: "guide", label: t("nav_guide"), icon: BookOpen, href: "/guide" },
  ];

  return (
    <div className="relative min-h-[100dvh] w-full bg-background flex">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-stardust opacity-10 mix-blend-screen" />
        <div className="absolute top-0 left-[-20%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-dark/20 via-transparent to-transparent blur-[120px]" />
      </div>

      {/* Mobile Header / Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 w-full h-16 z-50 flex items-center justify-between px-3 sm:px-4 bg-background/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Sparkles className="w-5 h-5 text-gold shrink-0" />
          <span className="font-serif text-base sm:text-lg font-bold text-white tracking-wide hidden xs:block">K-Destiny</span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-black/50 border border-gold/30 hover:bg-gold/10 transition-colors"
            >
              <Compass className="w-4 h-4 text-gold/80" />
              <span className="font-sans text-xs font-medium text-gray-200 hidden sm:block">
                {t("nav_destiny")}
              </span>
            </motion.button>
          </Link>
          <div className="scale-90 sm:scale-100 origin-right">
            <LoginButton />
          </div>
          <button 
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="text-gray-300 hover:text-gold transition-colors ml-1"
          >
            {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed lg:static top-0 left-0 h-[100dvh] w-64 lg:w-72 bg-black/40 backdrop-blur-xl border-r border-white/10 z-40 flex flex-col pt-20 lg:pt-8 pb-8 px-6 shadow-[10px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
            {/* Logo area (desktop only) */}
            <div className="hidden lg:flex items-center gap-2 mb-12 pl-2">
              <Sparkles className="w-6 h-6 text-gold" />
              <span className="font-serif text-2xl font-bold text-white tracking-wide">K-Destiny</span>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <Link 
                    key={item.id} 
                    href={item.href}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (window.innerWidth < 1024) setIsMobileOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                      isActive 
                        ? "bg-gold/10 border border-gold/30 shadow-[inset_0_0_20px_rgba(212,175,55,0.1)]" 
                        : "border border-transparent hover:bg-white/5 hover:border-white/10"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-gold" : "text-gray-400 group-hover:text-gold/70"}`} />
                    <span className={`font-sans text-sm tracking-wide ${isActive ? "text-gold font-medium" : "text-gray-300"}`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.div 
                        layoutId="activeTabIndicator"
                        className="absolute left-0 w-1 h-8 bg-gold rounded-r-full"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

              {/* ─── Premium Exclusives Section ─── */}
              <div className="mt-6 mb-4">
                <div className="flex items-center gap-2 px-4 mb-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                  <Crown className="w-3.5 h-3.5 text-gold/60" />
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                </div>
                <p className="px-4 mb-3 text-[10px] font-sans uppercase tracking-[0.2em] font-bold text-gold/50">
                  {t("premium_section")}
                </p>
                <div className="space-y-1.5">
                  {[
                    { id: "karma-report", label: t("nav_karma_report"), icon: Star, href: "/dashboard/premium/karma-report" },
                    { id: "cosmic-alignment", label: t("nav_cosmic_alignment"), icon: Compass, href: "/dashboard/premium/cosmic-alignment" },
                    { id: "fortune-2027", label: t("nav_fortune_2027"), icon: Flame, href: "/dashboard/premium/fortune-2027" },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => {
                          setActiveTab(item.id);
                          if (window.innerWidth < 1024) setIsMobileOpen(false);
                        }}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group ${
                          isActive
                            ? "bg-gold/10 border border-gold/30 shadow-[inset_0_0_20px_rgba(212,175,55,0.1)]"
                            : "border border-transparent hover:bg-gold/5 hover:border-gold/15"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-gold" : "text-gold/40 group-hover:text-gold/70"}`} />
                        <span className={`font-sans text-xs tracking-wide ${isActive ? "text-gold font-medium" : "text-gray-400 group-hover:text-gold/80"}`}>
                          {item.label}
                        </span>
                        <Crown className="w-3 h-3 text-gold/30 ml-auto" />
                      </Link>
                    );
                  })}
                </div>
              </div>

            {/* Language Selector */}
            <div className="mt-auto mb-4">
              <LanguageSelector className="relative w-full justify-center py-2.5 bg-white/5 border-white/10 hover:bg-white/10 transition-colors" />
            </div>

            {/* Sign Out Button */}
            <div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent hover:bg-red-500/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 transition-all duration-300 group"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-sans text-sm tracking-wide">{t("nav_signout")}</span>
              </button>
            </div>
          </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 w-full min-h-0 pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-8 lg:p-12">
          {children}
        </div>
      </main>

    </div>
  );
}
