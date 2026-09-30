"use client";

// 아직 결제한 적 없는 회원에게만 "회원 첫 결제 4,900원" 안내. 판정은 주문 금액과 같은 함수(/api/user/first-purchase).
import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { formatWon } from "@/lib/catalog";
import { trackEvent } from "@/lib/gtag";

export default function FirstPurchaseCard() {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/user/first-purchase", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.eligible && typeof j.price === "number") setPrice(j.price);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (price === null) return null;

  return (
    <a
      href="#explore"
      onClick={() => trackEvent("first_purchase_banner_click", {})}
      className="mt-4 flex items-center gap-3 rounded-2xl border border-coral/30 bg-coral-soft p-4 active:scale-[0.98] transition-all"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-coral">
        <Gift className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-coral-deep">회원 첫 결제 {formatWon(price)}</span>
        <span className="block text-xs text-text-2">단건 리포트 1회 · 아직 쓰지 않았어요 · 세트·프리미엄 제외</span>
      </span>
      <span className="shrink-0 text-xs font-bold text-coral-deep underline">고르기</span>
    </a>
  );
}
