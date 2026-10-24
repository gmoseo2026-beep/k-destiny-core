import type { Metadata } from "next";
import { getEffectiveCatalog } from "@/lib/catalogVisibility";
import { filterProductsByCategory } from "@/lib/home/explore";
import { buildPageMetadata } from "@/lib/seo";
import ProductsExplorerClient from "@/components/product/ProductsExplorerClient";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    ...buildPageMetadata("products", locale),
    title: "전체 운세 · 궁합 둘러보기 | 콩닥",
    description:
      "솔로 연애운, 그 사람 속마음, 재회운, 정통 궁합, 2027 신년운, 10년 대운까지 콩닥의 모든 사주 풀이를 한눈에 둘러보세요.",
  };
}

export default async function ProductsPage() {
  const effectiveCatalog = await getEffectiveCatalog();
  const visibleProducts = filterProductsByCategory(effectiveCatalog, "all");

  return (
    <div className="min-h-screen w-full bg-[#140B18] text-[#F6EEF3]">
      <ProductsExplorerClient products={visibleProducts} />
    </div>
  );
}
