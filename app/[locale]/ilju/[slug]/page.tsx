import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BASE_URL, canonicalUrlFor } from "@/lib/seo";
import { ILJU_LIST, resolveIljuParam } from "@/lib/seo/ilju";
import { paragraphs } from "@/lib/seo/data";
import SeoCta from "@/components/seo/SeoCta";
import {
  Breadcrumbs,
  ChipLinks,
  FaqList,
  IljuDisclaimer,
  Paragraphs,
  SeoJsonLd,
} from "@/components/seo/SeoBlocks";
import IljuChecker from "@/components/seo/IljuChecker";
import IljuViewTracker from "@/components/seo/IljuViewTracker";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolveIljuParam(slug);
  if (!resolved) {
    return { title: "일주 연애 성향 | 콩닥" };
  }

  const { entry, canonical } = resolved;
  const url = canonicalUrlFor(`/ilju/${canonical}`);
  const title = `${entry.title} | 콩닥`;
  const description =
    `${entry.name} 연애 성향, ${entry.name} 여자·남자 속마음 표현 방식, 이별·재회 패턴과 잘 맞는 일주 3개까지 쉬운 말로 정리했어요.`.slice(
      0,
      155
    );
  const image = {
    url: `${BASE_URL}/api/og/card?ilju=${canonical}&v=3`,
    width: 1200,
    height: 630,
    alt: entry.title,
  };

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "콩닥 (kongdak)",
      type: "article",
      locale: "ko_KR",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}

export default async function IljuDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const resolved = resolveIljuParam(slug);
  if (!resolved) notFound();

  if (resolved.canonical !== slug) {
    permanentRedirect(`/${locale}/ilju/${resolved.canonical}`);
  }

  const { entry } = resolved;
  const pageKey = `ilju:${entry.slug}`;
  const { loveStyle, innerMind, breakupReunion, bestMatches } = entry.sections;

  const neighborLinks = [-2, -1, 1, 2, 3, 4].map((offset) => {
    const idx = (entry.index + offset + ILJU_LIST.length) % ILJU_LIST.length;
    const item = ILJU_LIST[idx];
    return {
      href: `/${locale}/ilju/${item.slug}`,
      label: item.name,
    };
  });

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-ink">
      <IljuViewTracker slug={entry.slug} />
      <SeoJsonLd
        faq={[...entry.faq]}
        crumbs={[
          { name: "콩닥", url: canonicalUrlFor("") },
          { name: "일주 연애 성향", url: canonicalUrlFor("/ilju") },
          { name: entry.title, url: canonicalUrlFor(`/ilju/${entry.slug}`) },
        ]}
      />

      <article className="mx-auto flex w-full max-w-md flex-col gap-5">
        <Breadcrumbs
          items={[
            { href: `/${locale}`, label: "콩닥" },
            { href: `/${locale}/ilju`, label: "일주 연애 성향" },
            { label: entry.name },
          ]}
        />

        {/* 상단 헤더 카드 (한글 전용 제목) */}
        <header className="rounded-3xl border border-white/10 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,92,119,0.28),transparent_60%),linear-gradient(180deg,#3A1B40_0%,#22142A_100%)] p-6 text-center text-white">
          <span className="inline-block rounded-full bg-black/25 px-3 py-1 text-xs font-extrabold text-gold">
            {entry.metaphor}
          </span>
          <h1 className="mt-2.5 text-2xl font-black leading-snug">
            {entry.title}
          </h1>
          <p className="mt-2 text-sm font-medium text-white/90">
            {entry.headline}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            {entry.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold text-white"
              >
                {kw}
              </span>
            ))}
          </div>
        </header>

        <p className="px-1 text-sm leading-relaxed text-text-2">
          {entry.summary}
        </p>

        {/* 섹션 바로가기 앵커 네비게이션 */}
        <nav
          aria-label="본문 목차"
          className="flex flex-wrap gap-1.5 rounded-2xl border border-line bg-surface-soft p-3"
        >
          <a
            href="#love-style"
            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:border-coral"
          >
            1. 연애 성향
          </a>
          <a
            href="#inner-mind"
            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:border-coral"
          >
            2. 속마음 표현
          </a>
          <a
            href="#breakup-reunion"
            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:border-coral"
          >
            3. 이별·재회
          </a>
          <a
            href="#best-matches"
            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:border-coral"
          >
            4. 잘 맞는 일주
          </a>
        </nav>

        {/* 섹션 1: 연애 성향 */}
        <section
          id={loveStyle.id}
          className="scroll-mt-20 w-full rounded-2xl border border-line bg-white p-5 shadow-xs"
        >
          <h2 className="text-lg font-black text-ink">{loveStyle.heading}</h2>
          <div className="mt-3.5 space-y-5">
            {loveStyle.subheadings.map((sub) => (
              <div key={sub.title} className="space-y-2">
                <h3 className="text-sm font-extrabold text-coral">
                  {sub.title}
                </h3>
                <div className="space-y-2.5 text-sm leading-relaxed text-ink">
                  <Paragraphs items={paragraphs(sub.body)} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 섹션 2: 속마음 표현 방식 */}
        <section
          id={innerMind.id}
          className="scroll-mt-20 w-full rounded-2xl border border-line bg-white p-5 shadow-xs"
        >
          <h2 className="text-lg font-black text-ink">{innerMind.heading}</h2>
          <div className="mt-3.5 space-y-5">
            {innerMind.subheadings.map((sub) => (
              <div key={sub.title} className="space-y-2">
                <h3 className="text-sm font-extrabold text-coral">
                  {sub.title}
                </h3>
                <div className="space-y-2.5 text-sm leading-relaxed text-ink">
                  <Paragraphs items={paragraphs(sub.body)} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 중간 전환 안내 */}
        <section className="rounded-2xl border border-coral/30 bg-white p-5 shadow-[0_4px_16px_rgba(255,92,119,0.12)]">
          <h2 className="text-base font-black text-ink">
            그 사람이 지금 나를 어떻게 생각하는지 궁금하다면
          </h2>
          <p className="mt-1.5 mb-3 text-sm leading-relaxed text-text-2">
            같은 {entry.name}라도 상대가 누구인지에 따라 마음의 온도가 달라져요. 두 사람의 생년월일로 실제 궁합을 무료로 확인해 보세요.
          </p>
          <SeoCta href={`/${locale}/compat/new`} page={pageKey} target="compat_mid">
            두 사람 생년월일로 무료 궁합 보기
          </SeoCta>
        </section>

        {/* 섹션 3: 이별·재회 패턴 */}
        <section
          id={breakupReunion.id}
          className="scroll-mt-20 w-full rounded-2xl border border-line bg-white p-5 shadow-xs"
        >
          <h2 className="text-lg font-black text-ink">
            {breakupReunion.heading}
          </h2>
          <div className="mt-3.5 space-y-5">
            {breakupReunion.subheadings.map((sub) => (
              <div key={sub.title} className="space-y-2">
                <h3 className="text-sm font-extrabold text-coral">
                  {sub.title}
                </h3>
                <div className="space-y-2.5 text-sm leading-relaxed text-ink">
                  <Paragraphs items={paragraphs(sub.body)} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 섹션 4: 잘 맞는 일주 3개 (내부 링크) */}
        <section
          id={bestMatches.id}
          className="scroll-mt-20 w-full rounded-2xl border border-line bg-white p-5 shadow-xs"
        >
          <h2 className="text-lg font-black text-ink">{bestMatches.heading}</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-text-2">
            {bestMatches.intro}
          </p>
          <div className="mt-4 space-y-3">
            {bestMatches.matches.map((match, idx) => (
              <Link
                key={match.slug}
                href={`/${locale}/ilju/${match.slug}`}
                prefetch={false}
                className="group block rounded-2xl border border-line bg-surface-soft p-4 transition-all hover:border-coral active:scale-[0.98]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-coral text-xs font-black text-white">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-black text-ink group-hover:text-coral">
                      {entry.name} × {match.name}
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-coral">
                    <span>성향 보기</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-bold text-text-2">
                  {match.tag} · {match.metaphor}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink">
                  {match.reason}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* 내 일주 확인하기 입력기 */}
        <IljuChecker locale={locale} source={pageKey} />

        <FaqList faq={[...entry.faq]} />

        <section className="flex flex-col gap-2.5">
          <SeoCta
            href={`/${locale}/compat/new`}
            page={pageKey}
            target="compat_bottom"
          >
            우리 둘 진짜 궁합 무료로 보기
          </SeoCta>
          <SeoCta
            href={`/${locale}/compat/new?productId=inner_mind`}
            page={pageKey}
            target="inner_mind"
            variant="secondary"
          >
            그 사람 속마음 미리보기
          </SeoCta>
        </section>

        <ChipLinks title="다른 일주 연애 성향 둘러보기" links={neighborLinks} />

        <IljuDisclaimer />
      </article>
    </main>
  );
}
