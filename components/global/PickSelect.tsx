"use client";

// 외국어 궁합 화면 전용 선택 상자. 휴대폰 기본 <select> 는 안드로이드가 "이전·다음·완료"를
// 폰 언어(한국어 폰이면 한국어)로 띄우므로, 화면 안에 직접 그린 아래쪽 시트로 고른다.
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

export interface PickOption {
  value: string;
  label: string;
}

interface PickSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: PickOption[];
  placeholder: string;
  /** 시트 제목·스크린리더용 이름 */
  label: string;
  closeLabel: string;
  disabled?: boolean;
  /** 아직 고르지 않았을 때 시트를 열면 이 값 근처로 스크롤(예: 연도 1995) */
  scrollHint?: string;
  className?: string;
}

export default function PickSelect({
  value,
  onChange,
  options,
  placeholder,
  label,
  closeLabel,
  disabled,
  scrollHint,
  className = "",
}: PickSelectProps) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const target = value || scrollHint;
    const el = target ? listRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(target)}"]`) : null;
    el?.scrollIntoView({ block: "center" });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, value, scrollHint]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label ?? placeholder}`}
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-between gap-1 rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-left disabled:opacity-40 focus:outline-none focus:border-[#FF5C77] ${
          current ? "text-[#2B2430]" : "text-text-3"
        } ${className}`}
      >
        <span className="truncate">{current?.label ?? placeholder}</span>
        <ChevronDown className="w-4 h-4 shrink-0 text-text-3" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={label}>
          <button
            type="button"
            aria-label={closeLabel}
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-t-3xl bg-white pb-[max(12px,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-sm font-black text-[#2B2430]">{label}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 rounded-full bg-[#FFF0F3] px-3 py-1.5 text-xs font-extrabold text-[#E0245A]"
              >
                <X className="w-3.5 h-3.5" />
                {closeLabel}
              </button>
            </div>
            <div ref={listRef} role="listbox" aria-label={label} className="max-h-[55vh] overflow-y-auto px-3 pb-2">
              {options.map((o) => {
                const selected = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-value={o.value}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`w-full rounded-xl px-4 py-3 text-left text-base font-bold ${
                      selected ? "bg-[#FFE8EE] text-[#E0245A]" : "text-[#2B2430] hover:bg-[#FFF6F1]"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
