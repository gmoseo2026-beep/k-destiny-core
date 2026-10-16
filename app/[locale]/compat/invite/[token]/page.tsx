import { Metadata } from "next";
import prisma from "@/lib/prisma";
import { BASE_URL } from "@/lib/seo";
import { isValidInviteToken } from "@/lib/compatInviteClient";
import CompatInviteClient from "@/components/CompatInviteClient";

interface PageProps {
  params: Promise<{ locale: string; token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const siteUrl = BASE_URL;

  let nameA = "상대방";
  if (isValidInviteToken(token)) {
    const invite = await prisma.compatInvite
      .findUnique({
        where: { token },
        select: {
          personA: true,
          completedCompatId: true,
        },
      })
      .catch(() => null);

    const pA = invite?.personA as { name?: unknown } | null;
    if (typeof pA?.name === "string" && pA.name.trim()) {
      nameA = pA.name.trim();
    } else if (invite?.completedCompatId) {
      const compat = await prisma.compatibility
        .findUnique({
          where: { id: invite.completedCompatId },
          select: { personA: true },
        })
        .catch(() => null);
      const cpA = compat?.personA as { name?: unknown } | null;
      if (typeof cpA?.name === "string" && cpA.name.trim()) {
        nameA = cpA.name.trim();
      }
    }
  }

  const title = `${nameA}님이 반쪽 궁합을 채워뒀어요 — 콩닥`;
  const description = `${nameA}님의 반쪽은 이미 입력 완료! 내 생년월일만 채우면 우리 두 사람의 궁합 점수가 바로 열려요.`;
  const ogImageUrl = `${siteUrl}/api/og/compat?inviteToken=${encodeURIComponent(token)}`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/ko/compat/invite/${encodeURIComponent(token)}`,
      siteName: "콩닥 (kongdak)",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${nameA}님의 반쪽 궁합 초대장`,
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

export default async function CompatInvitePage({ params }: PageProps) {
  const { locale, token } = await params;

  return (
    <main className="min-h-screen bg-white text-ink px-4 py-8 flex flex-col items-center">
      <CompatInviteClient locale={locale} token={token} />
    </main>
  );
}
