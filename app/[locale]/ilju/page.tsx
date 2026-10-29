import type { Metadata } from "next";
import Link from "next/link";
import { BASE_URL, canonicalUrlFor } from "@/lib/seo";
import { ILJU_LIST } from "@/lib/seo/ilju";
import SeoCta from "@/components/seo/SeoCta";
import { Breadcrumbs, SeoJsonLd } from "@/components/seo/SeoBlocks";
import IljuChecker from "@/components/seo/IljuChecker";

const TITLE = "60갑자 일주 연애 성향 모아보기 — 내 일주와 잘 맞는 사람 | 콩닥";
const DESCRIPTION =
  "갑자일주부터 계해일주까지 60개 일주별 연애 성향, 여자·남자 속마음 표현 방식, 이별·재회 패턴과 잘 맞는 일주를 쉬운 한국어로 정리했어요.";

export function generateMetadata(): Metadata {
  const url = canonicalUrlFor("/ilju");
  const image = {
    url: `${BASE_URL}/api/og/card?v=3`,
    width: 1200,
    height: 630,
    alt: "콩닥 일주 연애 성향",
  };
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: url },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url,
      siteName: "콩닥 (kongdak)",
      type: "website",
      locale: "ko_KR",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
      images: [image.url],
    },
  };
}

const HUB_FAQ = [
  {
    q: "내 일주는 어떻게 확인할 수 있나요?",
    a: "위 '내 일주 확인하기'에 양력 생년월일을 선택하면 태어난 날의 일주를 바로 계산해 해당 연애 성향 페이지로 안내해 드려요.",
  },
  {
    q: "일주만 같으면 연애 궁합도 똑같이 나오나요?",
    a: "일주는 태어난 날의 중심 기질이라 연애 스타일을 이해하는 데 큰 도움이 되지만, 실제 두 사람의 궁합은 태어난 해·달·시간까지 합쳐 보아야 훨씬 정확해요.",
  },
];

export default async function IljuHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-ink">
      <SeoJsonLd
        faq={HUB_FAQ}
        crumbs={[
          { name: "콩닥", url: canonicalUrlFor("") },
          { name: "일주 연애 성향", url: canonicalUrlFor("/ilju") },
        ]}
      />

      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Breadcrumbs
          items={[{ href: `/${locale}`, label: "콩닥" }, { label: "일주 연애 성향" }]}
        />

        <header className="rounded-3xl border border-white/10 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,92,119,0.28),transparent_60%),linear-gradient(180deg,#3A1B40_0%,#22142A_100%)] p-6 text-center text-white">
          <span className="inline-block rounded-full bg-black/25 px-3 py-1 text-xs font-extrabold text-gold">
            쉬운 말로 읽는 60가지 연애 기질
          </span>
          <h1 className="mt-2.5 text-2xl font-black leading-snug">
            일주별 연애 성향과 잘 맞는 사람
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-white/85">
            갑자일주부터 계해일주까지, 좋아하는 사람 앞에서의 속마음과 재회 흐름을 한자 없이 다정하게 풀어 드려요.
          </p>
        </header>

        <IljuChecker locale={locale} source="ilju_hub" />

        <section aria-label="60개 일주 전체 목록" className="w-full">
          <h2 className="mb-3 text-base font-black text-ink">
            갑자일주 ~ 계해일주 (60장)
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {ILJU_LIST.map((item) => (
              <Link
                key={item.slug}
                href={`/${locale}/ilju/${item.slug}`}
                prefetch={false}
                className="flex flex-col justify-between rounded-2xl border border-line bg-white p-3.5 transition-all hover:border-coral active:scale-[0.97]"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-sm font-black text-ink">{item.name}</span>
                  <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-bold text-text-2">
                    {item.animal}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] text-text-3">
                  {item.metaphor}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-coral/30 bg-white p-5">
          <h2 className="text-base font-black text-ink">
            그 사람과의 실제 궁합 점수가 궁금하다면
          </h2>
          <p className="mt-1.5 mb-3 text-sm leading-relaxed text-text-2">
            두 사람의 생년월일을 함께 넣으면 30초 만에 무료로 궁합 점수와 케미 키워드를 볼 수 있어요.
          </p>
          <SeoCta href={`/${locale}/compat/new`} page="ilju:hub" target="compat">
            우리 둘 생년월일로 무료 궁합 보기
          </SeoCta>
        </section>

        <p className="w-full px-2 text-center text-[11px] leading-relaxed text-caption">
          ※ 일주(태어난 날) 중심으로 살펴본 연애 성향이에요. 같은 일주라도 태어난 해·달·시간에 따라 결과가 달라져요. 콩닥의 모든 풀이는 오락과 자기이해를 위한 참고 정보이며, 미래를 보장하지 않습니다.
        </p>
      </div>
    </main>
  );
}
