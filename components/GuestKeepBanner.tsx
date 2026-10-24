"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Link2, Check } from "lucide-react";
import { trackEvent } from "@/lib/gtag";

interface GuestKeepBannerProps {
  locale: string;
  /** GA 구분용: annual | report | premium */
  source: string;
  className?: string;
  /** 화면에 이미 링크 복사 버튼이 있으면 true (가입 저장만 보여 준다) */
  hideCopy?: boolean;
}

export default function GuestKeepBanner({ locale, source, className = "", hideCopy = false }: GuestKeepBannerProps) {
  const { data: session, status } = useSession();
  const [claimable, setClaimable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    fetch("/api/user/claim-unlock")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.claimable) setClaimable(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackEvent("keep_link_copy", { source });
    } catch {
      setNote("링크 복사에 실패했어요. 주소창의 주소를 길게 눌러 복사해 주세요.");
    }
  };

  const claim = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/user/claim-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setClaimable(false);
        setNote("내 계정에 저장했어요. 이제 어느 기기에서든 로그인하면 다시 볼 수 있어요.");
        trackEvent("keep_claimed", { source });
      } else {
        setClaimable(false);
        setNote("저장할 결제를 찾지 못했어요. 이미 저장됐을 수 있어요.");
      }
    } catch {
      setNote("저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") return null;

  // 로그인 상태: 묶을 결제가 있을 때만 보인다
  if (userId) {
    if (!claimable && !note) return null;
    return (
      <div className={`w-full rounded-2xl border border-white/[0.08] bg-[#22142A] p-5 text-left ${className}`}>
        <p className="mb-1 text-xs font-bold text-[#FF8AA1]">내 계정에 저장</p>
        {note ? (
          <p className="text-xs leading-relaxed text-[#B9A9BF]">{note}</p>
        ) : (
          <>
            <p className="mb-3 text-xs leading-relaxed text-[#B9A9BF]">
              이 기기에서 결제한 리포트가 있어요. 계정에 저장하면 다른 기기에서도 로그인해서 볼 수 있어요.
            </p>
            <button
              type="button"
              onClick={claim}
              disabled={busy}
              className="w-full rounded-xl bg-[#FF5C77] px-3 py-2.5 text-xs font-bold text-white transition-all active:scale-[0.96] disabled:opacity-60"
            >
              {busy ? "저장하는 중…" : "이 계정에 저장하기"}
            </button>
          </>
        )}
      </div>
    );
  }

  // 비회원
  const callback = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/${locale}/me`;
  return (
    <div className={`w-full rounded-2xl border border-white/[0.08] bg-[#22142A] p-5 text-left ${className}`}>
      <p className="mb-1 text-xs font-bold text-[#FF8AA1]">다시 볼 수 있게 보관해 두세요</p>
      <p className="mb-3 text-xs leading-relaxed text-[#B9A9BF]">
        결제한 리포트는 지금 이 브라우저에 보관돼 있어요. 같은 브라우저에서는 링크나 홈의 &lsquo;결제한 리포트&rsquo;로
        다시 볼 수 있고, 무료 가입 후 저장하면 다른 기기에서도 볼 수 있어요.
      </p>
      {note && <p className="mb-2 text-[11px] text-[#FF8AA1]">{note}</p>}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        {!hideCopy && (
          <button
            type="button"
            onClick={copyLink}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.12] bg-[#140B18] px-3 py-2.5 text-xs font-bold text-[#F6EEF3] transition-all active:scale-[0.96]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Link2 className="h-3.5 w-3.5 text-[#FF8AA1]" />}
            <span>{copied ? "복사했어요" : "링크 복사하기"}</span>
          </button>
        )}
        <Link
          href={`/${locale}/login?callbackUrl=${encodeURIComponent(callback)}`}
          onClick={() => trackEvent("keep_signup_click", { source })}
          className="flex flex-1 items-center justify-center rounded-xl bg-[#FF5C77] px-3 py-2.5 text-center text-xs font-bold text-white transition-all active:scale-[0.96]"
        >
          가입하고 내 계정에 저장
        </Link>
      </div>
    </div>
  );
}
