"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";
import type { GlobalCoupleLocale } from "@/lib/globalCoupleLocale";

interface GlobalChromeProps {
  locale: GlobalCoupleLocale;
  shareToken?: string;
  children: React.ReactNode;
}

const LANG_LINKS: { code: "en" | "ja" | "zh" | "ko"; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
];

export default function GlobalChrome({
  locale,
  shareToken,
  children,
}: GlobalChromeProps) {
  const buildLangHref = (code: "en" | "ja" | "zh" | "ko") => {
    if (code === "ko") {
      return shareToken ? `/ko/compat/${shareToken}` : "/ko/compat/new";
    }
    return shareToken ? `/${code}/couple/${shareToken}` : `/${code}/couple`;
  };

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] flex flex-col bg-[#FFF6F1]">
      {/* Fixed Global Top Header */}
      <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-line/60">
        <div className="max-w-[480px] mx-auto h-full px-4 flex items-center justify-between gap-2">
          <Link
            href={`/${locale}/couple`}
            className="flex items-center gap-1.5 shrink-0 transition-transform duration-150 active:scale-[0.96]"
          >
            <div className="w-7 h-7 relative shrink-0">
              <Image
                src="/mascot/transparent/couple_red_thread.webp"
                alt="kongdak"
                width={28}
                height={28}
                className="object-contain"
                priority
              />
            </div>
            <span className="font-extrabold text-base text-[#2B2430] tracking-tight">
              kongdak
            </span>
          </Link>

          <nav
            aria-label="Language switcher"
            className="flex items-center gap-1 text-[11px] font-bold"
          >
            {LANG_LINKS.map((item, idx) => {
              const isActive = item.code === locale;
              return (
                <React.Fragment key={item.code}>
                  {idx > 0 && <span className="text-line select-none">|</span>}
                  <Link
                    href={buildLangHref(item.code)}
                    className={`px-1.5 py-1 rounded-md transition-colors ${
                      isActive
                        ? "text-[#FF5C77] font-extrabold bg-[#FFF0F3]"
                        : "text-caption hover:text-[#2B2430]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-[480px] mx-auto px-4 py-6">
        {children}
      </div>

      {/* Global English Footer */}
      <footer className="w-full border-t border-line bg-white text-caption py-7 px-4 mt-auto">
        <div className="max-w-[480px] mx-auto text-center space-y-3">
          <nav
            aria-label="Legal navigation"
            className="flex items-center justify-center gap-3 text-xs font-semibold"
          >
            <Link
              href={`/${locale}/legal/terms`}
              className="hover:text-[#2B2430] transition-colors"
            >
              Terms
            </Link>
            <span className="text-line">|</span>
            <Link
              href={`/${locale}/legal/privacy`}
              className="font-bold text-[#2B2430] hover:text-[#FF5C77] transition-colors"
            >
              Privacy
            </Link>
            <span className="text-line">|</span>
            <Link
              href={`/${locale}/legal/refund`}
              className="hover:text-[#2B2430] transition-colors"
            >
              Refund
            </Link>
          </nav>

          <div className="space-y-1 text-[11px] leading-relaxed text-caption">
            <div className="flex items-center justify-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#FF5C77] shrink-0" />
              <a
                href="mailto:help@kongdak.kr"
                className="hover:text-[#FF5C77] transition-colors"
              >
                help@kongdak.kr
              </a>
            </div>
            <p>
              Company: DI Company (디아이컴퍼니) | CEO: Soo-kyung Choi (최수경) |
              Business Reg. No.: 263-08-01950 | E-Commerce Permit:
              2021-Seoul-Seodaemun-1718 (제2021-서울서대문-1718호) | Address: 100,
              Hongeun-jungang-ro 1-gil, Seodaemun-gu, Seoul, Republic of Korea
            </p>
          </div>

          <p className="text-[10px] text-caption/70 pt-2 border-t border-line/60">
            © 2026 kongdak (DI Company). All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
