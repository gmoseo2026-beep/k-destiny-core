"use client";

import React, { useState, useEffect, useRef } from "react";
import { Share2 } from "lucide-react";
import { formatStartedAt, shouldDisplayVisitorCounter } from "@/lib/home/visitors";
import { trackEvent } from "@/lib/gtag";

interface VisitorSectionProps {
  count: number;
  startedAt: string | Date; // ISO string or Date
}

export default function VisitorSection({ count, startedAt }: VisitorSectionProps) {
  const shouldDisplay = shouldDisplayVisitorCounter(count);
  const [displayNumber, setDisplayNumber] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);

  const dateObj = typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  const dateFormatted = formatStartedAt(dateObj);

  useEffect(() => {
    if (!shouldDisplay) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      const raf = requestAnimationFrame(() => setDisplayNumber(count));
      return () => cancelAnimationFrame(raf);
    }

    // IntersectionObserver to animate when entering viewport
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true;
          const duration = 1000; // 1 second
          const start = 0;
          const startTime = performance.now();

          const step = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            // Ease-out quad
            const easeProgress = 1 - (1 - progress) * (1 - progress);
            const current = Math.floor(start + (count - start) * easeProgress);
            setDisplayNumber(current);

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              setDisplayNumber(count);
            }
          };

          requestAnimationFrame(step);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [count, shouldDisplay]);

  // 문턱 미만(1,000명 미만)이면 전체 숨김
  if (!shouldDisplay) {
    return null;
  }

  const handleShare = async () => {
    trackEvent("share_click", { location: "visitor_counter" });

    const shareData = {
      title: "콩닥 — 마음이 콩닥",
      text: "사주로 보는 우리 사이, 마음이 콩닥",
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Share cancelled or failed silently
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        setToastMessage("링크가 복사되었습니다!");
        setTimeout(() => setToastMessage(null), 2500);
      } catch {
        setToastMessage("링크 복사에 실패했습니다.");
        setTimeout(() => setToastMessage(null), 2500);
      }
    }
  };

  return (
    <section
      ref={sectionRef}
      className="w-full max-w-[480px] mx-auto px-4 mt-12 text-center"
    >
      <div className="bg-surface rounded-3xl p-6 border border-line">
        <p className="text-xs font-bold text-caption tracking-wider uppercase mb-1.5">
          콩닥과 함께 두근거린 사람
        </p>

        {/* 40px 900 Bold Number */}
        <div className="text-[38px] sm:text-[42px] font-black text-ink leading-tight tracking-tight my-1">
          {displayNumber.toLocaleString("ko-KR")}
          <span className="text-2xl sm:text-3xl font-extrabold text-coral ml-1">명</span>
        </div>

        {/* Honest Caption */}
        <p className="text-[11px] sm:text-xs text-caption mt-2 leading-relaxed">
          <strong className="font-bold text-ink">{dateFormatted}</strong>부터 방문한 분 · 같은 기기는 한 번만 세요
        </p>

        {/* Share Button */}
        <div className="mt-4 pt-4 border-t border-line/60 flex justify-center">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-surface-soft text-ink border border-line rounded-full text-xs font-bold shadow-2xs transition-all duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 ring-coral"
          >
            <Share2 className="w-3.5 h-3.5 text-coral" />
            <span>친구에게 콩닥 알려주기</span>
          </button>
        </div>

        {toastMessage && (
          <div className="mt-2 text-xs font-bold text-coral animate-in fade-in duration-200">
            {toastMessage}
          </div>
        )}
      </div>
    </section>
  );
}
