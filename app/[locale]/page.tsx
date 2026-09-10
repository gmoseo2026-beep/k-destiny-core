import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import KongdakHero from "@/components/KongdakHero";
import DashboardView from "@/components/DashboardView";

export const metadata: Metadata = {
  title: "콩닥 — 우리, 얼마나 잘 맞을까? 사주 궁합",
  description: "두 사람의 생년월일만 넣으면 30초 만에 분석하는 진짜 사주 궁합과 에너지 케미",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

// 로그인 여부를 서버에서 판별해 분기한다. 예전에는 클라이언트 useSession() 이
// 서버 렌더 시 항상 "loading" 이라 스피너만 HTML 에 실렸고, 크롤러(특히 JS 렌더가
// 제한적인 네이버 Yeti)는 홈을 빈 페이지로 수집했다. 비로그인 방문자·크롤러는
// 이제 히어로(제목·설명·CTA)를 서버 HTML 로 바로 받는다.
// 가드는 user.id 로 본다 — 탈퇴자 토큰은 무효화돼도 session.user 가 남고 id 만 '' 가 된다.
export default async function Home({ params }: PageProps) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen bg-[#FFF6F1] text-[#2B2430] flex flex-col items-center justify-center">
      {session?.user?.id ? <DashboardView /> : <KongdakHero locale={locale} />}
    </main>
  );
}
