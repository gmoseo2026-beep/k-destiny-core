"use client";

import React, { useState, useEffect } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { useSession } from "next-auth/react";
import { Menu, X, User as UserIcon, Shield } from "lucide-react";
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

export default function Navbar({ visibleProducts = [] }: NavbarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close drawer on path change without cascading effect
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  }

  // Check if current page is Home
  const isHome = pathname === "/" || pathname === "";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-200 ${
          isHome
            ? isScrolled
              ? "bg-[#FFE3EA]/95 shadow-xs backdrop-blur-md border-b border-line/60"
              : "bg-[#FFE3EA]"
            : isScrolled
            ? "bg-white/95 shadow-xs backdrop-blur-md border-b border-line/60"
            : "bg-white border-b border-line/40"
        }`}
      >
        <div className="max-w-[480px] mx-auto h-14 px-4 flex items-center justify-between">
          {/* Left: Menu Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="전체 메뉴 열기"
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-ink hover:bg-black/5 transition-all duration-150 active:scale-[0.96]"
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
            <span className="font-extrabold text-lg text-ink tracking-tight">
              콩닥
            </span>
          </Link>

          {/* Right: My / Login Profile */}
          <div className="flex items-center gap-1">
            {session && (session.user as { role?: string })?.role === "ADMIN" && (
              <Link
                href="/admin"
                aria-label="관리자 페이지"
                className="w-8 h-8 rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 transition-all duration-150 active:scale-[0.96]"
              >
                <Shield className="w-4 h-4" />
              </Link>
            )}

            <Link
              href={session ? "/me" : "/login"}
              aria-label={session ? "마이페이지 보관함" : "로그인"}
              className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-ink hover:bg-black/5 transition-all duration-150 active:scale-[0.96]"
            >
              <UserIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Menu Drawer / Sheet */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-out Menu Panel */}
          <div className="relative w-full max-w-[320px] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-line">
              <div className="flex items-center gap-2">
                <Image
                  src="/mascot/transparent/couple_red_thread.webp"
                  alt="콩닥"
                  width={24}
                  height={24}
                  className="object-contain"
                />
                <span className="font-extrabold text-base text-ink">전체 메뉴</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label="메뉴 닫기"
                className="w-9 h-9 rounded-full flex items-center justify-center text-caption hover:text-ink hover:bg-surface transition-all duration-150 active:scale-[0.96]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Links List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Quick Navigation */}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/compat/new"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-3 bg-coral-soft text-coral-deep rounded-2xl text-xs font-bold text-center active:scale-[0.97]"
                >
                  ❤️ 정통 궁합
                </Link>
                <Link
                  href="/fortune/annual"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-3 bg-surface-soft text-ink rounded-2xl text-xs font-bold text-center active:scale-[0.97]"
                >
                  📅 2026 총운
                </Link>
              </div>

              {/* All Products Grouped */}
              <div className="pt-2">
                <h3 className="text-xs font-extrabold text-caption mb-2 px-1">
                  운세 & 궁합 콘텐츠
                </h3>
                <div className="space-y-1">
                  {visibleProducts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-soft text-ink transition-colors active:scale-[0.98]"
                    >
                      <div className="w-7 h-7 relative shrink-0">
                        <Image
                          src={p.icon3d}
                          alt=""
                          width={28}
                          height={28}
                          className="object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{p.name}</div>
                        <div className="text-[10px] text-caption truncate">
                          {p.gridLabel || p.hook}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-line bg-surface-soft">
              {session ? (
                <Link
                  href="/me"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full py-2.5 bg-white text-ink border border-line rounded-xl font-bold text-xs text-center block shadow-2xs active:scale-[0.97]"
                >
                  내 보관함 보기
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full py-2.5 bg-coral text-white rounded-xl font-bold text-xs text-center block shadow-xs active:scale-[0.97]"
                >
                  로그인 / 시작하기
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
