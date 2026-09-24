import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";
import Image from "next/image";

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/onboarding`);
  }

  const profile = await prisma.userSajuProfile.findUnique({
    where: { userId: session.user.id }
  });

  return (
    <main className="min-h-screen bg-background flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-line">
        <div className="text-center mb-6">
          <div className="w-16 h-16 relative mx-auto mb-3">
            <Image
              src="/mascot/transparent/doogeun_cat_canon.webp"
              alt="두근이"
              width={64}
              height={64}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-ink mb-1.5">내 사주 정보 등록</h1>
          <p className="text-xs sm:text-sm text-caption leading-relaxed">
            더 정확한 운세와 궁합 결과를 위해<br/>
            회원님의 생년월일과 태어난 시간을 입력해 주세요.
          </p>
        </div>

        <OnboardingClient initialProfile={profile} locale={locale} />
      </div>
    </main>
  );
}
