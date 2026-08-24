import { Metadata } from "next";
import KongdakHero from "@/components/KongdakHero";

export const metadata: Metadata = {
  title: "콩닥 — 우리, 얼마나 잘 맞을까? 사주 궁합",
  description: "두 사람의 생년월일만 넣으면 30초 만에 분석하는 진짜 사주 궁합과 에너지 케미",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-[#FFF6F1] text-[#2B2430] flex flex-col items-center justify-center">
      <KongdakHero locale={locale} />
    </main>
  );
}

