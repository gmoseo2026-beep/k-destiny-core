import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BASE_URL, canonicalUrlFor } from "@/lib/seo";
import {
  FORTUNE_TARGET_YEAR,
  YEAR_FLOW_LABEL,
  ZODIAC,
  birthYearFacts,
  birthYears,
  isBirthYearInRange,
  pairSlug,
  zodiacOfYear,
} from "@/lib/seo/zodiac";
import { getYearContent, paragraphs } from "@/lib/seo/data";
import SeoCta from "@/components/seo/SeoCta";
import {
  Breadcrumbs,
  ChipLinks,
  FaqList,
  Paragraphs,
  SeoDisclaimer,
  SeoJsonLd,
  SeoSection,
  TipsList,
} from "@/components/seo/SeoBlocks";

/**
 * 출생연도별 2027년 운세(검색용) — 예: /ko/fortune/2027/1995 = "95년생 2027년 운세".
 * 띠·나이·그 해와의 관계는 lib/seo/zodiac.ts(결정론), 문장은 data/seo/fortune-2027.json(미리 생성).
 * 태어난 해만 본 큰 틀이라는 점을 밝히고, 생년월일로 보는 2027년 운세(무료 미리보기)로 잇는다.
 */
interface PageProps {
  params: Promise<{ locale: string; birthYear: string }>;
}

const YEAR = FORTUNE_TARGET_YEAR;

function parseYear(raw: string): number | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const y = Number(raw);
  return isBirthYearInRange(y) ? y : null;
}

const SAMJAE_TEXT: Record<1 | 2 | 3, string> = {
  1: "흔히 말하는 삼재의 첫 해",
  2: "흔히 말하는 삼재의 가운데 해",
  3: "흔히 말하는 삼재의 마지막 해",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { birthYear } = await params;
  const y = parseYear(birthYear);
  const content = y ? getYearContent(y) : undefined;
  if (!y || !content) return { title: `${YEAR}년 운세 | 콩닥` };

  const f = birthYearFacts(y);
  const short = String(y).slice(2);
  const url = canonicalUrlFor(`/fortune/${YEAR}/${y}`);
  const title = `${y}년생 ${f.animal.name}띠 ${YEAR}년 운세 — ${short}년생 연애·일·돈 | 콩닥`;
  const description = `${content.summary} ${short}년생 ${f.animal.name}띠의 ${YEAR}년 연애운·직장운·금전운과 조심할 때.`.slice(0, 155);
  const image = { url: `${BASE_URL}/api/og/card?y=${y}&v=3`, width: 1200, height: 630, alt: `${y}년생 ${YEAR}년 운세` };
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "콩닥 (kongdak)", type: "article", locale: "ko_KR", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function BirthYearFortunePage({ params }: PageProps) {
  const { locale, birthYear } = await params;
  const y = parseYear(birthYear);
  if (!y) notFound();
  const content = getYearContent(y);
  if (!content) notFound();

  const f = birthYearFacts(y);
  const short = String(y).slice(2);
  const pageKey = `year:${y}`;
  const targetAnimal = zodiacOfYear(YEAR);

  const facts: Array<{ k: string; v: string }> = [
    { k: "띠", v: f.nickname },
    { k: `${YEAR}년 나이`, v: `만 ${f.ageFrom}~${f.ageTo}세` },
    { k: `${YEAR}년`, v: `${f.targetNickname}의 해` },
    { k: "올해의 결", v: YEAR_FLOW_LABEL[f.yearRelation.relation] },
  ];
  if (f.samjae) facts.push({ k: "참고", v: SAMJAE_TEXT[f.samjae] });

  // 같은 띠의 다른 출생연도(12년 간격) + 앞뒤 해
  const sameAnimalYears = birthYears().filter((v) => v !== y && (v - y) % 12 === 0);
  const nearYears = [y - 2, y - 1, y + 1, y + 2].filter(isBirthYearInRange);
  const yearLink = (v: number) => ({
    href: `/${locale}/fortune/${YEAR}/${v}`,
    label: `${v}년생 ${zodiacOfYear(v).name}띠`,
  });
  const pairLinks = ZODIAC.map((z) => ({
    href: `/${locale}/zodiac/${pairSlug(f.animal, z)}`,
    label: `${f.animal.name}띠 × ${z.name}띠`,
  }));

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-ink">
      <SeoJsonLd
        faq={content.faq}
        crumbs={[
          { name: "콩닥", url: canonicalUrlFor("") },
          { name: `${YEAR}년 운세`, url: canonicalUrlFor(`/fortune/${YEAR}`) },
          { name: `${y}년생 ${YEAR}년 운세`, url: canonicalUrlFor(`/fortune/${YEAR}/${y}`) },
        ]}
      />
      <article className="mx-auto flex w-full max-w-md flex-col gap-5">
        <Breadcrumbs
          items={[
            { href: `/${locale}`, label: "콩닥" },
            { href: `/${locale}/fortune/${YEAR}`, label: `${YEAR}년 운세` },
            { label: `${y}년생` },
          ]}
        />

        <header className="rounded-3xl bg-gradient-to-br from-[#FF8AA1] via-coral to-plum p-6 text-center text-white">
          <p className="text-3xl" aria-hidden>
            {f.animal.emoji}
          </p>
          <h1 className="mt-2 text-2xl font-black leading-snug">
            {y}년생 {f.animal.name}띠 {YEAR}년 운세
          </h1>
          <p className="mt-2 text-sm font-medium text-white/90">{content.headline}</p>
        </header>

        <dl className="grid grid-cols-2 gap-2">
          {facts.map((it) => (
            <div key={it.k} className="rounded-2xl border border-line bg-surface-soft px-4 py-3">
              <dt className="text-[11px] font-bold text-text-3">{it.k}</dt>
              <dd className="mt-0.5 text-sm font-extrabold text-ink">{it.v}</dd>
            </div>
          ))}
        </dl>

        <SeoSection title={`${short}년생 ${YEAR}년 총평`}>
          <Paragraphs items={paragraphs(content.summary)} />
        </SeoSection>

        {/* 태어난 해는 큰 틀 → 생년월일로 보는 내 운세로 */}
        <section className="rounded-2xl border border-coral/30 bg-white p-5 shadow-[0_4px_16px_rgba(255,92,119,0.12)]">
          <h2 className="text-base font-black text-ink">같은 {short}년생이라도 흐름이 달라요</h2>
          <p className="mt-1.5 mb-3 text-sm leading-relaxed text-text-2">
            여기는 태어난 해만 본 큰 틀이에요. 생년월일을 넣으면 나에게 맞춘 {YEAR}년 흐름을 무료로 먼저 볼 수 있어요.
          </p>
          <SeoCta href={`/${locale}/fortune/new?productId=annual_${YEAR}`} page={pageKey} target={`annual_${YEAR}`}>
            내 생년월일로 {YEAR}년 운세 보기
          </SeoCta>
        </section>

        <SeoSection title={`${YEAR}년 연애·관계`}>
          <Paragraphs items={paragraphs(content.love)} />
        </SeoSection>

        <SeoSection title={`${YEAR}년 일·진로`}>
          <Paragraphs items={paragraphs(content.work)} />
        </SeoSection>

        <SeoSection title={`${YEAR}년 돈`}>
          <Paragraphs items={paragraphs(content.money)} />
        </SeoSection>

        <SeoSection title="조심하면 좋은 때">
          <Paragraphs items={paragraphs(content.caution)} />
        </SeoSection>

        <TipsList title={`${short}년생이 ${YEAR}년에 해 볼 일`} tips={content.tips} />

        <FaqList faq={content.faq} />

        <section className="flex flex-col gap-2.5">
          <SeoCta href={`/${locale}/fortune/new?productId=annual_${YEAR}`} page={pageKey} target={`annual_${YEAR}_bottom`}>
            나에게 맞춘 {YEAR}년 운세 무료로 보기
          </SeoCta>
          <SeoCta href={`/${locale}/compat/new`} page={pageKey} target="compat" variant="secondary">
            그 사람과의 궁합도 궁금하다면
          </SeoCta>
        </section>

        <ChipLinks title={`다른 ${f.animal.name}띠 ${YEAR}년 운세`} links={sameAnimalYears.map(yearLink)} />
        <ChipLinks title="가까운 출생연도" links={nearYears.map(yearLink)} />
        <ChipLinks title={`${f.animal.name}띠 궁합`} links={pairLinks} />

        <p className="w-full px-2 text-center text-[11px] leading-relaxed text-caption">
          ※ 띠는 입춘(2월 4일 무렵)에 바뀌어요. {y}년 1월~2월 초에 태어났다면 {zodiacOfYear(y - 1).name}띠로 보기도 해요.
          {" "}{YEAR}년은 {targetAnimal.name}의 해예요.
        </p>
        <SeoDisclaimer />
      </article>
    </main>
  );
}
