"use client";

import React, { useState, useEffect } from "react";
import KongdakMascot from "./KongdakMascot";
import { trackEvent } from "@/lib/gtag";
import { Button } from "@/components/ui/Button";

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

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setFullName(initialName);
        setEmail(initialEmail);
        setPhoneNumber(initialPhone);
        setAgreedToWithdrawalPolicy(false);
        setErrorMsg(null);
      });
      trackEvent("view_paywall", {
        productId: productId || orderName || "unknown",
        tier: tier || "standard",
        amountLabel: priceLabel,
      });
    }
  }, [isOpen, initialName, initialEmail, initialPhone, productId, tier, orderName, priceLabel]);

  if (!isOpen) return null;

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
          <span className="text-base font-black text-coral">{priceLabel}</span>
        </div>

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
        </form>
      </div>
    </div>
  );
}
