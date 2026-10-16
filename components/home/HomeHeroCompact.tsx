"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import VisitorPill from "@/components/home/VisitorPill";
import { trackEvent } from "@/lib/gtag";

// 홈 상단 한 줄 배너. 예전 큰 히어로(두근이 230px + 버튼 2개)가 첫 화면을 다 차지해
// "궁합·총운만 하는 곳"으로 보였다 → 무엇이 있는지부터 알리고 바로가기 2개를 한 줄로 둔다.
export default function HomeHeroCompact({
  total,
  visitorCount = 0,
  locale = "ko",
}: {
  total: number;
  visitorCount?: number;
  locale?: string;
}) {
  return (
    <section className="w-full bg-gradient-to-b from-[#FFE3EA] to-[#FFF1F4]">
      {/* 이 머리말은 비회원에게만 그려진다(app/[locale]/page.tsx) → 방문 수 한 줄도 로그인 전에만 보인다 */}
      <VisitorPill count={visitorCount} />
      <div className="max-w-[480px] mx-auto px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 relative shrink-0">
            <Image
              src="/mascot/transparent/couple_red_thread.webp"
              alt=""
              fill
              sizes="56px"
              className="object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-ink tracking-tight leading-snug text-balance">
              그 사람 속마음부터 둘만의 속궁합까지
            </h1>
            <p className="text-xs font-semibold text-coral-deep mt-0.5">
              생년월일만 넣으면 30초 · {total}가지 무료 미리보기
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3.5">
          <Link
            href={`/${locale}/compat/new`}
            onClick={() =>
              trackEvent("home_hero_cta_click", {
                target: "compat_new",
                productId: "compat_basic",
                position: 1,
              })
            }
            className="flex items-center justify-center rounded-xl bg-coral py-2.5 px-2 text-xs font-extrabold text-white whitespace-nowrap shadow-2xs transition-all active:scale-[0.96]"
          >
            우리 궁합 무료로 보기
          </Link>
          <Link
            href={`/${locale}/fortune/annual?year=2027`}
            onClick={() =>
              trackEvent("home_hero_cta_click", {
                target: "annual_2027",
                productId: "annual_2027",
                position: 2,
              })
            }
            className="flex items-center justify-center rounded-xl border border-coral/30 bg-white py-2.5 px-2 text-xs font-extrabold text-ink whitespace-nowrap shadow-2xs transition-all active:scale-[0.96]"
          >
            2027 신년운 미리보기
          </Link>
        </div>
      </div>
    </section>
  );
}
