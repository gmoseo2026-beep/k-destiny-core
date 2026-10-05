import type { Metadata } from "next";
import Link from "next/link";
import { BASE_URL, canonicalUrlFor } from "@/lib/seo";
import { FORTUNE_TARGET_YEAR, YEAR_FLOW_LABEL, ZODIAC, birthYearFacts, birthYears, colorOfYear, zodiacOfYear } from "@/lib/seo/zodiac";
import SeoCta from "@/components/seo/SeoCta";
import { Breadcrumbs, SeoDisclaimer } from "@/components/seo/SeoBlocks";

/** 출생연도별 2027년 운세 모아보기(검색용 허브) — 띠별로 묶어 48개 출생연도로 가는 길 */
const YEAR = FORTUNE_TARGET_YEAR;
const YEAR_NAME = `${colorOfYear(YEAR)} ${zodiacOfYear(YEAR).name}의 해`;
const TITLE = `${YEAR}년 운세 — 출생연도별·띠별 신년운세 | 콩닥`;
const DESCRIPTION = `${YEAR}년 ${YEAR_NAME}, 내 출생연도의 운세는? 1960년생부터 2007년생까지 띠별·나이별 연애운·직장운·금전운과 조심할 때를 정리했어요.`;

export function generateMetadata(): Metadata {
  const url = canonicalUrlFor(`/fortune/${YEAR}`);
  const image = { url: `${BASE_URL}/api/og/card?p=annual_${YEAR}&v=3`, width: 1200, height: 630, alt: `콩닥 ${YEAR}년 운세` };
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: url },
    openGraph: { title: TITLE, description: DESCRIPTION, url, siteName: "콩닥 (kongdak)", type: "website", locale: "ko_KR", images: [image] },
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [image.url] },
  };
}

export default async function FortuneYearHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const years = birthYears();
  return (
    <main className="min-h-screen bg-white px-4 py-6 text-ink">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Breadcrumbs items={[{ href: `/${locale}`, label: "콩닥" }, { label: `${YEAR}년 운세` }]} />

        <header>
          <h1 className="text-2xl font-black leading-snug">{YEAR}년 운세, 출생연도별로 보기</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-2">
            {YEAR}년은 {YEAR_NAME}예요. 내 띠에서 태어난 해를 눌러 보세요. 나이대에 맞춰 연애·일·돈의 흐름과 조심할 때를 정리했어요.
          </p>
        </header>

        <section className="rounded-2xl border border-coral/30 bg-white p-5 shadow-[0_4px_16px_rgba(255,92,119,0.12)]">
          <h2 className="text-base font-black">태어난 해는 큰 틀, 내 운세는 생년월일로</h2>
          <p className="mt-1.5 mb-3 text-sm leading-relaxed text-text-2">
            같은 해에 태어나도 달과 날에 따라 흐름이 달라져요. 생년월일을 넣으면 나에게 맞춘 {YEAR}년 흐름을 무료로 먼저 볼 수 있어요.
          </p>
          <SeoCta href={`/${locale}/fortune/new?productId=annual_${YEAR}`} page="year:hub" target={`annual_${YEAR}`}>
            내 생년월일로 {YEAR}년 운세 보기
          </SeoCta>
        </section>

        {ZODIAC.map((animal) => {
          const mine = years.filter((y) => zodiacOfYear(y).slug === animal.slug);
          if (mine.length === 0) return null;
          const flow = YEAR_FLOW_LABEL[birthYearFacts(mine[0]).yearRelation.relation];
          return (
            <section key={animal.slug} aria-label={`${animal.name}띠 ${YEAR}년 운세`}>
              <h2 className="text-base font-black">
                <span aria-hidden>{animal.emoji}</span> {animal.name}띠 {YEAR}년 운세
              </h2>
              <p className="mb-2 mt-0.5 text-xs text-text-3">{flow}</p>
              <div className="flex flex-wrap gap-2">
                {mine.map((y) => (
                  <Link
                    key={y}
                    href={`/${locale}/fortune/${YEAR}/${y}`}
                    prefetch={false}
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-text-2 transition-all active:scale-[0.96]"
                  >
                    {y}년생 ({String(y).slice(2)}년생)
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <p className="text-xs leading-relaxed text-text-3">
          두 사람의 띠가 얼마나 맞는지 궁금하다면{" "}
          <Link href={`/${locale}/zodiac`} prefetch={false} className="font-bold text-coral underline">
            띠 궁합 모아보기
          </Link>
          도 보세요.
        </p>

        <SeoDisclaimer />
      </div>
    </main>
  );
}
