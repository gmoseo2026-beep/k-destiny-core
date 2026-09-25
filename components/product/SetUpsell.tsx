"use client";

// 세트 추천 카드. 결제 화면에서는 [세트로 보기] 버튼(onChoose), 상세 화면에서는 세트 상세 링크(locale)로 쓴다.
// 가격 비교는 실제 단건 정가 합계만 쓴다(취소선·가짜 정가 금지 — 표시광고법).
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Gift } from "lucide-react";
import { type CatalogItem, formatWon, getProduct, separatePrice } from "@/lib/catalog";
import { trackEvent } from "@/lib/gtag";

interface SetUpsellProps {
  sets: CatalogItem[];
  /** GA4 에서 어느 화면의 추천인지 구분 */
  source: string;
  title?: string;
  /** 있으면 버튼(바로 세트 결제), 없으면 세트 상세로 가는 링크 */
  onChoose?: (set: CatalogItem) => void;
  locale?: string;
  /** 지금 보고 있는 상품(카드에서 "포함"으로 강조) */
  currentId?: string;
}

function SetCardBody({ set, currentId }: { set: CatalogItem; currentId?: string }) {
  const items = (set.items ?? []).map((id) => getProduct(id)).filter((p): p is CatalogItem => !!p);
  return (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 relative shrink-0 rounded-xl bg-coral-soft flex items-center justify-center">
          <Image src={set.icon3d} alt="" width={36} height={36} className="object-contain" />
        </div>
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-extrabold text-coral-deep bg-coral-soft px-1.5 py-0.5 rounded">
              세트 · 리포트 {items.length}개
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-ink mt-1 truncate">{set.name}</h4>
          <p className="text-[11px] text-caption mt-0.5 leading-snug">
            {items.map((p, i) => (
              <span key={p.id}>
                {i > 0 && " · "}
                <span className={p.id === currentId ? "font-bold text-ink" : undefined}>{p.gridLabel || p.name}</span>
              </span>
            ))}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0 ml-2">
        <span className="text-sm font-black text-coral">{formatWon(set.price)}</span>
        <span className="text-[10px] text-caption whitespace-nowrap">따로 사면 {formatWon(separatePrice(set))}</span>
      </div>
    </>
  );
}

export default function SetUpsell({ sets, source, title, onChoose, locale, currentId }: SetUpsellProps) {
  if (sets.length === 0) return null;
  const cardClass =
    "group w-full flex items-center justify-between gap-2 p-3.5 rounded-2xl bg-white hover:bg-surface-soft border border-line transition-all duration-150 active:scale-[0.97]";

  return (
    <div className="w-full">
      <p className="flex items-center gap-1.5 text-xs font-bold text-ink mb-2">
        <Gift className="w-3.5 h-3.5 text-coral" />
        {title ?? "세트로 보면 더 알뜰해요"}
      </p>
      <div className="space-y-2">
        {sets.map((set) =>
          onChoose ? (
            <button
              key={set.id}
              type="button"
              className={cardClass}
              onClick={() => {
                trackEvent("set_upsell_click", { source, setId: set.id, fromProductId: currentId ?? "" });
                onChoose(set);
              }}
            >
              <SetCardBody set={set} currentId={currentId} />
            </button>
          ) : (
            <Link
              key={set.id}
              href={`/${locale ?? "ko"}/products/${set.id}`}
              className={cardClass}
              onClick={() => trackEvent("set_upsell_click", { source, setId: set.id, fromProductId: currentId ?? "" })}
            >
              <SetCardBody set={set} currentId={currentId} />
              <ArrowRight className="w-3.5 h-3.5 text-caption shrink-0" />
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
