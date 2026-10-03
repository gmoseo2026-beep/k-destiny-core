"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getProduct } from "@/lib/catalog";
import { trackEvent } from "@/lib/gtag";
import { listValidDeviceOrders, ownedOrdersFor, deviceOrderHref, type DeviceOrder } from "@/lib/payments/deviceOrders";

/**
 * "이미 결제한 리포트가 있어요" 안내 — 상품 화면·입력 화면에 둔다.
 *
 * catalogId 를 주면 그 상품(또는 그 상품이 든 세트)을 이 기기에서 결제한 경우에만 보인다.
 * catalogId 없이 쓰면 이 기기에서 결제한 리포트 전체 목록이다(홈·내 리포트 화면).
 * 환불·만료된 결제는 서버 확인을 거쳐 걸러지고 기기에서도 지워진다.
 */
interface OwnedReportNoticeProps {
  locale: string;
  catalogId?: string;
  /** GA 구분용: product | fortune_new | compat_new | me | home */
  source: string;
  className?: string;
}

const MAX_SHOWN = 5;

export default function OwnedReportNotice({ locale, catalogId, source, className = "" }: OwnedReportNoticeProps) {
  const [orders, setOrders] = useState<DeviceOrder[]>([]);

  useEffect(() => {
    let alive = true;
    listValidDeviceOrders().then((all) => {
      if (!alive) return;
      const mine = catalogId ? ownedOrdersFor(catalogId, all) : all;
      // 같은 주문이 여러 키(세트·정통 궁합)로 남아 있을 수 있다 → 주문·궁합 단위로 하나만
      const seen = new Set<string>();
      setOrders(
        mine.filter((o) => {
          const k = `${o.orderId}:${o.compatId ?? ""}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
      );
    });
    return () => {
      alive = false;
    };
  }, [catalogId]);

  if (orders.length === 0) return null;

  const shown = orders.slice(0, MAX_SHOWN);
  return (
    <div className={`w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left ${className}`}>
      <p className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-800">
        <CheckCircle2 className="h-4 w-4" />
        {catalogId ? "이미 결제한 리포트예요" : "이 기기에서 결제한 리포트"}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-emerald-900/80">
        {catalogId ? "다시 결제하지 않아도 돼요. 아래에서 바로 열 수 있어요." : "결제한 리포트를 다시 열 수 있어요."}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {shown.map((o) => {
          const bought = getProduct(o.catalogId);
          // 같은 상품을 여러 번(다른 상대로) 산 경우 번호로 구분한다
          const same = shown.filter((x) => x.catalogId === o.catalogId);
          const label = (bought?.name ?? "결제한 리포트") + (same.length > 1 ? ` ${same.indexOf(o) + 1}` : "");
          return (
            <Link
              key={`${o.orderId}:${o.compatId ?? ""}`}
              href={deviceOrderHref(locale, o, catalogId ?? o.catalogId)}
              onClick={() => trackEvent("owned_report_open", { productId: o.catalogId, source })}
              className="flex items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-ink shadow-2xs transition-all active:scale-[0.97]"
            >
              <span className="truncate">{label} 다시 보기</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-emerald-700" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
