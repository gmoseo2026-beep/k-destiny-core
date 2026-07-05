"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ArrowLeft, Eye } from "lucide-react";

const sectionClass =
  "bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]";

export default function PrivacyPage() {
  const t = useTranslations("Legal");

  const rights = [
    { title: t("privacy_s6_r1_title"), desc: t("privacy_s6_r1_desc") },
    { title: t("privacy_s6_r2_title"), desc: t("privacy_s6_r2_desc") },
    { title: t("privacy_s6_r3_title"), desc: t("privacy_s6_r3_desc") },
    { title: t("privacy_s6_r4_title"), desc: t("privacy_s6_r4_desc") },
    { title: t("privacy_s6_r5_title"), desc: t("privacy_s6_r5_desc") },
    { title: t("privacy_s6_r6_title"), desc: t("privacy_s6_r6_desc") },
  ];

  return (
    <main className="relative min-h-[100dvh] w-full bg-background overflow-hidden flex flex-col items-center py-12 px-4 sm:px-6">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-stardust opacity-10 mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent blur-[120px]" />
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
            <Eye className="w-5 h-5 text-gold" />
            <span className="text-xs font-sans tracking-widest text-gold/80 uppercase">{t("badge")}</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white">{t("privacy_title")}</h1>
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
            <h2 className="font-serif text-xl text-gold mb-4">{t("privacy_s1_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">{t("privacy_s1_body")}</p>
          </div>

          {/* Section 2 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("privacy_s2_title")}</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-sans text-white text-sm font-bold mb-1">{t("privacy_s2_sub1")}</h3>
                <ul className="list-disc list-inside font-sans text-gray-300 text-sm space-y-1 ml-2">
                  <li>{t("privacy_s2_li1")}</li>
                  <li>{t("privacy_s2_li2")}</li>
                  <li>{t("privacy_s2_li3")}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-sans text-white text-sm font-bold mb-1">{t("privacy_s2_sub2")}</h3>
                <ul className="list-disc list-inside font-sans text-gray-300 text-sm space-y-1 ml-2">
                  <li>{t("privacy_s2_li4")}</li>
                  <li>{t("privacy_s2_li5")}</li>
                  <li>{t("privacy_s2_li6")}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("privacy_s3_title")}</h2>
            <ul className="list-disc list-inside font-sans text-gray-300 text-sm space-y-2 ml-2">
              <li>{t("privacy_s3_li1")}</li>
              <li>{t("privacy_s3_li2")}</li>
              <li>{t("privacy_s3_li3")}</li>
              <li>{t("privacy_s3_li4")}</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("privacy_s4_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">{t("privacy_s4_body")}</p>
          </div>

          {/* Section 5 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("privacy_s5_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">{t("privacy_s5_body")}</p>
          </div>

          {/* Section 6 - GDPR/CCPA */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("privacy_s6_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm mb-3">{t("privacy_s6_body")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rights.map((right) => (
                <div key={right.title} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <h4 className="font-sans text-white text-xs font-bold mb-1">{right.title}</h4>
                  <p className="font-sans text-gray-400 text-xs leading-relaxed">{right.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 7 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("privacy_s7_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">{t("privacy_s7_body")}</p>
          </div>

          {/* Section 8 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("privacy_s8_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">{t("privacy_s8_body")}</p>
          </div>

          {/* Section 9 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("privacy_s9_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">{t("privacy_s9_body")}</p>
          </div>

          {/* Section 10 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("privacy_s10_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">
              {t("privacy_s10_body")} <a href="mailto:support@thekdestiny.com" className="text-gold hover:text-gold/80 underline underline-offset-2">support@thekdestiny.com</a>
            </p>
          </div>

          {/* Section 11 - Data Retention Post-Expiration */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-gold mb-4">{t("privacy_s11_title")}</h2>
            <p className="font-sans text-gray-300 leading-relaxed text-sm">{t("privacy_s11_body")}</p>
          </div>
        </motion.div>

        <div className="h-8" />
      </div>
    </main>
  );
}
