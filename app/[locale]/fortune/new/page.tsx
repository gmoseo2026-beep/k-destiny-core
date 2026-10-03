import { Metadata } from "next";
import FortuneNewClient from "@/components/FortuneNewClient";
import { canonicalUrlFor, productShareMeta, OG_CARD_URL } from "@/lib/seo";
import { sectionOutlines } from "@/lib/prompts/sectionOutline";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { isViewableFor, getProduct } from "@/lib/catalog";
import { getEffectiveProduct, getEffectiveCatalog } from "@/lib/catalogVisibility";
import { canPreview } from "@/lib/preview";

const TITLE = "내 사주 정보 입력 — 콩닥";
const DESCRIPTION = "사주 정보를 입력하고 정확한 분석 결과를 확인하세요.";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ productId?: string }>;
}): Promise<Metadata> {
  await params;
  const canonical = canonicalUrlFor('/fortune/new');
  // ?productId= 로 공유된 링크는 그 상품의 질문 카드를 보여 준다(입력 화면이 곧 상품 랜딩이다)
  const { productId } = await searchParams;
  const shared = productId ? getProduct(productId) : undefined;
  if (shared && !shared.isHidden) {
    return {
      title: `${shared.name} — 콩닥`,
      description: shared.description,
      alternates: { canonical },
      ...productShareMeta(shared, `${canonical}?productId=${encodeURIComponent(shared.id)}`),
    };
  }

  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical },
    openGraph: { title: TITLE, description: DESCRIPTION, url: canonical, images: [OG_CARD_URL] },
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ productId?: string; auto?: string }>;
}

export default async function FortuneNewPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { productId, auto } = await searchParams;

  const session = await getServerSession(authOptions).catch(() => null);
  const preview = canPreview(session?.user?.email);
  const product = productId ? await getEffectiveProduct(productId) : null;
  if (product && !isViewableFor(product, preview)) {
    notFound();
  }

  let profile = null;
  if (session?.user?.id) {
    profile = await prisma.userSajuProfile.findUnique({
      where: { userId: session.user.id }
    });
  }

  const effectiveCatalog = await getEffectiveCatalog();
  const visibleIds = effectiveCatalog
    .filter((p) => isViewableFor(p, preview))
    .map((p) => p.id);

  return (
    <main className="min-h-screen bg-white text-ink px-4 py-8 flex flex-col items-center">
      {product?.isHidden && preview && (
        <div className="w-full max-w-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold py-2 px-3 rounded-xl mb-4 text-center">
          🔒 미리보기 — 미공개 상품
        </div>
      )}

      {/* Hero Title — 저장된 사주로 바로 미리보기(auto=1)일 땐 입력 안내가 결과 위에 남지 않게 숨긴다 */}
      {!(auto === "1" && profile) && (
        <div className="w-full max-w-md text-center mb-6">
          <h1 className="text-2xl font-black text-ink tracking-tight">
            내 사주 정보 입력
          </h1>
          <p className="text-xs font-semibold text-[#8A8291] mt-1.5">
            가장 정확한 사주 풀이를 위해 생년월일을 입력해주세요 ✨
          </p>
        </div>
      )}

      {/* Form Component */}
      <FortuneNewClient
        locale={locale}
        productId={productId}
        initialProfile={profile}
        preview={preview}
        visibleIds={visibleIds}
        autoPreview={auto === "1"}
        sectionOutlines={sectionOutlines()}
      />
    </main>
  );
}
