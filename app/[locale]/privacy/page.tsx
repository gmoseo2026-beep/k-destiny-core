"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ArrowLeft, Eye } from "lucide-react";

const sectionClass =
  "bg-white border border-[#2B2430]/8 rounded-3xl p-6 sm:p-8 shadow-sm";

export default function PrivacyPage() {
  const t = useTranslations("Legal");

  const overseasTransfers = [
    { trustee: "Supabase, Inc.", task: "데이터베이스 호스팅", country: "미국" },
    { trustee: "Contabo GmbH", task: "서버 인프라 운영", country: "독일" },
    { trustee: "Cloudflare, Inc.", task: "CDN · 보안(DDoS/WAF) · 트래픽 처리", country: "미국" },
    { trustee: "Google LLC (Gemini API)", task: "AI 궁합 해석 생성", country: "미국" },
    { trustee: "Google LLC (Google Analytics)", task: "서비스 이용 통계 · 분석", country: "미국" },
    { trustee: "카카오 · 네이버 · 구글", task: "소셜 로그인 · 회원 식별", country: "국내(카카오·네이버), 미국(구글)" },
  ];

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
            <Eye className="w-5 h-5 text-coral" />
            <span className="text-xs font-sans tracking-widest text-coral/80 uppercase">{t("badge")}</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink">{t("privacy_title")}</h1>
          <p className="text-gray-500 text-sm font-sans">{t("last_updated")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="space-y-6"
        >
          {/* 머리말 */}
          <div className="bg-white border border-[#2B2430]/8 rounded-2xl p-5 shadow-sm">
            <p className="font-sans text-ink text-sm leading-relaxed">{t("privacy_intro")}</p>
          </div>

          {/* 1. 수집하는 개인정보 항목 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("privacy_s1_title")}</h2>
            <div className="space-y-3.5 font-sans text-sm text-ink">
              <div>
                <p className="font-bold text-ink mb-1">▪ {t("privacy_s1_item1_label")}</p>
                <p className="leading-relaxed pl-3">{t("privacy_s1_item1_desc")}</p>
                <p className="text-xs text-coral/90 mt-1 pl-3 font-medium">{t("privacy_s1_item1_note")}</p>
              </div>
              <div>
                <p className="font-bold text-ink mb-1">▪ {t("privacy_s1_item2_label")}</p>
                <p className="leading-relaxed pl-3">{t("privacy_s1_item2_desc")}</p>
              </div>
              <div>
                <p className="font-bold text-ink mb-1">▪ {t("privacy_s1_item3_label")}</p>
                <p className="leading-relaxed pl-3">{t("privacy_s1_item3_desc")}</p>
              </div>
              <div>
                <p className="font-bold text-ink mb-1">▪ {t("privacy_s1_item4_label")}</p>
                <p className="leading-relaxed pl-3">{t("privacy_s1_item4_desc")}</p>
              </div>
            </div>
          </div>

          {/* 2. 개인정보의 수집·이용 목적 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("privacy_s2_title")}</h2>
            <ul className="list-disc list-inside font-sans text-ink text-sm space-y-2 ml-2">
              <li>{t("privacy_s2_li1")}</li>
              <li>{t("privacy_s2_li2")}</li>
              <li>{t("privacy_s2_li3")}</li>
              <li>{t("privacy_s2_li4")}</li>
              <li>{t("privacy_s2_li5")}</li>
            </ul>
          </div>

          {/* 3. 보유 및 이용 기간 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("privacy_s3_title")}</h2>
            <ul className="list-disc list-inside font-sans text-ink text-sm space-y-2 ml-2">
              <li>{t("privacy_s3_li1")}</li>
              <li>{t("privacy_s3_li2")}</li>
              <li>{t("privacy_s3_li3")}</li>
              <li>{t("privacy_s3_li4")}</li>
            </ul>
          </div>

          {/* 4. 개인정보의 제3자 제공 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("privacy_s4_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm">{t("privacy_s4_body")}</p>
          </div>

          {/* 5. 개인정보 처리의 위탁 및 국외 이전 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("privacy_s5_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm mb-4">{t("privacy_s5_desc")}</p>
            
            {/* 위탁 및 국외이전 6개사 표 */}
            <div className="overflow-x-auto rounded-2xl border border-[#2B2430]/8 mb-4">
              <table className="w-full text-left font-sans text-xs sm:text-sm">
                <thead className="bg-[#FFF6F1] text-plum border-b border-[#2B2430]/8">
                  <tr>
                    <th className="py-3 px-4 font-bold">수탁자</th>
                    <th className="py-3 px-4 font-bold">위탁 업무</th>
                    <th className="py-3 px-4 font-bold">소재 국가</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B2430]/8 text-ink">
                  {overseasTransfers.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#FFF6F1]/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-ink">{row.trustee}</td>
                      <td className="py-3 px-4">{row.task}</td>
                      <td className="py-3 px-4 text-gray-500">{row.country}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="font-sans text-xs text-gray-500 leading-relaxed">{t("privacy_s5_note")}</p>
          </div>

          {/* 6. 이용자의 권리 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("privacy_s6_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm">{t("privacy_s6_body")}</p>
          </div>

          {/* 7. 개인정보의 파기 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("privacy_s7_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm">{t("privacy_s7_body")}</p>
          </div>

          {/* 8. 개인정보 보호를 위한 안전조치 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("privacy_s8_title")}</h2>
            <ul className="list-disc list-inside font-sans text-ink text-sm space-y-2 ml-2">
              <li>{t("privacy_s8_li1")}</li>
              <li>{t("privacy_s8_li2")}</li>
            </ul>
          </div>

          {/* 9. 만 14세 미만 아동 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("privacy_s9_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm">{t("privacy_s9_body")}</p>
          </div>

          {/* 10. 개인정보 보호책임자 및 문의처 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("privacy_s10_title")}</h2>
            <div className="space-y-1.5 font-sans text-sm text-ink">
              <p>{t("privacy_s10_officer")}</p>
              <p>
                {t("privacy_s10_email").split(":")[0]}:{" "}
                <a href="mailto:help@kongdak.kr" className="text-coral hover:underline">help@kongdak.kr</a>
              </p>
            </div>
          </div>

          {/* 11. 고지의 의무 */}
          <div className={sectionClass}>
            <h2 className="font-serif text-xl text-plum mb-4">{t("privacy_s11_title")}</h2>
            <p className="font-sans text-ink leading-relaxed text-sm mb-3">{t("privacy_s11_body")}</p>
            <p className="font-sans text-xs text-coral/80 font-semibold">{t("privacy_effective_date")}</p>
          </div>
        </motion.div>

        <div className="h-8" />
      </div>
    </main>
  );
}
