import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import AnnualFortuneClient from "./AnnualFortuneClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "2026 나의 총운 리포트 — 콩닥",
    description: "2026년 병오년(붉은 말의 해), 당신에게 펼쳐질 1년 운세와 행운의 기회를 미리 만나보세요.",
  };
}

export default async function AnnualFortunePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  let hasProfile = false;
  if (session?.user?.id) {
    const profile = await prisma.userSajuProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });
    hasProfile = Boolean(profile);
  }

  return (
    <main className="min-h-screen bg-cream text-ink px-4 py-8 sm:py-12 flex flex-col items-center">
      <header className="w-full max-w-md md:max-w-2xl flex items-center justify-between mb-6">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-1.5 text-xs font-bold text-[#8A8291] hover:text-coral transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>홈으로</span>
        </Link>
        <Link href={`/${locale}`} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF8AA1] to-coral flex items-center justify-center text-white text-xs font-black shadow-sm">
            콩
          </div>
          <span className="font-extrabold text-lg tracking-tight text-[#6A2C70]">
            콩닥 <span className="text-xs font-semibold text-[#8A8291]">2026 총운</span>
          </span>
        </Link>
        <div className="w-12" /> {/* Balanced spacer */}
      </header>

      <AnnualFortuneClient
        locale={locale}
        initialHasProfile={hasProfile}
        isLoggedIn={Boolean(session?.user?.id)}
      />
    </main>
  );
}
