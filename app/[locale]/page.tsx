import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Link } from "@/i18n/routing";
import OwnedReportNotice from "@/components/OwnedReportNotice";
import HomeExplore from "@/components/home/HomeExplore";
import TrustBanner from "@/components/home/TrustBanner";
import ProductReviewsSection from "@/components/product/ProductReviewsSection";
import WelcomeLoginSheet from "@/components/WelcomeLoginSheet";
import { getEffectiveCatalog } from "@/lib/catalogVisibility";
import { fetchHomeRanking } from "@/lib/home/ranking";
import { prisma } from "@/lib/prisma";
import { swrCached } from "@/lib/swrCache";
import { fetchVisitorCount } from "@/lib/home/visitors";
import VisitorPill from "@/components/home/VisitorPill";
import { canonicalUrlFor } from "@/lib/seo";
import { countAvailableCouponsForUser, getRecentPublicReviews } from "@/lib/reviews";
import { getSeasonNow, isSeason2027Active } from "@/lib/season";
import type { CatalogItem } from "@/lib/catalog";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "콩닥 — 그 사람 속마음까지 보는 사주 궁합",
  description:
    "그 사람은 지금 나를 어떻게 생각할까? 생년월일만 넣으면 30초 — 궁합, 속마음, 둘만의 속궁합까지 무료로 먼저 봐요.",
  alternates: { canonical: canonicalUrlFor("") },
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: PageProps) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  const effectiveCatalog = await getEffectiveCatalog();
  const visibleProducts = effectiveCatalog.filter((p) => !p.isHidden);
  const userId = session?.user?.id ?? "";
  const isMember = Boolean(userId);
  const memberName = session?.user?.name?.trim() || "회원";

  const now = getSeasonNow();
  const rankingCacheKey = isSeason2027Active(now) ? "home:ranking:2027" : "home:ranking:2026";

  const [ranking, recentReviews, couponCount, visitorData] = await Promise.all([
    swrCached(rankingCacheKey, 60_000, () => fetchHomeRanking(prisma, visibleProducts, now)),
    swrCached("home:reviews", 60_000, () => getRecentPublicReviews(6)),
    isMember ? countAvailableCouponsForUser(userId) : Promise.resolve(0),
    swrCached("home:visitors", 60_000, () => fetchVisitorCount(prisma)),
  ]);

  const catalogById: Record<string, CatalogItem> = Object.fromEntries(
    visibleProducts.map((p) => [p.id, p]),
  );

  return (
    <div className="w-full min-h-screen bg-[#140B18] text-[#F6EEF3] overflow-x-hidden pb-28 sm:pb-12">
      {/* 비로그인 첫 방문 환영 시트 (24시간 안 보기 지원) */}
      <WelcomeLoginSheet isMember={isMember} />

      {/* 로그인 회원 전용 상단 1줄 요약 바 (홈 화면 자체는 비회원과 100% 동일) */}
      {isMember ? (
        <div className="mx-auto w-full max-w-[480px] px-4 pt-2">
          <Link
            href="/me"
            className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#22142A] px-4 py-2.5 text-xs font-bold text-[#F6EEF3] transition-colors hover:border-white/20"
          >
            <span className="truncate">
              <strong className="font-extrabold text-[#FFC24B]">{memberName}</strong>님 · 쿠폰{" "}
              <strong className="font-extrabold text-[#FFC24B]">{couponCount}장</strong>
            </span>
            <span className="shrink-0 text-[#FF5C77] font-extrabold">
              이어보기 →
            </span>
          </Link>
        </div>
      ) : (
        <>
          {/* "벌써 N명이 함께했어요"(2026-10-09 사장님 결정 A안) — P-017 개편 때 빠졌던 것을 다크 톤으로 복원 */}
          <VisitorPill count={visitorData.count} />
          <div className="mx-auto w-full max-w-[480px] px-4 empty:hidden">
            <OwnedReportNotice locale={locale} source="home" className="mt-2" />
          </div>
        </>
      )}

      {/* 영역 1~3: 카테고리 칩 + 3:4 포스터 슬라이드 + (11/1부터 2027 신년 추천) + 인기 TOP 5 + 2열 포스터 격자 */}
      <HomeExplore
        locale={locale}
        products={visibleProducts}
        ranking={ranking}
        now={now}
      />

      {/* 영역 4: 실제 구매자 후기 (0개면 자동 숨김, 후기 아래에 해당 상품 목록 행 카드) */}
      <ProductReviewsSection
        reviews={recentReviews}
        variant="home"
        catalogById={catalogById}
      />

      <div className="mt-8">
        <TrustBanner />
      </div>
    </div>
  );
}
