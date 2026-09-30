import React from "react";
import Image from "next/image";

// 홈 상단 한 줄 배너. 예전 큰 히어로(두근이 230px + 버튼 2개)가 첫 화면을 다 차지해
// "궁합·총운만 하는 곳"으로 보였다 → 무엇이 있는지부터 알린다. 궁합 시작 버튼은 하단 고정(HomeStickyCta).
export default function HomeHeroCompact({ total }: { total: number }) {
  return (
    <section className="w-full bg-gradient-to-b from-[#FFE3EA] to-[#FFF1F4]">
      <div className="max-w-[480px] mx-auto px-4 pt-5 pb-4 flex items-center gap-3">
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
            궁합부터 속궁합, 매운맛 운세까지
          </h1>
          <p className="text-xs font-semibold text-coral-deep mt-0.5">
            사주 풀이 {total}가지 · 모두 무료 미리보기
          </p>
        </div>
      </div>
    </section>
  );
}
