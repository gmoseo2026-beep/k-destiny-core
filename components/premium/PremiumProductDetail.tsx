import React from "react";
import Link from "next/link";
import { ChevronLeft, ShieldCheck, Printer, Clock } from "lucide-react";
import type { CatalogItem } from "@/lib/catalog";
import { priceLabel } from "@/lib/catalog";
import { PremiumBadge } from "./PremiumBadge";
import ProductViewTracker from "@/components/ProductViewTracker";
import { ELEMENT_WORD, type Element } from "@/lib/premium/ganzhi";

// Import static sample previews
import sample2027 from "@/data/samples/premium_2027_daeun.json";
import sampleNaming from "@/data/samples/premium_naming.json";
import sampleDates from "@/data/samples/premium_date_selection.json";

interface PremiumProductDetailProps {
  product: CatalogItem;
  locale: string;
}

export function PremiumProductDetail({ product, locale }: PremiumProductDetailProps) {
  const is2027 = product.id === "premium_2027_daeun";
  const isNaming = product.id === "premium_naming";
  const isDates = product.id === "premium_date_pick";

  // Product specific content configuration
  const specDetails = is2027
    ? {
        headline: "인생 10년의 지도와 2027 정미년의 완전한 청사진",
        volume: "10년 대운 지도 · 6개 분야 심층 분석 · 12개월 월별 운세 · 약 1만 자",
        chapters: [
          { num: "01", title: "나의 10년 대운 지도", desc: "인생 8개 주기 흐름과 현재 대운의 절대적 의미" },
          { num: "02", title: "2027 정미년 총평", desc: "10년 중 2027년이 갖는 위치와 삶의 나침반" },
          { num: "03", title: "6대 핵심 분야 분석", desc: "사랑·재물·직업·건강·관계·가정의 정밀 진단과 Do & Don't" },
          { num: "04", title: "12개월 월별 흐름", desc: "1월부터 12월까지 매달의 기운 테마와 이달의 좋은 날 2선" },
          { num: "05", title: "분기별 실행 로드맵", desc: "사계절에 맞춘 4분기 집중 액션 플랜" },
          { num: "06", title: "두근이의 편지", desc: "마스코트 두근이가 전하는 따뜻한 응원의 편지" },
        ],
        sample: sample2027,
      }
    : isNaming
    ? {
        headline: "타고난 기운을 완성하는 평생의 선물, 프리미엄 아기 이름",
        volume: "정통 성명학 4대 원칙 · 엄선된 5개 후보작 · 상세 해설 리포트",
        chapters: [
          { num: "01", title: "작명의 4대 철학과 원칙", desc: "대법원 인명용 한자 원획 수리, 음양 조화, 발음오행, 사주 보완" },
          { num: "02", title: "사주 오행 분석 결과", desc: "아이의 타고난 기운 중 가장 보완이 필요한 기운 도출" },
          { num: "03", title: "추천 이름 5선 심층 해설", desc: "이름별 한 줄 요약, 글자 훈 풀이, 기운의 조화, 소리의 울림" },
          { num: "04", title: "이름의 숫자 (4격 수리표)", desc: "원격·형격·이격·정격 길흉과 음양 배합 상세표" },
          { num: "05", title: "부모님께 드리는 축복 편지", desc: "새로운 생명을 맞이한 가정에 건네는 진심 어린 축복" },
        ],
        sample: sampleNaming,
      }
    : {
        headline: "인생의 중대한 순간, 하늘과 땅이 돕는 최고의 길일",
        volume: "정통 역학 건제12신 채점 · 상위 길일 5선 · 맞춤형 준비 체크리스트",
        chapters: [
          { num: "01", title: "택일 결과 총평 및 지침", desc: "선택한 기간 중 최적의 기운이 모이는 시기 총론" },
          { num: "02", title: "추천 길일 5선 심층 해설", desc: "날짜별 길성, 천을귀인, 황도길일, 길한 시간대 2선 및 주의점" },
          { num: "03", title: "목적별 맞춤 준비 체크리스트", desc: "당일 최고의 운을 잡기 위한 5단계 실천 가이드" },
          { num: "04", title: "캘린더 연동 (.ics 다운로드)", desc: "구글·애플 캘린더에 원클릭으로 길일 일정 등록" },
        ],
        sample: sampleDates,
      };

  const nextPath = `/${locale}/premium/${product.id}/new`;

  return (
    <main className="min-h-screen bg-[#14101A] text-[#F6F1EA] pb-32">
      <ProductViewTracker productId={product.id} tier={product.tier} />

      {/* Top sticky navigation */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#14101A]/80 backdrop-blur-md border-b border-[#3A2E45]/80 z-50 flex items-center justify-between px-4 max-w-4xl mx-auto">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-1.5 text-xs text-[#B9AEC4] hover:text-[#F6F1EA] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>돌아가기</span>
        </Link>
        <span className="font-serif-kr text-sm font-semibold text-[#F3E3BF]">
          {product.name}
        </span>
        <div className="w-12" />
      </header>

      <div className="pt-20 max-w-2xl mx-auto px-4 sm:px-6">
        {/* 1. Hero Section */}
        <section className="text-center py-10 md:py-14 border-b border-[#3A2E45]/80">
          <div className="mb-4">
            <PremiumBadge text="KONGDAK SIGNATURE" />
          </div>
          <h1 className="font-serif-kr text-3xl sm:text-4xl font-bold tracking-tight text-[#F6F1EA] mb-4 leading-tight">
            {product.name}
          </h1>
          <p className="text-base sm:text-lg text-[#F3E3BF] font-medium max-w-lg mx-auto mb-6 leading-relaxed">
            {specDetails.headline}
          </p>
          <p className="text-sm text-[#B9AEC4] max-w-md mx-auto leading-relaxed">
            {product.description}
          </p>
        </section>

        {/* 2. What's in this report */}
        <section className="py-10 border-b border-[#3A2E45]/80">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif-kr text-xl font-bold text-[#F6F1EA]">
              이 리포트에 담기는 내용
            </h2>
            <span className="text-xs text-[#D9B26A] font-medium bg-[#1E1726] border border-[#D9B26A]/30 px-2.5 py-1 rounded-full">
              {specDetails.volume}
            </span>
          </div>

          <div className="grid gap-3">
            {specDetails.chapters.map((chap) => (
              <div
                key={chap.num}
                className="p-4 rounded-xl bg-[#1E1726]/70 border border-[#3A2E45]/60 flex items-start gap-4"
              >
                <span className="font-mono text-xs font-bold text-[#D9B26A] bg-[#14101A] px-2 py-0.5 rounded border border-[#D9B26A]/30 shrink-0 mt-0.5">
                  {chap.num}
                </span>
                <div>
                  <h3 className="font-serif-kr text-sm sm:text-base font-bold text-[#F6F1EA] mb-0.5">
                    {chap.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#B9AEC4] leading-relaxed">
                    {chap.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Sample Preview with watermark */}
        <section className="py-10 border-b border-[#3A2E45]/80">
          <div className="text-center mb-6">
            <span className="text-xs tracking-widest text-[#D9B26A] uppercase font-semibold">
              SAMPLE PREVIEW
            </span>
            <h2 className="font-serif-kr text-xl font-bold text-[#F6F1EA] mt-1">
              리포트 미리보기
            </h2>
          </div>

          <div className="relative rounded-2xl bg-[#1E1726] border border-[#D9B26A]/40 p-6 overflow-hidden shadow-xl">
            {/* Watermark */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 select-none rotate-[-20deg]">
              <span className="text-4xl sm:text-6xl font-black text-white whitespace-nowrap">
                예시 · 가상 인물
              </span>
            </div>

            <div className="relative z-10 space-y-4 text-xs sm:text-sm text-[#B9AEC4]">
              <div className="flex items-center justify-between border-b border-[#3A2E45] pb-3">
                <span className="text-[#D9B26A] font-semibold">
                  {specDetails.sample.meta.targetName}
                </span>
                <span className="text-xs bg-[#14101A] px-2 py-1 rounded text-[#F3E3BF]">
                  실제 엔진 산출 데이터
                </span>
              </div>

              {is2027 && (
                <div>
                  <p className="text-[#F6F1EA] font-serif-kr font-bold text-base mb-1">
                    {sample2027.sections.overview.headline}
                  </p>
                  <p className="text-xs text-[#B9AEC4] mb-3">
                    총운 점수: <strong className="text-[#D9B26A]">{sample2027.engine.yearScore}점</strong> · 키워드: {sample2027.sections.overview.keywords.join(", ")}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[#14101A] p-2 rounded">
                      <span className="text-[#B9AEC4] block">애정</span>
                      <strong className="text-[#F6F1EA]">{sample2027.engine.domains.love}점</strong>
                    </div>
                    <div className="bg-[#14101A] p-2 rounded">
                      <span className="text-[#B9AEC4] block">재물</span>
                      <strong className="text-[#F6F1EA]">{sample2027.engine.domains.money}점</strong>
                    </div>
                    <div className="bg-[#14101A] p-2 rounded">
                      <span className="text-[#B9AEC4] block">커리어</span>
                      <strong className="text-[#F6F1EA]">{sample2027.engine.domains.career}점</strong>
                    </div>
                  </div>
                </div>
              )}

              {isNaming && (
                <div>
                  <p className="text-[#F6F1EA] font-serif-kr font-bold text-base mb-2">
                    추천 후보 1: {sampleNaming.engine.names[0]?.hangul} ({sampleNaming.engine.names[0]?.hanja.join("")})
                  </p>
                  <p className="text-xs text-[#B9AEC4] leading-relaxed mb-2">
                    수리점수 {sampleNaming.engine.names[0]?.score}점 · 글자의 기운: {sampleNaming.engine.names[0]?.elements.map((e) => ELEMENT_WORD[e as Element] ?? e).join(" · ")}
                  </p>
                  <p className="text-xs text-[#D9B26A] italic">
                    &quot;{sampleNaming.sections.names.names[0]?.oneLine}&quot;
                  </p>
                </div>
              )}

              {isDates && (
                <div>
                  <p className="text-[#F6F1EA] font-serif-kr font-bold text-base mb-2">
                    최고의 길일 1순위: {sampleDates.engine.picks[0]?.date}
                  </p>
                  <p className="text-xs text-[#B9AEC4] leading-relaxed mb-2">
                    길일 등급 {sampleDates.engine.picks[0]?.score}점 · {sampleDates.engine.picks[0]?.title}
                  </p>
                  <p className="text-xs text-[#D9B26A] italic">
                    추천 시간대: {sampleDates.engine.picks[0]?.goodHours.join(", ")}
                  </p>
                </div>
              )}

              <p className="text-center text-xs text-[#B9AEC4]/60 pt-2 border-t border-[#3A2E45]">
                ※ 구매 시 실제 본인의 사주 정보에 맞춰 전체 분석 리포트가 완성됩니다.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Comparison Table */}
        <section className="py-10 border-b border-[#3A2E45]/80">
          <h2 className="font-serif-kr text-xl font-bold text-[#F6F1EA] mb-6 text-center">
            일반 리포트 vs 콩닥 프리미엄 비교
          </h2>

          <div className="rounded-xl overflow-hidden border border-[#3A2E45] text-xs sm:text-sm">
            <div className="grid grid-cols-3 bg-[#1E1726] p-3 font-semibold text-[#B9AEC4] text-center border-b border-[#3A2E45]">
              <span>구분</span>
              <span>표준 리포트</span>
              <span className="text-[#D9B26A]">프리미엄</span>
            </div>
            <div className="divide-y divide-[#3A2E45]/60 bg-[#14101A]/60">
              <div className="grid grid-cols-3 p-3 items-center text-center">
                <span className="font-medium text-[#B9AEC4]">분석 분량</span>
                <span className="text-[#B9AEC4]">3~4개 항목</span>
                <span className="text-[#F3E3BF] font-semibold">1만 자 정밀 분석</span>
              </div>
              <div className="grid grid-cols-3 p-3 items-center text-center">
                <span className="font-medium text-[#B9AEC4]">분석 모델</span>
                <span className="text-[#B9AEC4]">고속 AI</span>
                <span className="text-[#F3E3BF] font-semibold">Gemini Pro 엔진</span>
              </div>
              <div className="grid grid-cols-3 p-3 items-center text-center">
                <span className="font-medium text-[#B9AEC4]">보관 기간</span>
                <span className="text-[#B9AEC4]">30일</span>
                <span className="text-[#F3E3BF] font-semibold">1년 안전 보관</span>
              </div>
              <div className="grid grid-cols-3 p-3 items-center text-center">
                <span className="font-medium text-[#B9AEC4]">인쇄·PDF</span>
                <span className="text-[#B9AEC4]">미지원</span>
                <span className="text-[#F3E3BF] font-semibold">전용 인쇄 스타일 지원</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. FAQ */}
        <section className="py-10 border-b border-[#3A2E45]/80">
          <h2 className="font-serif-kr text-xl font-bold text-[#F6F1EA] mb-6 text-center">
            자주 묻는 질문
          </h2>

          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-4 rounded-xl bg-[#1E1726]/60 border border-[#3A2E45]">
              <h3 className="font-semibold text-[#F3E3BF] mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D9B26A]" />
                구매 후 언제까지 다시 볼 수 있나요?
              </h3>
              <p className="text-[#B9AEC4] leading-relaxed">
                프리미엄 리포트는 결제 완료일로부터 <strong>1년간</strong> 언제든지 &apos;내 보관함&apos;에서 다시 열람하실 수 있습니다.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#1E1726]/60 border border-[#3A2E45]">
              <h3 className="font-semibold text-[#F3E3BF] mb-1 flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#D9B26A]" />
                PDF 저장이나 인쇄가 가능한가요?
              </h3>
              <p className="text-[#B9AEC4] leading-relaxed">
                네, 리포트 상단의 &apos;PDF로 저장&apos; 버튼을 누르시면 전용 고해상도 인쇄 레이아웃으로 소장용 PDF 파일을 내려받으실 수 있습니다.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#1E1726]/60 border border-[#3A2E45]">
              <h3 className="font-semibold text-[#F3E3BF] mb-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D9B26A]" />
                환불 및 청약철회가 가능한가요?
              </h3>
              <p className="text-[#B9AEC4] leading-relaxed">
                디지털 콘텐츠의 특성상 리포트 생성이 시작된 이후에는 단순 변심으로 인한 환불이 불가합니다. 단, 시스템 장애로 생성이 불가능한 경우 100% 환불해 드립니다.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Pricing & Fixed Bottom CTA */}
        <section className="py-10 text-center">
          <p className="text-xs text-[#B9AEC4] mb-2 uppercase tracking-widest font-semibold">
            단건 서비스 이용권
          </p>
          <div className="text-3xl sm:text-4xl font-bold font-serif-kr text-[#F3E3BF] mb-6">
            {priceLabel(product)}
          </div>
          <Link
            href={nextPath}
            className="inline-flex items-center justify-center w-full max-w-sm py-4 rounded-2xl text-base font-bold text-[#14101A] bg-gradient-to-r from-[#F3E3BF] via-[#D9B26A] to-[#A8823C] hover:opacity-95 shadow-xl transition-all active:scale-95"
          >
            프리미엄 리포트 신청하기
          </Link>
        </section>
      </div>

      {/* Floating Bottom Bar on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#14101A]/95 backdrop-blur-md border-t border-[#3A2E45] z-40 sm:hidden flex items-center justify-between">
        <div>
          <span className="text-xs text-[#B9AEC4] block">이용료</span>
          <span className="font-serif-kr text-lg font-bold text-[#F3E3BF]">
            {priceLabel(product)}
          </span>
        </div>
        <Link
          href={nextPath}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-[#14101A] bg-gradient-to-r from-[#F3E3BF] via-[#D9B26A] to-[#A8823C] shadow-lg active:scale-95 transition-transform"
        >
          신청하기
        </Link>
      </div>
    </main>
  );
}
