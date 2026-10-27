import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BASE_URL, canonicalUrlFor } from "@/lib/seo";
import { FORTUNE_TARGET_YEAR, ZODIAC, pairSlug } from "@/lib/seo/zodiac";
import { animalYearPage } from "@/lib/seo/zodiacYear";
import { getYearContent, paragraphs } from "@/lib/seo/data";
import SeoCta from "@/components/seo/SeoCta";
import { Breadcrumbs, ChipLinks, FaqList, Paragraphs, SeoDisclaimer, SeoJsonLd, SeoSection } from "@/components/seo/SeoBlocks";

/**
 * 띠별 2027년 운세(검색용) — 예: /ko/fortune/2027/tti/horse = "2027년 말띠 운세".
 * 띠 단위의 큰 흐름·삼재·잘 맞는 띠는 lib/seo/zodiacYear.ts(결정론), 출생연도별 한 줄은 이미 있는
 * 출생연도 본문(data/seo/fortune-2027.json)의 첫 문단을 가져온다. 생년월일로 보는 2027년 운세(무료 미리보기)로 잇는다.
 */
interface PageProps {
  params: Promise<{ locale: string; animal: string }>;
}

const YEAR = FORTUNE_TARGET_YEAR;

export function generateStaticParams() {
  return ZODIAC.map((z) => ({ animal: z.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { animal } = await params;
  const page = animalYearPage(animal);
  if (!page) return { title: `${YEAR}년 운세 | 콩닥` };
  const name = page.animal.name;
  const url = canonicalUrlFor(`/fortune/${YEAR}/tti/${page.animal.slug}`);
  const shorts = page.years.slice(0, 4).map((y) => `${String(y).slice(2)}년생`).join("·");
  const title = `${YEAR}년 ${name}띠 운세 — ${shorts} 연애·일·돈 흐름 | 콩닥`;
  const description = `${YEAR}년 ${page.yearNickname}의 해, ${name}띠는 "${page.flowLabel}". ${page.samjae ? "삼재 여부, " : ""}출생연도별 한 줄 운세와 잘 맞는 띠까지.`.slice(0, 155);
  const ogYear = page.years.find((y) => y <= 2000) ?? page.years[0];
  const image = { url: `${BASE_URL}/api/og/card?y=${ogYear}&v=3`, width: 1200, height: 630, alt: `${YEAR}년 ${name}띠 운세` };
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "콩닥 (kongdak)", type: "article", locale: "ko_KR", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function AnimalYearFortunePage({ params }: PageProps) {
  const { locale, animal } = await params;
  const page = animalYearPage(animal);
  if (!page) notFound();
  const { animal: a } = page;
  const pageKey = `tti:${a.slug}`;
  const url = `/fortune/${YEAR}/tti/${a.slug}`;

  const facts: Array<{ k: string; v: string }> = [
    { k: `${YEAR}년`, v: `${page.yearNickname}의 해` },
    { k: "올해의 결", v: page.flowLabel },
    { k: "삼재", v: page.samjae ? `${page.samjae}번째 해` : "해당 없음" },
    { k: "잘 맞는 띠", v: page.goodMatches.length ? page.goodMatches.map((z) => z.name).join(" · ") : "-" },
  ];

  // 출생연도별 한 줄: 이미 있는 출생연도 본문의 헤드라인 + 첫 문단
  const yearCards = page.years
    .map((y) => ({ y, c: getYearContent(y) }))
    .filter((x): x is { y: number; c: NonNullable<ReturnType<typeof getYearContent>> } => !!x.c);

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-ink">
      <SeoJsonLd
        faq={page.faq}
        crumbs={[
          { name: "콩닥", url: canonicalUrlFor("") },
          { name: `${YEAR}년 운세`, url: canonicalUrlFor(`/fortune/${YEAR}`) },
          { name: `${YEAR}년 ${a.name}띠 운세`, url: canonicalUrlFor(url) },
        ]}
      />
      <article className="mx-auto flex w-full max-w-md flex-col gap-5">
        <Breadcrumbs
          items={[
            { href: `/${locale}`, label: "콩닥" },
            { href: `/${locale}/fortune/${YEAR}`, label: `${YEAR}년 운세` },
            { label: `${a.name}띠` },
          ]}
        />

        <header className="rounded-3xl bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,92,119,0.28),transparent_60%),linear-gradient(180deg,#3A1B40_0%,#22142A_100%)] border border-white/10 p-6 text-center text-white">
          <p className="text-3xl" aria-hidden>
            {a.emoji}
          </p>
          <h1 className="mt-2 text-2xl font-black leading-snug">
            {YEAR}년 {a.name}띠 운세
          </h1>
          <p className="mt-2 text-sm font-medium text-white/90">
            {page.yearNickname}의 해, {a.name}띠에게는 {page.flowLabel}
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-2">
          {facts.map((it) => (
            <div key={it.k} className="rounded-2xl border border-line bg-surface-soft px-4 py-3">
              <dt className="text-[11px] font-bold text-text-3">{it.k}</dt>
              <dd className="mt-0.5 text-sm font-extrabold text-ink">{it.v}</dd>
            </div>
          ))}
        </dl>

        <SeoSection title={`${a.name}띠 ${YEAR}년 큰 흐름`}>
          <Paragraphs items={page.intro} />
        </SeoSection>

        <section className="rounded-2xl border border-coral/30 bg-white p-5 shadow-[0_4px_16px_rgba(255,92,119,0.12)]">
          <h2 className="text-base font-black text-ink">같은 {a.name}띠라도 흐름이 달라요</h2>
          <p className="mt-1.5 mb-3 text-sm leading-relaxed text-text-2">
            여기는 태어난 해만 본 큰 틀이에요. 생년월일을 넣으면 나에게 맞춘 {YEAR}년 흐름을 무료로 먼저 볼 수 있어요.
          </p>
          <SeoCta href={`/${locale}/fortune/new?productId=annual_${YEAR}`} page={pageKey} target={`annual_${YEAR}`}>
            내 생년월일로 {YEAR}년 운세 보기
          </SeoCta>
        </section>

        <SeoSection title={`출생연도별 ${a.name}띠 ${YEAR}년 한 줄`}>
          <div className="flex flex-col gap-2.5">
            {yearCards.map(({ y, c }) => (
              <Link
                key={y}
                href={`/${locale}/fortune/${YEAR}/${y}`}
                prefetch={false}
                className="rounded-2xl border border-line bg-surface-soft px-4 py-3 transition-all active:scale-[0.98]"
              >
                <p className="text-xs font-extrabold text-coral">
                  {y}년생 ({String(y).slice(2)}년생)
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-ink">{c.headline}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-2">{paragraphs(c.summary)[0]}</p>
                <p className="mt-1 text-[11px] font-bold text-text-3">자세히 보기 →</p>
              </Link>
            ))}
          </div>
        </SeoSection>

        <FaqList faq={page.faq} />

        <section className="flex flex-col gap-2.5">
          <SeoCta href={`/${locale}/fortune/new?productId=annual_${YEAR}`} page={pageKey} target={`annual_${YEAR}_bottom`}>
            나에게 맞춘 {YEAR}년 운세 무료로 보기
          </SeoCta>
          <SeoCta href={`/${locale}/products/premium_${YEAR}_daeun`} page={pageKey} target={`daeun_${YEAR}`} variant="secondary">
            10년 흐름 속 {YEAR}년이 궁금하다면
          </SeoCta>
        </section>

        <ChipLinks
          title={`다른 띠 ${YEAR}년 운세`}
          links={ZODIAC.filter((z) => z.slug !== a.slug).map((z) => ({
            href: `/${locale}/fortune/${YEAR}/tti/${z.slug}`,
            label: `${z.emoji} ${z.name}띠`,
          }))}
        />
        <ChipLinks
          title={`${a.name}띠 궁합`}
          links={ZODIAC.map((z) => ({ href: `/${locale}/zodiac/${pairSlug(a, z)}`, label: `${a.name}띠 × ${z.name}띠` }))}
        />

        <p className="w-full px-2 text-center text-[11px] leading-relaxed text-caption">
          ※ 띠는 입춘(2월 4일 무렵)에 바뀌어요. 1월~2월 초에 태어났다면 앞 해의 띠로 보기도 해요. {YEAR}년은 {page.yearAnimal.name}의 해예요.
        </p>
        <SeoDisclaimer />
      </article>
    </main>
  );
}
