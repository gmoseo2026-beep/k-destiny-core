"use client";

// 인앱 브라우저(스레드·인스타·카톡 등)에서 결제 버튼을 눌렀을 때의 선택 창.
// 예전에는 결제를 막고 외부 브라우저로만 보냈지만, 이제 이 자리에서 결제하는 길을 먼저 연다.
import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, CreditCard } from "lucide-react";
import { continueInAppPayment, openInExternalBrowser } from "@/lib/inAppBrowser";
import { trackEvent } from "@/lib/gtag";

interface InAppPaymentChoiceProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InAppPaymentChoice({ isOpen, onClose }: InAppPaymentChoiceProps) {
  const [showCopy, setShowCopy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => {
      setShowCopy(false);
      setCopied(false);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePayHere = () => {
    onClose();
    continueInAppPayment();
  };

  const handleExternal = () => {
    trackEvent("inapp_open_external", {});
    // 카톡·라인·안드로이드는 바로 외부 브라우저로 연다. 아이폰 인스타·스레드는 링크 복사 안내로.
    if (!openInExternalBrowser(window.location.href)) setShowCopy(true);
  };

  const handleCopy = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 p-3" role="dialog" aria-modal="true" aria-labelledby="inapp-pay-title">
      <button type="button" aria-label="닫기" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative w-full max-w-[420px] rounded-3xl bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] shadow-xl">
        <h2 id="inapp-pay-title" className="text-base font-black text-ink">결제 방법을 골라 주세요</h2>
        <p className="mt-1 text-xs text-caption leading-relaxed">
          지금은 앱 안 브라우저예요. 이 화면에서 바로 결제할 수 있어요.
          카드 앱에서 이 화면으로 돌아오지 못하면 외부 브라우저로 열어 주세요.
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handlePayHere}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-coral py-3.5 text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(224,36,90,0.25)] active:scale-[0.96] transition-all"
          >
            <CreditCard className="h-4 w-4" />
            여기서 바로 결제하기
          </button>
          <button
            type="button"
            onClick={handleExternal}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3 text-sm font-bold text-ink active:scale-[0.96] transition-all"
          >
            <ExternalLink className="h-4 w-4 text-caption" />
            외부 브라우저로 열기
          </button>
        </div>

        {showCopy && (
          <div className="mt-3 rounded-2xl bg-surface-soft p-3.5 text-xs text-text-2 leading-relaxed">
            <p>
              오른쪽 위 메뉴(⋯)에서 <strong className="text-ink">외부 브라우저로 열기</strong>를 누르거나,
              링크를 복사해 Safari에 붙여 넣은 뒤 결제 버튼을 다시 눌러 주세요.
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white py-2.5 font-bold text-ink active:scale-[0.96] transition-all"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-coral" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "복사했어요. Safari에 붙여 넣어 주세요" : "현재 링크 복사하기"}
            </button>
          </div>
        )}

        <button type="button" onClick={onClose} className="mt-3 w-full py-2 text-xs font-semibold text-caption">
          닫기
        </button>
      </div>
    </div>
  );
}
