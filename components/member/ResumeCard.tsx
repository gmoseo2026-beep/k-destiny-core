"use client";

// 미리보기만 보고 결제하지 않은 회원에게 "지난번에 보던 것"을 바로 이어 준다(/api/user/resume).
// 없으면 아무것도 그리지 않는다. GA4: resume_card_view { count, source } · resume_card_click { productId, kind, source }
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getProductCover } from "@/lib/catalog";
import { trackEvent } from "@/lib/gtag";

interface ResumeEntry {
  kind: "teaser" | "compat";
  catalogId: string;
  href: string;
  name: string;
  hook: string;
  icon3d: string;
}

export default function ResumeCard({ locale, source, className = "" }: { locale: string; source: "home" | "me"; className?: string }) {
  const [items, setItems] = useState<ResumeEntry[]>([]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/user/resume?locale=${locale}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive || !Array.isArray(j?.items) || j.items.length === 0) return;
        setItems(j.items as ResumeEntry[]);
        trackEvent("resume_card_view", { count: j.items.length, source });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [locale, source]);

  if (items.length === 0) return null;

  return (
    <section className={`w-full rounded-2xl border border-[#FF5C77]/30 bg-[#22142A] p-4 ${className}`} aria-label="지난번에 보던 것">
      <h2 className="text-sm font-extrabold text-[#F6EEF3]">지난번에 보던 것, 이어서 볼까요?</h2>
      <div className="mt-2.5 flex flex-col gap-2">
        {items.map((it) => (
          <Link
            key={`${it.kind}:${it.catalogId}`}
            href={it.href}
            prefetch={false}
            onClick={() => trackEvent("resume_card_click", { productId: it.catalogId, kind: it.kind, source })}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#140B18] p-3 text-left transition-all active:scale-[0.98]"
          >
            <div className="relative h-[56px] w-[42px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#22142A]">
              <Image src={getProductCover(it.catalogId)} alt="" fill sizes="42px" className="object-cover" />
            </div>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-[#F6EEF3]">{it.name}</span>
              <span className="block truncate text-xs text-[#B9A9BF]">{it.hook}</span>
            </span>
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-[#FF5C77]">
              이어보기
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
