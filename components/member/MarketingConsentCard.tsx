"use client";

// 회원 홈에서 한 번 묻는다: "혜택·새 소식, 받아 보실래요?" — 아직 정하지 않은 회원에게만 보인다.
// 로그인 화면의 체크 칸은 간편 로그인에서 지나치기 쉬워서(2026-10-06: 가입 3명 중 체크 0명) 가입 뒤 첫 화면에서 묻는다.
// 받겠다/괜찮다 어느 쪽이든 고르면 다시 묻지 않는다(보관함 스위치로 언제든 바꿀 수 있다).
// 계정에 이메일이 없는 회원(카카오·네이버 가입)은 소식 받을 이메일을 함께 적는다.
// GA4: marketing_prompt_view { has_email } · marketing_optin / marketing_optout { source: "home_card" }
import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { trackEvent } from "@/lib/gtag";

export default function MarketingConsentCard({ className = "" }: { className?: string }) {
  const [state, setState] = useState<{ hasEmail: boolean } | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/user/marketing-consent", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive || !j || j.decided !== false) return;
        setState({ hasEmail: Boolean(j.hasEmail) });
        trackEvent("marketing_prompt_view", { has_email: Boolean(j.hasEmail) });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (thanks) {
    return (
      <div className={`w-full rounded-2xl border border-coral/30 bg-coral-soft p-4 text-sm font-bold text-coral-deep ${className}`}>
        고마워요! 좋은 소식이 생기면 알려 드릴게요 💌
      </div>
    );
  }
  if (!state) return null;

  const answer = async (agree: boolean) => {
    if (saving) return;
    setError("");
    const needEmail = agree && !state.hasEmail;
    const trimmed = email.trim();
    if (needEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setError("소식을 받을 이메일을 적어 주세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/marketing-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(needEmail ? { agree, email: trimmed } : { agree }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || "저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      trackEvent(agree ? "marketing_optin" : "marketing_optout", { source: "home_card" });
      if (agree) setThanks(true);
      setState(null);
    } catch {
      setError("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`w-full rounded-2xl border border-line bg-white p-4 shadow-xs ${className}`} aria-label="혜택·새 소식 받기">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral-soft text-coral">
          <Gift className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-left">
          <h2 className="text-sm font-extrabold text-ink">혜택·새 소식, 받아 보실래요? (선택)</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-text-2">
            할인·이벤트·새 리포트 소식을 가끔 이메일로 보내드려요. 보관함에서 언제든 끌 수 있어요.
          </p>
        </div>
      </div>

      {!state.hasEmail && (
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="소식 받을 이메일"
          aria-label="소식 받을 이메일"
          className="mt-3 w-full rounded-2xl border border-line bg-surface-soft px-4 py-3 text-sm text-ink placeholder:text-text-3 focus:border-coral focus:outline-none"
        />
      )}
      {error && <p className="mt-2 text-left text-xs font-bold text-coral-deep">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => answer(true)}
          disabled={saving}
          className="flex-1 rounded-2xl bg-coral py-3 text-sm font-bold text-white transition-all active:scale-[0.96] disabled:opacity-60"
        >
          받을게요
        </button>
        <button
          type="button"
          onClick={() => answer(false)}
          disabled={saving}
          className="rounded-2xl border border-line bg-white px-5 py-3 text-sm font-bold text-text-2 transition-all active:scale-[0.96] disabled:opacity-60"
        >
          괜찮아요
        </button>
      </div>
    </section>
  );
}
