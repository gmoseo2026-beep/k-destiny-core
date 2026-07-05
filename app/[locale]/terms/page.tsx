"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ArrowLeft, Shield } from "lucide-react";

const sectionClass =
  "bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]";

export default function TermsPage() {
  const t = useTranslations("Legal");

  return (
    <main className="relative min-h-[100dvh] w-full bg-background overflow-hidden flex flex-col items-center py-12 px-4 sm:px-6">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-stardust opacity-10 mix-blend-screen" />
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-dark/15 via-transparent to-transparent blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-gold transition-colors text-sm font-sans">
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
            <Shield className="w-5 h-5 text-gold" />
            <span className="text-xs font-sans tracking-widest text-gold/80 uppercase">{t("badge")}</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white">{t("terms_title")}</h1>
          <p className="text-gray-500 text-sm font-sans">{t("last_updated")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="space-y-6"
        >
          {/* Section 1 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("terms_s1_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">{t("terms_s1_body")}</p>
          </div>

          {/* Section 2 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("terms_s2_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">{t("terms_s2_body")}</p>
          </div>

          {/* Section 3 - Entertainment Disclaimer */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("terms_s3_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">
              <strong className="text-white">{t("terms_s3_body")}</strong>
            </p>
          </div>

          {/* Section 4 - No Refund */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("terms_s4_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm mb-3">{t("terms_s4_body")}</p>
            <ul className="list-disc list-inside font-sans text-gray-300 text-sm space-y-2 ml-2">
              <li><strong className="text-white">{t("terms_s4_li1")}</strong></li>
              <li>{t("terms_s4_li2")}</li>
              <li>{t("terms_s4_li3")}</li>
              <li>{t("terms_s4_li4")}</li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("terms_s5_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">{t("terms_s5_body")}</p>
          </div>

          {/* Section 6 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("terms_s6_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">{t("terms_s6_body")}</p>
          </div>

          {/* Section 7 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("terms_s7_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">{t("terms_s7_body")}</p>
          </div>

          {/* Section 8 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("terms_s8_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">{t("terms_s8_body")}</p>
          </div>

          {/* Section 9 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("terms_s9_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">
              {t("terms_s9_body")} <a href="mailto:support@thekdestiny.com" className="text-gold hover:text-gold/80 underline underline-offset-2">support@thekdestiny.com</a>
            </p>
          </div>

          {/* Section 10 - Data Retention Post-Expiration */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("terms_s10_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">{t("terms_s10_body")}</p>
          </div>
        </motion.div>

        <div className="h-8" />
      </div>
    </main>
  );
}
