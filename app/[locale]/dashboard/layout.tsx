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
  BookOpen
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import LanguageSelector from "@/components/LanguageSelector";
import { getMaster } from "@/lib/userStateManager";

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

  useEffect(() => {
    setSavedMasterId(getMaster());
  }, []);

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Clear premium status from localStorage
    localStorage.removeItem("kdestiny_premium");
    router.push("/login");
  };

  const navItems = [
    { id: "destiny", label: t("nav_destiny"), icon: Compass, href: "/dashboard" },
    { id: "profile", label: t("nav_profile"), icon: User, href: "/dashboard/profile" },
    { id: "chat", label: t("nav_chat"), icon: MessageSquare, href: savedMasterId ? `/chat?masterId=${savedMasterId}` : "/select-master?mode=chat" },
    { id: "energy", label: t("nav_energy"), icon: Zap, href: "/sync" },
    { id: "guide", label: t("nav_guide"), icon: BookOpen, href: "/guide" },
    { id: "reports", label: t("nav_reports"), icon: FileText, href: "/dashboard" },
  ];

  return (
    <div className="relative min-h-[100dvh] w-full bg-background overflow-hidden flex">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-stardust opacity-10 mix-blend-screen" />
        <div className="absolute top-0 left-[-20%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-dark/20 via-transparent to-transparent blur-[120px]" />
      </div>

      {/* Mobile Header / Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 w-full h-16 z-50 flex items-center justify-between px-4 bg-background/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" />
          <span className="font-serif text-lg font-bold text-white tracking-wide">K-Destiny</span>
        </div>
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="text-gray-300 hover:text-gold transition-colors"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
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
      <main className="flex-1 relative z-10 w-full h-[100dvh] overflow-y-auto pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-8 lg:p-12">
          {children}
        </div>
      </main>

    </div>
  );
}
