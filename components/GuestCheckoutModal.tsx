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

// 이니시스 상점에 켜져 있는 간편결제(사장님 확인 2026-10-03). 수단을 바꾸면 여기도 고친다.
const PAY_METHODS = [
  { label: "카카오페이", className: "bg-[#FEE500] text-[#191919]" },
  { label: "네이버페이", className: "bg-[#03C75A] text-white" },
  { label: "삼성페이", className: "bg-[#1428A0] text-white" },
  { label: "신용·체크카드", className: "bg-surface-soft text-text-2 border border-line" },
] as const;

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
  // KG이니시스는 모바일 결제에서 이름만 필수다(휴대폰·이메일은 PC 결제에서만 필수 — 포트원 V2 문서).
  // 모바일에서는 입력 칸을 이메일 하나로 줄인다. 이메일은 결제 후 다시 볼 때 본인 확인에 쓴다.
  const [isMobile] = useState(() => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
  const [consentNudge, setConsentNudge] = useState(false);

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
        setConsentNudge(false);
      });
      trackEvent("checkout_open", { productId: productId || orderName || "unknown", guest: !session?.user });
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
    const pid = productId || orderName || "unknown";
    const fail = (field: string, msg: string) => {
      trackEvent("checkout_validation_error", { productId: pid, field });
      setErrorMsg(msg);
    };

    if (!isMobile && (!trimmedName || trimmedName.length < 2)) {
      return fail("name", "이름을 2자 이상 입력해주세요.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      return fail("email", "이메일 주소를 확인해 주세요. 결제한 리포트를 다시 볼 때 필요해요.");
    }

    if (!isMobile && (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 11)) {
      return fail("phone", "휴대폰 번호를 정확히 입력해주세요. (예: 01012345678)");
    }

    if (!agreedToWithdrawalPolicy) {
      setConsentNudge(true);
      return fail("consent", "아래 안내에 체크하면 바로 결제로 넘어가요.");
    }

    trackEvent("checkout_submit", { productId: pid, guest: !session?.user, mobile: isMobile });
    await onSubmit({
      // 모바일은 이름 칸이 없다 → 앞에서 입력한 이름(있으면)을 쓰고, 없으면 일반 호칭으로 보낸다
      fullName: trimmedName.length >= 2 ? trimmedName : "콩닥 고객",
      email: trimmedEmail,
      phoneNumber: isMobile ? "" : cleanPhone,
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
            <p className="text-xs text-text-3">간편결제 가능 · 결제 후 바로 열람</p>
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

        {/* Guest Input Form */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
          {!isMobile && (
            <>
          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              주문자 이름 <span className="text-coral">*</span>
            </label>
            <input
              type="text"
              required
              autoComplete="name"
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
              autoComplete="tel"
              inputMode="numeric"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="01012345678 (- 없이 입력)"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 bg-surface-soft border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-coral/40 transition-all placeholder:text-text-3"
            />
          </div>

            </>
          )}

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              이메일 주소 <span className="text-coral">*</span>
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kongdak@example.com"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 bg-surface-soft border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-coral/40 transition-all placeholder:text-text-3"
            />
            <span className="text-[11px] text-text-3 mt-1 block">
              결제한 리포트를 다시 볼 때 본인 확인에만 써요.
            </span>
          </div>

          <label
            className={`flex items-start gap-2.5 cursor-pointer rounded-xl p-2.5 border text-[11px] text-text-2 leading-relaxed select-none transition-colors ${
              consentNudge && !agreedToWithdrawalPolicy ? "border-coral bg-coral-soft" : "border-line bg-surface-soft"
            }`}
          >
            <input
              type="checkbox"
              checked={agreedToWithdrawalPolicy}
              onChange={(e) => {
                setAgreedToWithdrawalPolicy(e.target.checked);
                if (e.target.checked) setErrorMsg(null);
              }}
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
              disabled={isLoading}
              isLoading={isLoading}
              className="flex-[2]"
            >
              {isLoading ? "결제창 연결 중..." : `${shownPrice} 결제하기`}
            </Button>
          </div>

          {/* 간편결제는 이니시스 결제창 안에서 고른다. 결제창을 열기 전에는 손님이 알 수 없어 여기서 미리 알린다. */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex flex-wrap items-center justify-center gap-1.5" aria-label="사용 가능한 결제 수단">
              {PAY_METHODS.map((m) => (
                <span key={m.label} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${m.className}`}>
                  {m.label}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-text-3">다음 화면(KG이니시스 안전결제)에서 골라요</p>
          </div>

          {isGuest && firstPrice && (
            <a
              href={loginHref}
              onClick={() => trackEvent("checkout_login_hint_click", { productId: productId || orderName || "unknown" })}
              className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-text-3"
            >
              <span>회원가입·로그인하면 첫 결제는 {firstPrice}</span>
              <span className="shrink-0 underline">로그인하기 →</span>
            </a>
          )}

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
