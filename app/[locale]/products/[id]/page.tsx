import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getProduct, getAllProducts, isViewableFor, priceLabel } from "@/lib/catalog";
import { canPreview } from "@/lib/preview";
import Link from "next/link";
import { ChevronLeft, LucideIcon, Sparkles, User, Calendar, Coins, Briefcase, Heart, Sparkle, Activity, Flame, HeartHandshake, MessageCircleHeart, Undo2, Eye, Gem, Swords, Moon, Users, HeartCrack, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import ProductViewTracker from "@/components/ProductViewTracker";

const iconMap: Record<string, LucideIcon> = {
  Sparkles, User, Calendar, Coins, Briefcase, Heart, Sparkle, Activity, Flame, HeartHandshake, MessageCircleHeart, Undo2, Eye, Gem, Swords, Moon, Users, HeartCrack, Star
};

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await getServerSession(authOptions).catch(() => null);
  const preview = canPreview(session?.user?.email);
  const product = getProduct(id);
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
  const product = getProduct(id);
  
  if (!product || !isViewableFor(product, preview)) {
    notFound();
  }

  if (product.tier === "premium") {
    const { PremiumProductDetail } = await import("@/components/premium/PremiumProductDetail");
    return <PremiumProductDetail product={product} locale={locale} />;
  }

  const Icon = iconMap[product.icon] || Star;
  
  // Determine next path for form input
  // Sets also need input, usually based on their target
  const nextPath = product.target === "couple" 
    ? `/${locale}/compat/new?productId=${product.id}`
    : `/${locale}/fortune/new?productId=${product.id}`;

  const allProducts = getAllProducts();
  const setProducts = product.items 
    ? product.items.map(itemId => allProducts.find(p => p.id === itemId)).filter(Boolean)
    : [];

  return (
    <main className="min-h-screen bg-cream text-ink">
      <ProductViewTracker productId={product.id} tier={product.tier} />
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md border-b border-plum/10 z-50 flex items-center px-4">
        <Link href={`/${locale}`} className="p-2 -ml-2 text-gray-600 hover:text-ink transition-colors">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="font-bold text-lg mx-auto pr-8">{product.name}</h1>
      </header>

      <div className="pt-20 pb-32 max-w-md mx-auto px-4">
        {product.isHidden && preview && (
          <div className="w-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold py-2 px-3 rounded-xl mb-4 text-center">
            🔒 미리보기 — 미공개 상품
          </div>
        )}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-plum/10 text-center mb-8 relative overflow-hidden">
          {product.isPopular && <div className="absolute top-4 right-4 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">BEST</div>}
          {product.isNew && <div className="absolute top-4 right-4 bg-plum text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">NEW</div>}
          
          <div className="w-20 h-20 bg-cream rounded-3xl flex items-center justify-center mx-auto mb-6 text-coral">
            <Icon size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-3">{product.name}</h2>
          <p className="text-gray-500 mb-6">{product.description}</p>
          
          <div className="flex items-center justify-center gap-3">
            <span className="text-xl font-bold text-coral">{priceLabel(product)}</span>
          </div>
        </div>

        {/* 세트 상품인 경우 구성 상품 목록 표시 */}
        {product.type === "SET" && setProducts.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-4 pl-2">세트 구성</h3>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-plum/10 flex flex-col gap-4">
              {setProducts.map((item, idx) => {
                if (!item) return null;
                const ItemIcon = iconMap[item.icon] || Star;
                return (
                  <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-cream/50 border border-cream">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-coral shadow-sm">
                      <ItemIcon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h3 className="font-bold text-lg mb-4 pl-2">무엇을 알 수 있나요?</h3>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-plum/10 flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="mt-0.5 text-coral"><Check size={20} /></div>
              <p className="text-sm text-gray-700 leading-relaxed">태어난 날의 기운을 바탕으로 한 심층 리포트 제공</p>
            </div>
            <div className="flex gap-3">
              <div className="mt-0.5 text-coral"><Check size={20} /></div>
              <p className="text-sm text-gray-700 leading-relaxed">어려운 사주 용어 없이 누구나 이해할 수 있는 다정한 설명</p>
            </div>
            <div className="flex gap-3">
              <div className="mt-0.5 text-coral"><Check size={20} /></div>
              <p className="text-sm text-gray-700 leading-relaxed">어떻게 행동해야 할지 알려주는 구체적인 솔루션과 조언</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-plum/10 z-50">
        <div className="max-w-md mx-auto">
          <Link href={nextPath} className="block w-full">
            <Button size="lg" className="w-full text-lg h-14 rounded-2xl">
              {product.isFree ? "무료로 보기" : "사주 정보 입력하기"}
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
