import { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import CompatResultClient from "@/components/CompatResultClient";
import { BASE_URL, canonicalUrlFor } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ ref?: string }>;
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
    alternates: {
      // canonical 은 유입 파라미터(?ref=)를 제외한 정규 URL 이어야 한다.
      // 공유 링크의 ref 는 클라이언트에서 그대로 유지되므로 K 추적에는 영향이 없다.
      // 로케일과 무관하게 ko 로 통합한다 — 같은 결과 페이지가 공유 경로에 따라
      // /en/compat/... 처럼 갈라지면 하나의 결과가 여러 URL 로 쪼개진다.
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
  const { ref } = await searchParams;

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
      personA: true,
      personB: true,
    },
  });

  if (!compat) {
    notFound();
  }

  const pA = compat.personA as { name?: string; gender?: string } | null;
  const pB = compat.personB as { name?: string; gender?: string } | null;

  // 프라이버시 보호: 클라이언트에는 표시용 필드만 전달
  const initialData = {
    id: compat.id,
    shareToken: compat.shareToken,
    relation: compat.relation,
    score: compat.score,
    keywords: compat.keywords,
    summaryKo: compat.summaryKo,
    personA: {
      name: pA?.name || "나",
      gender: pA?.gender || "M",
    },
    personB: {
      name: pB?.name || "상대방",
      gender: pB?.gender || "F",
    },
  };

  return (
    <main className="min-h-screen bg-[#FFF6F1] text-[#2B2430] px-4 py-8 flex flex-col items-center">
      {/* Top Brand Logo */}
      <header className="w-full max-w-md flex items-center justify-between mb-2">
        <a href={`/${locale}`} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF8AA1] to-[#FF5C77] flex items-center justify-center text-white text-xs font-black shadow-sm">
            콩
          </div>
          <span className="font-extrabold text-lg tracking-tight text-[#6A2C70]">
            콩닥 <span className="text-xs font-semibold text-[#8A8291]">kongdak</span>
          </span>
        </a>
        <a
          href={ref ? `/${locale}/compat/new?ref=${encodeURIComponent(ref)}` : `/${locale}/compat/new`}
          className="text-xs font-bold text-[#FF5C77] bg-white px-3 py-1.5 rounded-full border border-[#FFD9E0] shadow-sm hover:bg-[#FFF6F1]"
        >
          새로 하기
        </a>
      </header>

      {/* Main Result Interactive Client Component */}
      <CompatResultClient
        initialData={initialData}
        locale={locale}
        refToken={ref}
      />
    </main>
  );
}
