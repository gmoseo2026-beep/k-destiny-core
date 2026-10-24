"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Gift } from "lucide-react";
import {
  type CatalogItem,
  formatWon,
  getProduct,
  getSetCoverStack,
  separatePrice,
} from "@/lib/catalog";
import { trackEvent } from "@/lib/gtag";

interface SetUpsellProps {
  sets: CatalogItem[];
  source: string;
  title?: string;
  onChoose?: (set: CatalogItem) => void;
  locale?: string;
  currentId?: string;
}

function SetCardBody({ set, currentId }: { set: CatalogItem; currentId?: string }) {
  const items = (set.items ?? []).map((id) => getProduct(id)).filter((p): p is CatalogItem => !!p);
  const stack = getSetCoverStack(set);
  return (
    <>
      <div className="flex items-center gap-3 min-w-0">
        {/* 2~3장 표지 겹침 썸네일 */}
        <div className="relative h-12 w-12 shrink-0">
          {stack.slice(0, 3).map((src, idx) => {
            const offsets = [
              "left-0 top-1 -rotate-6 opacity-75",
              "left-1.5 top-0.5 rotate-3 opacity-85",
              "left-3 top-0 rotate-0 z-10",
            ];
            return (
              <div
                key={`${set.id}-upsell-${idx}`}
                className={`absolute h-11 w-8 overflow-hidden rounded-md border border-white/20 bg-[#140B18] ${offsets[idx] ?? ""}`}
              >
                <Image src={src} alt="" fill sizes="36px" className="object-cover" />
              </div>
            );
          })}
        </div>
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-extrabold text-[#FFC24B] bg-[#FFC24B]/15 px-1.5 py-0.5 rounded">
              세트 · 리포트 {items.length}개
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-[#F6EEF3] mt-1 truncate">{set.name}</h4>
          <p className="text-[11px] text-[#B9A9BF] mt-0.5 leading-snug">
            {items.map((p, i) => (
              <span key={p.id}>
                {i > 0 && " · "}
                <span className={p.id === currentId ? "font-bold text-[#F6EEF3]" : undefined}>
                  {p.gridLabel || p.name}
                </span>
              </span>
            ))}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0 ml-2">
        <span className="text-sm font-black text-[#FFC24B]">{formatWon(set.price)}</span>
        <span className="text-[10px] text-[#B9A9BF] whitespace-nowrap">
          따로 사면 <span className="line-through">{formatWon(separatePrice(set))}</span>
        </span>
      </div>
    </>
  );
}

export default function SetUpsell({ sets, source, title, onChoose, locale, currentId }: SetUpsellProps) {
  if (sets.length === 0) return null;
  const cardClass =
    "group w-full flex items-center justify-between gap-2 p-3.5 rounded-2xl bg-[#22142A] hover:border-white/20 border border-white/[0.08] transition-all duration-150 active:scale-[0.98]";

  return (
    <div className="w-full">
      <p className="flex items-center gap-1.5 text-xs font-bold text-[#F6EEF3] mb-2">
        <Gift className="w-3.5 h-3.5 text-[#FFC24B]" />
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
              prefetch
              key={set.id}
              href={`/${locale ?? "ko"}/products/${set.id}`}
              className={cardClass}
              onClick={() => trackEvent("set_upsell_click", { source, setId: set.id, fromProductId: currentId ?? "" })}
            >
              <SetCardBody set={set} currentId={currentId} />
              <ArrowRight className="w-3.5 h-3.5 text-[#B9A9BF] shrink-0" />
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
