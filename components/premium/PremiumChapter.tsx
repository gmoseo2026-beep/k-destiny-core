import React from "react";

interface PremiumChapterProps {
  id?: string;
  number: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function PremiumChapter({
  id,
  number,
  title,
  subtitle,
  children,
  className = "",
}: PremiumChapterProps) {
  return (
    <section id={id} className={`premium-chapter py-10 md:py-14 border-t border-[#3A2E45]/80 scroll-mt-24 ${className}`}>
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-sm font-bold text-[#D9B26A] bg-[#1E1726] border border-[#D9B26A]/40 px-2.5 py-0.5 rounded-full">
            {number}
          </span>
          <div className="h-px flex-grow bg-gradient-to-r from-[#D9B26A]/40 via-[#3A2E45] to-transparent" />
        </div>
        <h2 className="font-serif-kr text-xl sm:text-2xl font-bold text-[#F6F1EA] tracking-tight mb-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-[#B9AEC4] leading-relaxed font-normal">
            {subtitle}
          </p>
        )}
      </header>

      <div className="space-y-6 text-[#F6F1EA]/90 leading-relaxed text-sm sm:text-base font-normal">
        {children}
      </div>
    </section>
  );
}
