"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { trackEvent } from "@/lib/gtag";
import { withCompatFromParam } from "@/lib/compatFromUrl";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import InAppPaymentChoice from "@/components/InAppPaymentChoice";
import { blockPaymentIfInApp } from "@/lib/inAppBrowser";
import { requestPortOnePayment, BuyerInfo } from "@/lib/payments/client";
import { getProduct, getProductCover, priceLabel, teaserCatalogIdFor, setsContaining, checkoutOptionsFor } from "@/lib/catalog";
import SetUpsell from "@/components/product/SetUpsell";
import StandardReportView from "@/components/report/StandardReportView";
import TeaserUnlockPanel, { revealUnlockPanel, trackTeaserUnlock } from "@/components/report/TeaserUnlockPanel";
import PreviewLimitPanel from "@/components/report/PreviewLimitPanel";
import { saveLastCouple, loadLastCouple, saveLastPerson, loadLastPerson, type LastCouple, type LastPerson } from "@/lib/reportHandoff";
import type { SectionOutlineMap } from "@/lib/prompts/sectionOutline";
import OwnedReportNotice from "@/components/OwnedReportNotice";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Link2, Lock, ArrowLeft, ArrowRight } from "lucide-react";
import {
  loadSentInvites,
  saveSentInvite,
  removeSentInvite,
  relationLabel,
} from "@/lib/compatInviteClient";
import {
  COMPAT_CURIOSITY_OPTIONS,
  type CompatCuriosityKey,
} from "@/lib/compatCuriosity";

import { StandardReport, StandardTeaser } from "@/lib/reports/standard";

const GuestCheckoutModal = dynamic(() => import("@/components/GuestCheckoutModal"), { ssr: false });

interface InitialProfile {
  name?: string | null;
  birthYear?: string | number | null;
  birthMonth?: string | number | null;
  birthDay?: string | number | null;
  gender?: "F" | "M" | string | null;
  unknownTime?: boolean | null;
  birthTime?: string | null;
  isLunar?: boolean | null;
  [key: string]: unknown;
}

interface CompatNewClientProps {
  locale: string;
  refToken?: string;
  productId?: string;
  initialProfile?: InitialProfile | null;
  visibleIds?: string[];
  /** 회원 화면 "지난 궁합 이어보기": 이미 만든 궁합으로 입력 없이 바로 이 상품 미리보기 */
  fromCompatId?: string;
  /** 진입 경로 구분 (next = 리포트 끝 다음 풀이 권유) */
  fromVia?: string;
  /** 상품별 섹션 제목(서버가 넘김 — 프롬프트 원문은 클라이언트로 가져오지 않는다) */
  sectionOutlines?: SectionOutlineMap;
  /** ?mode=invite 진입 시 반쪽 초대장 모드로 시작 */
  initialInviteMode?: boolean;
}

function getReadyKakaoForInvite() {
  if (typeof window === "undefined") return null;
  const kakao = window.Kakao;
  if (!kakao || typeof kakao.init !== "function") return null;
  try {
    if (!kakao.isInitialized()) {
      const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || "";
      if (!jsKey) return null;
      kakao.init(jsKey);
    }
    return kakao.isInitialized() ? kakao : null;
  } catch {
    return null;
  }
}

type InputStep = 1 | 2 | 3 | 4;

const STEP_META: ReadonlyArray<{ step: InputStep; shortLabel: string; question: string }> = [
  { step: 1, shortLabel: "1. 나", question: "먼저 내 생년월일을 알려주세요" },
  { step: 2, shortLabel: "2. 상대", question: "함께 볼 그 사람의 생년월일은?" },
  { step: 3, shortLabel: "3. 관계", question: "두 사람은 지금 어떤 사이인가요?" },
  { step: 4, shortLabel: "4. 궁금한 점", question: "지금 제일 궁금한 것은 무엇인가요?" },
];

export default function CompatNewClient({
  locale,
  refToken,
  productId,
  initialProfile,
  visibleIds,
  fromCompatId,
  fromVia,
  sectionOutlines = {},
  initialInviteMode = false,
}: CompatNewClientProps) {
  const router = useRouter();

  const [nameA, setNameA] = useState(initialProfile?.name || "");
  // 프로필은 "05"처럼 0이 붙어 저장될 수 있다 → 선택 칸 값("5")과 맞추려고 숫자로 정규화
  const toOptionValue = (v: string | number | null | undefined) =>
    v === null || v === undefined || v === "" || isNaN(Number(v)) ? "" : String(Number(v));
  const [yearA, setYearA] = useState(toOptionValue(initialProfile?.birthYear));
  const [monthA, setMonthA] = useState(toOptionValue(initialProfile?.birthMonth));
  const [dayA, setDayA] = useState(toOptionValue(initialProfile?.birthDay));
  const [genderA, setGenderA] = useState<"F" | "M">(initialProfile?.gender === "M" ? "M" : "F");
  
  let defaultAmpmA = "";
  let defaultHourA = "1";
  let defaultMinA = "0";
  if (initialProfile && !initialProfile.unknownTime && initialProfile.birthTime) {
    const [hStr, mStr] = initialProfile.birthTime.split(":");
    let h = parseInt(hStr);
    defaultMinA = parseInt(mStr).toString();
    if (h >= 12) {
      defaultAmpmA = "PM";
      if (h > 12) h -= 12;
    } else {
      defaultAmpmA = "AM";
      if (h === 0) h = 12; // 자정(00시)은 오전 12시
    }
    defaultHourA = h.toString();
  }

  const [ampmA, setAmpmA] = useState(defaultAmpmA);
  const [hourA, setHourA] = useState(defaultHourA);
  const [minA, setMinA] = useState(defaultMinA);

  const [nameB, setNameB] = useState("");
  const [yearB, setYearB] = useState("");
  const [monthB, setMonthB] = useState("");
  const [dayB, setDayB] = useState("");
  const [genderB, setGenderB] = useState<"F" | "M">("M");
  const [ampmB, setAmpmB] = useState("");
  const [hourB, setHourB] = useState("1");
  const [minB, setMinB] = useState("0");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const getDaysInMonth = (y: string, m: string) => {
    if (!y || !m) return 31;
    return new Date(parseInt(y), parseInt(m), 0).getDate();
  };
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const [relation, setRelation] = useState<"love" | "crush" | "friend">("love");
  // [P-016-2 §6] 대화형 입력 단계(1: 나 -> 2: 상대 -> 3: 관계 -> 4: 지금 제일 궁금한 것)
  const [step, setStep] = useState<InputStep>(1);
  const [curiosity, setCuriosity] = useState<CompatCuriosityKey>("mind");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const product = productId ? getProduct(productId) : null;
  const isSpecialCouple = Boolean(productId && productId !== "compat_basic");

  const [teaserResult, setTeaserResult] = useState<{
    compatId: string;
    score: number;
    data: StandardReport | StandardTeaser;
    reportId?: string;
  } | null>(null);

  // 오늘의 무료 미리보기 한도를 넘김 → 미리보기 대신 결제 안내(궁합은 이미 만들어져 있어 바로 결제 가능)
  const [limitHit, setLimitHit] = useState<{ compatId: string; limit: number; signupBonus?: number } | null>(null);

  const { data: session } = useSession();
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [inAppOpen, setInAppOpen] = useState(false);

  // 결제할 상품: 기본은 이 상품, [세트로 보기]를 누르면 그 세트(같은 궁합 그대로)
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const checkoutProduct = (checkoutId ? getProduct(checkoutId) : null) ?? product;
  const upsellSets = product && product.type !== "SET" ? setsContaining(product.id, visibleIds ?? []) : [];

  const openCheckoutFor = (id: string) => {
    if (blockPaymentIfInApp(() => setInAppOpen(true), () => openCheckoutFor(id))) return;
    setCheckoutId(id);
    setCheckoutModalOpen(true);
  };
  const handleOpenCheckout = () => {
    if (product) openCheckoutFor(product.id);
  };

  // 지난 궁합 이어보기: 두 사람 정보를 다시 넣지 않고 기존 궁합(compatId)으로 맛보기를 만든다
  const [continuing, setContinuing] = useState(Boolean(fromCompatId && isSpecialCouple));
  const handledFromRef = useRef<string | null>(null);

  const syncCompatUrl = (compatId: string) => {
    if (typeof window === "undefined") return;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const next = withCompatFromParam(window.location.href, compatId);
    if (next === current) return;
    window.history.replaceState(window.history.state, "", next);
  };

  useEffect(() => {
    if (!fromCompatId || !isSpecialCouple || !product) return;
    if (handledFromRef.current === fromCompatId) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ catalogId: teaserCatalogIdFor(product), kind: "TEASER", compatId: fromCompatId, locale }),
        });
        const json = await res.json();
        if (res.status === 429 && json.code === "PREVIEW_LIMIT") {
          if (alive) {
            handledFromRef.current = fromCompatId;
            setLimitHit({ compatId: fromCompatId, limit: json.limit ?? 3, signupBonus: json.signupBonus ?? 0 });
          }
          return;
        }
        if (!res.ok) throw new Error(json.error || "미리보기를 만들지 못했어요.");
        if (!alive) return;
        handledFromRef.current = fromCompatId;
        trackEvent("teaser_created", {
          productId: product.id,
          tier: product.tier,
          via:
            fromVia === "next"
              ? "next_reading"
              : fromVia === "saved_detail"
              ? "saved_detail"
              : fromVia === "free_result"
              ? "free_result"
              : "compat_continue",
        });
        setTeaserResult({ compatId: fromCompatId, score: json.score || 0, data: json.data, reportId: json.reportId });
      } catch (err) {
        if (!alive) return;
        setErrorMsg(err instanceof Error ? `${err.message} 두 사람 정보를 입력해 다시 시도해 주세요.` : "미리보기를 만들지 못했어요.");
      } finally {
        if (alive) setContinuing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fromCompatId, fromVia, isSpecialCouple, product, locale]);

  // 방금 입력한 두 사람(같은 탭 안에서만 기억). 상품을 바꿀 때마다 처음부터 다시 넣지 않게 한다.
  const [lastCouple, setLastCouple] = useState<LastCouple | null>(null);
  useEffect(() => {
    const last = loadLastCouple();
    const split = (p: LastPerson) => {
      const [y, m, d] = p.dob.split("-");
      let ampm = "", hour = "1", min = "0";
      if (p.time) {
        const [hStr, mStr] = p.time.split(":");
        let h = parseInt(hStr, 10);
        ampm = h >= 12 ? "PM" : "AM";
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
        hour = String(h);
        min = String(parseInt(mStr, 10) || 0);
      }
      return { y, m: String(parseInt(m, 10)), d: String(parseInt(d, 10)), ampm, hour, min };
    };
    if (!last) {
      // 궁합은 처음이지만 방금 개인 운세에서 내 정보를 넣었다면 그것만 채운다
      const me = loadLastPerson();
      if (me && !initialProfile) {
        const a = split(me);
        queueMicrotask(() => {
          if (me.name && me.name !== "나") setNameA(me.name);
          setYearA(a.y); setMonthA(a.m); setDayA(a.d); setGenderA(me.gender);
          setAmpmA(a.ampm); setHourA(a.hour); setMinA(a.min);
        });
      }
      return;
    }
    queueMicrotask(() => {
      setLastCouple(last);
      // 내 정보: 저장된 프로필(회원)이 있으면 그쪽이 우선
      if (!initialProfile) {
        const a = split(last.a);
        if (last.a.name && last.a.name !== "나") setNameA(last.a.name);
        setYearA(a.y); setMonthA(a.m); setDayA(a.d); setGenderA(last.a.gender);
        setAmpmA(a.ampm); setHourA(a.hour); setMinA(a.min);
      }
      const b = split(last.b);
      if (last.b.name && last.b.name !== "상대방") setNameB(last.b.name);
      setYearB(b.y); setMonthB(b.m); setDayB(b.d); setGenderB(last.b.gender);
      setAmpmB(b.ampm); setHourB(b.hour); setMinB(b.min);
      setRelation(last.relation);
    });
    // 마운트 때 한 번만 복원한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 방금 만든 궁합(compatId)으로 입력 없이 이 상품의 미리보기를 연다
  const previewWithLastCouple = async () => {
    if (!lastCouple || !product) return;
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogId: teaserCatalogIdFor(product), kind: "TEASER", compatId: lastCouple.compatId, locale }),
      });
      const json = await res.json();
      if (res.status === 429 && json.code === "PREVIEW_LIMIT") {
        handledFromRef.current = lastCouple.compatId;
        setLimitHit({ compatId: lastCouple.compatId, limit: json.limit ?? 3, signupBonus: json.signupBonus ?? 0 });
        syncCompatUrl(lastCouple.compatId);
        return;
      }
      if (!res.ok) throw new Error(json.error || "미리보기를 만들지 못했어요.");
      handledFromRef.current = lastCouple.compatId;
      trackEvent("teaser_created", { productId: product.id, tier: product.tier, via: "last_couple" });
      setTeaserResult({ compatId: lastCouple.compatId, score: json.score || 0, data: json.data, reportId: json.reportId });
      syncCompatUrl(lastCouple.compatId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? `${err.message} 아래에 두 사람 정보를 확인하고 다시 시도해 주세요.` : "미리보기를 만들지 못했어요.");
    } finally {
      setIsLoading(false);
    }
  };

  // [P-008] 반쪽 초대장 모드 및 보낸 초대장 완성 확인
  const [inviteMode, setInviteMode] = useState<boolean>(
    Boolean(initialInviteMode && !isSpecialCouple)
  );
  const [createdInvite, setCreatedInvite] = useState<{
    token: string;
    nameA: string;
    relation: string;
  } | null>(null);
  const [inviteToast, setInviteToast] = useState<string | null>(null);
  const [completedSentInvites, setCompletedSentInvites] = useState<
    { token: string; shareToken: string }[]
  >([]);

  useEffect(() => {
    if (isSpecialCouple) return;
    const sent = loadSentInvites();
    if (sent.length === 0) return;

    let alive = true;
    (async () => {
      const found: { token: string; shareToken: string }[] = [];
      for (const item of sent) {
        try {
          const res = await fetch(`/api/compat/invite/${encodeURIComponent(item.token)}`, {
            cache: "no-store",
          });
          if (res.status === 410 || res.status === 404) {
            removeSentInvite(item.token);
            continue;
          }
          if (!res.ok) continue;
          const json = await res.json();
          if (json?.status === "completed" && typeof json?.shareToken === "string") {
            found.push({ token: item.token, shareToken: json.shareToken });
          }
        } catch {
          // 네트워크 오류 시 다음 방문에 다시 확인
        }
      }
      if (alive && found.length > 0) {
        setCompletedSentInvites(found);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isSpecialCouple]);

  const handleCreateInvite = async () => {
    setErrorMsg(null);
    if (!yearA || !monthA || !dayA) {
      setErrorMsg("내 생년월일을 입력해주세요.");
      setStep(1);
      return;
    }

    setIsLoading(true);
    try {
      const dobA = `${yearA}-${String(monthA).padStart(2, "0")}-${String(dayA).padStart(2, "0")}`;
      let finalTimeA: string | null = null;
      if (ampmA) {
        let h = parseInt(hourA, 10);
        if (ampmA === "PM" && h !== 12) h += 12;
        if (ampmA === "AM" && h === 12) h = 0;
        finalTimeA = `${String(h).padStart(2, "0")}:${String(minA).padStart(2, "0")}`;
      }

      const cleanNameA = nameA.trim() || "나";

      const res = await fetch("/api/compat/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personA: {
            name: cleanNameA,
            dob: dobA,
            gender: genderA,
            time: finalTimeA,
          },
          relation,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || typeof json?.token !== "string") {
        throw new Error(json?.error || "초대장 생성 중 오류가 발생했습니다.");
      }

      saveLastPerson({
        name: cleanNameA,
        dob: dobA,
        time: finalTimeA,
        gender: genderA,
      });

      // [SECURITY] localStorage에는 { token, createdAt }만 저장한다 (이름·생년월일 저장 금지)
      saveSentInvite(json.token);

      trackEvent("compat_invite_created", { relation });
      setCreatedInvite({
        token: json.token,
        nameA: cleanNameA,
        relation,
      });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "초대장 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const getInviteUrl = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://kongdak.kr";
    return `${origin}/${locale}/compat/invite/${token}`;
  };

  const handleCopyInviteLink = async () => {
    if (!createdInvite) return;
    const inviteUrl = getInviteUrl(createdInvite.token);
    trackEvent("compat_invite_shared", { method: "link", relation: createdInvite.relation });

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        setInviteToast("반쪽 초대장 링크가 복사되었어요! 상대방에게 보내보세요 💌");
        setTimeout(() => setInviteToast(null), 3000);
      } catch {
        setInviteToast("링크 복사에 실패했습니다.");
        setTimeout(() => setInviteToast(null), 2000);
      }
    }
  };

  const handleKakaoInviteShare = () => {
    if (!createdInvite) return;
    const kakao = getReadyKakaoForInvite();
    if (!kakao) {
      void handleCopyInviteLink();
      return;
    }

    trackEvent("compat_invite_shared", { method: "kakao", relation: createdInvite.relation });

    let baseDomain = process.env.NEXT_PUBLIC_SITE_URL || "https://kongdak.kr";
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        baseDomain = window.location.origin;
      }
    }

    const inviteUrl = `${baseDomain}/${locale}/compat/invite/${createdInvite.token}`;
    const imageUrl = `${baseDomain}/api/og/compat?inviteToken=${encodeURIComponent(createdInvite.token)}&w=800&h=400`;

    try {
      if (typeof kakao.Share?.sendDefault === "function") {
        kakao.Share.sendDefault({
          objectType: "feed",
          content: {
            title: `${createdInvite.nameA}님이 반쪽 궁합을 채워뒀어요 💌`,
            description: `${createdInvite.nameA}님의 반쪽은 이미 입력 완료! 내 생년월일만 채우면 우리 두 사람의 궁합 점수가 바로 열려요.`,
            imageUrl,
            imageWidth: 800,
            imageHeight: 400,
            link: {
              mobileWebUrl: inviteUrl,
              webUrl: inviteUrl,
            },
          },
          buttons: [
            {
              title: "내 생년월일 채우고 궁합 열기 💘",
              link: {
                mobileWebUrl: inviteUrl,
                webUrl: inviteUrl,
              },
            },
          ],
        });
      } else if (typeof kakao.Share?.sendScrap === "function") {
        kakao.Share.sendScrap({ requestUrl: inviteUrl });
      }
    } catch {
      void handleCopyInviteLink();
    }
  };

  const handleNextFromStep1 = () => {
    setErrorMsg(null);
    if (!yearA || !monthA || !dayA) {
      setErrorMsg("내 생년월일을 입력해주세요.");
      return;
    }
    trackEvent("compat_step_next", { step: 1 });
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    setErrorMsg(null);
    if (!yearB || !monthB || !dayB) {
      setErrorMsg("상대방의 생년월일을 입력해주세요.");
      return;
    }
    trackEvent("compat_step_next", { step: 2 });
    setStep(3);
  };

  const handleNextFromStep3 = (chosenRelation?: "love" | "crush" | "friend") => {
    setErrorMsg(null);
    const nextRel = chosenRelation ?? relation;
    if (chosenRelation) setRelation(chosenRelation);
    trackEvent("compat_step_next", { step: 3, relation: nextRel });
    setStep(4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteMode && !isSpecialCouple) {
      await handleCreateInvite();
      return;
    }
    setErrorMsg(null);

    if (!yearA || !monthA || !dayA) {
      setErrorMsg("내 생년월일을 입력해주세요.");
      setStep(1);
      return;
    }
    if (!yearB || !monthB || !dayB) {
      setErrorMsg("상대방의 생년월일을 입력해주세요.");
      setStep(2);
      return;
    }

    if (step < 4) {
      if (step === 1) handleNextFromStep1();
      else if (step === 2) handleNextFromStep2();
      else if (step === 3) handleNextFromStep3();
      return;
    }

    setIsLoading(true);

    try {
      const dobA = `${yearA}-${String(monthA).padStart(2, '0')}-${String(dayA).padStart(2, '0')}`;
      const dobB = `${yearB}-${String(monthB).padStart(2, '0')}-${String(dayB).padStart(2, '0')}`;

      let finalTimeA = null;
      if (ampmA) {
        let h = parseInt(hourA);
        if (ampmA === "PM" && h !== 12) h += 12;
        if (ampmA === "AM" && h === 12) h = 0;
        finalTimeA = `${h.toString().padStart(2, '0')}:${minA.padStart(2, '0')}`;
      }

      let finalTimeB = null;
      if (ampmB) {
        let h = parseInt(hourB);
        if (ampmB === "PM" && h !== 12) h += 12;
        if (ampmB === "AM" && h === 12) h = 0;
        finalTimeB = `${h.toString().padStart(2, '0')}:${minB.padStart(2, '0')}`;
      }

      const payload = {
        personA: {
          name: nameA.trim() || "나",
          dob: dobA,
          gender: genderA,
          time: finalTimeA,
        },
        personB: {
          name: nameB.trim() || "상대방",
          dob: dobB,
          gender: genderB,
          time: finalTimeB,
        },
        relation,
        ref: refToken || null,
      };

      const res = await fetch("/api/compat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.shareToken) {
        throw new Error(json.error || "궁합 계산 중 오류가 발생했습니다.");
      }

      // [P-016-2 §6] 선택된 궁금증은 AI 문장 말투에만 반영하도록 sessionStorage 에 저장 (점수 영향 없음)
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(`kd_compat_curiosity_${json.shareToken}`, curiosity);
        } catch {}
      }

      // 다음 상품에서 다시 입력하지 않도록 이 탭에만 기억해 둔다(서버 저장 없음)
      saveLastCouple({
        compatId: json.id,
        relation,
        a: { name: payload.personA.name, dob: dobA, time: finalTimeA, gender: genderA },
        b: { name: payload.personB.name, dob: dobB, time: finalTimeB, gender: genderB },
      });
      // 개인 운세에서도 내 정보를 이어 쓴다
      saveLastPerson({ name: payload.personA.name, dob: dobA, time: finalTimeA, gender: genderA });

      // GA4 측정 이벤트 발사 (기존과 동일한 시점 유지 — 틱톡 광고 학습 신호 보호)
      trackEvent("compat_created", {
        relation,
        has_ref: Boolean(refToken),
      });

      if (isSpecialCouple && productId) {
        const genRes = await fetch("/api/reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // 세트는 대표 구성 상품의 맛보기(결제·열람은 세트 id 그대로)
            catalogId: product ? teaserCatalogIdFor(product) : productId,
            kind: "TEASER",
            compatId: json.id,
            locale,
          }),
        });

        const genJson = await genRes.json();
        if (genRes.status === 429 && genJson.code === "PREVIEW_LIMIT") {
          handledFromRef.current = json.id;
          setLimitHit({ compatId: json.id, limit: genJson.limit ?? 3, signupBonus: genJson.signupBonus ?? 0 });
          syncCompatUrl(json.id);
          setIsLoading(false);
          return;
        }
        if (!genRes.ok) throw new Error(genJson.error || "리포트 생성 중 오류가 발생했습니다.");

        handledFromRef.current = json.id;
        trackEvent("teaser_created", { productId, tier: product?.tier || "standard" });

        setTeaserResult({
          compatId: json.id,
          score: genJson.score || 0,
          data: genJson.data,
          reportId: genJson.reportId,
        });
        syncCompatUrl(json.id);
        setIsLoading(false);
        return;
      }

      // 결과 화면으로 이동 (compat_basic 또는 기본 궁합)
      if (productId) {
        router.push(`/${locale}/compat/${json.shareToken}?productId=${productId}`);
      } else {
        router.push(`/${locale}/compat/${json.shareToken}`);
      }
    } catch (err) {
      console.error("궁합 생성 실패:", err);
      setErrorMsg(err instanceof Error ? err.message : "궁합 계산 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  // Teaser Result View for couple products
  if ((teaserResult || limitHit) && product) {
    const outline = sectionOutlines[getProduct(teaserCatalogIdFor(product))?.promptKey ?? product.promptKey] ?? [];
    const lockedSpecs = outline.slice(1).map((s) => ({ key: s.key, title: s.title }));
    const payCompatId = (teaserResult?.compatId ?? limitHit?.compatId) as string;

    return (
      <div className="w-full max-w-md mx-auto text-center flex flex-col gap-6 pb-28">
        {teaserResult ? (
          <>
            <h2 className="text-2xl font-bold tracking-tight">{product.name} 미리보기</h2>
            <StandardReportView
              mode="teaser"
              score={teaserResult.score}
              data={teaserResult.data}
              catalogId={product.id}
              lockedSpecs={lockedSpecs}
              onLockedClick={() => {
                trackTeaserUnlock(product.id, "locked_card", "panel");
                if (!revealUnlockPanel()) handleOpenCheckout();
              }}
            />

            <TeaserUnlockPanel
              product={product}
              lockedTitles={lockedSpecs.map((s) => s.title)}
              onUnlock={handleOpenCheckout}
            />
          </>
        ) : (
          <PreviewLimitPanel
            product={product}
            sectionTitles={outline.map((s) => s.title)}
            limit={limitHit?.limit ?? 3}
            onUnlock={handleOpenCheckout}
            signupBonus={limitHit?.signupBonus ?? 0}
            // 가입 후 같은 두 사람(from=궁합 id)으로 이 상품 미리보기를 바로 만든다
            signupHref={`/${locale}/login?callbackUrl=${encodeURIComponent(
              `/${locale}/compat/new?productId=${product.id}${limitHit?.compatId ? `&from=${limitHit.compatId}` : ""}`
            )}`}
          />
        )}

        {upsellSets.length > 0 && (
          <SetUpsell
            sets={upsellSets.slice(0, 2)}
            source="compat_teaser"
            currentId={product.id}
            onChoose={(set) => openCheckoutFor(set.id)}
          />
        )}


        <GuestCheckoutModal
          options={checkoutOptionsFor(product, visibleIds ?? [])}
          selectedId={checkoutId ?? undefined}
          onSelect={(id) => setCheckoutId(id)}
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          title={`${checkoutProduct?.name ?? product.name} 열람`}
          orderName={checkoutProduct?.name ?? product.name}
          priceLabel={priceLabel(checkoutProduct ?? product)}
          initialName={session?.user?.name || nameA || ""}
          initialEmail={session?.user?.email || ""}
          initialPhone=""
          isLoading={isProcessingPayment}
          onSubmit={async (buyer: BuyerInfo) => {
            try {
              setIsProcessingPayment(true);
              const payId = checkoutProduct?.id ?? product.id;
              const res = await requestPortOnePayment({
                productId: payId,
                compatId: payCompatId,
                buyer,
                locale,
              });

              if (res.ok) {
                trackEvent("purchase_confirmed", {
                  productId: payId,
                  tier: checkoutProduct?.tier ?? product.tier,
                  amount: res.amount,
                });
                router.push(`/${locale}/report/new?c=${payId}&compat=${payCompatId}`);
              }
            } catch (e: unknown) {
              alert(e instanceof Error ? e.message : "결제 진행 중 오류가 발생했습니다.");
            } finally {
              setIsProcessingPayment(false);
              setCheckoutModalOpen(false);
            }
          }}
        />

        <InAppPaymentChoice isOpen={inAppOpen} onClose={() => setInAppOpen(false)} />
      </div>
    );
  }

  if (continuing) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3 py-16 text-center">
        <div className="relative h-[96px] w-[72px] overflow-hidden rounded-xl border border-white/10 bg-[#22142A] animate-pulse">
          <Image src={getProductCover(product || "compat_basic")} alt="" fill sizes="72px" className="object-cover" />
        </div>
        <p className="text-sm font-bold text-[#F6EEF3]">지난 궁합으로 {product?.name} 미리보기를 만들고 있어요</p>
        <p className="text-xs text-[#B9A9BF]">두 사람 정보를 다시 넣지 않아도 돼요</p>
      </div>
    );
  }

  // [P-008] 반쪽 초대장 생성 완료 화면
  if (createdInvite) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col gap-5 pb-12 text-center">
        {inviteToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-white px-5 py-3 rounded-full text-sm font-semibold shadow-xl transition-all duration-300 border border-[#FF8AA1]/30">
            {inviteToast}
          </div>
        )}

        <div className="w-full bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,92,119,0.28),transparent_60%),linear-gradient(180deg,#3A1B40_0%,#22142A_100%)] border border-white/10 rounded-3xl p-6 text-white shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
          <span className="inline-flex items-center gap-1 bg-black/25 backdrop-blur-sm text-gold px-3 py-1 rounded-full text-xs font-extrabold mb-3">
            💌 {relationLabel(createdInvite.relation)} 반쪽 초대장
          </span>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">
            {createdInvite.nameA}님의 반쪽이 준비됐어요!
          </h2>
          <p className="text-xs font-semibold text-white/90 mt-1.5 leading-relaxed">
            상대방에게 링크를 보내면, 상대방이 생년월일만 입력해
            <br />
            우리 두 사람의 궁합 점수를 바로 열 수 있어요.
          </p>
          <p className="text-[11px] font-medium text-white/80 mt-2">
            내 생년월일·태어난 시간 원문은 상대방에게 보이지 않아요 (72시간 유효)
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleKakaoInviteShare}
            className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 active:scale-[0.96] text-[#191919] py-4 rounded-2xl font-bold text-base shadow-xs transition-all duration-150 flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
              <path d="M16 4.64C8.269 4.64 2 9.697 2 15.942c0 4.024 2.502 7.55 6.275 9.624l-1.579 5.86c-.116.425.353.754.73.522l6.815-4.51c.563.078 1.144.12 1.749.12 7.73 0 14-5.057 14-11.302S23.73 4.64 16 4.64z" />
            </svg>
            <span>카카오톡으로 반쪽 초대장 보내기</span>
          </button>

          <Button
            type="button"
            onClick={handleCopyInviteLink}
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={<Link2 className="w-5 h-5 text-white" />}
          >
            <span>초대장 링크 복사하기</span>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreatedInvite(null);
            setInviteMode(false);
          }}
          className="mt-1 text-xs font-bold text-text-2 hover:text-coral underline underline-offset-4 transition-colors py-2"
        >
          기다리지 않고 내가 아는 생년월일로 바로 볼래요 →
        </button>
      </div>
    );
  }

  const currentStepMeta = STEP_META.find((m) => m.step === step) ?? STEP_META[0];

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-5 pb-12 mx-auto">
      {/* Hero Title (미리보기·한도 화면에서는 위쪽 조기 반환으로 숨겨진다) */}
      <div className="w-full max-w-md mx-auto text-center">
        <h1 className="text-2xl font-black text-ink tracking-tight break-keep">
          {isSpecialCouple && product?.hook ? product.hook : "우리, 얼마나 잘 맞을까?"}
        </h1>
        <p className="text-xs font-semibold text-caption mt-1.5">
          {isSpecialCouple && product
            ? "두 사람 생년월일만 넣으면 30초 · 가입 없이 무료 미리보기"
            : "두 사람의 생년월일만 넣으면 30초 만에 분석 완료 🔮"}
        </p>
      </div>

      <OwnedReportNotice locale={locale} catalogId={productId || "compat_basic"} source="compat_new" />

      {/* [P-008] 보낸 반쪽 초대장이 완성된 경우 상단 안내 배너 */}
      {completedSentInvites.length > 0 && !isSpecialCouple && (
        <div className="rounded-2xl border border-coral/35 bg-coral-soft p-4 flex items-center justify-between gap-3">
          <div className="text-left min-w-0">
            <p className="text-xs font-extrabold text-coral-deep">
              🎉 보내신 반쪽 초대장이 완성됐어요!
            </p>
            <p className="text-[11px] font-medium text-text-2 mt-0.5">
              상대방이 생년월일을 입력해 우리 궁합 결과가 열렸어요.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const target = completedSentInvites[0];
                removeSentInvite(target.token);
                router.push(`/${locale}/compat/${target.shareToken}`);
              }}
              className="rounded-xl bg-coral hover:bg-coral-deep text-white px-3.5 py-2 text-xs font-extrabold shadow-2xs transition-all active:scale-[0.96]"
            >
              결과 보기 →
            </button>
          </div>
        </div>
      )}

      {/* 3:4 Product Cover & Title */}
      <div className="flex flex-col items-center justify-center -mb-1">
        <div className="relative mb-2 h-[104px] w-[78px] overflow-hidden rounded-2xl border border-white/10 bg-[#22142A] shadow-md">
          <Image
            src={getProductCover(product || "compat_basic")}
            alt=""
            fill
            sizes="78px"
            priority
            className="object-cover"
          />
        </div>
        <h2 className="text-sm font-extrabold text-[#F6EEF3]">{product?.name || "정통 궁합"}</h2>
      </div>

      {/* 방금 본 두 사람으로 입력 없이 이 상품 미리보기 */}
      {lastCouple && isSpecialCouple && product && (
        <div className="rounded-2xl border border-coral/30 bg-coral-soft p-4 text-center">
          <p className="text-xs font-bold text-coral-deep">
            방금 본 두 사람
            {lastCouple.a.name !== "나" || lastCouple.b.name !== "상대방" ? ` (${lastCouple.a.name} · ${lastCouple.b.name})` : ""}
            의 정보가 남아 있어요
          </p>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              trackEvent("last_couple_preview_click", { productId: product.id });
              void previewWithLastCouple();
            }}
            className="mt-2.5 w-full rounded-2xl bg-coral py-3.5 text-sm font-extrabold text-white shadow-[0_4px_12px_rgba(255,92,119,0.25)] transition-all active:scale-[0.97] disabled:opacity-60"
          >
            {isLoading ? "미리보기를 만들고 있어요…" : `다시 입력 없이 ${product.name} 보기`}
          </button>
          <p className="mt-2 text-[11px] text-caption">다른 사람으로 보려면 아래에서 고쳐 주세요</p>
        </div>
      )}

      {/* [P-016-2 §6] 대화형 단계 표시 바 (초대장 모드가 아닐 때 노출) */}
      {!inviteMode && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-4 gap-1.5">
            {STEP_META.map((item) => {
              const isCurrent = step === item.step;
              const isDone = step > item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => {
                    if (item.step < step) {
                      setErrorMsg(null);
                      setStep(item.step);
                    }
                  }}
                  disabled={item.step > step}
                  className={`rounded-xl py-2 px-1 text-[11px] font-extrabold transition-all ${
                    isCurrent
                      ? "bg-coral text-white shadow-2xs"
                      : isDone
                      ? "bg-coral-soft text-coral-deep hover:bg-coral-soft/80"
                      : "bg-surface-soft text-caption"
                  }`}
                >
                  {item.shortLabel}
                </button>
              );
            })}
          </div>
          <p className="text-center text-sm font-black text-ink">
            {currentStepMeta.question}
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-coral-soft border border-coral text-coral-deep p-3.5 rounded-xl text-sm font-semibold text-center">
          {errorMsg}
        </div>
      )}

      {/* STEP 1: 내 정보 (또는 반쪽 초대장 모드) */}
      {(step === 1 || inviteMode) && (
        <Card className="p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">👤</span>
              <h3 className="font-bold text-sm text-ink">내 정보</h3>
            </div>
            {initialProfile ? (
              <span className="text-[10px] bg-coral-soft text-coral-deep px-2 py-0.5 rounded-full font-bold">
                저장된 프로필 불러옴
              </span>
            ) : !isSpecialCouple ? (
              <button
                type="button"
                onClick={() => {
                  const next = !inviteMode;
                  setInviteMode(next);
                  setErrorMsg(null);
                  if (next) {
                    trackEvent("compat_invite_entry_click", { source: "compat_new" });
                  }
                }}
                className="text-[11px] font-bold text-coral hover:text-coral-deep bg-coral-soft px-2.5 py-1 rounded-full transition-colors shrink-0"
              >
                {inviteMode ? "직접 입력으로 돌아가기" : "생일을 모르나요? 반쪽 초대장"}
              </button>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-2 mb-1">내 이름 또는 닉네임 (선택)</label>
            <input
              type="text"
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              placeholder="예: 김콩닥"
              className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] focus-visible:ring-2 ring-coral"
            />
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-2 mb-1">
                생년월일 <span className="text-coral">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={yearA}
                  onChange={(e) => setYearA(e.target.value)}
                  className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] focus-visible:ring-2 ring-coral"
                >
                  <option value="">년도</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}년
                    </option>
                  ))}
                </select>
                <select
                  value={monthA}
                  onChange={(e) => setMonthA(e.target.value)}
                  className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] focus-visible:ring-2 ring-coral"
                >
                  <option value="">월</option>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m}월
                    </option>
                  ))}
                </select>
                <select
                  value={dayA}
                  onChange={(e) => setDayA(e.target.value)}
                  className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] focus-visible:ring-2 ring-coral"
                >
                  <option value="">일</option>
                  {Array.from(
                    { length: getDaysInMonth(String(yearA), String(monthA)) },
                    (_, i) => i + 1
                  ).map((d) => (
                    <option key={d} value={d}>
                      {d}일
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-caption">
                <Lock className="h-3 w-3 text-coral shrink-0" />
                <span>생일은 암호화돼 저장돼요</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-text-2 mb-1">성별</label>
                <select
                  value={genderA}
                  onChange={(e) => setGenderA(e.target.value as "F" | "M")}
                  className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] focus-visible:ring-2 ring-coral"
                >
                  <option value="F">여성</option>
                  <option value="M">남성</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-text-2 mb-1">태어난 시간 (선택)</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={ampmA}
                    onChange={(e) => setAmpmA(e.target.value)}
                    className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] focus-visible:ring-2 ring-coral"
                  >
                    <option value="">모름</option>
                    <option value="AM">오전</option>
                    <option value="PM">오후</option>
                  </select>
                  <select
                    value={hourA}
                    onChange={(e) => setHourA(e.target.value)}
                    disabled={!ampmA}
                    className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] disabled:opacity-50 focus-visible:ring-2 ring-coral"
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>
                        {h}시
                      </option>
                    ))}
                  </select>
                  <select
                    value={minA}
                    onChange={(e) => setMinA(e.target.value)}
                    disabled={!ampmA}
                    className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] disabled:opacity-50 focus-visible:ring-2 ring-coral"
                  >
                    {minutes.map((m) => (
                      <option key={m} value={m}>
                        {m}분
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {inviteMode && !isSpecialCouple ? (
            <div className="mt-2 flex flex-col gap-3">
              <div className="rounded-2xl bg-surface-soft border border-coral/25 p-3.5 text-left">
                <p className="text-xs font-extrabold text-ink">
                  💌 상대방의 생년월일을 몰라도 괜찮아요
                </p>
                <p className="text-[11px] font-medium text-text-2 mt-1 leading-relaxed">
                  내 정보만 입력하고 반쪽 초대장 링크를 보내면, 상대방이 직접 생년월일을 채워 우리 두 사람의 궁합 점수를 바로 열 수 있어요.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-caption mb-1.5">우리의 관계</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "love", label: "연인 · 커플", icon: "❤️" },
                    { key: "crush", label: "썸 · 호감", icon: "💌" },
                    { key: "friend", label: "친구 · 지인", icon: "✨" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setRelation(item.key as "love" | "crush" | "friend")}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 border active:scale-[0.96] ${
                        relation === item.key
                          ? "bg-coral text-white border-coral shadow-2xs"
                          : "bg-surface-soft text-ink border-line hover:bg-white/[0.06]"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" size="lg" fullWidth isLoading={isLoading}>
                반쪽 초대장 링크 만들기 (무료) 💌
              </Button>
              <button
                type="button"
                onClick={() => setInviteMode(false)}
                className="text-xs font-bold text-text-2 hover:text-coral underline underline-offset-4 transition-colors py-1"
              >
                기다리지 않고 내가 아는 생년월일로 바로 볼래요 →
              </button>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              <Button
                type="button"
                size="lg"
                fullWidth
                onClick={handleNextFromStep1}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                다음: 상대방 정보 입력
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* STEP 2: 상대방 정보 */}
      {!inviteMode && step === 2 && (
        <Card className="p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">💖</span>
              <h3 className="font-bold text-sm text-ink">상대방 정보</h3>
            </div>
            {!isSpecialCouple && (
              <button
                type="button"
                onClick={() => {
                  setInviteMode(true);
                  setErrorMsg(null);
                  trackEvent("compat_invite_entry_click", { source: "compat_new" });
                }}
                className="text-[11px] font-bold text-coral hover:text-coral-deep bg-coral-soft px-2.5 py-1 rounded-full transition-colors shrink-0"
              >
                생일을 모르나요? 반쪽 초대장 보내기
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-2 mb-1">상대방 이름 또는 애칭 (선택)</label>
            <input
              type="text"
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              placeholder="예: 이설렘"
              className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] focus-visible:ring-2 ring-coral"
            />
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-2 mb-1">
                생년월일 <span className="text-coral">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={yearB}
                  onChange={(e) => setYearB(e.target.value)}
                  className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] focus-visible:ring-2 ring-coral"
                >
                  <option value="">년도</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}년
                    </option>
                  ))}
                </select>
                <select
                  value={monthB}
                  onChange={(e) => setMonthB(e.target.value)}
                  className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] focus-visible:ring-2 ring-coral"
                >
                  <option value="">월</option>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m}월
                    </option>
                  ))}
                </select>
                <select
                  value={dayB}
                  onChange={(e) => setDayB(e.target.value)}
                  className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] focus-visible:ring-2 ring-coral"
                >
                  <option value="">일</option>
                  {Array.from(
                    { length: getDaysInMonth(yearB, monthB) },
                    (_, i) => i + 1
                  ).map((d) => (
                    <option key={d} value={d}>
                      {d}일
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-caption">
                <Lock className="h-3 w-3 text-coral shrink-0" />
                <span>생일은 암호화돼 저장돼요</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-text-2 mb-1">성별</label>
                <select
                  value={genderB}
                  onChange={(e) => setGenderB(e.target.value as "M" | "F")}
                  className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] focus-visible:ring-2 ring-coral"
                >
                  <option value="M">남성</option>
                  <option value="F">여성</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-text-2 mb-1">태어난 시간 (선택)</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={ampmB}
                    onChange={(e) => setAmpmB(e.target.value)}
                    className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] placeholder:text-[#8E7D96] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] focus-visible:ring-2 ring-coral"
                  >
                    <option value="">모름</option>
                    <option value="AM">오전</option>
                    <option value="PM">오후</option>
                  </select>
                  <select
                    value={hourB}
                    onChange={(e) => setHourB(e.target.value)}
                    disabled={!ampmB}
                    className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] disabled:opacity-50 focus-visible:ring-2 ring-coral"
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>
                        {h}시
                      </option>
                    ))}
                  </select>
                  <select
                    value={minB}
                    onChange={(e) => setMinB(e.target.value)}
                    disabled={!ampmB}
                    className="w-full border border-white/[0.12] rounded-xl p-3 text-sm text-[#F6EEF3] focus:outline-none focus:border-coral bg-[#140B18] [color-scheme:dark] disabled:opacity-50 focus-visible:ring-2 ring-coral"
                  >
                    {minutes.map((m) => (
                      <option key={m} value={m}>
                        {m}분
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => {
                setErrorMsg(null);
                setStep(1);
              }}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="shrink-0"
            >
              이전
            </Button>
            <Button
              type="button"
              size="lg"
              fullWidth
              onClick={handleNextFromStep2}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              다음: 우리의 관계
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: 우리의 관계 (3가지 유지) */}
      {!inviteMode && step === 3 && (
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="text-sm font-bold text-ink">우리의 관계</span>
            <span className="text-[11px] font-semibold text-caption">
              {nameA.trim() || "나"} · {nameB.trim() || "상대방"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { key: "love", label: "연인 · 커플", icon: "❤️" },
              { key: "crush", label: "썸 · 호감", icon: "💌" },
              { key: "friend", label: "친구 · 지인", icon: "✨" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNextFromStep3(item.key as "love" | "crush" | "friend")}
                className={`py-4 px-2 rounded-2xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 border active:scale-[0.96] ${
                  relation === item.key
                    ? "bg-coral text-white border-coral shadow-xs"
                    : "bg-surface-soft text-ink border-line hover:bg-white/[0.06]"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => {
                setErrorMsg(null);
                setStep(2);
              }}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="shrink-0"
            >
              이전
            </Button>
            <Button
              type="button"
              size="lg"
              fullWidth
              onClick={() => handleNextFromStep3()}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              다음: 지금 제일 궁금한 것
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: 지금 제일 궁금한 것 (1개 선택 — AI 문장 말투에만 반영) */}
      {!inviteMode && step === 4 && (
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="text-sm font-bold text-ink">지금 제일 궁금한 것</span>
            <span className="text-[11px] font-semibold text-caption">1개 선택</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {COMPAT_CURIOSITY_OPTIONS.map((opt) => {
              const isSelected = curiosity === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setCuriosity(opt.key);
                    trackEvent("compat_curiosity_select", { curiosity: opt.key });
                  }}
                  className={`w-full rounded-2xl border p-3.5 text-left transition-all flex items-center justify-between gap-3 active:scale-[0.98] ${
                    isSelected
                      ? "border-coral bg-coral-soft shadow-2xs"
                      : "border-line bg-surface-soft hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{opt.emoji}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-extrabold text-ink">{opt.label}</span>
                      <span className="text-[11px] font-medium text-text-2 truncate">
                        {opt.subLabel}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-coral bg-coral text-white" : "border-white/25 bg-[#140B18]"
                    }`}
                  >
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => {
                setErrorMsg(null);
                setStep(3);
              }}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="shrink-0"
            >
              이전
            </Button>
            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={isLoading}
            >
              {isSpecialCouple && product
                ? `${product.name} 무료 미리보기 ✨`
                : "우리 궁합 점수 확인하기 (무료) ✨"}
            </Button>
          </div>
        </Card>
      )}
    </form>
  );
}
