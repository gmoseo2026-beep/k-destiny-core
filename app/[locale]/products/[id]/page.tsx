import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isViewableFor } from "@/lib/catalog";
import { getEffectiveProduct, getEffectiveCatalog } from "@/lib/catalogVisibility";
import { canPreview } from "@/lib/preview";
import { StandardProductDetail } from "@/components/product/StandardProductDetail";
import { canonicalUrlFor, productSearchMeta, productShareMeta } from "@/lib/seo";
import { ProductJsonLd } from "@/components/seo/SeoBlocks";
import { sectionOutlineFor } from "@/lib/prompts/sectionOutline";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await getServerSession(authOptions).catch(() => null);
  const preview = canPreview(session?.user?.email);
  const product = await getEffectiveProduct(id);
  if (!product || !isViewableFor(product, preview)) return { title: "상품을 찾을 수 없습니다" };

  // 공유 카드: 홈 카드가 아니라 이 상품의 질문(hook)이 크게 보이게 한다. og:url 도 이 상품 주소로.
  const url = canonicalUrlFor(`/products/${product.id}`);
  return {
    title: { absolute: productSearchMeta(product).title },
    description: productSearchMeta(product).description,
    alternates: { canonical: url },
    ...productShareMeta(product, url),
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const session = await getServerSession(authOptions).catch(() => null);
  const preview = canPreview(session?.user?.email);
  const product = await getEffectiveProduct(id);

  if (!product || !isViewableFor(product, preview)) {
    notFound();
  }

  if (product.tier === "premium") {
    const { PremiumProductDetail } = await import("@/components/premium/PremiumProductDetail");
    return (
      <>
        <ProductJsonLd product={product} />
        <PremiumProductDetail product={product} locale={locale} />
      </>
    );
  }

  const effectiveCatalog = await getEffectiveCatalog();
  const allProducts = effectiveCatalog.filter((p) => !p.isHidden);

  return (
    <>
      <ProductJsonLd product={product} />
      <StandardProductDetail
        product={product}
        locale={locale}
        preview={preview}
        allProducts={allProducts}
        sections={sectionOutlineFor(product.promptKey)}
      />
    </>
  );
}
