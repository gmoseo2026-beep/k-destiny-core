"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { trackEvent } from "@/lib/gtag";
import { clearDeviceCoupon } from "@/lib/couponsClient";

interface AccountDeleteSectionProps {
  locale: string;
}

function purgeDeviceAuthAndOrderTokens(): void {
  if (typeof window === "undefined") return;
  try {
    clearDeviceCoupon();
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (
        k &&
        (k.startsWith("kongdak_order_") ||
          k.startsWith("kongdak_unlock_") ||
          k.startsWith("kd_last_order_") ||
          k === "kongdak_pay_attempts")
      ) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
  } catch {
    // 저장소 접근 제한 환경에서는 무시
  }
}

export default function AccountDeleteSection({ locale }: AccountDeleteSectionProps) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpen = () => {
    setConfirmed(false);
    setErrorMessage(null);
    setOpen(true);
    trackEvent("account_delete_open");
  };

  const handleClose = () => {
    if (submitting) return;
    setOpen(false);
  };

  const handleDelete = async () => {
    if (!confirmed || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrorMessage(data?.error || "회원 탈퇴 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
        setSubmitting(false);
        return;
      }

      trackEvent("account_delete_done");
      purgeDeviceAuthAndOrderTokens();
      await signOut({ callbackUrl: `/${locale}` });
    } catch {
      setErrorMessage("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full mt-8 mb-2 flex justify-center">
        <button
          type="button"
          onClick={handleOpen}
          className="text-xs text-[#B9A9BF]/70 hover:text-[#F6EEF3] underline underline-offset-4 transition-colors py-1.5 px-3"
        >
          회원 탈퇴
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-delete-modal-title"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#22142A] p-6 text-[#F6EEF3] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="account-delete-modal-title" className="text-base font-black text-[#F6EEF3]">
              정말 탈퇴하시겠어요?
            </h2>

            <div className="mt-3 rounded-2xl border border-[#FF5C77]/30 bg-[#140B18] p-3.5 text-xs leading-relaxed">
              <p className="font-bold text-[#FF8AA1]">
                열람 기간이 남은 리포트도 더 이상 볼 수 없어요
              </p>
              <p className="mt-1.5 text-[#B9A9BF]">
                저장해 둔 내 사주 정보와 사용하지 않은 쿠폰이 즉시 삭제되며, 탈퇴 후에는 복구할 수 없어요.
              </p>
            </div>

            <label className="mt-4 flex items-start gap-2.5 cursor-pointer rounded-2xl border border-white/[0.08] bg-[#140B18]/70 p-3.5 text-xs text-[#F6EEF3]">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#FF5C77]"
              />
              <span className="leading-relaxed">
                위 안내를 모두 확인했고 회원 탈퇴에 동의해요.
              </span>
            </label>

            {errorMessage && (
              <p className="mt-3 rounded-xl border border-red-500/30 bg-red-950/50 px-3 py-2 text-xs text-red-300">
                {errorMessage}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="rounded-2xl border border-white/10 bg-[#140B18] py-3 text-xs font-bold text-[#B9A9BF] hover:text-[#F6EEF3] transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!confirmed || submitting}
                className="rounded-2xl bg-[#FF5C77] hover:bg-[#E0245A] py-3 text-xs font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "탈퇴 처리 중..." : "회원 탈퇴"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
