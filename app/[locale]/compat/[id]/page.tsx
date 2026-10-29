import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import CompatResultClient from "@/components/CompatResultClient";
import { isViewableFor } from "@/lib/catalog";
import { getEffectiveCatalog } from "@/lib/catalogVisibility";
import { canPreview } from "@/lib/preview";
import { BASE_URL, canonicalUrlFor } from "@/lib/seo";
import { resolveCompatPageEntitlement } from "@/lib/entitlement";
import { pickPublicBreakdown } from "@/lib/compatGauge";
import {
  buildSajuDisplayFromPillars,
  toSharedSajuPerson,
  type SajuDisplayPerson,
} from "@/lib/sajuDisplay";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ ref?: string; via?: string }>;
}

/**
 * Dynamic OpenGraph Metadata Generation
 * 카카오톡/인스타 링크 공유 시 카드가 곧바로 렌더링되도록 연결
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const siteUrl = BASE_URL;

  const compat = await prisma.compatibility.findFirst({
    where: { OR: [{ shareToken: id }, { id }] },
    select: {
      shareToken: true,
      score: true,
      keywords: true,
      personA: true,
      personB: true,
    },
  });

  if (!compat) {
    return {
      metadataBase: new URL(siteUrl),
      title: "콩닥 — 우리, 얼마나 잘 맞을까?",
      description: "사주로 보는 우리 사이의 진짜 케미",
      robots: { index: false, follow: true },
    };
  }

  const pA = compat.personA as { name?: string } | null;
  const pB = compat.personB as { name?: string } | null;
  const nameA = pA?.name || "나";
  const nameB = pB?.name || "상대방";
  const keywordText = compat.keywords.join(", ");
  const ogImageUrl = `${siteUrl}/api/og/compat?shareToken=${encodeURIComponent(compat.shareToken)}`;

  return {
    metadataBase: new URL(siteUrl),
    title: `${nameA} ❤️ ${nameB} 궁합 점수: ${compat.score}점 — 콩닥`,
    description: `우리의 케미 키워드: ${keywordText} | 사주로 보는 우리 사이`,
    robots: { index: false, follow: true },
    alternates: {
      canonical: canonicalUrlFor(`/compat/${compat.shareToken}`),
    },
    openGraph: {
      title: `${nameA} ❤️ ${nameB} 궁합 점수: ${compat.score}점 — 콩닥`,
      description: `우리의 케미 키워드: ${keywordText} | 사주로 보는 우리 사이`,
      url: `${siteUrl}/ko/compat/${compat.shareToken}`,
      siteName: "콩닥 (kongdak)",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${nameA} ❤️ ${nameB} 궁합 결과`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${nameA} ❤️ ${nameB} 궁합: ${compat.score}점`,
      description: `케미 키워드: ${keywordText}`,
      images: [ogImageUrl],
    },
  };
}

export default async function CompatResultPage({ params, searchParams }: PageProps) {
  const { locale, id } = await params;
  const { ref, via } = await searchParams;

  const session = await getServerSession(authOptions);

  // shareToken 또는 cuid(id)로 DB 조회
  // (cuid 25자·shareToken 24자로 둘 다 20자를 넘어 길이 분기가 불가능하므로 OR 조회)
  const compat = await prisma.compatibility.findFirst({
    where: { OR: [{ shareToken: id }, { id }] },
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

  const isPremium = await resolveCompatPageEntitlement(session?.user?.id, compat.id);

  const pA = compat.personA as {
    name?: string;
    gender?: string;
    fourPillars?: { year: string; month: string; day: string; time: string | null };
  } | null;
  const pB = compat.personB as {
    name?: string;
    gender?: string;
    fourPillars?: { year: string; month: string; day: string; time: string | null };
  } | null;

  const cardA = buildSajuDisplayFromPillars(pA?.fourPillars);
  const cardB = buildSajuDisplayFromPillars(pB?.fourPillars);
  // 이 화면은 공유 링크로 누구나 연다 → 여덟 칸(생년월일·시간을 거꾸로 알 수 있음)은 빼고 기운 막대·배지만 보낸다.
  const sajuPeople = ([
    ...(cardA ? [{ name: pA?.name || "나", card: cardA }] : []),
    ...(cardB ? [{ name: pB?.name || "상대방", card: cardB }] : []),
  ] satisfies SajuDisplayPerson[]).map(toSharedSajuPerson);

  // 프라이버시 보호: 클라이언트에는 표시용 필드만 전달 (세부 지표도 공개 3축만 전달하고 잠긴 2축은 내려보내지 않는다)
  const initialData = {
    id: compat.id,
    shareToken: compat.shareToken,
    relation: compat.relation,
    score: compat.score,
    keywords: compat.keywords,
    summaryKo: compat.summaryKo,
    publicBreakdown: pickPublicBreakdown(compat.breakdown),
    sajuPeople,
    personA: {
      name: pA?.name || "나",
      gender: pA?.gender || "M",
    },
    personB: {
      name: pB?.name || "상대방",
      gender: pB?.gender || "F",
    },
  };

  // 정통 궁합이 든 세트 추천용(숨긴 세트는 권하지 않는다)
  const preview = canPreview(session?.user?.email);
  const visibleIds = (await getEffectiveCatalog()).filter((p) => isViewableFor(p, preview)).map((p) => p.id);

  return (
    <main className="min-h-screen bg-[#140B18] text-[#F6EEF3] px-4 py-8 flex flex-col items-center">
      {/* 상단 내비게이션(Navbar)에 로고가 있으므로 여기서는 '새로 하기'만 둔다 */}
      <header className="w-full max-w-md flex items-center justify-end mb-2">
        <Link
          href={ref ? `/${locale}/compat/new?ref=${encodeURIComponent(ref)}` : `/${locale}/compat/new`}
          className="text-xs font-bold text-[#FF8AA1] bg-[#22142A] px-3 py-1.5 rounded-full border border-white/[0.08] hover:bg-white/[0.06] active:scale-95 transition-all"
        >
          새로 하기
        </Link>
      </header>

      {/* Main Result Interactive Client Component */}
      <CompatResultClient
        initialData={initialData}
        locale={locale}
        refToken={ref}
        via={via}
        isPremium={isPremium}
        visibleIds={visibleIds}
      />
    </main>
  );
}
