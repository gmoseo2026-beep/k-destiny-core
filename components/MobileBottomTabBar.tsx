"use client";

import React, { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { Home, Heart, Sparkles, FolderHeart } from "lucide-react";
import { trackEvent } from "@/lib/gtag";

/**
 * 기존 하단 고정 버튼(결제·미리보기 CTA 바)이나 집중 입력 퍼널이 있는 경로에서는
 * 모바일 하단 떠 있는 탭바를 숨겨 버튼 겹침을 원천 차단한다.
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

export type MobileTabId = "home" | "compat" | "fortune" | "me";

export function activeMobileTabForPath(pathname: string | null | undefined): MobileTabId {
  const p = pathname || "/";
  if (p.startsWith("/compat")) return "compat";
  if (p.startsWith("/fortune")) return "fortune";
  if (p.startsWith("/me") || p.startsWith("/dashboard") || p.startsWith("/report")) return "me";
  return "home";
}

const TABS: Array<{
  id: MobileTabId;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "home", label: "홈", href: "/", icon: Home },
  { id: "compat", label: "궁합", href: "/compat/new", icon: Heart },
  { id: "fortune", label: "내 운세", href: "/fortune/annual?year=2027", icon: Sparkles },
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
      aria-label="모바일 하단 메뉴"
      aria-hidden={footerVisible}
      className={`sm:hidden fixed bottom-2.5 left-3 right-3 z-30 pointer-events-none transition-all duration-200 pb-safe-bar ${
        footerVisible ? "translate-y-24 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="pointer-events-auto mx-auto grid max-w-[440px] grid-cols-4 gap-1 rounded-2xl border border-line/90 bg-white/95 px-2 py-1.5 shadow-[0_8px_28px_rgba(43,36,48,0.14)] backdrop-blur-md">
        {TABS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;
          return (
            <Link
              key={item.id}
              href={item.href}
              tabIndex={footerVisible ? -1 : 0}
              onClick={() =>
                trackEvent("mobile_tab_click", {
                  tab: item.id,
                  href: item.href,
                })
              }
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-center transition-all active:scale-[0.96] ${
                isActive
                  ? "bg-coral-soft/80 text-coral-deep font-extrabold"
                  : "text-caption hover:text-ink font-semibold"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  isActive ? "text-coral stroke-[2.4]" : "text-caption stroke-[2]"
                }`}
              />
              <span className="text-[11px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
