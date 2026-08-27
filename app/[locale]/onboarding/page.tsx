import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";
import { getTranslations } from "next-intl/server";

export default async function OnboardingPage({ params }: { params: { locale: string } }) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/onboarding`);
  }

  // Check if they already have a profile
  const profile = await prisma.userSajuProfile.findUnique({
    where: { userId: session.user.id }
  });

  const t = await getTranslations({ locale, namespace: "Onboarding" });

  return (
    <main className="min-h-screen bg-[#FFF6F1] flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm border border-[#FFD9E0]/50">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-[#6A2C70] mb-2">내 사주 프로필 등록</h1>
          <p className="text-sm text-[#8A8291]">
            정확한 운세와 궁합 결과를 위해<br/>
            대표님의 태어난 정보를 입력해주세요.
          </p>
        </div>

        <OnboardingClient initialProfile={profile} locale={locale} />
      </div>
    </main>
  );
}
