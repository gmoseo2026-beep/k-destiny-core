"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  Calendar,
  Heart,
  Share2,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { BASE_URL } from "@/lib/seo";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const steps = [
  { icon: Heart, tint: "bg-coral/10", iconColor: "text-coral" },
  { icon: Sparkles, tint: "bg-plum/10", iconColor: "text-plum" },
  { icon: Calendar, tint: "bg-gold/15", iconColor: "text-[#C98A0E]" },
];

const faqs = [
  {
    num: "Q1",
    q: "콩닥 궁합은 어떻게 보나요?",
    a: (
      <>
        나와 상대방의 생년월일(+아는 경우 태어난 시간)만 넣으면 끝이에요. 두 사람의 사주를 분석해 30초 안에 궁합 점수와 우리 사이 케미 키워드, 다정한 해석을 보여드려요.
      </>
    ),
  },
  {
    num: "Q2",
    q: "정말 무료인가요?",
    a: (
      <>
        네, 궁합 점수·케미 키워드·요약 해석은 무료예요. 관계의 갈등 포인트와 현실 연애 조언까지 담은 <strong className="text-ink font-bold">심층 리포트만 유료</strong>(단건 결제 또는 이용권)로 제공해요.
      </>
    ),
  },
  {
    num: "Q3",
    q: "회원가입을 꼭 해야 하나요?",
    a: (
      <>
        아니요. 회원가입 없이 비회원으로 바로 궁합을 볼 수 있어요. 결과를 계정에 저장하거나 여러 궁합을 모아보고 싶을 때만 로그인하면 됩니다.
      </>
    ),
  },
  {
    num: "Q4",
    q: "태어난 시간을 몰라도 되나요?",
    a: (
      <>
        괜찮아요. 시간을 모르면 &quot;시간 모름&quot;으로 진행할 수 있어요. 시간까지 알면 더 정밀한 결과가 나오지만, 몰라도 궁합 점수와 해석은 충분히 볼 수 있습니다.
      </>
    ),
  },
  {
    num: "Q5",
    q: "생년월일 같은 개인정보는 안전한가요?",
    a: (
      <>
        네. 생년월일·태어난 시간은 그대로 저장하지 않고 <strong className="text-ink font-bold">단방향 해시로만</strong> 보관해요. 원본을 되돌릴 수 없는 형태라 안전합니다. 자세한 내용은 개인정보처리방침에서 확인하세요.
      </>
    ),
  },
  {
    num: "Q6",
    q: "결과는 어떻게 저장하거나 공유하나요?",
    a: (
      <>
        결과 화면에서 <strong className="text-ink font-bold">카카오톡 공유</strong>나 링크 복사로 친구에게 바로 보낼 수 있어요. 로그인하면 본 궁합 기록이 내 계정에 저장돼 언제든 다시 볼 수 있습니다.
      </>
    ),
  },
  {
    num: "Q7",
    q: "궁합 점수는 어떻게 계산되나요?",
    a: (
      <>
        전통 사주(명리) 기준으로 두 사람의 기운을 분석해 결정론적으로 점수를 냅니다. 같은 입력이면 항상 같은 결과가 나와요. 여기에 AI가 이해하기 쉬운 해석을 더해드립니다.
      </>
    ),
  },
  {
    num: "Q8",
    q: "심층 리포트는 무료 결과와 뭐가 다른가요?",
    a: (
      <>
        무료가 &quot;우리가 얼마나 잘 맞는지&quot;라면, 심층 리포트는 &quot;<strong className="text-ink font-bold">왜</strong> 끌리는지, 어떤 갈등이 생길 수 있는지, 어떻게 풀면 좋은지&quot;까지 구체적으로 짚어줘요.
      </>
    ),
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${BASE_URL}/ko/guide#faq`,
  "mainEntity": [
    {
      "@type": "Question",
      "name": "콩닥 궁합은 어떻게 보나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "나와 상대방의 생년월일(+아는 경우 태어난 시간)만 넣으면 두 사람의 사주를 분석해 30초 안에 궁합 점수와 케미 키워드, 다정한 해석을 보여드립니다.",
      },
    },
    {
      "@type": "Question",
      "name": "정말 무료인가요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "궁합 점수·케미 키워드·요약 해석은 무료입니다. 관계의 갈등 포인트와 현실 연애 조언까지 담은 심층 리포트만 유료(단건 결제 또는 이용권)로 제공합니다.",
      },
    },
    {
      "@type": "Question",
      "name": "회원가입을 꼭 해야 하나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "아니요. 비회원으로 바로 궁합을 볼 수 있습니다. 결과를 계정에 저장하거나 여러 궁합을 모아보고 싶을 때만 로그인하면 됩니다.",
      },
    },
    {
      "@type": "Question",
      "name": "태어난 시간을 몰라도 되나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "괜찮습니다. 시간을 모르면 '시간 모름'으로 진행할 수 있습니다. 시간까지 알면 더 정밀하지만, 몰라도 궁합 점수와 해석은 볼 수 있습니다.",
      },
    },
    {
      "@type": "Question",
      "name": "생년월일 같은 개인정보는 안전한가요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "생년월일·태어난 시간은 원본으로 저장하지 않고 단방향 해시로만 보관합니다. 되돌릴 수 없는 형태라 안전하며, 자세한 내용은 개인정보처리방침에서 확인할 수 있습니다.",
      },
    },
    {
      "@type": "Question",
      "name": "결과는 어떻게 저장하거나 공유하나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "결과 화면에서 카카오톡 공유나 링크 복사로 바로 보낼 수 있고, 로그인하면 본 궁합 기록이 계정에 저장돼 언제든 다시 볼 수 있습니다.",
      },
    },
    {
      "@type": "Question",
      "name": "궁합 점수는 어떻게 계산되나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "전통 사주(명리) 기준으로 두 사람의 기운을 분석해 결정론적으로 점수를 냅니다. 같은 입력이면 항상 같은 결과가 나오며, 여기에 AI 해석을 더합니다.",
      },
    },
    {
      "@type": "Question",
      "name": "심층 리포트는 무료 결과와 무엇이 다른가요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "무료가 '얼마나 잘 맞는지'라면, 심층 리포트는 왜 끌리는지, 어떤 갈등이 생길 수 있는지, 어떻게 풀면 좋은지까지 구체적으로 짚어줍니다.",
      },
    },
  ],
};

export default function GuidePage() {
  const t = useTranslations("Guide");

  return (
    <main className="relative min-h-[100dvh] w-full bg-background flex flex-col items-center py-12 sm:py-16 px-4 sm:px-6">
      {/* FAQPage JSON-LD for Search Engines & AI Answer Engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd),
        }}
      />

      {/* Soft ambient glow — 콩닥 코랄 톤 */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-coral-light/20 via-transparent to-transparent blur-[100px] pointer-events-none"
      />

      <div className="relative z-10 w-full max-w-2xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#FFD9E0] shadow-sm mb-5">
              <Sparkles className="w-4 h-4 text-coral" />
              <span className="text-xs font-extrabold text-plum tracking-wide">
                {t("badge")}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-ink mb-3">
              {t("title")}
            </h1>
            <p className="text-sm sm:text-base text-gray-500 font-medium max-w-lg mx-auto leading-relaxed">
              {t("subtitle")}
            </p>
          </motion.div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const stepNum = idx + 1;

              return (
                <motion.div
                  key={stepNum}
                  variants={itemVariants}
                  className="relative bg-white border border-[#FFD9E0]/60 rounded-3xl p-5 sm:p-7 shadow-sm hover:border-coral/40 transition-colors group"
                >
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <div
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${step.tint} flex items-center justify-center group-hover:scale-105 transition-transform`}
                      >
                        <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${step.iconColor}`} />
                      </div>
                      <span className="text-[10px] font-bold text-coral/50 tracking-widest">
                        {String(stepNum).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 pt-1">
                      <h2 className="text-lg sm:text-xl font-black text-ink mb-1.5">
                        {t(`step${stepNum}_title`)}
                      </h2>
                      <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
                        {t(`step${stepNum}_desc`)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Tip */}
          <motion.div
            variants={itemVariants}
            className="bg-gold/10 border border-gold/40 rounded-3xl p-5 sm:p-7"
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-gold/20 flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-[#C98A0E]" />
              </div>
              <div>
                <h3 className="text-base font-black text-ink mb-1.5">{t("tip_title")}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t("tip_desc")}</p>
              </div>
            </div>
          </motion.div>

          {/* FAQ Section */}
          <motion.div variants={itemVariants} className="space-y-4 pt-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-coral/10 text-coral text-xs font-bold mb-2">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>자주 묻는 질문</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-ink">
                자주 묻는 질문 (FAQ)
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                콩닥 이용에 대해 가장 궁금해하시는 점들을 모았어요
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#FFD9E0]/60 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm hover:border-coral/40 transition-colors"
                >
                  <h3 className="text-base sm:text-lg font-black text-ink mb-2 flex items-start gap-2.5">
                    <span className="text-coral font-black flex-shrink-0">{faq.num}.</span>
                    <span>{faq.q}</span>
                  </h3>
                  <div className="text-sm sm:text-base text-gray-600 leading-relaxed pl-7">
                    {faq.a}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Disclaimer */}
          <motion.p
            variants={itemVariants}
            className="text-center text-xs text-gray-500 leading-relaxed px-4"
          >
            {t("disclaimer")}
          </motion.p>

          {/* Actions */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row justify-center gap-3 pt-2"
          >
            <Link href="/" className="block">
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-[#2B2430]/10 bg-white text-gray-600 hover:text-ink hover:border-coral/40 transition-all text-sm font-semibold group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                {t("btn_back")}
              </button>
            </Link>
            <Link href="/compat/new" className="block">
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white bg-gradient-to-r from-coral-light via-coral to-plum font-bold text-base shadow-lg shadow-coral/30 hover:opacity-95 active:scale-[0.98] transition-all group">
                <Heart className="w-5 h-5 fill-white" />
                <span>{t("btn_start")}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
