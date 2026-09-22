import { Metadata } from "next";
import Link from "next/link";
import FortuneNewClient from "@/components/FortuneNewClient";
import { canonicalUrlFor } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

const TITLE = "내 사주 정보 입력 — 콩닥";
const DESCRIPTION = "사주 정보를 입력하고 정확한 분석 결과를 확인하세요.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await params;
  const canonical = canonicalUrlFor('/fortune/new');

  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical },
    openGraph: { title: TITLE, description: DESCRIPTION, url: canonical },
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ productId?: string }>;
}

export default async function FortuneNewPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { productId } = await searchParams;

  const session = await getServerSession(authOptions);
  let profile = null;
  if (session?.user?.id) {
    profile = await prisma.userSajuProfile.findUnique({
      where: { userId: session.user.id }
    });
  }

  return (
    <main className="min-h-screen bg-[#FFF6F1] text-[#2B2430] px-4 py-8 flex flex-col items-center">
      {/* Top Header */}
      <header className="w-full max-w-md flex items-center justify-between mb-6">
        <Link href={`/${locale}`} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF8AA1] to-[#FF5C77] flex items-center justify-center text-white text-xs font-black shadow-sm">
            콩
          </div>
          <span className="font-extrabold text-lg tracking-tight text-[#6A2C70]">
            콩닥 <span className="text-xs font-semibold text-[#8A8291]">kongdak</span>
          </span>
        </Link>
      </header>

      {/* Hero Title */}
      <div className="w-full max-w-md text-center mb-6">
        <h1 className="text-2xl font-black text-[#2B2430] tracking-tight">
          내 사주 정보 입력
        </h1>
        <p className="text-xs font-semibold text-[#8A8291] mt-1.5">
          가장 정확한 사주 풀이를 위해 생년월일을 입력해주세요 ✨
        </p>
      </div>

      {/* Form Component */}
      <FortuneNewClient locale={locale} productId={productId} initialProfile={profile} />
    </main>
  );
}
