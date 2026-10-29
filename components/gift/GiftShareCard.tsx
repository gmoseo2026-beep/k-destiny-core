"use client";

import React, { useState } from "react";
import { Gift, Copy, Check, MessageCircle } from "lucide-react";
import { getProduct, getProductCover } from "@/lib/catalog";
import { formatGiftHeadline } from "@/lib/giftCopy";
import type { IssuedGiftSummary } from "@/lib/payments/client";

interface GiftShareCardProps {
  gift: IssuedGiftSummary;
  locale: string;
}

export default function GiftShareCard({ gift, locale }: GiftShareCardProps) {
  const [copied, setCopied] = useState(false);
  const product = getProduct(gift.catalogId);
  const productName = product?.name || "운세 리포트";
  const headline = formatGiftHeadline(gift.senderNickname, gift.catalogId, productName);

  const getGiftUrl = () => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://kongdak.kr";
    return `${origin}/${locale}/gift/${gift.code}`;
  };

  const handleCopy = async () => {
    const link = getGiftUrl();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement("textarea");
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert("선물 링크 복사에 실패했어요.");
    }
  };

  const handleShareKakao = async () => {
    const link = getGiftUrl();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://kongdak.kr";
    const coverPath = getProductCover(gift.catalogId);
    const imageUrl = coverPath.startsWith("http") ? coverPath : `${origin}${coverPath}`;
    const kakao = typeof window !== "undefined" ? window.Kakao : undefined;

    if (kakao && kakao.isInitialized && kakao.isInitialized() && kakao.Share?.sendDefault) {
      kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: `🎁 ${headline}`,
          description:
            gift.message ||
            `${gift.recipientNickname}님, 생년월일만 입력하면 바로 풀이를 열어볼 수 있어요.`,
          imageUrl,
          link: {
            mobileWebUrl: link,
            webUrl: link,
          },
        },
        buttons: [
          {
            title: "선물 열어보기",
            link: {
              mobileWebUrl: link,
              webUrl: link,
            },
          },
        ],
      });
      return;
    }

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `🎁 ${headline}`,
          text: gift.message || `${gift.recipientNickname}님을 위한 콩닥 운세 선물이에요.`,
          url: link,
        });
        return;
      } catch {
        // 사용자 취소 등 → 링크 복사로 폴백
      }
    }

    await handleCopy();
  };

  const expiryText = gift.expiresAt
    ? new Date(gift.expiresAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "결제일로부터 90일";

  return (
    <div className="w-full rounded-2xl border border-[#FFC24B]/35 bg-gradient-to-br from-[#2B1936] via-[#22142A] to-[#1A1022] p-5 text-left shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFC24B]/15 border border-[#FFC24B]/35 px-2.5 py-0.5 text-[11px] font-extrabold text-[#FFC24B]">
          <Gift className="w-3 h-3" />
          선물 링크 준비 완료
        </span>
      </div>

      <p className="text-base font-extrabold text-[#F6EEF3] leading-snug mb-1">
        To. {gift.recipientNickname}님
      </p>
      <p className="text-xs text-[#D6C8DC] mb-3">{productName}</p>

      {gift.message && (
        <div className="rounded-xl bg-[#140B18]/75 border border-white/[0.08] px-3.5 py-2.5 text-xs text-[#F6EEF3] leading-relaxed mb-3">
          &ldquo;{gift.message}&rdquo;
        </div>
      )}

      <div className="flex flex-col gap-2.5 mt-3">
        <button
          type="button"
          onClick={handleShareKakao}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.96]"
        >
          <MessageCircle className="w-4 h-4" />
          <span>카카오톡으로 선물 보내기</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="w-full py-3 px-4 rounded-2xl bg-[#140B18] border border-white/[0.14] hover:border-white/30 text-[#F6EEF3] font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.96]"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#FFC24B]" />
              <span className="text-[#FFC24B]">선물 링크가 복사됐어요!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>선물 링크 복사하기</span>
            </>
          )}
        </button>
      </div>

      <p className="mt-3 text-[11px] text-[#B9A9BF] leading-relaxed">
        • 받는 분이 직접 생년월일을 입력하며, 보낸 분에게는 생년월일과 풀이 내용이 보이지 않아요.
        <br />• 사용 기한: {expiryText}까지 (미사용 시 환불 가능)
      </p>
    </div>
  );
}
