"use client";

import React, { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";
import LoginButton from "./LoginButton";
import { useSession } from "next-auth/react";
import KongdakMascot from "./KongdakMascot";

export default function Navbar() {
  const t = useTranslations("Dashboard");
  const { data: session } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 pt-3 pointer-events-none transition-all duration-150">
      <nav
        className={`max-w-screen-md mx-auto pointer-events-auto rounded-[20px] transition-all duration-150 px-3.5 sm:px-5 py-2.5 flex items-center justify-between border border-white/55 ${
          isScrolled
            ? "bg-[#FFF6F1]/85 shadow-[0_8px_32px_rgba(181,71,96,0.15)]"
            : "bg-[#FFF6F1]/65 shadow-[0_6px_24px_rgba(181,71,96,0.10)]"
        }`}
        style={{
          backdropFilter: "blur(16px) saturate(140%)",
          WebkitBackdropFilter: "blur(16px) saturate(140%)",
        }}
      >
        {/* Left: Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group transition-transform duration-150 active:scale-[0.97]"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 relative flex items-center justify-center">
            <KongdakMascot size={32} animate="none" priority={true} />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-serif font-bold text-base sm:text-lg text-[#2B2430] leading-none tracking-tight">
              콩닥
            </span>
          </div>
        </Link>

        {/* Right: Clean Text Navigation */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* 2026 Annual Fortune Link */}
          <Link
            href="/fortune/annual"
            className="px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold text-coral hover:bg-coral/10 transition-colors duration-150 whitespace-nowrap active:scale-[0.97]"
          >
            2026 총운
          </Link>

          {/* Weekly Fortune Link (Desktop / Tablet visible) */}
          <Link
            href="/fortune/weekly"
            className="hidden sm:inline-flex px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold text-plum hover:bg-cream hover:text-coral transition-colors duration-150 whitespace-nowrap active:scale-[0.97]"
          >
            이번 주 운세
          </Link>

          {/* Pricing Link */}
          <Link
            href="/pricing"
            className="px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold text-gray-500 hover:text-foreground hover:bg-black/5 transition-colors duration-150 whitespace-nowrap active:scale-[0.97]"
          >
            요금안내
          </Link>

          {/* Admin Link — strictly visible to ADMIN */}
          {session && (session.user as any)?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="px-2.5 py-1.5 rounded-full text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors duration-150 flex items-center gap-1 whitespace-nowrap active:scale-[0.97]"
            >
              <Shield className="w-3 h-3 text-red-500" />
              <span className="hidden md:inline">관리자</span>
            </Link>
          )}

          {/* Login / Profile Button */}
          <div className="ml-1 sm:ml-1.5">
            <LoginButton />
          </div>
        </div>
      </nav>
    </header>
  );
}
