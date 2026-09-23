import React from "react";

export interface TocItem {
  id: string;
  number: string;
  title: string;
}

interface PremiumTocProps {
  items: TocItem[];
}

export function PremiumToc({ items }: PremiumTocProps) {
  return (
    <nav className="py-8 my-6 px-6 rounded-2xl bg-[#1E1726]/60 border border-[#3A2E45]/80">
      <h2 className="text-xs font-semibold tracking-[0.2em] text-[#D9B26A] uppercase mb-4 text-center">
        TABLE OF CONTENTS · 목차
      </h2>
      <ul className="divide-y divide-[#3A2E45]/40 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="flex items-center justify-between py-3 px-2 rounded-lg text-[#F6F1EA] hover:text-[#F3E3BF] hover:bg-[#3A2E45]/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-[#D9B26A] font-medium w-6">
                  {item.number}
                </span>
                <span className="font-serif-kr text-sm sm:text-base group-hover:translate-x-1 transition-transform">
                  {item.title}
                </span>
              </div>
              <span className="text-[#3A2E45] group-hover:text-[#D9B26A] transition-colors text-xs">
                →
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
