"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import FortuneLoading from "@/components/FortuneLoading";
import StandardReportView from "@/components/report/StandardReportView";
import type { StandardReport } from "@/lib/reports/standard";
import { getProduct } from "@/lib/catalog";
import { trackEvent } from "@/lib/gtag";
import { AlertCircle, Lock, Home, Link2, Check } from "lucide-react";

interface ReportViewClientProps {
  locale: string;
  reportId: string;
}

interface ReportResponse {
  reportId: string;
  catalogId: string;
  score: number;
  data: StandardReport;
}

function getAllOrderTokens(): string[] {
  if (typeof window === "undefined") return [];
  const tokens: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("kongdak_order_")) {
        const val = localStorage.getItem(key);
        if (val && !tokens.includes(val)) {
          tokens.push(val);
        }
      }
    }
  } catch {
    // Ignore storage errors
  }
  return tokens;
}

const LOADING_STEPS = [
  "태어난 날의 기운을 차근차근 읽고 있어요",
  "타고난 흐름과 균형을 살펴보고 있어요",
  "나에게 맞는 맞춤형 심층 리포트를 작성하고 있어요",
  "거의 다 완성되었어요! 잠시만 기다려주세요",
];

export default function ReportViewClient({
  locale,
  reportId,
}: ReportViewClientProps) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchReportRef = useRef<() => Promise<void>>(async () => {});

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    setErrorMessage(null);

    const tokens = getAllOrderTokens();
    const candidateTokens: Array<string | null> = [null, ...tokens];

    let lastError = "리포트를 불러올 수 없습니다.";
    let lastStatus = 403;

    for (const token of candidateTokens) {
      try {
        const res = await fetch("/api/reports/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportId,
            orderId: token || undefined,
          }),
        });

        if (res.status === 200) {
          const json: ReportResponse = await res.json();
          setReportData(json);
          setLoading(false);
          const p = getProduct(json.catalogId);
          trackEvent("report_generated", {
            productId: json.catalogId,
            tier: p?.tier || "standard",
          });
          return;
        }

        if (res.status === 202) {
          // GENERATING — retry after 3s via ref
          setTimeout(() => {
            fetchReportRef.current();
          }, 3000);
          return;
        }

        lastStatus = res.status;
        const errJson = await res.json().catch(() => ({}));
        if (errJson.error) lastError = errJson.error;
      } catch {
        // Continue to try other tokens
      }
    }

    setLoading(false);
    setErrorCode(lastStatus);
    setErrorMessage(lastError);
  }, [reportId]);

  useEffect(() => {
    fetchReportRef.current = fetchReport;
  }, [fetchReport]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) fetchReport();
    });
    return () => {
      active = false;
    };
  }, [fetchReport]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <FortuneLoading steps={LOADING_STEPS} skeletonVariant="deep-report" />;
  }

  if (errorCode || !reportData) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-3xl p-8 border border-plum/10 shadow-sm text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-coral flex items-center justify-center mx-auto mb-4">
          {errorCode === 402 ? <Lock className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">
          {errorCode === 402
            ? "결제가 완료되지 않았어요"
            : errorCode === 403
            ? "열람 권한이 없어요"
            : "리포트를 찾을 수 없어요"}
        </h2>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          {errorMessage || "결제한 기기에서 열람하거나 로그인해 주세요."}
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={fetchReport}
            className="w-full py-3.5 bg-coral text-white font-bold rounded-2xl shadow-sm hover:opacity-95 transition-all"
          >
            다시 시도하기
          </button>
          <Link
            href={`/${locale}`}
            className="w-full py-3 bg-cream text-plum font-bold rounded-2xl hover:bg-cream/80 transition-all text-center text-sm"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    );
  }

  const product = getProduct(reportData.catalogId);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-6 pb-12">
      {/* Product Name Header */}
      {product && (
        <div className="text-center -mb-2">
          <span className="text-xs font-bold text-coral bg-coral/10 px-3 py-1 rounded-full">
            {product.name}
          </span>
        </div>
      )}

      {/* Full Report View */}
      <StandardReportView
        mode="full"
        score={reportData.score}
        data={reportData.data}
      />

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5 mt-2">
        <button
          type="button"
          onClick={handleCopyLink}
          className="w-full py-3.5 bg-white border border-plum/10 text-ink font-bold rounded-2xl shadow-xs hover:bg-cream transition-all flex items-center justify-center gap-2 text-sm"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4 text-coral" />}
          <span>{copied ? "링크가 복사되었어요!" : "리포트 링크 복사하기"}</span>
        </button>
        <Link
          href={`/${locale}`}
          className="w-full py-3.5 bg-cream text-plum font-bold rounded-2xl hover:bg-cream/80 transition-all text-center text-sm flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>다른 운세·궁합 보러가기</span>
        </Link>
      </div>
    </div>
  );
}
