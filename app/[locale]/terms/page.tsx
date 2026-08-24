"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ArrowLeft, Shield } from "lucide-react";

const sectionClass =
  "bg-white border border-[#2B2430]/8 rounded-3xl p-6 sm:p-8 shadow-sm";

export default function TermsPage() {
  const t = useTranslations("Legal");

  return (
    <main className="relative min-h-[100dvh] w-full bg-background overflow-hidden flex flex-col items-center py-12 px-4 sm:px-6">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-coral-light/20 via-transparent to-transparent blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-plum/10 via-transparent to-transparent blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-coral transition-colors text-sm font-sans">
          <ArrowLeft className="w-4 h-4" />
          {t("back_home")}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-coral" />
            <span className="text-xs font-sans tracking-widest text-coral/80 uppercase">{t("badge")}</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink">{t("terms_title")}</h1>
          <p className="text-gray-500 text-sm font-sans">{t("last_updated")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="space-y-6"
        >
          {/* 제1조 (목적) */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("terms_s1_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm whitespace-pre-line">{t("terms_s1_body")}</p>
          </div>

          {/* 제2조 (정의) */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("terms_s2_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm whitespace-pre-line">{t("terms_s2_body")}</p>
          </div>

          {/* 제3조 (서비스의 성격 — 중요) */}
          <div className={`${sectionClass} border-[#FF5C77]/30 bg-[#FF5C77]/[0.03]`}>
            <h2 className="font-serif text-xl text-coral mb-4">{t("terms_s3_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm font-medium whitespace-pre-line">
              {t("terms_s3_body")}
            </p>
          </div>

          {/* 제4조 (약관의 효력 및 변경) */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("terms_s4_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm whitespace-pre-line">{t("terms_s4_body")}</p>
          </div>

          {/* 제5조 (서비스의 제공 및 변경) */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("terms_s5_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm whitespace-pre-line">{t("terms_s5_body")}</p>
          </div>

          {/* 제6조 (회원가입 및 계정) */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("terms_s6_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm whitespace-pre-line">{t("terms_s6_body")}</p>
          </div>

          {/* 제7조 (이용자의 의무) */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("terms_s7_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm whitespace-pre-line">{t("terms_s7_body")}</p>
          </div>

          {/* 제8조 (지식재산권) */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("terms_s8_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm whitespace-pre-line">{t("terms_s8_body")}</p>
          </div>

          {/* 제9조 (유료 서비스 및 청약철회) */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("terms_s9_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm whitespace-pre-line">{t("terms_s9_body")}</p>
          </div>

          {/* 제10조 (면책) */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("terms_s10_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm whitespace-pre-line">{t("terms_s10_body")}</p>
          </div>

          {/* 제11조 (준거법 및 관할) */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("terms_s11_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm whitespace-pre-line">{t("terms_s11_body")}</p>
          </div>

          {/* 부칙 및 문의 */}
          <div className="bg-white border border-[#2B2430]/8 rounded-2xl p-6 text-center space-y-2 shadow-sm">
            <p className="font-sans text-xs text-gray-500">{t("terms_addendum")}</p>
            <p className="font-sans text-xs text-gray-500">
              문의: <a href="mailto:help@kongdak.kr" className="text-coral hover:underline">help@kongdak.kr</a>
            </p>
          </div>
        </motion.div>

        <div className="h-8" />
      </div>
    </main>
  );
}
