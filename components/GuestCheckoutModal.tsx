"use client";

import React, { useState, useEffect } from "react";
import KongdakMascot from "./KongdakMascot";
import { trackEvent } from "@/lib/gtag";
import { Button } from "@/components/ui/Button";
import { useSession } from "next-auth/react";
import { isInAppBrowser, openInExternalBrowser } from "@/lib/inAppBrowser";

interface GuestCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  orderName: string;
  priceLabel: string;
  productId?: string;
  tier?: string;
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  onSubmit: (buyer: { fullName: string; email: string; phoneNumber: string }) => Promise<void>;
  isLoading?: boolean;
}

export default function GuestCheckoutModal({
  isOpen,
  onClose,
  title,
  orderName,
  priceLabel,
  productId,
  tier = "standard",
  initialName = "",
  initialEmail = "",
  initialPhone = "",
  onSubmit,
  isLoading = false,
}: GuestCheckoutModalProps) {
  const [fullName, setFullName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [agreedToWithdrawalPolicy, setAgreedToWithdrawalPolicy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { data: session } = useSession();
  const [inApp] = useState(() => isInAppBrowser());
  const [showCopy, setShowCopy] = useState(false);
  const [copied, setCopied] = useState(false);

  // 비회원은 정가가 청구된다 → 결제창에서는 청구 금액만 보이고, 첫 결제 할인은 로그인 안내로 분리한다
  const FIRST_TAG = " · 회원 첫 결제 ";
  const isGuest = !session?.user;
  const hasFirstDiscount = priceLabel.includes(FIRST_TAG);
  const shownPrice = isGuest && hasFirstDiscount ? priceLabel.split(FIRST_TAG)[0] : priceLabel;
  const firstPrice = hasFirstDiscount ? priceLabel.split(FIRST_TAG)[1] : null;
  const loginHref = (() => {
    if (typeof window === "undefined") return "/ko/login";
    const locale = window.location.pathname.split("/")[1] || "ko";
    return `/${locale}/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  })();

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setFullName(initialName);
        setEmail(initialEmail);
        setPhoneNumber(initialPhone);
        setAgreedToWithdrawalPolicy(false);
        setErrorMsg(null);
      });
      trackEvent("checkout_open", { productId: productId || orderName || "unknown", guest: !session?.user });
      trackEvent("view_paywall", {
        productId: productId || orderName || "unknown",
        tier: tier || "standard",
        amountLabel: priceLabel,
      });
    }
    // 모달이 열릴 때 한 번만 기록한다(세션 로딩으로 다시 기록하지 않음)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialName, initialEmail, initialPhone, productId, tier, orderName, priceLabel]);

  if (!isOpen) return null;

  const handleExternal = () => {
    trackEvent("inapp_open_external", { from: "checkout_modal" });
    // 카톡·라인·안드로이드는 바로 외부 브라우저로 연다. 아이폰 인스타·스레드는 링크 복사 안내로.
    if (!openInExternalBrowser(window.location.href)) setShowCopy(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // 복사가 막힌 인앱이면 위 메뉴 안내만으로 진행한다
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    // 숫자만 남기기
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg("이름을 2자 이상 입력해주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMsg("올바른 이메일 주소를 입력해주세요. (리포트 열람 확인용)");
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 11) {
      setErrorMsg("휴대폰 번호를 정확히 입력해주세요. (예: 01012345678)");
      return;
    }

    await onSubmit({
      fullName: trimmedName,
      email: trimmedEmail,
      phoneNumber: cleanPhone,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-7 shadow-xl border border-line relative flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-text-3 hover:text-ink p-1.5 rounded-full transition-colors active:scale-95"
          aria-label="닫기"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <KongdakMascot size={42} animate="none" expression="flutter" />
          <div>
            <h3 className="text-lg font-black text-ink">{title}</h3>
            <p className="text-xs text-text-3">KG이니시스 카드 결제 정보 입력</p>
          </div>
        </div>

        {/* Order Info Card */}
        <div className="bg-surface-soft rounded-2xl p-3.5 mb-5 border border-line flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-ink block">{orderName}</span>
            <span className="text-[11px] text-text-3">결제 후 즉시 열람 가능</span>
          </div>
          <span className="text-base font-black text-coral">{shownPrice}</span>
        </div>

        {isGuest && firstPrice && (
          <a
            href={loginHref}
            onClick={() => trackEvent("checkout_login_hint_click", { productId: productId || orderName || "unknown" })}
            className="-mt-3 mb-5 flex items-center justify-between gap-2 rounded-xl border border-coral/30 bg-coral-soft px-3.5 py-2.5 text-xs font-bold text-coral-deep active:scale-[0.98] transition-all"
          >
            <span>회원가입·로그인하면 첫 결제는 {firstPrice}</span>
            <span className="shrink-0 underline">로그인하기 →</span>
          </a>
        )}

        {/* Guest Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              주문자 이름 <span className="text-coral">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="예: 홍길동"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 bg-surface-soft border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-coral/40 transition-all placeholder:text-text-3"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              휴대폰 번호 <span className="text-coral">*</span>
            </label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="01012345678 (- 없이 입력)"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 bg-surface-soft border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-coral/40 transition-all placeholder:text-text-3"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              이메일 주소 <span className="text-coral">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kongdak@example.com"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 bg-surface-soft border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-coral/40 transition-all placeholder:text-text-3"
            />
            <span className="text-[11px] text-text-3 mt-1 block">
              결제 내역 및 추후 리포트 다시보기 시 본인 확인용으로 사용됩니다.
            </span>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer bg-surface-soft rounded-xl p-2.5 border border-line text-[11px] text-text-2 leading-relaxed select-none">
            <input
              type="checkbox"
              required
              checked={agreedToWithdrawalPolicy}
              onChange={(e) => setAgreedToWithdrawalPolicy(e.target.checked)}
              className="mt-0.5 rounded text-coral focus:ring-coral"
            />
            <span>
              <strong className="text-ink font-semibold">[필수]</strong> 본 상품은 디지털 콘텐츠로서 열람(제공 개시) 후에는 전자상거래법 제17조 제2항에 따라 청약철회가 제한될 수 있음에 동의합니다.
            </span>
          </label>

          {errorMsg && (
            <p className="text-xs text-red-500 bg-red-50 py-1.5 px-3 rounded-lg border border-red-200">
              {errorMsg}
            </p>
          )}

          <div className="flex gap-2.5 mt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isLoading || !agreedToWithdrawalPolicy}
              isLoading={isLoading}
              className="flex-[2]"
            >
              {isLoading ? "결제창 연결 중..." : "결제 진행하기"}
            </Button>
          </div>

          {/* 인앱 브라우저(인스타·스레드 등): 결제는 바로 진행하되, 카드 앱에서 못 돌아오는 경우를 위한 보조 길 */}
          {inApp && (
            <div className="text-center text-[11px] text-text-3 leading-relaxed">
              {!showCopy ? (
                <button type="button" onClick={handleExternal} className="underline underline-offset-2">
                  결제가 넘어가지 않으면 다른 브라우저로 열기
                </button>
              ) : (
                <div className="rounded-xl bg-surface-soft p-3 text-left text-text-2">
                  오른쪽 위 메뉴(⋯)에서 <strong className="text-ink">외부 브라우저로 열기</strong>를 누르거나, 링크를 복사해 Safari에 붙여 넣어 주세요.
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="mt-2 w-full rounded-lg border border-line bg-white py-2 font-bold text-ink"
                  >
                    {copied ? "복사했어요" : "현재 링크 복사하기"}
                  </button>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
