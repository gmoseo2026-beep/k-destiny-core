"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { X, Check } from "lucide-react";
import KongdakMascot from "@/components/KongdakMascot";
import { trackEvent } from "@/lib/gtag";
import {
  getWelcomeSheetBenefits,
  WELCOME_COUPON_AMOUNT,
  WELCOME_DISMISS_STORAGE_KEY,
  WELCOME_DISMISS_TTL_MS,
} from "@/lib/welcome";

export default function WelcomeLoginSheet({ isMember }: { isMember: boolean }) {
  const [open, setOpen] = useState(false);
  const benefits = getWelcomeSheetBenefits(WELCOME_COUPON_AMOUNT);

  useEffect(() => {
    if (isMember) return;
    try {
      const raw = window.localStorage.getItem(WELCOME_DISMISS_STORAGE_KEY);
      if (raw) {
        const until = Number(raw);
        if (Number.isFinite(until) && Date.now() < until) {
          return;
        }
      }
      const timer = window.setTimeout(() => {
        setOpen(true);
        trackEvent("welcome_sheet_view", {
          coupon_amount: WELCOME_COUPON_AMOUNT,
        });
      }, 450);
      return () => window.clearTimeout(timer);
    } catch {
      // localStorage 접근 불가 시 조용히 무시
    }
  }, [isMember]);

  if (!open || isMember) return null;

  const dismiss = (mode: "close" | "24h") => {
    try {
      if (mode === "24h") {
        window.localStorage.setItem(
          WELCOME_DISMISS_STORAGE_KEY,
          String(Date.now() + WELCOME_DISMISS_TTL_MS),
        );
      }
    } catch {
      // ignore
    }
    trackEvent("welcome_sheet_dismiss", { mode });
    setOpen(false);
  };

  const handleKakaoLogin = () => {
    trackEvent("welcome_sheet_login_click", {
      provider: "kakao",
      coupon_amount: WELCOME_COUPON_AMOUNT,
    });
    void signIn("kakao", { callbackUrl: "/" });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-sheet-title"
    >
      <div
        className="fixed inset-0"
        onClick={() => dismiss("close")}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-[400px] overflow-hidden rounded-3xl border border-white/15 bg-[#22142A] p-6 text-[#F6EEF3] shadow-[0_20px_50px_rgba(0,0,0,0.65)] pb-safe-sheet">
        <button
          type="button"
          onClick={() => dismiss("close")}
          aria-label="닫기"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[#B9A9BF] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-3">
            <KongdakMascot size={68} animate="bounce" />
          </div>
          <span className="rounded-full border border-[#FFC24B]/35 bg-[#FFC24B]/10 px-3 py-0.5 text-[11px] font-bold text-[#FFC24B]">
            콩닥에 오신 걸 환영해요
          </span>
          <h2
            id="welcome-sheet-title"
            className="mt-2.5 text-[19px] font-extrabold leading-snug tracking-tight text-[#F6EEF3]"
          >
            오늘 당신의 마음은
            <br />
            어디를 향하고 있나요?
          </h2>
          <p className="mt-1.5 text-[13px] text-[#B9A9BF]">
            로그인 없이도 둘러볼 수 있지만, 시작하면 더 편해요
          </p>
        </div>

        {/* 사실 기반 3줄 혜택 */}
        <ul className="mt-4 space-y-2 rounded-2xl border border-white/[0.08] bg-[#140B18]/80 px-4 py-3.5 text-left">
          {benefits.map((line) => (
            <li
              key={line}
              className="flex items-center gap-2.5 text-[13px] font-semibold text-[#F6EEF3]"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF5C77]/20 text-[#FF5C77]">
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        {/* 노란 카카오 3초 시작 버튼 */}
        <button
          type="button"
          onClick={handleKakaoLogin}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FEE500] py-3.5 text-[15px] font-extrabold text-[#191919] shadow-md transition-transform active:scale-[0.98]"
        >
          <span aria-hidden="true">💬</span>
          <span>3초만에 카카오로 시작하기</span>
        </button>

        <div className="mt-3 flex items-center justify-between px-1 text-[12px] text-[#B9A9BF]">
          <button
            type="button"
            onClick={() => dismiss("24h")}
            className="underline decoration-white/25 underline-offset-4 hover:text-[#F6EEF3]"
          >
            24시간 동안 안 보기
          </button>
          <button
            type="button"
            onClick={() => dismiss("close")}
            className="font-semibold hover:text-[#F6EEF3]"
          >
            먼저 둘러볼게요
          </button>
        </div>
      </div>
    </div>
  );
}
