import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEffectiveCatalog } from "@/lib/catalogVisibility";
import { filterProductsByCategory } from "@/lib/home/explore";
import { BASE_URL, canonicalUrlFor } from "@/lib/seo";
import {
  evaluateSeasonEventState,
  getSeasonEvent,
  resolveSeasonEventProducts,
} from "@/lib/seasonEvents";
import SeasonEventView from "@/components/season/SeasonEventView";

export const dynamic = "force-dynamic";

interface SeasonPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: SeasonPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = getSeasonEvent(slug);
  if (!event) {
    return {
      title: "콩닥 — 시즌 기획전",
      robots: { index: false, follow: true },
    };
  }

  const title = `${event.title} | 콩닥`;
  const description = event.subtitle;
  const url = canonicalUrlFor(`/season/${event.slug}`);
  const ogImage = `${BASE_URL}/api/og/card?v=3`;

  return {
    metadataBase: new URL(BASE_URL),
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "콩닥 (kongdak)",
      type: "website",
      locale: "ko_KR",
      images: [{ url: ogImage, width: 1200, height: 630, alt: event.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function SeasonEventPage({ params }: SeasonPageProps) {
  const { slug } = await params;
  const event = getSeasonEvent(slug);
  if (!event) {
    notFound();
  }

  const { active, daysLeftLabel } = evaluateSeasonEventState(event);

  const effectiveCatalog = await getEffectiveCatalog();
  const seasonProducts = resolveSeasonEventProducts(event, effectiveCatalog, false);
  const allProducts = filterProductsByCategory(effectiveCatalog, "all");

  return (
    <main className="min-h-screen w-full bg-[#140B18] text-[#F6EEF3]">
      <SeasonEventView
        slug={event.slug}
        title={event.title}
        subtitle={event.subtitle}
        endDateLabel={event.endDateLabel}
        daysLeftLabel={daysLeftLabel}
        active={active}
        seasonProducts={seasonProducts}
        allProducts={allProducts}
      />
    </main>
  );
}
