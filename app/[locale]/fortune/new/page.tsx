import { Metadata } from "next";
import FortuneNewClient from "@/components/FortuneNewClient";
import { canonicalUrlFor } from "@/lib/seo";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { getProduct, isViewableFor } from "@/lib/catalog";
import { canPreview } from "@/lib/preview";

const TITLE = "내 사주 정보 입력 — 콩닥";
const DESCRIPTION = "사주 정보를 입력하고 정확한 분석 결과를 확인하세요.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await params;
  const canonical = canonicalUrlFor('/fortune/new');

  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical },
    openGraph: { title: TITLE, description: DESCRIPTION, url: canonical },
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ productId?: string }>;
}

export default async function FortuneNewPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { productId } = await searchParams;

  const session = await getServerSession(authOptions).catch(() => null);
  const preview = canPreview(session?.user?.email);
  const product = productId ? getProduct(productId) : null;
  if (product && !isViewableFor(product, preview)) {
    notFound();
  }

  let profile = null;
  if (session?.user?.id) {
    profile = await prisma.userSajuProfile.findUnique({
      where: { userId: session.user.id }
    });
  }

  return (
    <main className="min-h-screen bg-white text-ink px-4 py-8 flex flex-col items-center">
      {product?.isHidden && preview && (
        <div className="w-full max-w-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold py-2 px-3 rounded-xl mb-4 text-center">
          🔒 미리보기 — 미공개 상품
        </div>
      )}

      {/* Hero Title */}
      <div className="w-full max-w-md text-center mb-6">
        <h1 className="text-2xl font-black text-ink tracking-tight">
          내 사주 정보 입력
        </h1>
        <p className="text-xs font-semibold text-[#8A8291] mt-1.5">
          가장 정확한 사주 풀이를 위해 생년월일을 입력해주세요 ✨
        </p>
      </div>

      {/* Form Component */}
      <FortuneNewClient
        locale={locale}
        productId={productId}
        initialProfile={profile}
        preview={preview}
      />
    </main>
  );
}
