"use client";

import React, { useState, useEffect } from "react";
import KongdakMascot from "./KongdakMascot";

interface GuestCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  orderName: string;
  priceLabel: string;
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

  useEffect(() => {
    if (isOpen) {
      setFullName(initialName);
      setEmail(initialEmail);
      setPhoneNumber(initialPhone);
      setErrorMsg(null);
    }
  }, [isOpen, initialName, initialEmail, initialPhone]);

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
      <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-7 shadow-xl border border-[#FFD9E0] relative flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full transition-colors active:scale-95"
          aria-label="닫기"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <KongdakMascot size={42} animate="bounce" expression="flutter" />
          <div>
            <h3 className="text-lg font-black text-[#2B2430]">{title}</h3>
            <p className="text-xs text-[#8A8291]">KG이니시스 카드 결제 정보 입력</p>
          </div>
        </div>

        {/* Order Info Card */}
        <div className="bg-[#FFF6F1] rounded-2xl p-3.5 mb-5 border border-[#FFD9E0]/50 flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-[#6A2C70] block">{orderName}</span>
            <span className="text-[11px] text-[#8A8291]">결제 후 즉시 열람 가능</span>
          </div>
          <span className="text-base font-black text-[#FF5C77]">{priceLabel}</span>
        </div>

        {/* Guest Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-bold text-[#2B2430] mb-1">
              주문자 이름 <span className="text-[#FF5C77]">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="예: 홍길동"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 bg-[#FFF6F1]/30 border border-[#FFD9E0] rounded-xl text-sm text-[#2B2430] focus:outline-none focus:ring-2 focus:ring-[#FF5C77] transition-all placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2B2430] mb-1">
              휴대폰 번호 <span className="text-[#FF5C77]">*</span>
            </label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="01012345678 (- 없이 입력)"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 bg-[#FFF6F1]/30 border border-[#FFD9E0] rounded-xl text-sm text-[#2B2430] focus:outline-none focus:ring-2 focus:ring-[#FF5C77] transition-all placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2B2430] mb-1">
              이메일 주소 <span className="text-[#FF5C77]">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kongdak@example.com"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 bg-[#FFF6F1]/30 border border-[#FFD9E0] rounded-xl text-sm text-[#2B2430] focus:outline-none focus:ring-2 focus:ring-[#FF5C77] transition-all placeholder:text-gray-400"
            />
            <span className="text-[11px] text-[#8A8291] mt-1 block">
              결제 내역 및 추후 리포트 다시보기 시 본인 확인용으로 사용됩니다.
            </span>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-500 bg-red-50 py-1.5 px-3 rounded-lg border border-red-200">
              {errorMsg}
            </p>
          )}

          <div className="flex gap-2.5 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors active:scale-95"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-2 py-3 bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] text-white rounded-xl text-xs font-bold shadow-md hover:opacity-95 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? "결제창 연결 중..." : "결제 진행하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
