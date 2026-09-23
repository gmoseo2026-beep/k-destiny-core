import React from "react";
import Link from "next/link";
import Image from "next/image";
import { CatalogItem } from "@/lib/catalog";

interface MoreContentCardsProps {
  locale: string;
  products: CatalogItem[];
}

interface CardItem {
  id: string;
  tag: string;
  title: string;
  icon: string;
  href: string;
}

export default function MoreContentCards({ locale, products }: MoreContentCardsProps) {
  const cards: CardItem[] = [
    {
      id: "free_personality",
      tag: "무료 체험",
      title: "타고난 성격과 기질",
      icon: "/icons3d/free_personality.webp",
      href: `/${locale}/products/free_personality`,
    },
  ];

  // spicy_annual 보일 때만
  const spicy = products.find((p) => p.id === "spicy_annual" && !p.isHidden);
  if (spicy) {
    cards.push({
      id: "spicy_annual",
      tag: "팩폭 주의",
      title: "매운맛 총운",
      icon: "/mascot/transparent/expr_2_flame.webp",
      href: `/${locale}/products/spicy_annual`,
    });
  }

  // 사주 첫걸음 가이드
  cards.push({
    id: "guide",
    tag: "기초 상식",
    title: "사주 첫걸음",
    icon: "/icons3d/set_me.webp",
    href: `/${locale}/guide`,
  });

  // 2026 총운
  cards.push({
    id: "annual_2026",
    tag: "신년 운세",
    title: "2026년 총운",
    icon: "/icons3d/annual_2026.webp",
    href: `/${locale}/products/annual_2026`,
  });

  return (
    <section className="w-full max-w-[480px] mx-auto px-4 mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-extrabold text-ink tracking-tight">
          더 많은 콘텐츠
        </h2>
        <span className="text-xs text-caption">밀어서 보기 →</span>
      </div>

      <div className="flex gap-3 overflow-x-auto snap-x no-scrollbar pb-2 -mx-4 px-4">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className="group shrink-0 w-[150px] h-[164px] snap-start rounded-2xl bg-surface-soft hover:bg-[#F5EFEF] border border-line p-3.5 flex flex-col justify-between transition-all duration-150 active:scale-[0.96]"
          >
            <div>
              <span className="inline-block text-[10px] font-bold text-coral-deep bg-coral-soft px-2 py-0.5 rounded-full mb-1.5">
                {card.tag}
              </span>
              <h3 className="text-xs font-bold text-ink group-hover:text-coral transition-colors line-clamp-2 leading-snug">
                {card.title}
              </h3>
            </div>
            <div className="w-13 h-13 relative self-end transition-transform duration-200 group-hover:scale-110">
              <Image
                src={card.icon}
                alt=""
                width={52}
                height={52}
                className="object-contain"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
