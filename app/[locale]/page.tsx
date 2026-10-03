import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import HomeHeroCompact from "@/components/home/HomeHeroCompact";
import HomeExplore from "@/components/home/HomeExplore";
import HomeStickyCta from "@/components/home/HomeStickyCta";
import DashboardView from "@/components/DashboardView";
import TrustBanner from "@/components/home/TrustBanner";
import HomeSearch from "@/components/home/HomeSearch";
import PremiumBanner from "@/components/home/PremiumBanner";
import HomeRankingView from "@/components/home/HomeRankingView";
import MoreContentCards from "@/components/home/MoreContentCards";
import VisitorSection from "@/components/home/VisitorSection";
import BrandStory from "@/components/home/BrandStory";
import SetRow from "@/components/home/SetRow";
import { getEffectiveCatalog } from "@/lib/catalogVisibility";
import { fetchHomeRanking } from "@/lib/home/ranking";
import { fetchVisitorCount } from "@/lib/home/visitors";
import { prisma } from "@/lib/prisma";
import { buildExploreTabs } from "@/lib/home/explore";
import { swrCached } from "@/lib/swrCache";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "콩닥 — 그 사람 속마음까지 보는 사주 궁합",
  description: "그 사람은 지금 나를 어떻게 생각할까? 생년월일만 넣으면 30초 — 궁합, 속마음, 둘만의 속궁합까지 무료로 먼저 봐요.",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: PageProps) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  const effectiveCatalog = await getEffectiveCatalog();
  const visibleProducts = effectiveCatalog.filter((p) => !p.isHidden);
  const products = visibleProducts.filter((p) => p.tier !== "premium");
  const premiumProducts = visibleProducts.filter((p) => p.tier === "premium");
  const explore = buildExploreTabs(visibleProducts);
  const exploreTotal = visibleProducts.filter((p) => p.type !== "SET").length;
  const isMember = Boolean(session?.user?.id);

  // 순위 및 방문자 통계 (안전하게 fallback 포함). 읽어 둔 값을 바로 쓰고 1분마다 뒤에서 새로 읽는다 — 홈이 먼 DB를 기다리지 않게.
  const [ranking, visitorData] = await Promise.all([
    swrCached("home:ranking", 60_000, () => fetchHomeRanking(prisma, visibleProducts)),
    swrCached("home:visitors", 60_000, () => fetchVisitorCount(prisma)),
  ]);

  return (
    <div className={`w-full min-h-screen bg-background text-ink ${isMember ? "pb-12" : "pb-28"}`}>
      {/* 첫 화면: 무엇이 있는지(탭·추천·격자·프리미엄)를 먼저 보여 준다 */}
      {isMember ? (
        <DashboardView effectiveProducts={visibleProducts} />
      ) : (
        <HomeHeroCompact total={exploreTotal} />
      )}
      <HomeExplore locale={locale} tabs={explore.tabs} picks={explore.picks} />
      <SetRow locale={locale} products={products} />
      <PremiumBanner locale={locale} premiumProducts={premiumProducts} />
      <HomeRankingView locale={locale} ranking={ranking} />
      <TrustBanner />
      <HomeSearch locale={locale} products={products} />
      <MoreContentCards locale={locale} products={products} />
      <VisitorSection count={visitorData.count} startedAt={visitorData.startedAt} />
      <BrandStory />
      {!isMember && <HomeStickyCta locale={locale} />}
    </div>
  );
}
