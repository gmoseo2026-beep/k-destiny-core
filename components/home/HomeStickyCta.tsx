"use client";

// 홈 하단 고정 "우리 궁합 무료로 보기". 상단 히어로를 줄이면서 가장 많이 쓰이는 입구를 늘 보이게 둔다.
// 푸터(사업자 정보)가 화면에 들어오면 가리지 않도록 아래로 숨긴다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/gtag";

export default function HomeStickyCta({ locale }: { locale: string }) {
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { threshold: 0 });
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  return (
    <div
      aria-hidden={footerVisible}
      className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-line px-4 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom,0px))] transition-transform duration-200 ${
        footerVisible ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <Link
        href={`/${locale}/compat/new`}
        tabIndex={footerVisible ? -1 : 0}
        onClick={() => trackEvent("home_card_click", { section: "sticky_cta", position: 1, productId: "compat_basic", tab: "-" })}
        className="mx-auto flex max-w-[448px] items-center justify-center rounded-2xl bg-coral py-3.5 text-[15px] font-extrabold text-white shadow-[0_6px_16px_rgba(224,36,90,0.25)] active:scale-[0.96] transition-all"
      >
        우리 궁합 무료로 보기
      </Link>
    </div>
  );
}
