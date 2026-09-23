import React from "react";

interface PremiumBadgeProps {
  text?: string;
  className?: string;
}

export function PremiumBadge({ text = "KONGDAK PREMIUM", className = "" }: PremiumBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border border-[#D9B26A]/40 bg-[#1E1726]/80 text-[#F3E3BF] shadow-sm ${className}`}
      style={{
        boxShadow: "0 0 12px rgba(217, 178, 106, 0.15)",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#D9B26A] animate-pulse" />
      <span className="premium-gold-text font-bold tracking-widest">{text}</span>
    </span>
  );
}
