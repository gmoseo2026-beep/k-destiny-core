"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Shield } from "lucide-react";
import LoginButton from "./LoginButton";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import KongdakMascot from "./KongdakMascot";

// 로케일 선택 UI 는 두지 않는다. 콩닥 Phase A 는 국내 전용이고
// en/ja/es/de/fr 은 동면(비노출) 상태라 전환 진입점을 노출하지 않는다.
export default function Navbar() {
  const t = useTranslations("Dashboard");
  const { data: session } = useSession();

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-[#FFF6F1]/80 backdrop-blur-md border-b border-[#2B2430]/8">
      <div className="flex items-center justify-between p-3 sm:p-4 max-w-7xl mx-auto">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 transition-transform hover:scale-105 active:scale-95">
          <div className="w-8 h-8 sm:w-9 sm:h-9 relative">
            <KongdakMascot size={36} animate="none" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-serif font-bold text-lg sm:text-xl text-ink leading-none">콩닥</span>
            <span className="font-sans font-bold text-[9px] sm:text-[10px] text-coral tracking-widest uppercase mt-0.5">kongdak</span>
          </div>
        </Link>

        {/* Right side actions */}
        <div className="flex items-center justify-end gap-2 sm:gap-3">



        {/* Fortune Dashboard Link */}
        <Link href="/fortune/weekly">
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#FFF6F1] border border-[#FFD9E0] hover:border-[#FF8AA1] shadow-sm active:scale-95 transition-all duration-150"
          >
            <span className="text-sm">🔮</span>
            <span className="font-sans text-xs font-bold text-[#6A2C70] whitespace-nowrap">
              이번 주 운세
            </span>
          </motion.button>
        </Link>

        {/* Pricing Link */}
        <Link href="/pricing">
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white border border-[#FFD9E0] hover:border-[#FF8AA1] shadow-sm active:scale-95 transition-all duration-150"
          >
            <span className="font-sans text-xs font-bold text-[#FF5C77] whitespace-nowrap">
              요금안내
            </span>
          </motion.button>
        </Link>

        {/* Admin Dashboard — strictly visible to ADMIN role only */}
        {session && (session.user as any)?.role === 'ADMIN' && (
          <Link href="/admin">
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-red-50 border border-red-200 hover:border-red-300 hover:bg-red-100 shadow-sm group active:scale-95 transition-all duration-150 ease-in-out transform-gpu"
            >
              <Shield className="w-3.5 h-3.5 text-red-500 group-hover:text-red-600" />
              <span className="hidden sm:block font-sans text-xs font-medium text-red-600 group-hover:text-red-700 tracking-wide">
                관리자
              </span>
            </motion.button>
          </Link>
        )}

        {/* NextAuth Login Button */}
        <LoginButton />
        </div>
      </div>
    </div>
  );
}
