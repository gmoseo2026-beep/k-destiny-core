"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";

export default function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="relative z-10 w-full border-t border-line bg-surface text-caption py-8 px-4 mt-auto">
      <div className="max-w-[480px] mx-auto text-center space-y-4">
        {/* Navigation Links */}
        <nav className="flex items-center justify-center gap-4 text-xs">
          <Link href="/" className="hover:text-ink transition-colors">
            {t("home")}
          </Link>
          <span className="text-line">|</span>
          <Link href="/guide" className="hover:text-ink transition-colors">
            가이드
          </Link>
          <span className="text-line">|</span>
          <Link href="/terms" className="hover:text-ink transition-colors">
            {t("terms")}
          </Link>
          <span className="text-line">|</span>
          <Link href="/privacy" className="font-bold text-ink hover:text-coral transition-colors">
            {t("privacy")}
          </Link>
        </nav>

        {/* Support Contact & Business Info */}
        <div className="space-y-1.5 text-[11px] leading-relaxed text-caption">
          <div className="flex items-center justify-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-coral shrink-0" />
            <a href="mailto:help@kongdak.kr" className="hover:text-coral transition-colors">
              help@kongdak.kr
            </a>
          </div>
          <p className="mt-1">
            {t("business_info")}
          </p>
        </div>

        {/* Legal Disclaimer */}
        <div className="pt-3 border-t border-line/60">
          <p className="text-[10px] sm:text-[11px] leading-relaxed text-caption text-center">
            콩닥(kongdak)은 사주 기반 알고리즘으로 궁합·관계 해석을 제공하는 디지털 서비스입니다. 모든 콘텐츠는{" "}
            <strong className="font-bold text-ink">오락 및 자기이해를 위한 목적</strong>이며, 전문적 판단을 대체하지 않습니다. 유료 콘텐츠의 청약철회·환불은 전자상거래법 및 이용약관에 따릅니다.
          </p>
          <p className="text-[10px] text-caption/70 mt-2">
            © 2026 콩닥 (kongdak). All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
