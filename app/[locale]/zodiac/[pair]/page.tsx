import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { BASE_URL, canonicalUrlFor } from "@/lib/seo";
import { ZODIAC, pairRelation, pairSlug, parsePairSlug } from "@/lib/seo/zodiac";
import { getPairContent, paragraphs } from "@/lib/seo/data";
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
 * 띠 궁합 상세(검색용) — 예: /ko/zodiac/rat-ox = "쥐띠 소띠 궁합".
 * 점수·관계는 lib/seo/zodiac.ts(결정론), 문장은 data/seo/zodiac-pairs.json(미리 생성).
 * 띠만으로는 큰 틀이라는 점을 밝히고, 두 사람 생년월일로 보는 무료 궁합으로 잇는다.
 */
interface PageProps {
  params: Promise<{ locale: string; pair: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pair } = await params;
  const parsed = parsePairSlug(pair);
  const content = parsed ? getPairContent(parsed.canonical) : undefined;
  if (!parsed || !content) return { title: "띠 궁합 | 콩닥" };

  const { a, b, canonical } = parsed;
  const rel = pairRelation(a, b);
  const url = canonicalUrlFor(`/zodiac/${canonical}`);
  const title = `${a.name}띠 ${b.name}띠 궁합 — ${rel.grade} | 콩닥`;
  const description = `${content.summary} ${b.name}띠 ${a.name}띠 궁합, 끌리는 이유와 부딪히는 지점, 잘 지내는 법까지.`.slice(0, 155);
  const image = { url: `${BASE_URL}/api/og/card?z=${canonical}&v=3`, width: 1200, height: 630, alt: `${a.name}띠 ${b.name}띠 궁합` };
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "콩닥 (kongdak)", type: "article", locale: "ko_KR", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function ZodiacPairPage({ params }: PageProps) {
  const { locale, pair } = await params;
  const parsed = parsePairSlug(pair);
  if (!parsed) notFound();
  // 뒤집힌 주소(ox-rat)는 정본(rat-ox)으로 보낸다 — 한 쌍에 주소 하나
  if (parsed.canonical !== pair) permanentRedirect(`/${locale}/zodiac/${parsed.canonical}`);

  const { a, b, canonical } = parsed;
  const content = getPairContent(canonical);
  if (!content) notFound();
  const rel = pairRelation(a, b);
  const same = a.slug === b.slug;
  const pageKey = `zodiac:${canonical}`;

  const others = (me: typeof a, partner: typeof b) =>
    ZODIAC.filter((z) => z.slug !== partner.slug).map((z) => ({
      href: `/${locale}/zodiac/${pairSlug(me, z)}`,
      label: `${me.name}띠 × ${z.name}띠`,
    }));

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-ink">
      <SeoJsonLd
        faq={content.faq}
        crumbs={[
          { name: "콩닥", url: canonicalUrlFor("") },
          { name: "띠 궁합", url: canonicalUrlFor("/zodiac") },
          { name: `${a.name}띠 ${b.name}띠 궁합`, url: canonicalUrlFor(`/zodiac/${canonical}`) },
        ]}
      />
      <article className="mx-auto flex w-full max-w-md flex-col gap-5">
        <Breadcrumbs
          items={[
            { href: `/${locale}`, label: "콩닥" },
            { href: `/${locale}/zodiac`, label: "띠 궁합" },
            { label: `${a.name}띠 × ${b.name}띠` },
          ]}
        />

        <header className="rounded-3xl bg-gradient-to-br from-[#FF8AA1] via-coral to-plum p-6 text-center text-white">
          <p className="text-3xl" aria-hidden>
            {a.emoji} {same ? "" : "×"} {same ? "" : b.emoji}
          </p>
          <h1 className="mt-2 text-2xl font-black leading-snug">
            {a.name}띠와 {b.name}띠 궁합, 잘 맞을까?
          </h1>
          <p className="mt-2 text-sm font-medium text-white/90">{content.headline}</p>
          <div className="mt-4 inline-flex items-baseline gap-1.5 rounded-full bg-black/20 px-4 py-1.5">
            <span className="text-xs font-bold text-white/90">띠 기준 궁합</span>
            <span className="text-xl font-black">{rel.score}점</span>
            <span className="text-xs font-bold text-gold">{rel.grade}</span>
          </div>
          <p className="mt-2 text-xs text-white/85">{rel.label}</p>
        </header>

        <p className="px-1 text-sm leading-relaxed text-text-2">{content.summary}</p>

        {/* 띠는 큰 틀 → 두 사람 생년월일로 보는 실제 궁합으로 */}
        <section className="rounded-2xl border border-coral/30 bg-white p-5 shadow-[0_4px_16px_rgba(255,92,119,0.12)]">
          <h2 className="text-base font-black text-ink">같은 {a.name}띠·{b.name}띠라도 점수가 달라요</h2>
          <p className="mt-1.5 mb-3 text-sm leading-relaxed text-text-2">
            띠는 태어난 해만 본 거예요. 두 사람의 생년월일을 넣으면 30초 만에 둘만의 궁합 점수와 해석이 나와요. 무료예요.
          </p>
          <SeoCta href={`/${locale}/compat/new`} page={pageKey} target="compat">
            우리 둘 생년월일로 궁합 보기
          </SeoCta>
        </section>

        <SeoSection title={`${a.name}띠와 ${b.name}띠가 끌리는 이유`}>
          <Paragraphs items={paragraphs(content.attraction)} />
        </SeoSection>

        <SeoSection title="부딪히기 쉬운 지점">
          <Paragraphs items={paragraphs(content.friction)} />
        </SeoSection>

        <SeoSection title="연애할 때">
          <Paragraphs items={paragraphs(content.love)} />
        </SeoSection>

        <SeoSection title="함께 살거나 오래 볼 때">
          <Paragraphs items={paragraphs(content.marriage)} />
        </SeoSection>

        <TipsList title={`${a.name}띠 × ${b.name}띠, 잘 지내는 법`} tips={content.tips} />

        <FaqList faq={content.faq} />

        <section className="flex flex-col gap-2.5">
          <SeoCta href={`/${locale}/compat/new`} page={pageKey} target="compat_bottom">
            우리 둘 진짜 궁합 무료로 보기
          </SeoCta>
          <SeoCta href={`/${locale}/compat/new?productId=inner_mind`} page={pageKey} target="inner_mind" variant="secondary">
            그 사람 속마음이 궁금하다면
          </SeoCta>
        </section>

        <ChipLinks title={`${a.name}띠의 다른 궁합`} links={others(a, b)} />
        {!same && <ChipLinks title={`${b.name}띠의 다른 궁합`} links={others(b, a)} />}

        <SeoDisclaimer />
      </article>
    </main>
  );
}
