"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Sparkles, Mail } from "lucide-react";

export default function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="relative z-10 w-full border-t border-[#2B2430]/8 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-coral/60" />
            <span className="font-serif text-sm text-gray-500 tracking-wide">
              © 2026 콩닥 (kongdak)
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="font-sans text-xs text-gray-500 hover:text-coral transition-colors tracking-wide uppercase"
            >
              {t("home")}
            </Link>
            <Link
              href="/guide"
              className="font-sans text-xs text-gray-500 hover:text-coral transition-colors tracking-wide uppercase"
            >
              Guide
            </Link>
            <Link
              href="/terms"
              className="font-sans text-xs text-gray-500 hover:text-coral transition-colors tracking-wide uppercase"
            >
              {t("terms")}
            </Link>
            <Link
              href="/privacy"
              className="font-sans text-xs text-gray-500 hover:text-coral transition-colors tracking-wide uppercase"
            >
              {t("privacy")}
            </Link>
          </nav>

          {/* Disclaimer */}
          <p className="font-sans text-[10px] text-gray-600 text-center sm:text-right max-w-[200px]">
            {t("disclaimer")}
          </p>
        </div>

        {/* Support Contact */}
        <div className="mt-6 pt-4 border-t border-[#2B2430]/8 flex items-center justify-center gap-2">
          <Mail className="w-3.5 h-3.5 text-coral/40" />
          <a
            href="mailto:help@kongdak.kr"
            className="font-sans text-xs text-gray-500 hover:text-coral transition-colors tracking-wide"
          >
            help@kongdak.kr
          </a>
        </div>
      </div>

      {/* Mandatory Legal Disclaimer — PG / Merchant of Record Compliance */}
      <div className="w-full border-t border-[#2B2430]/8 bg-[#2B2430]/[0.02] px-4 sm:px-6 py-4">
        <p className="max-w-5xl mx-auto font-sans text-[11px] leading-relaxed text-gray-500 text-center">
          콩닥(kongdak)은 사주 기반 알고리즘으로 궁합·관계 해석을 제공하는 디지털 서비스입니다. 모든 콘텐츠는{" "}
          <span className="font-semibold text-ink">오락 및 자기이해를 위한 참고용</span>이며, 의료·법률·재무 등 전문적 판단을 대체하지 않습니다. 유료 콘텐츠의 청약철회·환불은 관련 법령(전자상거래법) 및 이용약관 제9조에 따릅니다.
        </p>
      </div>
    </footer>
  );
}
