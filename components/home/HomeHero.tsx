import React from "react";
import Image from "next/image";
import Link from "next/link";

interface HomeHeroProps {
  locale: string;
}

export default function HomeHero({ locale }: HomeHeroProps) {
  return (
    <section className="relative w-full bg-hero-gradient pt-16 pb-10 px-4 flex flex-col items-center text-center overflow-hidden">
      {/* Decorative gentle glow background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FFE3EA] to-[#FFC7D4] -z-10" />

      {/* Main Copy */}
      <p className="text-xs sm:text-sm font-bold text-coral-deep tracking-wider uppercase mb-2">
        사주로 보는 우리 사이
      </p>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight mb-3">
        마음이 <span className="text-coral">콩닥</span>
      </h1>
      <p className="text-xs sm:text-sm text-text-2 leading-relaxed max-w-xs sm:max-w-sm mb-6">
        타고난 기운으로 읽는 두 사람의 진짜 마음<br />
        30초 만에 확인하는 우리 사이 궁합과 케미
      </p>

      {/* Hero Mascot: Couple Red Thread (250px, priority) */}
      <div className="relative w-[230px] h-[230px] sm:w-[250px] sm:h-[250px] my-2 transition-transform duration-300 hover:scale-105">
        <Image
          src="/mascot/transparent/couple_red_thread.webp"
          alt="두근이 커플"
          width={250}
          height={250}
          priority
          className="object-contain w-full h-full drop-shadow-[0_12px_24px_rgba(224,36,90,0.15)]"
        />
      </div>

      {/* CTAs */}
      <div className="w-full max-w-xs flex flex-col gap-2.5 mt-5">
        <Link
          href={`/${locale}/compat/new`}
          className="w-full h-13 sm:h-14 bg-coral hover:bg-coral-deep text-white font-bold text-base rounded-2xl shadow-[0_8px_20px_rgba(224,36,90,0.25)] flex items-center justify-center transition-all duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 ring-coral"
        >
          우리 궁합 무료로 보기
        </Link>
        <Link
          href={`/${locale}/fortune/annual`}
          className="w-full h-11 bg-white/90 hover:bg-white text-plum-deep border border-line font-bold text-sm rounded-2xl shadow-xs flex items-center justify-center transition-all duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 ring-plum-deep"
        >
          2026 총운 보기
        </Link>
      </div>
    </section>
  );
}
