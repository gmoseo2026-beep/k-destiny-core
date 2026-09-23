import { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import ReportNewClient from "@/components/report/ReportNewClient";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "리포트 생성 중 | 콩닥",
  description: "사주 리포트를 심층 분석하여 생성하고 있습니다.",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ c?: string; compat?: string }>;
}

export default async function ReportNewPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { c: catalogId, compat: compatId } = await searchParams;

  if (!catalogId) {
    redirect(`/${locale}#products`);
  }

  const session = await getServerSession(authOptions).catch(() => null);
  let profile = null;
  if (session?.user?.id) {
    profile = await prisma.userSajuProfile.findUnique({
      where: { userId: session.user.id },
    });
  }

  return (
    <main className="min-h-screen bg-cream text-ink px-4 py-8 flex flex-col items-center">
      {/* Top Header */}
      <header className="w-full max-w-md flex items-center justify-between mb-6">
        <Link href={`/${locale}`} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-coral-light to-coral flex items-center justify-center text-white text-xs font-black shadow-sm">
            콩
          </div>
          <span className="font-extrabold text-lg tracking-tight text-plum">
            콩닥 <span className="text-xs font-semibold text-muted">kongdak</span>
          </span>
        </Link>
      </header>

      <ReportNewClient
        locale={locale}
        catalogId={catalogId}
        compatId={compatId}
        initialProfile={profile}
      />
    </main>
  );
}
