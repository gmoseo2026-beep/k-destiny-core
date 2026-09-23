"use client";

import React, { useState } from "react";

export function PrintButton() {
  const [showTooltip, setShowTooltip] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="no-print relative inline-block">
      <button
        type="button"
        onClick={handlePrint}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#14101A] bg-gradient-to-r from-[#F3E3BF] via-[#D9B26A] to-[#A8823C] hover:opacity-95 shadow-md transition-all active:scale-95"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
        <span>PDF로 저장하기</span>
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 bg-[#1E1726] border border-[#D9B26A]/40 text-[#F6F1EA] text-xs rounded-lg shadow-xl text-center pointer-events-none z-50">
          인쇄 창 대상에서 <strong>&apos;PDF로 저장&apos;</strong>을 선택하세요
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1E1726]" />
        </div>
      )}
    </div>
  );
}
