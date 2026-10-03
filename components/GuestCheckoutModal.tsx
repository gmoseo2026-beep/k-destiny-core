"use client";

import React, { useState, useEffect, useRef } from "react";
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

/**
 * 결제 직전 확인 창.
 *
 * 2026-10-03 개편: 최근 7일 결제 안내를 본 80명 중 24명이 이 창을 열었는데 결제창(PG)까지 간 사람은 8명뿐이었다
 * (PG 까지 간 사람은 8명 중 7명이 결제). 이 창이 가장 큰 구멍이라 모바일에서는 입력을 전부 없앴다.
 *
 * - 모바일: 입력 칸 없음. [결제하기] 한 번이면 결제창으로 간다. KG이니시스 모바일 결제는 이름만 필수라
 *   앞에서 넣은 이름(없으면 "콩닥 고객")을 보낸다. 이메일은 결제 완료 화면에서 선택으로 받는다.
 * - PC: 이니시스 PC 결제가 이름·휴대폰·이메일을 요구해 세 칸을 그대로 둔다.
 * - 청약철회 제한은 체크박스 대신 버튼 바로 위 고지로 알린다(약관 제9조 8항: 결제를 진행하면 동의).
 * - 모바일은 하단 시트(스크롤 가능) — 키보드나 작은 화면에서도 결제 버튼이 가려지지 않는다.
 *
 * GA4: checkout_open → checkout_submit → begin_checkout / checkout_close { reason, seconds, typed }
 */
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { data: session } = useSession();
  const [inApp] = useState(() => isInAppBrowser());
  const [showCopy, setShowCopy] = useState(false);
  const [copied, setCopied] = useState(false);
  // KG이니시스는 모바일 결제에서 이름만 필수다(휴대폰·이메일은 PC 결제에서만 필수 — 포트원 V2 문서).
  const [isMobile] = useState(() => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
  const openedAtRef = useRef(0);
  const submittedRef = useRef(false);

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
  const pid = productId || orderName || "unknown";

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setFullName(initialName);
        setEmail(initialEmail);
        setPhoneNumber(initialPhone);
        setErrorMsg(null);
      });
      openedAtRef.current = Date.now();
      submittedRef.current = false;
      trackEvent("checkout_open", { productId: pid, guest: !session?.user, mobile: isMobile });
    }
    // 모달이 열릴 때 한 번만 기록한다(세션 로딩으로 다시 기록하지 않음)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialName, initialEmail, initialPhone, productId, tier, orderName, priceLabel]);

  if (!isOpen) return null;

  // 결제하지 않고 닫은 경우만 기록한다(결제 진행 뒤 부모가 닫는 것은 제외) — 어디서, 얼마 만에 나가는지 보려고
  const closeByUser = (reason: "x" | "cancel" | "backdrop") => {
    if (isLoading) return;
    if (!submittedRef.current) {
      trackEvent("checkout_close", {
        productId: pid,
        reason,
        seconds: Math.round((Date.now() - openedAtRef.current) / 1000),
        typed: !isMobile && (email.trim() !== initialEmail.trim() || phoneNumber.trim() !== initialPhone.trim()),
        mobile: isMobile,
        inapp: inApp,
      });
    }
    onClose();
  };

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
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
    const fail = (field: string, msg: string) => {
      trackEvent("checkout_validation_error", { productId: pid, field });
      setErrorMsg(msg);
    };

    // PC 결제만 이름·이메일·휴대폰을 받는다(이니시스 PC 필수값)
    if (!isMobile) {
      if (!trimmedName || trimmedName.length < 2) return fail("name", "이름을 2자 이상 입력해주세요.");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) return fail("email", "이메일 주소를 확인해 주세요.");
      if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 11) {
        return fail("phone", "휴대폰 번호를 정확히 입력해주세요. (예: 01012345678)");
      }
    }

    submittedRef.current = true;
    trackEvent("checkout_submit", { productId: pid, guest: !session?.user, mobile: isMobile });
    await onSubmit({
      // 모바일은 이름 칸이 없다 → 앞에서 입력한 이름(있으면)을 쓰고, 없으면 일반 호칭으로 보낸다
      fullName: trimmedName.length >= 2 ? trimmedName : "콩닥 고객",
      // 모바일은 이메일을 묻지 않는다(회원이면 계정 이메일이 들어 있다). 결제 완료 화면에서 선택으로 받는다.
      email: isMobile ? initialEmail.trim() : trimmedEmail,
      phoneNumber: isMobile ? "" : cleanPhone,
    });
  };

  const inputClass =
    "w-full px-3.5 py-2.5 bg-surface-soft border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-coral/40 transition-all placeholder:text-text-3";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeByUser("backdrop");
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6 pb-safe-sheet sm:p-7 shadow-xl border border-line relative flex flex-col"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => closeByUser("x")}
          disabled={isLoading}
          className="absolute top-4 right-4 text-text-3 hover:text-ink p-1.5 rounded-full transition-colors active:scale-95"
          aria-label="닫기"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 pr-8">
          <KongdakMascot size={42} animate="none" expression="flutter" />
          <div>
            <h3 className="text-lg font-black text-ink">{title}</h3>
            <p className="text-xs text-text-3">결제하면 바로 전체가 열려요</p>
          </div>
        </div>

        {/* Order Info Card */}
        <div className="bg-surface-soft rounded-2xl p-3.5 mb-4 border border-line flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-ink block">{orderName}</span>
            <span className="text-[11px] text-text-3">결제 후 즉시 열람 · 한 번 결제로 끝</span>
          </div>
          <span className="text-base font-black text-coral">{shownPrice}</span>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
          {/* PC 결제만: 이니시스 PC 결제창의 필수값 */}
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
                  className={inputClass}
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
                  className={inputClass}
                />
              </div>

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
                  className={inputClass}
                />
                <span className="text-[11px] text-text-3 mt-1 block">결제 영수증과 문의 확인에만 써요.</span>
              </div>
            </>
          )}

          {errorMsg && (
            <p className="text-xs text-red-500 bg-red-50 py-1.5 px-3 rounded-lg border border-red-200">
              {errorMsg}
            </p>
          )}

          {/* 간편결제는 이니시스 결제창 안에서 고른다. 결제창을 열기 전에는 손님이 알 수 없어 여기서 미리 알린다. */}
          <div className="flex flex-wrap items-center justify-center gap-1.5" aria-label="사용 가능한 결제 수단">
            {PAY_METHODS.map((m) => (
              <span key={m.label} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${m.className}`}>
                {m.label}
              </span>
            ))}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isLoading}
            isLoading={isLoading}
          >
            {isLoading ? "결제창 연결 중..." : `${shownPrice} 결제하기`}
          </Button>

          {/* 청약철회 제한 고지 — 체크박스 대신 버튼 바로 아래 고지(결제를 진행하면 동의, 약관 제9조) */}
          <p className="text-[11px] leading-relaxed text-text-3 text-center">
            결제하기를 누르면 다음 화면에서 결제 수단을 골라요. 디지털 콘텐츠라 열람(제공 개시) 후에는 전자상거래법
            제17조 제2항에 따라 청약철회가 제한될 수 있으며, 결제를 진행하면 이에 동의하게 됩니다.
          </p>

          {isGuest && firstPrice && (
            <a
              href={loginHref}
              onClick={() => trackEvent("checkout_login_hint_click", { productId: pid })}
              className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-text-3"
            >
              <span>회원가입·로그인하면 첫 결제는 {firstPrice}</span>
              <span className="shrink-0 underline">로그인하기 →</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => closeByUser("cancel")}
            disabled={isLoading}
            className="mx-auto py-1 text-xs font-semibold text-text-3 underline underline-offset-2"
          >
            다음에 할게요
          </button>

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
