import React from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

export default function TrustBanner() {
  return (
    <section className="w-full bg-plum-deep text-white py-3.5 px-4 border-y border-[#4E2A45]/40 shadow-inner">
      <div className="max-w-[480px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-4 text-center">
        <div className="flex items-center gap-1.5 text-xs text-[#F2D08F] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#F2D08F] shrink-0" />
          <span>비회원 궁합·운세는 생년월일을 저장하지 않아요</span>
        </div>
        <span className="hidden sm:inline text-white/30 text-xs">·</span>
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-white/80 font-medium">
          <CheckCircle2 className="w-3 h-3 text-white/60 shrink-0" />
          <span>같은 생일이면 언제 봐도 같은 점수 · 결제 후 90일 보관</span>
        </div>
      </div>
    </section>
  );
}
