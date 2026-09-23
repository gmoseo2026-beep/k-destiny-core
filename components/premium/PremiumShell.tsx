import React from "react";

interface PremiumShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PremiumShell({ children, className = "" }: PremiumShellProps) {
  return (
    <article
      className={`premium-shell max-w-2xl mx-auto rounded-3xl border border-[#D9B26A]/30 bg-[#14101A] text-[#F6F1EA] shadow-2xl overflow-hidden p-6 sm:p-10 ${className}`}
      style={{
        boxShadow: "0 25px 50px -12px rgba(20, 16, 26, 0.7), 0 0 40px rgba(217, 178, 106, 0.08)",
      }}
    >
      {children}
    </article>
  );
}
