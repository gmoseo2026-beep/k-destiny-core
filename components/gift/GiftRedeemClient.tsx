"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Gift, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";
import KongdakMascot from "@/components/KongdakMascot";
import BirthFields, {
  formatBirthInput,
  type BirthValues,
} from "@/components/forms/BirthFields";
import { getProductCover, type InputKind, type ProductTarget } from "@/lib/catalog";
import { formatGiftHeadline } from "@/lib/giftCopy";
import { rememberOrderToken } from "@/lib/payments/client";
import {
  savePendingInput,
  saveLastPerson,
  saveLastCouple,
} from "@/lib/reportHandoff";
import { trackEvent } from "@/lib/gtag";
import { Card } from "@/components/ui/Card";

export interface GiftViewData {
  code: string;
  catalogId: string;
  productName: string;
  target: ProductTarget;
  inputKind: InputKind;
  tier: "standard" | "premium";
  senderNickname: string | null;
  recipientNickname: string;
  message: string | null;
  status: "AVAILABLE" | "USED" | "EXPIRED" | "UNPAID";
  expiresAt: string;
}

interface GiftRedeemClientProps {
  locale: string;
  gift: GiftViewData;
}

const EMPTY_BIRTH: BirthValues = {
  name: "",
  year: "",
  month: "",
  day: "",
  gender: "F",
  ampm: "",
  hour: "1",
  min: "00",
};

export default function GiftRedeemClient({ locale, gift }: GiftRedeemClientProps) {
  const router = useRouter();
  const openedRef = useRef(false);

  const [personValues, setPersonValues] = useState<BirthValues>({
    ...EMPTY_BIRTH,
    name: gift.recipientNickname || "",
  });
  const [personAValues, setPersonAValues] = useState<BirthValues>({
    ...EMPTY_BIRTH,
    name: gift.recipientNickname || "",
    gender: "F",
  });
  const [personBValues, setPersonBValues] = useState<BirthValues>({
    ...EMPTY_BIRTH,
    name: "",
    gender: "M",
  });
  const [relation, setRelation] = useState<"love" | "crush" | "friend">("love");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    trackEvent("gift_open", {
      productId: gift.catalogId,
      status: gift.status,
    });
  }, [gift.catalogId, gift.status]);

  const headline = formatGiftHeadline(
    gift.senderNickname,
    gift.catalogId,
    gift.productName
  );
  const coverSrc = getProductCover(gift.catalogId);
  const isCouple = gift.target === "couple" || gift.inputKind === "couple";
  const isSpecialPremium =
    gift.inputKind === "child_naming" || gift.inputKind === "date_selection";

  const expiryText = gift.expiresAt
    ? new Date(gift.expiresAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    let createdCompatId: string | null = null;
    let formattedPerson: ReturnType<typeof formatBirthInput> | null = null;
    let formattedA: ReturnType<typeof formatBirthInput> | null = null;
    let formattedB: ReturnType<typeof formatBirthInput> | null = null;

    if (!isSpecialPremium && !isCouple) {
      if (!personValues.year || !personValues.month || !personValues.day) {
        setErrorMsg("생년월일을 모두 선택해 주세요.");
        return;
      }
      formattedPerson = formatBirthInput(personValues);
    } else if (isCouple) {
      if (
        !personAValues.year ||
        !personAValues.month ||
        !personAValues.day ||
        !personBValues.year ||
        !personBValues.month ||
        !personBValues.day
      ) {
        setErrorMsg("두 분의 생년월일을 모두 선택해 주세요.");
        return;
      }
      formattedA = formatBirthInput(personAValues);
      formattedB = formatBirthInput({
        ...personBValues,
        name: personBValues.name.trim() || "그 사람",
      });
    }

    setSubmitting(true);
    try {
      if (isCouple && formattedA && formattedB) {
        const compatRes = await fetch("/api/compat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personA: formattedA,
            personB: formattedB,
            relation,
            locale,
          }),
        });
        const compatJson = await compatRes.json().catch(() => ({}));
        if (!compatRes.ok || !compatJson?.id) {
          throw new Error(
            compatJson?.error || "두 분의 정보를 확인하는 중 오류가 발생했어요."
          );
        }
        createdCompatId = String(compatJson.id);
      }

      const redeemRes = await fetch(`/api/gift/${encodeURIComponent(gift.code)}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogId: gift.catalogId,
          ...(createdCompatId ? { compatId: createdCompatId } : {}),
        }),
      });
      const redeemJson = await redeemRes.json().catch(() => ({}));
      if (!redeemRes.ok || !redeemJson?.orderId) {
        throw new Error(redeemJson?.error || "선물 코드를 사용하지 못했어요.");
      }

      const orderId = String(redeemJson.orderId);
      const compatId =
        typeof redeemJson.compatId === "string" ? redeemJson.compatId : createdCompatId;

      rememberOrderToken(gift.catalogId, orderId, compatId);
      trackEvent("gift_redeem", {
        productId: gift.catalogId,
      });

      if (isSpecialPremium) {
        router.replace(`/${locale}/premium/${gift.catalogId}/new`);
        return;
      }

      if (isCouple && compatId && formattedA && formattedB) {
        saveLastCouple({
          compatId,
          relation,
          a: formattedA,
          b: formattedB,
        });
        if (gift.catalogId === "compat_basic") {
          router.replace(`/${locale}/compat/${compatId}`);
        } else {
          router.replace(
            `/${locale}/report/new?c=${encodeURIComponent(gift.catalogId)}&compat=${encodeURIComponent(compatId)}`
          );
        }
        return;
      }

      if (formattedPerson) {
        savePendingInput(gift.catalogId, formattedPerson);
        saveLastPerson(formattedPerson);
        try {
          window.sessionStorage.setItem(
            "kongdak_guest_fortune_input",
            JSON.stringify(formattedPerson)
          );
        } catch {
          // ignore storage block
        }

        if (gift.catalogId.startsWith("annual_")) {
          const year = gift.catalogId.replace("annual_", "");
          router.replace(`/${locale}/fortune/annual?year=${encodeURIComponent(year)}`);
        } else {
          router.replace(`/${locale}/report/new?c=${encodeURIComponent(gift.catalogId)}`);
        }
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "선물을 여는 중 오류가 발생했어요."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-5 pb-20">
      <Card className="p-6 text-center relative overflow-hidden border border-[#FFC24B]/30 bg-gradient-to-b from-[#2A1735] via-[#22142A] to-[#190F20]">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFC24B]/15 border border-[#FFC24B]/35 px-3 py-1 text-xs font-extrabold text-[#FFC24B] mb-4">
          <Gift className="w-3.5 h-3.5" />
          <span>콩닥 운세 선물 도착</span>
        </div>

        <div className="flex justify-center mb-3">
          <KongdakMascot size={64} expression="simkoong" animate="none" />
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-[#F6EEF3] leading-snug mb-2">
          {headline}
        </h1>

        <p className="text-xs font-bold text-[#FF8AA1] mb-4">
          To. {gift.recipientNickname}님
        </p>

        {gift.message && (
          <div className="rounded-2xl bg-[#140B18]/80 border border-white/[0.1] px-4 py-3.5 text-sm text-[#F6EEF3] leading-relaxed mb-4">
            &ldquo;{gift.message}&rdquo;
          </div>
        )}

        <div className="flex items-center gap-3 rounded-2xl bg-[#140B18]/65 border border-white/[0.08] p-3 text-left">
          <div className="relative w-12 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-[#22142A]">
            <Image
              src={coverSrc}
              alt={gift.productName}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-[#FFC24B] block">선물 상품</span>
            <p className="text-sm font-extrabold text-[#F6EEF3] truncate">
              {gift.productName}
            </p>
            {expiryText && (
              <p className="text-[11px] text-[#B9A9BF] mt-0.5">
                사용 기한: {expiryText}까지
              </p>
            )}
          </div>
        </div>
      </Card>

      {gift.status !== "AVAILABLE" ? (
        <Card className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FF5C77]/15 text-[#FF8AA1] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-[#F6EEF3]">
            {gift.status === "USED" && "이미 사용된 선물 링크예요"}
            {gift.status === "EXPIRED" && "사용 기한(90일)이 지난 선물 링크예요"}
            {gift.status === "UNPAID" && "지금은 사용할 수 없는 선물 링크예요"}
          </h2>
          <p className="text-xs text-[#B9A9BF] leading-relaxed">
            {gift.status === "USED" &&
              "선물 코드는 1회만 사용할 수 있어요. 이미 생성한 리포트는 생성했던 브라우저의 보관함에서 다시 볼 수 있어요."}
            {gift.status === "EXPIRED" &&
              "결제일로부터 90일이 지나 선물 코드가 만료되었어요. 선물 보낸 분께 환불 문의를 안내해 주세요."}
            {gift.status === "UNPAID" &&
              "결제가 아직 완료되지 않았거나 취소(환불)된 선물 코드예요."}
          </p>
          <Link
            href={`/${locale}`}
            className="block w-full py-3.5 rounded-2xl bg-[#FF5C77] text-white font-extrabold text-sm text-center hover:opacity-95 transition-all active:scale-[0.96]"
          >
            콩닥 홈 둘러보기
          </Link>
        </Card>
      ) : (
        <Card className="p-6">
          <form onSubmit={handleRedeem} className="space-y-5">
            <div className="flex items-start gap-2.5 rounded-2xl bg-[#140B18]/80 border border-white/[0.08] p-3.5 text-left">
              <ShieldCheck className="w-4 h-4 text-[#FFC24B] shrink-0 mt-0.5" />
              <p className="text-xs text-[#D6C8DC] leading-relaxed">
                직접 입력하신 생년월일과 리포트 결과는{" "}
                <strong className="text-[#F6EEF3]">선물 보낸 분에게 보이지 않아요.</strong>{" "}
                안심하고 입력해 주세요.
              </p>
            </div>

            {isSpecialPremium ? (
              <p className="text-xs text-[#B9A9BF] leading-relaxed text-center">
                아래 버튼을 누르면 선물을 수령하고 맞춤 정보를 입력하는 화면으로 바로 이동해요.
              </p>
            ) : isCouple ? (
              <div className="space-y-5">
                <div>
                  <span className="block text-xs font-extrabold text-[#FF8AA1] mb-2">
                    1. 나의 정보
                  </span>
                  <BirthFields
                    values={personAValues}
                    onChange={(patch) =>
                      setPersonAValues((prev) => ({ ...prev, ...patch }))
                    }
                    disabled={submitting}
                  />
                </div>

                <div className="pt-4 border-t border-white/[0.08]">
                  <span className="block text-xs font-extrabold text-[#FFC24B] mb-2">
                    2. 상대방 정보
                  </span>
                  <BirthFields
                    values={personBValues}
                    onChange={(patch) =>
                      setPersonBValues((prev) => ({ ...prev, ...patch }))
                    }
                    disabled={submitting}
                  />
                </div>

                <div className="pt-2">
                  <span className="block text-xs font-semibold text-[#B9A9BF] mb-2">
                    두 분의 관계
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { key: "love", label: "연인·부부" },
                        { key: "crush", label: "썸·짝사랑" },
                        { key: "friend", label: "친구·동료" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setRelation(opt.key)}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-[0.96] ${
                          relation === opt.key
                            ? "bg-[#FF5C77]/20 border-[#FF5C77] text-[#F6EEF3]"
                            : "bg-[#140B18] border-white/[0.1] text-[#B9A9BF]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <span className="block text-xs font-extrabold text-[#FFC24B] mb-2">
                  내 사주 정보 입력
                </span>
                <BirthFields
                  values={personValues}
                  onChange={(patch) =>
                    setPersonValues((prev) => ({ ...prev, ...patch }))
                  }
                  disabled={submitting}
                />
              </div>
            )}

            {errorMsg && (
              <p className="text-xs font-bold text-[#FF8AA1] text-center">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] text-white font-extrabold text-sm shadow-lg hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-[0.96]"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {submitting ? "선물을 여는 중..." : "선물 받고 리포트 생성하기"}
              </span>
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
