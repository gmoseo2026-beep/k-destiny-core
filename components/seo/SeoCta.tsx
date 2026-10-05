"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/gtag";

/**
 * 검색용 페이지(띠 궁합·출생연도 운세)에서 실제 서비스로 넘기는 버튼.
 * GA4: seo_cta_click { page, target } — 검색 유입이 무료 결과로 얼마나 넘어가는지 본다.
 */
interface SeoCtaProps {
  href: string;
  /** 어느 페이지에서 눌렀는지(예: zodiac:rat-ox, year:1995) */
  page: string;
  /** 어디로 가는지(예: compat, annual_2027) */
  target: string;
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

export default function SeoCta({ href, page, target, variant = "primary", children }: SeoCtaProps) {
  const cls =
    variant === "primary"
      ? "bg-coral text-white shadow-[0_4px_16px_rgba(255,92,119,0.25)]"
      : "border border-line bg-white text-ink";
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={() => trackEvent("seo_cta_click", { page, target })}
      className={`flex w-full items-center justify-center gap-1.5 rounded-2xl px-6 py-4 text-base font-bold transition-all active:scale-[0.96] ${cls}`}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
