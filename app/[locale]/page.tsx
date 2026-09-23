import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import HomeHero from "@/components/home/HomeHero";
import DashboardView from "@/components/DashboardView";
import TrustBanner from "@/components/home/TrustBanner";
import HomeSearch from "@/components/home/HomeSearch";
import ProductGrid from "@/components/home/ProductGrid";
import PremiumBanner from "@/components/home/PremiumBanner";
import HomeRankingView from "@/components/home/HomeRankingView";
import MoreContentCards from "@/components/home/MoreContentCards";
import VisitorSection from "@/components/home/VisitorSection";
import BrandStory from "@/components/home/BrandStory";
import { getAllProducts, getPremiumProducts } from "@/lib/catalog";
import { fetchHomeRanking } from "@/lib/home/ranking";
import { fetchVisitorCount } from "@/lib/home/visitors";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "콩닥 — 우리, 얼마나 잘 맞을까? 사주 궁합",
  description: "두 사람의 생년월일만 넣으면 30초 만에 분석하는 진짜 사주 궁합과 에너지 케미",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: PageProps) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  const products = getAllProducts();
  const premiumProducts = getPremiumProducts();

  // 순위 및 방문자 통계 병렬 조회 (안전하게 fallback 포함)
  const [ranking, visitorData] = await Promise.all([
    fetchHomeRanking(prisma),
    fetchVisitorCount(prisma),
  ]);

  return (
    <div className="w-full min-h-screen bg-background text-ink pb-12">
      {session?.user?.id ? <DashboardView /> : <HomeHero locale={locale} />}
      <TrustBanner />
      <HomeSearch locale={locale} products={products} />
      <ProductGrid locale={locale} products={products} />
      <PremiumBanner locale={locale} premiumProducts={premiumProducts} />
      <HomeRankingView locale={locale} ranking={ranking} />
      <MoreContentCards locale={locale} products={products} />
      <VisitorSection count={visitorData.count} startedAt={visitorData.startedAt} />
      <BrandStory />
    </div>
  );
}
