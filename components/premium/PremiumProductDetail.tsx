import { SerifFont } from "@/components/premium/SerifFont";
import OwnedReportNotice from "@/components/OwnedReportNotice";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ShieldCheck, Printer, Clock } from "lucide-react";
import type { CatalogItem } from "@/lib/catalog";
import { priceLabel, listPrice, formatWon, discountBadge, getProductCover } from "@/lib/catalog";
import { PremiumBadge } from "./PremiumBadge";
import ProductViewTracker, { ProductCtaLink } from "@/components/ProductViewTracker";
import GiftPurchaseButton from "@/components/gift/GiftPurchaseButton";
import { ELEMENT_WORD, type Element } from "@/lib/premium/ganzhi";

import sample2027 from "@/data/samples/premium_2027_daeun.json";
import sampleNaming from "@/data/samples/premium_naming.json";
import sampleDates from "@/data/samples/premium_date_selection.json";

const sampleElementWords = ((sampleNaming.engine.names[0]?.elements ?? []) as (Element | null)[])
  .filter((e): e is Element => e !== null && e in ELEMENT_WORD)
  .map((e) => ELEMENT_WORD[e])
  .join(" · ");

interface PremiumProductDetailProps {
  product: CatalogItem;
  locale: string;
}

export function PremiumProductDetail({ product, locale }: PremiumProductDetailProps) {
  const is2027 = product.id === "premium_2027_daeun";
  const isNaming = product.id === "premium_naming";
  const isDates = product.id === "premium_date_pick";
  const coverSrc = getProductCover(product);

  const specDetails = is2027
    ? {
        headline: "인생 10년의 지도와 2027년의 청사진",
        volume: "10년 대운 지도 · 6개 분야 심층 분석 · 12개월 월별 운세",
        chapters: [
          { num: "01", title: "나의 10년 대운 지도", desc: "인생 8개 주기 흐름과 현재 대운의 절대적 의미" },
          { num: "02", title: "2027년 총평", desc: "10년 중 2027년이 갖는 위치와 삶의 나침반" },
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
          { num: "01", title: "작명의 4대 철학과 원칙", desc: "대법원 인명용 한자 · 획수의 조화 · 부르기 좋은 소리 · 타고난 기운 보완" },
          { num: "02", title: "아이의 타고난 기운", desc: "아이의 기운 중 가장 채워 주면 좋은 기운 찾기" },
          { num: "03", title: "추천 이름 5선 심층 해설", desc: "이름별 한 줄 요약, 글자 훈 풀이, 기운의 조화, 소리의 울림" },
          { num: "04", title: "이름의 숫자 풀이", desc: "획수로 보는 초년·청년·장년·말년의 흐름과 홀짝 균형표" },
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
    <main className="min-h-screen bg-[#140B18] text-[#F6EEF3] pb-32">
      <SerifFont />
      <ProductViewTracker productId={product.id} tier={product.tier} />

      {/* Top sticky navigation */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#140B18]/90 backdrop-blur-md border-b border-white/[0.08] z-50 flex items-center justify-between px-4 max-w-4xl mx-auto">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-1.5 text-xs text-[#B9A9BF] hover:text-[#F6EEF3] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>돌아가기</span>
        </Link>
        <span className="font-serif-kr text-sm font-semibold text-[#FFC24B]">
          {product.name}
        </span>
        <div className="w-12" />
      </header>

      <div className="pt-16 max-w-2xl mx-auto px-4 sm:px-6">
        <OwnedReportNotice locale={locale} catalogId={product.id} source="product" className="mb-4" />

        {/* 1. 상단 3:4 표지 포스터 (3D 이모지 제거, 통일된 나이트 표지 사용) */}
        <section className="relative mx-auto aspect-[3/4] w-full max-w-[380px] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#22142A] mb-8 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
          <Image
            src={coverSrc}
            alt={product.name}
            fill
            sizes="(max-width: 480px) 92vw, 380px"
            priority
            className="object-cover"
          />
          <div
            className="absolute inset-0 flex flex-col items-center justify-end p-6 text-center"
            style={{
              background:
                "linear-gradient(180deg, transparent 35%, rgba(20,11,24,0.88) 70%, #140B18 100%)",
            }}
          >
            <div className="mb-2.5">
              <PremiumBadge text="KONGDAK SIGNATURE" />
            </div>
            <h1 className="font-serif-kr text-2xl sm:text-3xl font-bold tracking-tight text-[#F6EEF3] mb-2 leading-tight">
              {product.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#FFC24B] font-semibold max-w-md mx-auto mb-1.5 leading-relaxed">
              {specDetails.headline}
            </p>
            <p className="text-xs text-[#B9A9BF] max-w-md mx-auto leading-relaxed">
              {product.description}
            </p>
          </div>
        </section>

        {/* 2. What's in this report */}
        <section className="py-10 border-b border-white/[0.08]">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <h2 className="font-serif-kr text-xl font-bold text-[#F6EEF3]">
              이 리포트에 담기는 내용
            </h2>
            <span className="text-xs text-[#FFC24B] font-medium bg-[#22142A] border border-[#FFC24B]/30 px-2.5 py-1 rounded-full">
              {specDetails.volume}
            </span>
          </div>

          <div className="grid gap-3">
            {specDetails.chapters.map((chap) => (
              <div
                key={chap.num}
                className="p-4 rounded-xl bg-[#22142A] border border-white/[0.08] flex items-start gap-4"
              >
                <span className="font-mono text-xs font-bold text-[#FFC24B] bg-[#140B18] px-2 py-0.5 rounded border border-[#FFC24B]/30 shrink-0 mt-0.5">
                  {chap.num}
                </span>
                <div>
                  <h3 className="font-serif-kr text-sm sm:text-base font-bold text-[#F6EEF3] mb-0.5">
                    {chap.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#B9A9BF] leading-relaxed">
                    {chap.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Sample Preview with watermark */}
        <section className="py-10 border-b border-white/[0.08]">
          <div className="text-center mb-6">
            <span className="text-xs tracking-widest text-[#FFC24B] uppercase font-semibold">
              SAMPLE PREVIEW
            </span>
            <h2 className="font-serif-kr text-xl font-bold text-[#F6EEF3] mt-1">
              리포트 미리보기
            </h2>
          </div>

          <div className="relative rounded-2xl bg-[#22142A] border border-[#FFC24B]/35 p-6 overflow-hidden shadow-xl">
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 select-none rotate-[-20deg]">
              <span className="text-4xl sm:text-6xl font-black text-white whitespace-nowrap">
                예시 · 가상 인물
              </span>
            </div>

            <div className="relative z-10 space-y-4 text-xs sm:text-sm text-[#B9A9BF]">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="text-[#FFC24B] font-semibold">
                  {specDetails.sample.meta.targetName}
                </span>
                <span className="text-xs bg-[#140B18] px-2 py-1 rounded text-[#FFC24B]">
                  실제 엔진 산출 데이터
                </span>
              </div>

              {is2027 && (
                <div>
                  <p className="text-[#F6EEF3] font-serif-kr font-bold text-base mb-1">
                    {sample2027.sections.overview.headline}
                  </p>
                  <p className="text-xs text-[#B9A9BF] mb-3">
                    총운 점수: <strong className="text-[#FFC24B]">{sample2027.engine.yearScore}점</strong> · 키워드: {sample2027.sections.overview.keywords.join(", ")}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[#140B18] p-2 rounded">
                      <span className="text-[#B9A9BF] block">애정</span>
                      <strong className="text-[#F6EEF3]">{sample2027.engine.domains.love}점</strong>
                    </div>
                    <div className="bg-[#140B18] p-2 rounded">
                      <span className="text-[#B9A9BF] block">재물</span>
                      <strong className="text-[#F6EEF3]">{sample2027.engine.domains.money}점</strong>
                    </div>
                    <div className="bg-[#140B18] p-2 rounded">
                      <span className="text-[#B9A9BF] block">커리어</span>
                      <strong className="text-[#F6EEF3]">{sample2027.engine.domains.career}점</strong>
                    </div>
                  </div>
                </div>
              )}

              {isNaming && (
                <div>
                  <p className="text-[#F6EEF3] font-serif-kr font-bold text-base mb-2">
                    추천 후보 1: {sampleNaming.engine.names[0]?.hangul} ({sampleNaming.engine.names[0]?.hanja.join("")})
                  </p>
                  <p className="text-xs text-[#B9A9BF] leading-relaxed mb-2">
                    수리점수 {sampleNaming.engine.names[0]?.score}점
                    {sampleElementWords && ` · 글자의 기운: ${sampleElementWords}`}
                  </p>
                  <p className="text-xs text-[#FFC24B] italic">
                    &quot;{sampleNaming.sections.names.names[0]?.oneLine}&quot;
                  </p>
                </div>
              )}

              {isDates && (
                <div>
                  <p className="text-[#F6EEF3] font-serif-kr font-bold text-base mb-2">
                    최고의 길일 1순위: {sampleDates.engine.picks[0]?.date}
                  </p>
                  <p className="text-xs text-[#B9A9BF] leading-relaxed mb-2">
                    길일 등급 {sampleDates.engine.picks[0]?.score}점 · {sampleDates.engine.picks[0]?.title}
                  </p>
                  <p className="text-xs text-[#FFC24B] italic">
                    추천 시간대: {sampleDates.engine.picks[0]?.goodHours.join(", ")}
                  </p>
                </div>
              )}

              <p className="text-center text-xs text-[#B9A9BF] pt-2 border-t border-white/[0.08]">
                ※ 구매 시 실제 본인의 사주 정보에 맞춰 전체 분석 리포트가 완성됩니다.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Comparison Table */}
        <section className="py-10 border-b border-white/[0.08]">
          <h2 className="font-serif-kr text-xl font-bold text-[#F6EEF3] mb-6 text-center">
            일반 리포트 vs 콩닥 프리미엄 비교
          </h2>

          <div className="rounded-xl overflow-hidden border border-white/[0.08] text-xs sm:text-sm">
            <div className="grid grid-cols-3 bg-[#22142A] p-3 font-semibold text-[#B9A9BF] text-center border-b border-white/[0.08]">
              <span>구분</span>
              <span>표준 리포트</span>
              <span className="text-[#FFC24B]">프리미엄</span>
            </div>
            <div className="divide-y divide-white/[0.08] bg-[#140B18]/60">
              {[
                {
                  label: "풀이 범위",
                  standard: "핵심 4개 항목",
                  premium: is2027 ? "10년 흐름 · 6개 분야 · 12개월" : isNaming ? "이름 5개 · 뜻·획수·소리 풀이" : "길일 3~5개 · 좋은 시간대",
                },
                {
                  label: "풀이 방식",
                  standard: "생년월일로 보는 핵심 풀이",
                  premium: is2027 ? "10년 주기와 달마다의 흐름까지 계산" : isNaming ? "인명용 한자를 뜻·획수·소리로 선별" : "전통 택일 기준으로 날짜 선별",
                },
                { label: "보관 기간", standard: "90일", premium: "1년" },
                { label: "소장", standard: "-", premium: "PDF로 저장" },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-3 p-3 items-center text-center gap-1">
                  <span className="font-medium text-[#B9A9BF]">{row.label}</span>
                  <span className="text-[#B9A9BF]">{row.standard}</span>
                  <span className="text-[#FFC24B] font-semibold">{row.premium}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. FAQ */}
        <section className="py-10 border-b border-white/[0.08]">
          <h2 className="font-serif-kr text-xl font-bold text-[#F6EEF3] mb-6 text-center">
            자주 묻는 질문
          </h2>

          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-4 rounded-xl bg-[#22142A] border border-white/[0.08]">
              <h3 className="font-semibold text-[#FFC24B] mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FFC24B]" />
                구매 후 언제까지 다시 볼 수 있나요?
              </h3>
              <p className="text-[#B9A9BF] leading-relaxed">
                프리미엄 리포트는 결제 완료일로부터 <strong>1년간</strong> 언제든지 &apos;내 보관함&apos;에서 다시 열람하실 수 있습니다.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#22142A] border border-white/[0.08]">
              <h3 className="font-semibold text-[#FFC24B] mb-1 flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#FFC24B]" />
                PDF 저장이나 인쇄가 가능한가요?
              </h3>
              <p className="text-[#B9A9BF] leading-relaxed">
                네, 리포트 상단의 &apos;PDF로 저장&apos; 버튼을 누르시면 전용 고해상도 인쇄 레이아웃으로 소장용 PDF 파일을 내려받으실 수 있습니다.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#22142A] border border-white/[0.08]">
              <h3 className="font-semibold text-[#FFC24B] mb-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FFC24B]" />
                환불 및 청약철회가 가능한가요?
              </h3>
              <p className="text-[#B9A9BF] leading-relaxed">
                디지털 콘텐츠의 특성상 리포트 생성이 시작된 이후에는 단순 변심으로 인한 환불이 불가합니다. 단, 시스템 장애로 생성이 불가능한 경우 100% 환불해 드립니다.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Pricing & Fixed Bottom CTA */}
        <section className="py-10 text-center">
          <p className="text-xs text-[#B9A9BF] mb-2 uppercase tracking-widest font-semibold">
            단건 서비스 이용권
          </p>
          {listPrice(product) && (
            <p className="mb-1.5 flex items-center justify-center gap-2 text-sm text-[#B9A9BF]">
              <span className="line-through">{formatWon(listPrice(product)!)}</span>
              <span className="rounded-md bg-[#FFC24B]/15 px-2 py-0.5 text-xs font-bold text-[#FFC24B]">{discountBadge(product)}</span>
            </p>
          )}
          <div className="text-3xl sm:text-4xl font-bold font-serif-kr text-[#FFC24B] mb-6">
            {priceLabel(product)}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
            <GiftPurchaseButton
              product={product}
              locale={locale}
              source="product_detail"
              className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 rounded-2xl border border-[#FFC24B]/45 bg-[#22142A] hover:bg-[#2B1936] px-5 py-4 text-sm font-extrabold text-[#FFC24B] transition-all active:scale-[0.96]"
            />
            <ProductCtaLink
              href={nextPath}
              productId={product.id}
              tier="premium"
              target={product.target}
              isFree={false}
              location="bottom_cta"
              className="inline-flex items-center justify-center w-full flex-1 py-4 rounded-2xl text-base font-bold text-[#140B18] bg-[#FFC24B] hover:opacity-95 shadow-xl transition-all active:scale-95"
            >
              프리미엄 리포트 신청하기
            </ProductCtaLink>
          </div>
        </section>
      </div>

      {/* Floating Bottom Bar on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#140B18]/95 backdrop-blur-md border-t border-white/[0.08] z-40 sm:hidden flex items-center justify-between gap-2 pb-safe-bar">
        <div>
          <span className="text-xs text-[#B9A9BF] block">
            {listPrice(product) ? (
              <>
                <span className="line-through">{formatWon(listPrice(product)!)}</span> · {discountBadge(product)}
              </>
            ) : (
              "이용료"
            )}
          </span>
          <span className="font-serif-kr text-lg font-bold text-[#FFC24B]">
            {priceLabel(product)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <GiftPurchaseButton
            product={product}
            locale={locale}
            source="product_detail"
            className="px-3.5 py-2.5 rounded-xl border border-[#FFC24B]/45 bg-[#22142A] text-xs font-extrabold text-[#FFC24B] inline-flex items-center gap-1 active:scale-[0.96]"
          />
          <ProductCtaLink
            href={nextPath}
            productId={product.id}
            tier="premium"
            target={product.target}
            isFree={false}
            location="mobile_sticky"
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#140B18] bg-[#FFC24B] shadow-lg active:scale-95 transition-transform"
          >
            신청하기
          </ProductCtaLink>
        </div>
      </div>
    </main>
  );
}
