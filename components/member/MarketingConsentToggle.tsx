"use client";

// 보관함의 "혜택·새 소식 받기" 스위치. 언제든 켜고 끌 수 있다(끄면 수신 동의 철회).
// GA4: marketing_optin { source: "me" } · marketing_optout { source: "me" }
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/gtag";

export default function MarketingConsentToggle() {
  const [consent, setConsent] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/user/marketing-consent", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && typeof j?.consent === "boolean") setConsent(j.consent);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (consent === null) return null;

  const toggle = async () => {
    if (saving) return;
    const next = !consent;
    setSaving(true);
    try {
      const res = await fetch("/api/user/marketing-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agree: next }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && typeof json?.consent === "boolean") {
        setConsent(json.consent);
        trackEvent(json.consent ? "marketing_optin" : "marketing_optout", { source: "me" });
      }
    } catch {
      // 저장에 실패하면 화면의 상태를 바꾸지 않는다
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
      <div className="min-w-0 text-left">
        <p className="text-xs font-bold text-ink">혜택·새 소식 받기 (선택)</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-caption">
          할인·이벤트·새 리포트 소식을 이메일 등으로 보내드려요. 언제든 끌 수 있어요.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={consent}
        aria-label="혜택·새 소식 받기"
        onClick={toggle}
        disabled={saving}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${consent ? "bg-coral" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${consent ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}
