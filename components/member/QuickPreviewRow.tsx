"use client";

// 회원 대시보드 "내 정보로 바로 보기": 저장된 사주 정보로 입력 화면 없이 바로 무료 미리보기(&auto=1).
import Image from "next/image";
import { Link } from "@/i18n/routing";
import type { CatalogItem } from "@/lib/catalog";
import { trackEvent } from "@/lib/gtag";

const QUICK_IDS = ["wealth", "love_single", "spicy_annual", "career", "health", "charm"];

export default function QuickPreviewRow({ products }: { products: CatalogItem[] }) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = QUICK_IDS.map((id) => byId.get(id)).filter((p): p is CatalogItem => !!p);
  if (items.length === 0) return null;

  return (
    <section className="mt-4 rounded-2xl border border-line bg-white p-4" aria-label="내 정보로 바로 보기">
      <h2 className="text-sm font-extrabold text-ink">내 정보로 바로 보기</h2>
      <p className="mt-0.5 text-[11px] text-caption">입력 없이 한 번에 무료 미리보기</p>
      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        {items.map((p, i) => (
          <Link
            key={p.id}
            href={`/fortune/new?productId=${p.id}&auto=1`}
            onClick={() => trackEvent("quick_preview_click", { productId: p.id, position: i + 1 })}
            className="shrink-0 flex w-[76px] flex-col items-center rounded-2xl bg-surface-soft py-2.5 active:scale-[0.96] transition-all"
          >
            <Image src={p.icon3d} alt="" width={40} height={40} className="object-contain" />
            <span className="mt-1 text-[11px] font-bold text-ink line-clamp-1">{p.gridLabel || p.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
