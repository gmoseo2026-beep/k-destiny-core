import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import KongdakHero from "@/components/KongdakHero";
import DashboardView from "@/components/DashboardView";
import { getAllProducts, getPremiumProducts, priceLabel } from "@/lib/catalog";
import Link from "next/link";
import { LucideIcon, Sparkles, User, Calendar, Coins, Briefcase, Heart, Sparkle, Activity, Flame, HeartHandshake, MessageCircleHeart, Undo2, Eye, Gem, Swords, Moon, Users, HeartCrack, Star } from "lucide-react";
import { PremiumBadge } from "@/components/premium/PremiumBadge";

export const metadata: Metadata = {
  title: "콩닥 — 우리, 얼마나 잘 맞을까? 사주 궁합",
  description: "두 사람의 생년월일만 넣으면 30초 만에 분석하는 진짜 사주 궁합과 에너지 케미",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

const iconMap: Record<string, LucideIcon> = {
  Sparkles, User, Calendar, Coins, Briefcase, Heart, Sparkle, Activity, Flame, HeartHandshake, MessageCircleHeart, Undo2, Eye, Gem, Swords, Moon, Users, HeartCrack, Star
};

export default async function Home({ params }: PageProps) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  
  const products = getAllProducts();
  const individualProducts = products.filter(p => p.target === "individual" && p.type !== "SET");
  const coupleProducts = products.filter(p => p.target === "couple" && p.type !== "SET");
  const sets = products.filter(p => p.type === "SET");
  const premiumProducts = getPremiumProducts();

  return (
    <main className="min-h-screen bg-background text-ink">
      {session?.user?.id ? <DashboardView /> : <KongdakHero locale={locale} />}
      
      {/* Premium Products Full-Width Dark Band */}
      {premiumProducts.length > 0 && (
        <section className="w-full bg-[#14101A] text-[#F6F1EA] py-16 border-y border-[#3A2E45]">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center max-w-xl mx-auto mb-10">
              <div className="mb-3">
                <PremiumBadge text="KONGDAK SIGNATURE" />
              </div>
              <h2 className="font-serif-kr text-2xl sm:text-3xl font-bold text-[#F6F1EA] mb-3">
                콩닥 프리미엄 리포트
              </h2>
              <p className="text-xs sm:text-sm text-[#B9AEC4] leading-relaxed">
                인생의 중대한 기로, 정통 역학의 완전한 수리 분석과 최고 사양 AI가 집필하는 독보적인 심층 리포트
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {premiumProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/${locale}/products/${product.id}`}
                  className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 ring-[#D9B26A]"
                >
                  <div className="bg-[#1E1726] border border-[#3A2E45] rounded-3xl p-6 h-full flex flex-col justify-between hover:border-[#D9B26A]/60 hover:shadow-xl transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <PremiumBadge text="PREMIUM" />
                        <span className="text-[11px] text-[#B9AEC4]">단건 이용권</span>
                      </div>
                      <h3 className="font-serif-kr text-xl font-bold text-[#F6F1EA] mb-2 group-hover:text-[#F3E3BF] transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-xs text-[#B9AEC4] leading-relaxed mb-6">
                        {product.description}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-[#3A2E45]/80 flex items-center justify-between">
                      <span className="font-serif-kr text-lg font-bold text-[#F3E3BF]">
                        {priceLabel(product)}
                      </span>
                      <span className="text-xs font-semibold text-[#D9B26A] group-hover:underline">
                        자세히 보기 →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <div id="products" className="max-w-5xl mx-auto px-4 py-16 scroll-mt-14">
        {sets.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-2 mb-8">
              <h2 className="text-2xl font-bold">인기 세트</h2>
              <span className="bg-coral text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Best</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sets.map((product) => {
                const Icon = iconMap[product.icon] || Star;
                return (
                  <Link
                    key={product.id}
                    href={`/${locale}/products/${product.id}`}
                    className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 ring-coral"
                  >
                    <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow border border-plum/10 h-full flex flex-col relative overflow-hidden">
                      {product.isPopular && <div className="absolute top-4 right-4 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">BEST</div>}
                      {product.isNew && <div className="absolute top-4 right-4 bg-plum text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">NEW</div>}
                      
                      <div className="w-12 h-12 bg-cream rounded-2xl flex items-center justify-center mb-4 text-coral group-hover:scale-110 transition-transform">
                        <Icon size={24} />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                      <p className="text-gray-500 text-sm mb-6 flex-1">{product.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-coral">{priceLabel(product)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {coupleProducts.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">우리 사이 궁합 (커플)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coupleProducts.map((product) => {
                const Icon = iconMap[product.icon] || Heart;
                return (
                  <Link
                    key={product.id}
                    href={`/${locale}/products/${product.id}`}
                    className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 ring-coral"
                  >
                    <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow border border-plum/10 h-full flex flex-col relative overflow-hidden">
                      {product.isPopular && <div className="absolute top-4 right-4 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">BEST</div>}
                      {product.isNew && <div className="absolute top-4 right-4 bg-plum text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">NEW</div>}
                      
                      <div className="w-12 h-12 bg-cream rounded-2xl flex items-center justify-center mb-4 text-coral group-hover:scale-110 transition-transform">
                        <Icon size={24} />
                      </div>
                      <h3 className="text-lg font-bold mb-2">{product.name}</h3>
                      <p className="text-gray-500 text-sm mb-6 flex-1">{product.description}</p>
                      <div className="text-lg font-bold text-coral">{priceLabel(product)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {individualProducts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-8">나의 운세 (개인)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {individualProducts.map((product) => {
                const Icon = iconMap[product.icon] || User;
                return (
                  <Link
                    key={product.id}
                    href={`/${locale}/products/${product.id}`}
                    className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 ring-coral"
                  >
                    <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow border border-plum/10 h-full flex flex-col relative overflow-hidden">
                      {product.isPopular && <div className="absolute top-4 right-4 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">BEST</div>}
                      {product.isNew && <div className="absolute top-4 right-4 bg-plum text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">NEW</div>}
                      
                      <div className="w-12 h-12 bg-cream rounded-2xl flex items-center justify-center mb-4 text-coral group-hover:scale-110 transition-transform">
                        <Icon size={24} />
                      </div>
                      <h3 className="text-lg font-bold mb-2">{product.name}</h3>
                      <p className="text-gray-500 text-sm mb-6 flex-1">{product.description}</p>
                      <div className="text-lg font-bold text-coral">{priceLabel(product)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
