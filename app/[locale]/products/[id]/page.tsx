import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isViewableFor } from "@/lib/catalog";
import { getEffectiveProduct, getEffectiveCatalog } from "@/lib/catalogVisibility";
import { canPreview } from "@/lib/preview";
import { StandardProductDetail } from "@/components/product/StandardProductDetail";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await getServerSession(authOptions).catch(() => null);
  const preview = canPreview(session?.user?.email);
  const product = await getEffectiveProduct(id);
  if (!product || !isViewableFor(product, preview)) return { title: "상품을 찾을 수 없습니다" };

  return {
    title: `${product.name} | 콩닥`,
    description: product.description,
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
    return <PremiumProductDetail product={product} locale={locale} />;
  }

  const effectiveCatalog = await getEffectiveCatalog();
  const allProducts = effectiveCatalog.filter((p) => !p.isHidden);

  return (
    <StandardProductDetail
      product={product}
      locale={locale}
      preview={preview}
      allProducts={allProducts}
    />
  );
}
