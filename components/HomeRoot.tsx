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

  // 로그인 상태인 경우 대시보드 화면 렌더링 (지난 궁합 기록, 새 궁합 보기 CTA 등)
  if (status === "authenticated" && session?.user) {
    return <DashboardView />;
  }

  // 비로그인 상태이거나 로딩 중일 때는 기본 랜딩 히어로 렌더링
  return <KongdakHero locale={locale} />;
}
