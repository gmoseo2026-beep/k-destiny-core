import React from "react";
import Image from "next/image";
import { shouldDisplayVisitorPill } from "@/lib/home/visitors";

// 비회원 홈 맨 위 한 줄: "벌써 N명이 함께했어요".
// 광고로 처음 온 사람이 가장 먼저 보는 자리에 "이미 사람들이 있다"는 신호를 둔다(2026-10-09 사장님 결정 — A안).
// 숫자는 SiteCounter "visitors"(같은 기기는 한 번만 센 방문 수) 그대로다. 꾸미거나 올려 적지 않는다.
// 자세한 설명(언제부터·어떻게 세는지)은 홈 아래 VisitorSection 에 있다.
const FACES = ["expr_1_simkoong", "expr_3_flutter", "doogeun_cat_canon"] as const;

export default function VisitorPill({ count }: { count: number }) {
  if (!shouldDisplayVisitorPill(count)) return null;
  return (
    <div className="flex justify-center px-4 pt-3.5">
      <div className="inline-flex items-center gap-2 rounded-full border border-coral/30 bg-white py-1 pl-1.5 pr-3.5 shadow-[0_4px_14px_rgba(255,92,119,0.16)]">
        <span className="flex" aria-hidden>
          {FACES.map((name, i) => (
            <Image
              key={name}
              src={`/mascot/transparent/${name}.webp`}
              alt=""
              width={24}
              height={24}
              className={`h-6 w-6 rounded-full border-2 border-white bg-[#FFE3EA] object-cover ${i === 0 ? "" : "-ml-2.5"}`}
            />
          ))}
        </span>
        <span className="text-[13px] font-bold tracking-tight text-ink">
          벌써 <b className="font-black text-coral">{count.toLocaleString("ko-KR")}명</b>이 함께했어요
        </span>
      </div>
    </div>
  );
}
