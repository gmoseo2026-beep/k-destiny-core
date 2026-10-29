"use client";

import React, { useRef } from "react";
import { Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/gtag";
import { useSeenOnce } from "@/lib/useSeenOnce";
import type {
  CharmBadgeId,
  SajuCellDisplay,
  SajuCellElement,
  SajuDisplayPerson,
  SajuElementKey,
} from "@/lib/sajuDisplay";

interface SajuEightCharCardProps {
  people: SajuDisplayPerson[];
  source: string;
  className?: string;
}

const CELL_STYLE: Record<
  SajuCellElement,
  { box: string; dot: string; sub: string; text: string }
> = {
  wood: {
    box: "border-emerald-400/35 bg-emerald-500/[0.12]",
    dot: "bg-emerald-400",
    sub: "text-emerald-300/90",
    text: "text-emerald-50",
  },
  fire: {
    box: "border-[#FF5C77]/40 bg-[#FF5C77]/[0.14]",
    dot: "bg-[#FF5C77]",
    sub: "text-[#FF9EB0]",
    text: "text-[#FFF0F3]",
  },
  earth: {
    box: "border-[#FFC24B]/40 bg-[#FFC24B]/[0.13]",
    dot: "bg-[#FFC24B]",
    sub: "text-[#FFD685]",
    text: "text-[#FFF8E6]",
  },
  metal: {
    box: "border-slate-300/35 bg-slate-200/[0.10]",
    dot: "bg-slate-200",
    sub: "text-slate-300",
    text: "text-slate-50",
  },
  water: {
    box: "border-sky-400/40 bg-sky-500/[0.13]",
    dot: "bg-sky-400",
    sub: "text-sky-300",
    text: "text-sky-50",
  },
  unknown: {
    box: "border-white/[0.08] bg-white/[0.03]",
    dot: "bg-white/25",
    sub: "text-[#8E7D96]",
    text: "text-[#9E8EA6]",
  },
};

const BAR_FILL_STYLE: Record<SajuElementKey, string> = {
  wood: "bg-emerald-400",
  fire: "bg-[#FF5C77]",
  earth: "bg-[#FFC24B]",
  metal: "bg-slate-200",
  water: "bg-sky-400",
};

const BADGE_STYLE: Record<CharmBadgeId, string> = {
  dohwa:
    "border-[#FF5C77]/45 bg-[#FF5C77]/15 text-[#FFB3C1]",
  hongyeom:
    "border-[#FFC24B]/45 bg-[#FFC24B]/15 text-[#FFE099]",
  yeokma:
    "border-sky-400/45 bg-sky-500/15 text-sky-200",
};

function EightCharCell({ cell }: { cell: SajuCellDisplay }) {
  const style = CELL_STYLE[cell.element];
  const isUnknown = cell.element === "unknown";

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border px-1.5 py-2 text-center transition-colors ${style.box}`}
    >
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold leading-none ${style.sub}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
        <span>{isUnknown ? "시간" : cell.elementLabel}</span>
      </span>
      <span className={`mt-1 text-xs font-extrabold leading-tight break-keep ${style.text}`}>
        {cell.label}
      </span>
    </div>
  );
}

export default function SajuEightCharCard({
  people,
  source,
  className = "",
}: SajuEightCharCardProps) {
  const validPeople = people.filter((p) => Boolean(p?.card));
  const cardRef = useRef<HTMLDivElement>(null);

  useSeenOnce(
    cardRef,
    () => {
      trackEvent("saju_card_view", {
        source,
        person_count: validPeople.length,
      });
      for (const person of validPeople) {
        for (const badge of person.card.badges) {
          trackEvent("charm_badge_view", {
            badge: badge.label,
            badge_id: badge.id,
            source,
          });
        }
      }
    },
    validPeople.length > 0,
  );

  if (validPeople.length === 0) return null;

  const isCouple = validPeople.length >= 2;

  return (
    <section
      ref={cardRef}
      aria-label="타고난 여덟 글자 기운 카드"
      className={`w-full rounded-3xl border border-white/[0.10] bg-[#22142A] p-4 sm:p-5 text-left shadow-[0_10px_28px_rgba(0,0,0,0.28)] ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="h-4 w-4 text-[#FFC24B] shrink-0" />
          <h3 className="text-sm font-black text-[#F6EEF3] truncate">
            {isCouple ? "두 사람의 타고난 여덟 글자" : "타고난 여덟 글자와 기운"}
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-[#B9A9BF] shrink-0">
          태어난 날의 실제 기운
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {validPeople.map((person, idx) => {
          const { card } = person;
          const displayName = person.name?.trim() || (idx === 0 ? "나" : "그 사람");

          return (
            <div
              key={`${displayName}-${idx}`}
              className={
                isCouple
                  ? "rounded-2xl border border-white/[0.08] bg-[#140B18]/80 p-3.5"
                  : "rounded-2xl border border-white/[0.07] bg-[#140B18]/70 p-3.5"
              }
            >
              {/* 이름 및 매력 기운 배지 (있을 때만 노출) */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
                <span className="inline-flex items-center rounded-full bg-white/[0.08] px-2.5 py-0.5 text-xs font-extrabold text-[#F6EEF3]">
                  {displayName}
                </span>
                {!card.timeKnown && (
                  <span className="text-[10px] font-semibold text-[#8E7D96]">
                    태어난 시간 미입력 · 6글자 기준
                  </span>
                )}
              </div>

              {card.badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {card.badges.map((badge) => (
                    <span
                      key={badge.id}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-extrabold leading-none ${BADGE_STYLE[badge.id]}`}
                    >
                      <span aria-hidden>✦</span>
                      <span>{badge.label}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* 8칸 (연·월·일·시 × 위·아래) */}
              <div className="grid grid-cols-4 gap-1.5">
                {card.pillars.map((pillar) => (
                  <div key={pillar.slot} className="flex flex-col gap-1.5">
                    <span
                      className={`text-center text-[10px] font-extrabold ${
                        pillar.slot === "day" ? "text-[#FF8AA1]" : "text-[#B9A9BF]"
                      }`}
                    >
                      {pillar.slotLabel}
                    </span>
                    <EightCharCell cell={pillar.top} />
                    <EightCharCell cell={pillar.bottom} />
                  </div>
                ))}
              </div>

              {/* 다섯 기운 막대 (나무·불·흙·쇠·물 개수) */}
              <div className="mt-3 pt-2.5 border-t border-white/[0.07]">
                <div className="grid grid-cols-5 gap-1.5">
                  {card.elements.map((el) => {
                    const fillRatio = Math.min(
                      1,
                      el.count / card.totalKnownChars,
                    );
                    return (
                      <div
                        key={el.key}
                        className="flex flex-col gap-1 rounded-xl bg-white/[0.03] px-2 py-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px] leading-none">
                          <span className="font-bold text-[#B9A9BF]">{el.label}</span>
                          <span className="font-black text-[#F6EEF3] tabular-nums">
                            {el.count}개
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                          <div
                            className={`h-full rounded-full transition-all ${BAR_FILL_STYLE[el.key]}`}
                            style={{
                              width: el.count === 0 ? "0%" : `${Math.max(18, Math.round(fillRatio * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
