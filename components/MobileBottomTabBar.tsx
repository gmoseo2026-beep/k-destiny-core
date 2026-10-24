"use client";

import React, { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { Home, Heart, Sparkles, LayoutGrid, FolderHeart } from "lucide-react";
import { trackEvent } from "@/lib/gtag";

/**
 * 하단 고정 버튼(결제·미리보기 CTA 바)이나 집중 입력 퍼널이 있는 경로에서는
 * 모바일 하단 리퀴드 글래스 독을 숨겨 버튼 겹침을 원천 차단한다.
 * 단, `/products`(전체 상품 탐색 페이지)는 독의 "전체" 탭 화면이므로 표시한다.
 */
const HIDDEN_PATH_PREFIXES = [
  "/products/",
  "/compat/",
  "/fortune/new",
  "/fortune/annual",
  "/premium/",
  "/pay/",
  "/checkout/",
  "/welcome",
  "/couple",
  "/legal",
  "/admin",
  "/login",
  "/onboarding",
];

export function shouldShowMobileTabBar(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const normalized = pathname === "" ? "/" : pathname;
  for (const prefix of HIDDEN_PATH_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(prefix)) {
      return false;
    }
  }
  return true;
}

export type MobileTabId = "home" | "compat" | "fortune" | "products" | "me";

export function activeMobileTabForPath(pathname: string | null | undefined): MobileTabId {
  const p = pathname || "/";
  if (p.startsWith("/compat")) return "compat";
  if (p.startsWith("/fortune")) return "fortune";
  if (p === "/products" || p.startsWith("/products")) return "products";
  if (p.startsWith("/me") || p.startsWith("/dashboard") || p.startsWith("/report")) return "me";
  return "home";
}

export const DOCK_TABS: Array<{
  id: MobileTabId;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "home", label: "홈", href: "/", icon: Home },
  { id: "compat", label: "궁합", href: "/compat/new", icon: Heart },
  { id: "fortune", label: "신년·운세", href: "/fortune/annual?year=2027", icon: Sparkles },
  { id: "products", label: "전체", href: "/products", icon: LayoutGrid },
  { id: "me", label: "보관함", href: "/me", icon: FolderHeart },
];

export default function MobileBottomTabBar() {
  const pathname = usePathname();
  const [footerVisible, setFooterVisible] = useState(false);

  const visibleByRoute = shouldShowMobileTabBar(pathname);
  const activeId = activeMobileTabForPath(pathname);

  useEffect(() => {
    if (!visibleByRoute) return;
    const footer = document.querySelector("footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(footer);
    return () => io.disconnect();
  }, [visibleByRoute, pathname]);

  if (!visibleByRoute) return null;

  return (
    <nav
      aria-label="모바일 하단 리퀴드 글래스 독"
      aria-hidden={footerVisible}
      className={`sm:hidden fixed bottom-3 left-3 right-3 z-30 pointer-events-none transition-all duration-200 pb-safe-bar ${
        footerVisible ? "translate-y-24 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="pointer-events-auto mx-auto grid max-w-[440px] grid-cols-5 gap-1 rounded-full bg-[#180E20]/60 backdrop-blur-xl border border-white/20 px-2 py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]">
        {DOCK_TABS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;
          return (
            <Link
              key={item.id}
              href={item.href}
              tabIndex={footerVisible ? -1 : 0}
              onClick={() =>
                trackEvent("dock_tab_click", {
                  tab: item.id,
                  href: item.href,
                })
              }
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-center transition-all active:scale-[0.96] ${
                isActive
                  ? "rounded-full bg-white/15 border border-white/25 text-white font-extrabold"
                  : "rounded-full border border-transparent text-[#B9A9BF] hover:text-[#F6EEF3] font-semibold"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  isActive ? "text-[#FF5C77] stroke-[2.4]" : "text-[#B9A9BF] stroke-[2]"
                }`}
              />
              <span className="text-[10px] leading-tight tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
