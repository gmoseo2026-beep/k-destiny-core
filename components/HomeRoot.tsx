"use client";

import React from "react";
import { useSession } from "next-auth/react";
import KongdakHero from "@/components/KongdakHero";
import DashboardView from "@/components/DashboardView";

interface HomeRootProps {
  locale: string;
}

export default function HomeRoot({ locale }: HomeRootProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#FF5C77] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 로그인 상태인 경우 대시보드 화면 렌더링
  if (status === "authenticated" && session?.user) {
    return <DashboardView />;
  }

  // 비로그인 상태일 때는 기본 랜딩 히어로 렌더링
  return <KongdakHero locale={locale} />;
}
