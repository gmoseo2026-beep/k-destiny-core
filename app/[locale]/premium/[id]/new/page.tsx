import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { isViewableFor } from "@/lib/catalog";
import { getEffectiveProduct } from "@/lib/catalogVisibility";
import { canPreview } from "@/lib/preview";
import { canonicalUrlFor } from "@/lib/seo";
import { PremiumNewClient } from "@/components/premium/PremiumNewClient";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getEffectiveProduct(id);
  if (!product || product.tier !== "premium") {
    return { title: "상품을 찾을 수 없습니다" };
  }
  const canonical = canonicalUrlFor(`/premium/${id}/new`);

  return {
    title: `${product.name} 정보 입력 | 콩닥 프리미엄`,
    description: product.description,
    alternates: { canonical },
  };
}

export default async function PremiumNewPage({ params }: PageProps) {
  const { locale, id } = await params;
  const session = await getServerSession(authOptions).catch(() => null);
  const preview = canPreview(session?.user?.email);
  const product = await getEffectiveProduct(id);

  if (!product || product.tier !== "premium" || !isViewableFor(product, preview)) {
    notFound();
  }

  let profile = null;
  if (session?.user?.id) {
    profile = await prisma.userSajuProfile.findUnique({
      where: { userId: session.user.id },
    }).catch(() => null);
  }

  return (
    <main className="min-h-screen bg-[#14101A] text-[#F6F1EA] px-4 py-8 flex flex-col items-center">
      {product.isHidden && preview && (
        <div className="w-full max-w-lg bg-amber-500/10 border border-amber-500/30 text-[#F3E3BF] text-xs font-semibold py-2 px-3 rounded-xl mb-4 text-center">
          🔒 미리보기 — 미공개 프리미엄 상품
        </div>
      )}
      <PremiumNewClient
        locale={locale}
        product={product}
        initialProfile={profile}
        sessionUser={
          session?.user
            ? {
                id: session.user.id,
                name: session.user.name ?? null,
                email: session.user.email ?? null,
              }
            : null
        }
      />
    </main>
  );
}
