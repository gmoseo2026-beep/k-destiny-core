import React from "react";
import Image from "next/image";

export default function BrandStory() {
  return (
    <section className="w-full max-w-[480px] mx-auto px-4 mt-12 mb-10">
      <div className="bg-gradient-to-b from-[#FFF5F7] to-[#FFEBF1] rounded-3xl p-6 border border-[#FFD6E2] text-center shadow-xs">
        {/* Title */}
        <p className="text-xs font-bold text-coral-deep tracking-wider uppercase mb-1">
          두근이의 이야기
        </p>
        <h2 className="text-base sm:text-lg font-extrabold text-ink mb-3 tracking-tight">
          두근이가 두 사람 마음을 살짝 재 봤어요
        </h2>

        {/* Mascot */}
        <div className="relative w-36 h-36 mx-auto my-3">
          <Image
            src="/mascot/transparent/couple_red_thread.webp"
            alt="두근이 커플"
            width={144}
            height={144}
            className="object-contain w-full h-full drop-shadow-sm"
          />
        </div>

        {/* 3 Interactive Chips (aria-hidden for screen readers) */}
        <div
          aria-hidden="true"
          className="flex items-center justify-center gap-2 my-3 select-none flex-wrap"
        >
          <span className="bg-white/90 text-coral-deep text-xs font-bold px-3 py-1 rounded-full border border-coral-soft shadow-2xs">
            설렘 +5 ✨
          </span>
          <span className="bg-white/90 text-plum-deep text-xs font-bold px-3 py-1 rounded-full border border-[#E8DCE5] shadow-2xs">
            배려 +3 🌿
          </span>
          <span className="bg-white/90 text-[#C98A0B] text-xs font-bold px-3 py-1 rounded-full border border-[#FBEEC8] shadow-2xs">
            티키타카 +2 💬
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-text-2 leading-relaxed max-w-xs mx-auto mt-3">
          점수는 두 사람의 생년월일로 정해져요.<br />
          같은 두 사람이면 언제나 같은 결과가 나와요.
        </p>
      </div>
    </section>
  );
}
