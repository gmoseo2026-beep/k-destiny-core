"use client";

import React, { useState, useEffect } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { useSession, signOut } from "next-auth/react";
import {
  Menu,
  X,
  User as UserIcon,
  Shield,
  Ticket,
  BookOpen,
  Headphones,
  FileText,
  LogOut,
  LogIn,
} from "lucide-react";
import Image from "next/image";

export interface NavbarProductItem {
  id: string;
  name: string;
  icon3d: string;
  gridLabel?: string;
  hook?: string;
}

interface NavbarProps {
  visibleProducts?: NavbarProductItem[];
}

export default function Navbar({ visibleProducts }: NavbarProps) {
  void visibleProducts;
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  }

  const isGlobalOrWelcome =
    pathname === "/welcome" ||
    pathname.startsWith("/couple") ||
    pathname.startsWith("/legal");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isGlobalOrWelcome) return null;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-200 ${
          isScrolled
            ? "bg-[#140B18]/90 backdrop-blur-md border-b border-white/[0.08]"
            : "bg-[#140B18] border-b border-transparent"
        }`}
      >
        <div className="max-w-[480px] mx-auto h-14 px-4 flex items-center justify-between">
          {/* Left: Menu Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="메뉴 열기"
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#F6EEF3] hover:bg-white/10 transition-all duration-150 active:scale-[0.96]"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Center: Brand Mascot + Name */}
          <Link
            href="/"
            className="flex items-center gap-1.5 transition-transform duration-150 active:scale-[0.96]"
          >
            <div className="w-7 h-7 relative shrink-0">
              <Image
                src="/mascot/transparent/couple_red_thread.webp"
                alt="콩닥"
                width={28}
                height={28}
                className="object-contain"
                priority
              />
            </div>
            <span className="font-extrabold text-lg text-[#F6EEF3] tracking-tight">
              콩닥
            </span>
          </Link>

          {/* Right: My / Login Profile */}
          <div className="flex items-center gap-1">
            {session && (session.user as { role?: string })?.role === "ADMIN" && (
              <Link
                href="/admin"
                aria-label="관리자 페이지"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#FF5C77] hover:bg-white/10 transition-all duration-150 active:scale-[0.96]"
              >
                <Shield className="w-4 h-4" />
              </Link>
            )}

            <Link
              href={session ? "/me" : "/login"}
              aria-label={session ? "마이페이지 보관함" : "로그인"}
              className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-[#F6EEF3] hover:bg-white/10 transition-all duration-150 active:scale-[0.96]"
            >
              <UserIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Menu Drawer / Sheet */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-[300px] bg-[#140B18] border-r border-white/[0.08] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Image
                  src="/mascot/transparent/couple_red_thread.webp"
                  alt="콩닥"
                  width={24}
                  height={24}
                  className="object-contain"
                />
                <span className="font-extrabold text-base text-[#F6EEF3]">콩닥 안내</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label="메뉴 닫기"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#B9A9BF] hover:text-[#F6EEF3] hover:bg-white/10 transition-all duration-150 active:scale-[0.96]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items (상품 나열 제거 — 내 쿠폰함·이용 안내·고객센터·약관·로그인/로그아웃) */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
              <Link
                href="/me#coupons"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#22142A] px-4 py-3.5 text-sm font-bold text-[#F6EEF3] hover:border-white/20 transition-colors"
              >
                <Ticket className="h-4 w-4 text-[#FFC24B]" />
                <span>내 쿠폰함</span>
              </Link>

              <Link
                href="/guide"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#22142A] px-4 py-3.5 text-sm font-bold text-[#F6EEF3] hover:border-white/20 transition-colors"
              >
                <BookOpen className="h-4 w-4 text-[#B9A9BF]" />
                <span>이용 안내</span>
              </Link>

              <Link
                href="/contact"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#22142A] px-4 py-3.5 text-sm font-bold text-[#F6EEF3] hover:border-white/20 transition-colors"
              >
                <Headphones className="h-4 w-4 text-[#B9A9BF]" />
                <span>고객센터</span>
              </Link>

              <Link
                href="/terms"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#22142A] px-4 py-3.5 text-sm font-bold text-[#F6EEF3] hover:border-white/20 transition-colors"
              >
                <FileText className="h-4 w-4 text-[#B9A9BF]" />
                <span>약관 및 개인정보처리방침</span>
              </Link>
            </nav>

            {/* Drawer Footer: 로그인 / 로그아웃 */}
            <div className="p-4 border-t border-white/[0.08] bg-[#22142A]/60">
              {session ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    void signOut({ callbackUrl: "/" });
                  }}
                  className="w-full py-3 bg-[#22142A] text-[#F6EEF3] border border-white/15 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.97]"
                >
                  <LogOut className="h-4 w-4 text-[#B9A9BF]" />
                  <span>로그아웃</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full py-3 bg-[#FF5C77] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.97]"
                >
                  <LogIn className="h-4 w-4" />
                  <span>로그인 / 시작하기</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
