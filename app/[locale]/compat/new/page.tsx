import { Metadata } from "next";
import CompatNewClient from "@/components/CompatNewClient";
import { canonicalUrlFor, productShareMeta, OG_CARD_URL, PAGE_META } from "@/lib/seo";
import { sectionOutlines } from "@/lib/prompts/sectionOutline";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { isViewableFor, getProduct } from "@/lib/catalog";
import { getEffectiveProduct, getEffectiveCatalog } from "@/lib/catalogVisibility";
import { canPreview } from "@/lib/preview";

// 검색 결과에 보이는 제목·설명은 lib/seo.ts 한 곳에서 관리한다
const TITLE = PAGE_META["/compat/new"].ko.title;
const DESCRIPTION = PAGE_META["/compat/new"].ko.description;

// canonical 을 직접 선언한다. 선언하지 않으면 레이아웃의 canonical(로케일 홈)을
// 상속해 이 페이지가 "홈의 중복"으로 색인에서 제외된다. ?ref= 등 유입 파라미터는 canonical 에 넣지 않는다.
// 로케일과 무관하게 ko URL 로 통합한다 — 근거는 lib/seo.ts 의 canonicalUrlFor 주석 참조.
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ productId?: string }>;
}): Promise<Metadata> {
  await params;
  const canonical = canonicalUrlFor('/compat/new');
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
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical },
    openGraph: { title: TITLE, description: DESCRIPTION, url: canonical, images: [OG_CARD_URL] },
    twitter: { title: TITLE, description: DESCRIPTION },
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string; productId?: string; from?: string }>;
}

export default async function CompatNewPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { ref, productId, from } = await searchParams;

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

  // CompatNewClient 의 isSpecialCouple 과 같은 조건(정통 궁합이 아닌 상품)
  const hasProductLanding = Boolean(product && product.id !== "compat_basic");

  // 세트 추천에 쓸 공개 상품 id(숨긴 세트는 권하지 않는다)
  const visibleIds = (await getEffectiveCatalog()).filter((p) => isViewableFor(p, preview)).map((p) => p.id);

  return (
    <main className="min-h-screen bg-white text-ink px-4 py-8 flex flex-col items-center">
      {product?.isHidden && preview && (
        <div className="w-full max-w-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold py-2 px-3 rounded-xl mb-4 text-center">
          🔒 미리보기 — 미공개 상품
        </div>
      )}

      {/* Hero Title — 상품 입력 화면(?productId=)은 CompatNewClient 가 그 상품의 머리말을 직접 그린다.
          여기 머리말을 같이 두면 광고가 약속한 질문 대신 "우리, 얼마나 잘 맞을까?"가 먼저 보인다. */}
      {!hasProductLanding && (
        <div className="w-full max-w-md text-center mb-6">
          <h1 className="text-2xl font-black text-ink tracking-tight">
            우리, 얼마나 잘 맞을까?
          </h1>
          <p className="text-xs font-semibold text-[#8A8291] mt-1.5">
            가입 없이 무료 · 두 사람 생년월일만 넣으면 30초 🔮
          </p>
        </div>
      )}

      {/* Form Component */}
      <CompatNewClient locale={locale} refToken={ref} productId={productId} initialProfile={profile} visibleIds={visibleIds} fromCompatId={from} sectionOutlines={sectionOutlines()} />
    </main>
  );
}
