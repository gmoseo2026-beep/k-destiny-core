"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import KongdakMascot from "@/components/KongdakMascot";
import FortuneLoading from "@/components/FortuneLoading";
import BirthFields, { BirthValues, formatBirthInput } from "@/components/forms/BirthFields";
import { getProduct } from "@/lib/catalog";
import { recallOrderToken } from "@/lib/payments/client";
import { loadPendingInput, clearPendingInput, savePendingInput } from "@/lib/reportHandoff";
import { ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/gtag";
import { PremiumGenerating } from "@/components/premium/PremiumGenerating";

interface ReportNewClientProps {
  locale: string;
  catalogId: string;
  compatId?: string;
  initialProfile?: {
    name?: string | null;
    birthDate?: string | null;
    birthTime?: string | null;
    gender?: string | null;
  } | null;
}

interface SetItemStatus {
  catalogId: string;
  name: string;
  isAnnual?: boolean;
  status: "PENDING" | "GENERATING" | "READY" | "FAILED";
  reportId?: string;
  error?: string;
}

const LOADING_STEPS = [
  "태어난 날의 기운을 차근차근 읽고 있어요",
  "타고난 흐름과 균형을 살펴보고 있어요",
  "나에게 맞는 맞춤형 심층 리포트를 작성하고 있어요",
  "거의 다 완성되었어요! 잠시만 기다려주세요",
];

export default function ReportNewClient({
  locale,
  catalogId,
  compatId,
  initialProfile,
}: ReportNewClientProps) {
  const router = useRouter();
  const product = getProduct(catalogId);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [checkedOrder, setCheckedOrder] = useState(false);

  // Single product state
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needInput, setNeedInput] = useState(false);

  // Form state for when pending input is missing
  const initDob = initialProfile?.birthDate?.split("-") || ["", "", ""];
  const [formValues, setFormValues] = useState<BirthValues>({
    name: initialProfile?.name || "",
    year: initDob[0] || "",
    month: initDob[1] ? String(parseInt(initDob[1], 10)) : "",
    day: initDob[2] ? String(parseInt(initDob[2], 10)) : "",
    gender: (initialProfile?.gender as "F" | "M") || "F",
    ampm: initialProfile?.birthTime ? (parseInt(initialProfile.birthTime.split(":")[0], 10) >= 12 ? "PM" : "AM") : "",
    hour: initialProfile?.birthTime ? String(parseInt(initialProfile.birthTime.split(":")[0], 10) % 12 || 12) : "1",
    min: initialProfile?.birthTime ? initialProfile.birthTime.split(":")[1] || "00" : "00",
  });

  // Set items state
  const [setItems, setSetItems] = useState<SetItemStatus[]>([]);
  const hasStartedRef = useRef(false);

  // 1) Find orderId on mount
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const token = recallOrderToken(catalogId, compatId);
      setOrderId(token);
      setCheckedOrder(true);
    });
    return () => {
      active = false;
    };
  }, [catalogId, compatId]);

  // Request generation for a single item
  const generateSingleReport = useCallback(
    async (targetCatalogId: string, inputPayload: unknown, currentOrderId: string): Promise<string> => {
      let attempts = 0;
      const maxAttempts = 40;

      while (attempts < maxAttempts) {
        attempts++;
        const res = await fetch("/api/reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            catalogId: targetCatalogId,
            kind: "FULL",
            orderId: currentOrderId,
            input: inputPayload,
            compatId: compatId || undefined,
            locale,
          }),
        });

        if (res.status === 200) {
          const data = await res.json();
          trackEvent("report_generated", { productId: targetCatalogId, tier: product?.tier || "standard" });
          return data.reportId as string;
        }

        if (res.status === 202) {
          // Still generating, wait 3 seconds and retry
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "리포트 생성에 실패했습니다.");
      }

      throw new Error("리포트 생성이 지연되고 있습니다. 잠시 후 다시 확인해주세요.");
    },
    [compatId, locale, product?.tier]
  );

  // Start generation when orderId is ready
  useEffect(() => {
    if (!checkedOrder || !orderId || hasStartedRef.current) return;
    hasStartedRef.current = true;

    if (!product) {
      queueMicrotask(() => setErrorMsg("상품 정보를 찾을 수 없습니다."));
      return;
    }

    // SET Flow
    if (product.type === "SET" && product.items && product.items.length > 0) {
      const itemsList: SetItemStatus[] = product.items.map((itemId) => {
        const itemP = getProduct(itemId);
        const isAnnual = itemId.startsWith("annual_");
        return {
          catalogId: itemId,
          name: itemP?.name || itemId,
          isAnnual,
          status: isAnnual ? "READY" : "PENDING",
        };
      });
      queueMicrotask(() => setSetItems(itemsList));

      // Get input for set items
      const saved = loadPendingInput(catalogId);
      if (!saved && product.target !== "couple") {
        queueMicrotask(() => setNeedInput(true));
        return;
      }

      // Generate items (up to 2 parallel)
      const nonAnnualItems = itemsList.filter((it) => !it.isAnnual);
      const runParallel = async () => {
        for (let i = 0; i < nonAnnualItems.length; i += 2) {
          const chunk = nonAnnualItems.slice(i, i + 2);
          await Promise.all(
            chunk.map(async (item) => {
              setSetItems((prev) =>
                prev.map((s) => (s.catalogId === item.catalogId ? { ...s, status: "GENERATING" } : s))
              );
              try {
                const repId = await generateSingleReport(item.catalogId, saved, orderId);
                setSetItems((prev) =>
                  prev.map((s) => (s.catalogId === item.catalogId ? { ...s, status: "READY", reportId: repId } : s))
                );
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : "생성 실패";
                setSetItems((prev) =>
                  prev.map((s) => (s.catalogId === item.catalogId ? { ...s, status: "FAILED", error: msg } : s))
                );
              }
            })
          );
        }
      };
      runParallel();
      return;
    }

    // Single Product Flow
    const saved = loadPendingInput(catalogId);
    if (!saved) {
      if (product.tier === "premium") {
        router.replace(`/${locale}/premium/${catalogId}/new`);
        return;
      }
      if (product.inputKind === "person") {
        queueMicrotask(() => setNeedInput(true));
        return;
      }
    }

    // Begin generation
    queueMicrotask(() => setGenerating(true));
    generateSingleReport(catalogId, saved, orderId)
      .then((reportId) => {
        clearPendingInput(catalogId);
        router.replace(`/${locale}/report/${reportId}`);
      })
      .catch((err: unknown) => {
        setGenerating(false);
        setErrorMsg(err instanceof Error ? err.message : "리포트 생성 중 오류가 발생했습니다.");
      });
  }, [checkedOrder, orderId, product, catalogId, generateSingleReport, locale, router]);

  // Handle re-entering input if pending input was missing
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !product) return;
    const formatted = formatBirthInput(formValues);
    savePendingInput(catalogId, formatted);
    setNeedInput(false);
    setGenerating(true);
    setErrorMsg(null);

    try {
      if (product.type === "SET") {
        // Restart set generation
        hasStartedRef.current = false;
        setCheckedOrder(false);
        setTimeout(() => setCheckedOrder(true), 50);
      } else {
        const reportId = await generateSingleReport(catalogId, formatted, orderId);
        clearPendingInput(catalogId);
        router.replace(`/${locale}/report/${reportId}`);
      }
    } catch (err: unknown) {
      setGenerating(false);
      setErrorMsg(err instanceof Error ? err.message : "리포트 생성 중 오류가 발생했습니다.");
    }
  };

  if (!checkedOrder) {
    return <FortuneLoading steps={LOADING_STEPS} skeletonVariant="deep-report" />;
  }

  // Missing Order Token
  if (!orderId) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-3xl p-8 border border-plum/10 shadow-sm text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-coral flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">결제 정보가 없어요</h2>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          리포트 생성을 위한 결제 내역을 확인할 수 없습니다. 상품 페이지에서 결제를 완료해 주세요.
        </p>
        <Link
          href={`/${locale}/products/${catalogId}`}
          className="inline-block w-full py-3.5 bg-coral text-white font-bold rounded-2xl shadow-sm hover:opacity-95 transition-all text-center"
        >
          상품 페이지로 이동
        </Link>
      </div>
    );
  }

  // Need Input Form
  if (needInput) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-3xl p-6 border border-plum/10 shadow-sm">
        <div className="text-center mb-6">
          <KongdakMascot size={48} animate="none" />
          <h2 className="text-xl font-black text-ink mt-2">사주 정보 입력</h2>
          <p className="text-xs text-muted mt-1">리포트 생성을 위해 생년월일을 확인해 주세요.</p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl mb-4 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
          <BirthFields values={formValues} onChange={(patch) => setFormValues((v) => ({ ...v, ...patch }))} />
          <button
            type="submit"
            className="w-full py-4 bg-coral text-white font-bold rounded-2xl shadow-sm hover:opacity-95 transition-all active:scale-[0.97]"
          >
            리포트 생성 시작하기 ✨
          </button>
        </form>
      </div>
    );
  }

  // SET Product View
  if (product?.type === "SET") {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col gap-6">
        <div className="bg-white rounded-3xl p-6 border border-plum/10 shadow-sm text-center">
          <KongdakMascot size={48} animate="bounce" />
          <h2 className="text-xl font-black text-ink mt-3">{product.name}</h2>
          <p className="text-xs text-muted mt-1">세트 구성 리포트를 생성하고 있어요.</p>
        </div>

        <div className="flex flex-col gap-3">
          {setItems.map((item) => (
            <div
              key={item.catalogId}
              className="bg-white rounded-2xl p-4 border border-plum/10 shadow-xs flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center text-coral shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink">{item.name}</h4>
                  <p className="text-xs text-muted">
                    {item.status === "PENDING" && "대기 중"}
                    {item.status === "GENERATING" && "분석 리포트 생성 중..."}
                    {item.status === "READY" && "생성 완료"}
                    {item.status === "FAILED" && (item.error || "생성 실패")}
                  </p>
                </div>
              </div>

              <div>
                {item.isAnnual ? (
                  <Link
                    href={`/${locale}/fortune/annual?year=2026`}
                    className="px-3.5 py-2 bg-coral text-white text-xs font-bold rounded-xl shadow-2xs hover:opacity-95 transition-all flex items-center gap-1"
                  >
                    <span>열기</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : item.status === "READY" && item.reportId ? (
                  <Link
                    href={`/${locale}/report/${item.reportId}`}
                    className="px-3.5 py-2 bg-coral text-white text-xs font-bold rounded-xl shadow-2xs hover:opacity-95 transition-all flex items-center gap-1"
                  >
                    <span>보기</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : item.status === "GENERATING" ? (
                  <div className="w-6 h-6 border-2 border-coral border-t-transparent rounded-full animate-spin mr-2" />
                ) : item.status === "FAILED" ? (
                  <button
                    type="button"
                    onClick={() => {
                      const saved = loadPendingInput(catalogId);
                      setSetItems((prev) =>
                        prev.map((s) => (s.catalogId === item.catalogId ? { ...s, status: "GENERATING" } : s))
                      );
                      generateSingleReport(item.catalogId, saved, orderId)
                        .then((repId) => {
                          setSetItems((prev) =>
                            prev.map((s) =>
                              s.catalogId === item.catalogId ? { ...s, status: "READY", reportId: repId } : s
                            )
                          );
                        })
                        .catch((e: unknown) => {
                          const msg = e instanceof Error ? e.message : "생성 실패";
                          setSetItems((prev) =>
                            prev.map((s) =>
                              s.catalogId === item.catalogId ? { ...s, status: "FAILED", error: msg } : s
                            )
                          );
                        });
                    }}
                    className="text-xs text-coral font-bold underline px-2 py-1"
                  >
                    재시도
                  </button>
                ) : (
                  <span className="text-xs text-muted px-2 py-1">대기</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Single Product Loading or Error View
  return (
    <div className="w-full max-w-md mx-auto">
      {errorMsg ? (
        <div className="bg-white rounded-3xl p-8 border border-plum/10 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-coral flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">리포트 생성 중 문제가 발생했어요</h2>
          <p className="text-sm text-muted mb-6 leading-relaxed">{errorMsg}</p>
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setGenerating(true);
              const saved = loadPendingInput(catalogId);
              generateSingleReport(catalogId, saved, orderId)
                .then((reportId) => {
                  clearPendingInput(catalogId);
                  router.replace(`/${locale}/report/${reportId}`);
                })
                .catch((err: unknown) => {
                  setGenerating(false);
                  setErrorMsg(err instanceof Error ? err.message : "리포트 생성 중 오류가 발생했습니다.");
                });
            }}
            className="w-full py-3.5 bg-coral text-white font-bold rounded-2xl shadow-sm hover:opacity-95 transition-all"
          >
            다시 시도하기
          </button>
        </div>
      ) : product?.tier === "premium" ? (
        <div className="w-full max-w-2xl mx-auto py-8">
          <PremiumGenerating />
        </div>
      ) : (
        <FortuneLoading
          steps={LOADING_STEPS}
          skeletonVariant="deep-report"
          subMessage={generating ? "리포트를 작성하고 있어요" : "사주 기운을 심층 분석하고 있어요"}
        />
      )}
    </div>
  );
}
