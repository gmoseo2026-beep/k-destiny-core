import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import GlobalCoupleResultClient, {
  type GlobalCompatData,
} from "@/components/global/GlobalCoupleResultClient";
import { pickPublicBreakdown } from "@/lib/compatGauge";
import {
  GLOBAL_COUPLE_META,
  isGlobalCoupleLocale,
  resolveGlobalCoupleGuardRedirect,
  type GlobalCoupleLocale,
} from "@/lib/globalCoupleLocale";
import { BASE_URL } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string; shareToken: string }>;
  searchParams: Promise<{ ref?: string }>;
}

const DEFAULT_NAMES: Record<GlobalCoupleLocale, { a: string; b: string }> = {
  en: { a: "Person A", b: "Person B" },
  ja: { a: "あなた", b: "お相手" },
  zh: { a: "我", b: "对方" },
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, shareToken } = await params;
  const siteUrl = BASE_URL;

  if (!isGlobalCoupleLocale(locale)) {
    return {
      metadataBase: new URL(siteUrl),
      title: GLOBAL_COUPLE_META.en.title,
      robots: { index: false, follow: false },
    };
  }

  const compat = await prisma.compatibility
    .findFirst({
      where: { OR: [{ shareToken }, { id: shareToken }] },
      select: {
        shareToken: true,
        score: true,
        personA: true,
        personB: true,
      },
    })
    .catch(() => null);

  if (!compat) {
    return {
      metadataBase: new URL(siteUrl),
      title: "Korean Couple Compatibility — kongdak",
      description:
        "Korean birth-date compatibility — how two birthdays click in love.",
      robots: { index: false, follow: true },
    };
  }

  const pA = compat.personA as { name?: string } | null;
  const pB = compat.personB as { name?: string } | null;
  const defaults = DEFAULT_NAMES[locale];
  const nameA = pA?.name || defaults.a;
  const nameB = pB?.name || defaults.b;
  const ogImageUrl = `${siteUrl}/api/og/compat?shareToken=${encodeURIComponent(
    compat.shareToken
  )}&lang=${locale}`;

  const meta = GLOBAL_COUPLE_META[locale];
  const title = meta.resultTitle(nameA, nameB, compat.score);
  const description = meta.description;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/${locale}/couple/${compat.shareToken}`,
      siteName: "kongdak",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function GlobalCoupleResultPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, shareToken } = await params;
  const { ref } = await searchParams;

  const guardTarget = resolveGlobalCoupleGuardRedirect(locale);
  if (guardTarget || !isGlobalCoupleLocale(locale)) {
    redirect(guardTarget ?? "/ko/compat/new");
  }

  const compat = await prisma.compatibility.findFirst({
    where: { OR: [{ shareToken }, { id: shareToken }] },
    select: {
      id: true,
      shareToken: true,
      relation: true,
      score: true,
      keywords: true,
      summaryKo: true,
      breakdown: true,
      personA: true,
      personB: true,
    },
  });

  if (!compat) {
    notFound();
  }

  const pA = compat.personA as { name?: string; gender?: string } | null;
  const pB = compat.personB as { name?: string; gender?: string } | null;
  const defaults = DEFAULT_NAMES[locale];

  const initialData: GlobalCompatData = {
    id: compat.id,
    shareToken: compat.shareToken,
    relation: compat.relation,
    score: compat.score,
    keywords: compat.keywords,
    summaryKo: compat.summaryKo,
    publicBreakdown: pickPublicBreakdown(compat.breakdown),
    personA: {
      name: pA?.name || defaults.a,
      gender: pA?.gender || "F",
    },
    personB: {
      name: pB?.name || defaults.b,
      gender: pB?.gender || "M",
    },
  };

  return (
    <GlobalCoupleResultClient
      initialData={initialData}
      locale={locale}
      refToken={ref}
    />
  );
}
