import type { Metadata } from "next";
import Link from "next/link";
import { BASE_URL, canonicalUrlFor } from "@/lib/seo";
import { ZODIAC, pairRelation, pairSlug } from "@/lib/seo/zodiac";
import SeoCta from "@/components/seo/SeoCta";
import { Breadcrumbs, SeoDisclaimer } from "@/components/seo/SeoBlocks";

/** 띠 궁합 모아보기(검색용 허브) — 12띠 × 12띠, 78쌍으로 가는 길 */
const TITLE = "띠 궁합 모아보기 — 12띠 궁합표 | 콩닥";
const DESCRIPTION =
  "쥐띠부터 돼지띠까지, 띠별 궁합을 한눈에. 잘 맞는 띠와 부딪히기 쉬운 띠, 연애·결혼 궁합과 잘 지내는 법까지 정리했어요.";

export function generateMetadata(): Metadata {
  const url = canonicalUrlFor("/zodiac");
  const image = { url: `${BASE_URL}/api/og/card?v=3`, width: 1200, height: 630, alt: "콩닥 띠 궁합" };
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: url },
    openGraph: { title: TITLE, description: DESCRIPTION, url, siteName: "콩닥 (kongdak)", type: "website", locale: "ko_KR", images: [image] },
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [image.url] },
  };
}

const TONE: Record<string, string> = {
  "아주 잘 맞는 편": "border-coral/50 bg-coral-soft text-coral-deep",
  "잘 맞는 편": "border-coral/30 bg-white text-coral-deep",
  "무난한 편": "border-line bg-white text-text-2",
  "맞춰 가야 하는 편": "border-line bg-surface-soft text-text-2",
  "부딪히기 쉬운 편": "border-plum/30 bg-surface-soft text-plum",
};

export default async function ZodiacHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <main className="min-h-screen bg-white px-4 py-6 text-ink">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Breadcrumbs items={[{ href: `/${locale}`, label: "콩닥" }, { label: "띠 궁합" }]} />

        <header>
          <h1 className="text-2xl font-black leading-snug">띠 궁합 모아보기</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-2">
            내 띠를 찾아 상대 띠를 눌러 보세요. 띠별로 끌리는 이유와 부딪히기 쉬운 지점, 잘 지내는 법을 정리했어요.
          </p>
        </header>

        <section className="rounded-2xl border border-coral/30 bg-white p-5 shadow-[0_4px_16px_rgba(255,92,119,0.12)]">
          <h2 className="text-base font-black">띠는 큰 틀, 진짜 궁합은 생년월일로</h2>
          <p className="mt-1.5 mb-3 text-sm leading-relaxed text-text-2">
            같은 띠라도 태어난 달과 날에 따라 궁합이 달라져요. 두 사람 생년월일을 넣으면 30초 만에 무료로 볼 수 있어요.
          </p>
          <SeoCta href={`/${locale}/compat/new`} page="zodiac:hub" target="compat">
            우리 둘 생년월일로 궁합 보기
          </SeoCta>
        </section>

        {ZODIAC.map((me) => (
          <section key={me.slug} aria-label={`${me.name}띠 궁합`}>
            <h2 className="mb-2 text-base font-black">
              <span aria-hidden>{me.emoji}</span> {me.name}띠 궁합
            </h2>
            <div className="flex flex-wrap gap-2">
              {ZODIAC.map((other) => {
                const rel = pairRelation(me, other);
                return (
                  <Link
                    key={other.slug}
                    href={`/${locale}/zodiac/${pairSlug(me, other)}`}
                    prefetch={false}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.96] ${TONE[rel.grade]}`}
                  >
                    {me.name}띠 × {other.name}띠
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <p className="text-xs leading-relaxed text-text-3">
          색이 진할수록 띠 기준으로 잘 맞는 조합이에요. 2027년 운세가 궁금하다면{" "}
          <Link href={`/${locale}/fortune/2027`} prefetch={false} className="font-bold text-coral underline">
            출생연도별 2027년 운세
          </Link>
          도 보세요.
        </p>

        <SeoDisclaimer />
      </div>
    </main>
  );
}
