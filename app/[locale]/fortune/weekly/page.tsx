import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import WeeklyFortuneClient from "./WeeklyFortuneClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "이번 주 종합 운세 — 콩닥",
    description: "한 주의 흐름을 미리 읽고 대비하는 주간 사주 운세",
  };
}

export default async function WeeklyFortunePage({ 
  params,
  searchParams 
}: { 
  params: { locale: string },
  searchParams: { compatId?: string }
}) {
  const { locale } = await params;
  const { compatId } = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/fortune/weekly${compatId ? `?compatId=${compatId}` : ''}`);
  }

  // Check if they have onboarded
  const profile = await prisma.userSajuProfile.findUnique({
    where: { userId: session.user.id }
  });

  if (!profile) {
    redirect(`/${locale}/onboarding`);
  }

  return (
    <main className="min-h-screen bg-[#FFF6F1] text-[#2B2430] px-4 py-8 flex flex-col items-center">
      <header className="w-full max-w-md flex items-center justify-between mb-6">
        <a href={`/${locale}`} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF8AA1] to-[#FF5C77] flex items-center justify-center text-white text-xs font-black shadow-sm">
            콩
          </div>
          <span className="font-extrabold text-lg tracking-tight text-[#6A2C70]">
            콩닥 <span className="text-xs font-semibold text-[#8A8291]">운세</span>
          </span>
        </a>
      </header>

      <div className="w-full max-w-md text-center mb-6">
        <h1 className="text-2xl font-black text-[#2B2430] tracking-tight">
          {compatId ? "우리 커플의 이번 주 운세" : "나의 이번 주 종합 운세"}
        </h1>
        <p className="text-xs font-semibold text-[#8A8291] mt-1.5">
          매주 월요일 0시, 당신을 위한 새로운 흐름이 업데이트됩니다 ✨
        </p>
      </div>

      <WeeklyFortuneClient locale={locale} compatId={compatId} />
    </main>
  );
}
