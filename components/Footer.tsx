"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

export default function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="relative z-10 w-full border-t border-white/5 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold/60" />
            <span className="font-serif text-sm text-gray-400 tracking-wide">
              © 2026 K-Destiny Inc.
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="font-sans text-xs text-gray-500 hover:text-gold transition-colors tracking-wide uppercase"
            >
              {t("home")}
            </Link>
            <Link
              href="/guide"
              className="font-sans text-xs text-gray-500 hover:text-gold transition-colors tracking-wide uppercase"
            >
              Guide
            </Link>
            <Link
              href="/terms"
              className="font-sans text-xs text-gray-500 hover:text-gold transition-colors tracking-wide uppercase"
            >
              {t("terms")}
            </Link>
            <Link
              href="/privacy"
              className="font-sans text-xs text-gray-500 hover:text-gold transition-colors tracking-wide uppercase"
            >
              {t("privacy")}
            </Link>
          </nav>

          {/* Disclaimer */}
          <p className="font-sans text-[10px] text-gray-600 text-center sm:text-right max-w-[200px]">
            {t("disclaimer")}
          </p>
        </div>
      </div>

      {/* Mandatory Legal Disclaimer — PG / Merchant of Record Compliance */}
      <div className="w-full border-t border-white/10 bg-black/40 px-4 sm:px-6 py-4">
        <p className="max-w-5xl mx-auto font-sans text-[11px] leading-relaxed text-gray-400 text-center">
          <span className="font-semibold text-gray-300 uppercase tracking-wider">Disclaimer:</span>{" "}
          K-Destiny is a digital SaaS platform providing algorithmic Eastern Astrology (Saju) insights.
          All content and services are intended strictly{" "}
          <span className="font-semibold text-gray-300 uppercase">for entertainment and self-reflection purposes only</span>{" "}
          and should not replace professional medical, legal, or financial advice.
          Due to the digital nature of our AI-generated reports,{" "}
          <span className="font-semibold text-gray-300 uppercase">all sales are final</span> and non-refundable.
        </p>
      </div>
    </footer>
  );
}
