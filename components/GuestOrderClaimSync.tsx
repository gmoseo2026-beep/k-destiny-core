"use client";

// 로그인하면 이 기기에서 비회원으로 결제한 리포트를 버튼 없이 바로 내 계정으로 옮긴다(2026-10-29 손님 항의 후).
// 1) kd_claim 쿠키(결제 직후 7일) → /api/user/claim-unlock
// 2) 이 기기 localStorage 의 결제 증명(orderId) → /api/user/claim-device-orders
// 탭마다 한 번. 옮긴 게 있으면 잠깐 알려 준다.
// GA4: guest_orders_linked { count }
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { listDeviceOrders } from "@/lib/payments/deviceOrders";
import { trackEvent } from "@/lib/gtag";

const DONE_KEY = "kongdak_guest_claim_checked";

export default function GuestOrderClaimSync() {
  const { status } = useSession();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    try {
      if (window.sessionStorage.getItem(DONE_KEY)) return;
      window.sessionStorage.setItem(DONE_KEY, "1");
    } catch {
      // 저장소를 못 쓰면 매번 확인한다(서버가 중복 귀속을 막는다)
    }

    let alive = true;
    (async () => {
      let count = 0;
      try {
        const check = await fetch("/api/user/claim-unlock").then((r) => (r.ok ? r.json() : null));
        if (check?.claimable) {
          const res = await fetch("/api/user/claim-unlock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (res.ok) count++;
        }
      } catch {
        // 다음 경로로 계속
      }
      const orderIds = [...new Set(listDeviceOrders().map((o) => o.orderId))];
      if (orderIds.length > 0) {
        try {
          const res = await fetch("/api/user/claim-device-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderIds }),
          });
          const json = res.ok ? ((await res.json()) as { linked?: number }) : null;
          count += json?.linked ?? 0;
        } catch {
          // 무시 — 보관함 화면에서 다시 확인된다
        }
      }
      if (!alive || count === 0) return;
      trackEvent("guest_orders_linked", { count });
      setToast("비회원으로 결제한 리포트를 내 보관함에 옮겼어요");
      window.setTimeout(() => alive && setToast(null), 4500);
    })();
    return () => {
      alive = false;
    };
  }, [status]);

  if (!toast) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 top-4 z-[90] mx-auto max-w-sm rounded-2xl border border-[#FFC24B]/40 bg-[#22142A] px-4 py-3 text-center text-xs font-bold text-[#F6EEF3] shadow-lg"
    >
      {toast}
    </div>
  );
}
