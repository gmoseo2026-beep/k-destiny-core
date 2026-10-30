"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageCircleHeart, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import KongdakMascot from "@/components/KongdakMascot";
import GuestCheckoutModal from "@/components/GuestCheckoutModal";
import { formatWon, getProduct, listPrice, priceLabel } from "@/lib/catalog";
import {
  ASK_THREE_CHIPS,
  ASK_THREE_ENTERTAINMENT_NOTICE,
  ASK_THREE_MAX_LEN,
  validateAskThreeQuestions,
} from "@/lib/askThreeSafety";
import { requestPortOnePayment } from "@/lib/payments/client";
import { savePendingInput } from "@/lib/reportHandoff";
import { trackEvent } from "@/lib/gtag";

export interface AskThreeWidgetProps {
  compatId: string;
  locale: string;
  fromProductId: string;
  defaultOpen?: boolean;
}

export default function AskThreeWidget({
  compatId,
  locale,
  fromProductId,
  defaultOpen = false,
}: AskThreeWidgetProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const product = getProduct("ask_three");

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [questions, setQuestions] = useState<[string, string, string]>(["", "", ""]);
  const [activeSlot, setActiveSlot] = useState<0 | 1 | 2>(0);
  const [blockedIndex, setBlockedIndex] = useState<0 | 1 | 2 | null>(null);
  const [safetyMsg, setSafetyMsg] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validatedQuestions, setValidatedQuestions] = useState<[string, string, string] | null>(
    null,
  );
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  if (!product || !compatId) return null;

  const strike = listPrice(product);
  const priceText = priceLabel(product);

  const handleOpenForm = () => {
    if (!isOpen) {
      setIsOpen(true);
      trackEvent("ask_open", {
        compatId,
        fromProductId,
      });
    }
  };

  const handleQuestionChange = (idx: 0 | 1 | 2, value: string) => {
    setQuestions((prev) => {
      const next: [string, string, string] = [prev[0], prev[1], prev[2]];
      next[idx] = value;
      return next;
    });
    if (safetyMsg) {
      setSafetyMsg(null);
      setBlockedIndex(null);
    }
  };

  const handleChipClick = (chip: string) => {
    let targetSlot: 0 | 1 | 2 = activeSlot;
    const emptyIdx = questions.findIndex((q) => q.trim().length === 0);
    if (emptyIdx === 0 || emptyIdx === 1 || emptyIdx === 2) {
      targetSlot = emptyIdx;
    }

    // 이미 같은 질문이 다른 칸에 적혀 있으면 그 칸으로 포커스만 이동
    const existingIdx = questions.findIndex((q) => q.trim() === chip);
    if (existingIdx === 0 || existingIdx === 1 || existingIdx === 2) {
      setActiveSlot(existingIdx);
      trackEvent("ask_question_chip", {
        compatId,
        fromProductId,
        chip,
        slot: existingIdx + 1,
      });
      return;
    }

    setQuestions((prev) => {
      const next: [string, string, string] = [prev[0], prev[1], prev[2]];
      next[targetSlot] = chip;
      return next;
    });
    const nextEmpty = ([0, 1, 2] as const).find(
      (i) => i !== targetSlot && questions[i].trim().length === 0,
    );
    if (nextEmpty !== undefined) {
      setActiveSlot(nextEmpty);
    }
    setSafetyMsg(null);
    setBlockedIndex(null);

    trackEvent("ask_question_chip", {
      compatId,
      fromProductId,
      chip,
      slot: targetSlot + 1,
    });
  };

  const handleProceedToCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSafetyMsg(null);
    setBlockedIndex(null);

    const localCheck = validateAskThreeQuestions(questions);
    if (!localCheck.ok) {
      setBlockedIndex(localCheck.index);
      setSafetyMsg(localCheck.message);
      return;
    }

    setValidating(true);
    try {
      const res = await fetch("/api/ask-three/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: localCheck.questions }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; questions: [string, string, string] }
        | { ok: false; error?: string; index?: 0 | 1 | 2 | null }
        | null;

      if (!res.ok || !json || !json.ok) {
        setBlockedIndex(json && !json.ok && json.index !== undefined ? json.index : null);
        setSafetyMsg(
          (json && !json.ok && json.error) ||
            "질문 내용을 다시 확인해 주세요.",
        );
        return;
      }

      setValidatedQuestions(json.questions);
      savePendingInput("ask_three", { questions: json.questions });
      setCheckoutOpen(true);
    } catch {
      setSafetyMsg("질문 확인 중 통신 오류가 생겼어요. 잠시 후 다시 눌러 주세요.");
    } finally {
      setValidating(false);
    }
  };

  return (
    <section
      aria-label="두근이에게 묻기"
      className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#FF5C77]/30 bg-gradient-to-b from-[#2A1635] to-[#1C1024] p-5 text-left shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <KongdakMascot size={48} expression="flutter" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1 rounded-full bg-[#FF5C77]/15 border border-[#FF5C77]/30 px-2.5 py-0.5 text-[11px] font-extrabold text-[#FF8AA1]">
            <MessageCircleHeart className="w-3 h-3" />
            <span>두근이에게 묻기</span>
          </div>
          <h3 className="mt-1.5 text-base font-black text-[#F6EEF3] leading-snug">
            {product.name}
          </h3>
          <p className="mt-1 text-xs text-[#B9A9BF] leading-relaxed">
            리포트를 읽고도 남은 궁금증 3가지를 적어 주세요. 이 궁합의 기운과 앞선 풀이를 바탕으로 답장 3개를 리포트 1개로 전해 드려요.
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            {strike && (
              <span className="text-xs font-semibold text-[#B9A9BF]/60 line-through">
                {formatWon(strike)}
              </span>
            )}
            <span className="text-sm font-black text-[#FFC24B]">{priceText}</span>
            <span className="text-[11px] font-medium text-[#B9A9BF]">
              · 질문 3개 답장 리포트 1건
            </span>
          </div>
        </div>
      </div>

      {!isOpen ? (
        <button
          type="button"
          onClick={handleOpenForm}
          className="mt-4 w-full rounded-2xl bg-[#FF5C77] hover:bg-[#FF5C77]/90 py-3.5 px-4 text-sm font-extrabold text-white shadow-[0_6px_18px_rgba(255,92,119,0.3)] transition-all active:scale-[0.96] flex items-center justify-center gap-1.5"
        >
          <span>궁금한 질문 3개 적어보기</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <form onSubmit={handleProceedToCheckout} className="mt-4 space-y-3.5">
          {/* 추천 질문 칩 */}
          <div>
            <p className="text-[11px] font-bold text-[#FFC24B] mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>눌러서 바로 넣는 추천 질문</span>
            </p>
            <div role="group" aria-label="추천 질문 목록" className="-mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ASK_THREE_CHIPS.map((chip) => {
                const isSelected = questions.some((q) => q.trim() === chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold border transition-all active:scale-[0.96] ${
                      isSelected
                        ? "bg-[#FF5C77]/20 border-[#FF5C77] text-[#F6EEF3]"
                        : "bg-[#140B18] border-white/10 text-[#B9A9BF] hover:text-[#F6EEF3] hover:border-white/25"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 질문 3칸 */}
          <div className="space-y-2.5">
            {([0, 1, 2] as const).map((idx) => {
              const isBlocked = blockedIndex === idx;
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor={`ask-three-q-${idx}`}
                      className="text-xs font-extrabold text-[#F6EEF3]"
                    >
                      질문 {idx + 1}
                    </label>
                    <span className="text-[11px] text-[#B9A9BF]/70">
                      {questions[idx].trim().length}/{ASK_THREE_MAX_LEN}
                    </span>
                  </div>
                  <input
                    id={`ask-three-q-${idx}`}
                    type="text"
                    maxLength={ASK_THREE_MAX_LEN}
                    value={questions[idx]}
                    onFocus={() => setActiveSlot(idx)}
                    onChange={(e) => handleQuestionChange(idx, e.target.value)}
                    placeholder={ASK_THREE_CHIPS[idx]}
                    className={`w-full rounded-xl bg-[#140B18] px-3.5 py-3 text-sm text-[#F6EEF3] placeholder:text-[#B9A9BF]/45 border transition-colors focus:outline-none ${
                      isBlocked
                        ? "border-[#FF5C77] ring-1 ring-[#FF5C77]"
                        : "border-white/10 focus:border-[#FF5C77]"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {safetyMsg && (
            <div
              role="alert"
              className="rounded-xl border border-[#FF5C77]/40 bg-[#FF5C77]/10 p-3 flex items-start gap-2 text-xs text-[#FFD7DF] leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-[#FF5C77] mt-0.5" />
              <span>{safetyMsg}</span>
            </div>
          )}

          <p className="text-[11px] text-[#B9A9BF]/85 leading-relaxed">
            {ASK_THREE_ENTERTAINMENT_NOTICE} 더 묻고 싶을 때는 새 리포트로 다시 구매할 수 있어요.
          </p>

          <button
            type="submit"
            disabled={validating || paying}
            className="w-full rounded-2xl bg-[#FF5C77] hover:bg-[#FF5C77]/90 disabled:opacity-60 py-3.5 px-4 text-sm font-extrabold text-white shadow-[0_6px_18px_rgba(255,92,119,0.3)] transition-all active:scale-[0.96] flex items-center justify-center gap-1.5"
          >
            <span>
              {validating
                ? "질문 확인 중..."
                : `질문 3개 답장 받기 · ${priceText}`}
            </span>
            {!validating && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      )}

      <GuestCheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title={product.name}
        orderName={product.name}
        priceLabel={priceText}
        productId={product.id}
        tier={product.tier}
        initialName={session?.user?.name || ""}
        initialEmail={session?.user?.email || ""}
        initialPhone=""
        isLoading={paying}
        onSubmit={async (buyer) => {
          if (!validatedQuestions) return;
          try {
            setPaying(true);
            savePendingInput("ask_three", { questions: validatedQuestions });
            const res = await requestPortOnePayment({
              productId: "ask_three",
              compatId,
              buyer,
              locale,
              askQuestions: validatedQuestions,
            });
            if (res.ok) {
              trackEvent("purchase_confirmed", {
                productId: "ask_three",
                tier: product.tier,
                amount: res.amount,
              });
              router.push(`/${locale}/report/new?c=ask_three&compat=${encodeURIComponent(compatId)}`);
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "결제 진행 중 오류가 발생했습니다.";
            alert(msg);
          } finally {
            setPaying(false);
            setCheckoutOpen(false);
          }
        }}
      />
    </section>
  );
}
