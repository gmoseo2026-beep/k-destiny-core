"use client";

// 로그인 화면에서 "(선택) 혜택·새 소식 받기"를 체크한 사람이 로그인되면, 그 동의를 계정에 저장한다.
// 체크하지 않았으면 아무 일도 하지 않는다. GA4: marketing_optin { source: "login" }
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { takeOptIn } from "@/lib/marketingConsent";
import { trackEvent } from "@/lib/gtag";

export default function MarketingConsentSync() {
  const { status } = useSession();
  const ranRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || ranRef.current) return;
    ranRef.current = true;
    if (!takeOptIn()) return;
    fetch("/api/user/marketing-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agree: true }),
    })
      .then((r) => {
        if (r.ok) trackEvent("marketing_optin", { source: "login" });
      })
      .catch(() => {});
  }, [status]);

  return null;
}
