"use client";

import { useState } from "react";

export interface PartnerShareItem {
  partner: string;
  name: string;
  rsRate: number | null;
  codeCount: number;
  shareUrl: string | null;
}

export default function PartnerShareLinks({ items }: { items: PartnerShareItem[] }) {
  const [copiedPartner, setCopiedPartner] = useState<string | null>(null);

  const handleCopy = async (partner: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPartner(partner);
      window.setTimeout(() => {
        setCopiedPartner((prev) => (prev === partner ? null : prev));
      }, 2000);
    } catch {
      // 클립보드 권한이 막힌 환경 대비
      window.prompt("아래 제휴사 공유 주소를 복사해 주세요.", url);
    }
  };

  const missingSecret = items.some((i) => !i.shareUrl);

  return (
    <section className="rounded-2xl border border-[#2B2430]/10 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-black text-ink">제휴사별 성과 화면 공유 (읽기 전용)</h2>
          <p className="mt-0.5 text-xs text-ink/60">
            제휴사에게 전달하면 해당 파트너의 코드만 모아서 기간별(이번 달·지난달·전체) 클릭·가입·결제·정산 기준 금액을 볼 수 있습니다.
          </p>
        </div>
        {missingSecret && (
          <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
            서버에 PARTNER_REPORT_SECRET 설정 필요
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => {
          const isCopied = copiedPartner === item.partner;
          return (
            <div
              key={item.partner}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#2B2430]/10 bg-[#FFF6F1]/60 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink">{item.name}</span>
                  <span className="font-mono text-xs text-ink/50">({item.partner})</span>
                  {typeof item.rsRate === "number" && item.rsRate > 0 && (
                    <span className="rounded-full bg-[#FF5C77]/15 px-2 py-0.5 text-[11px] font-bold text-[#6A2C70]">
                      RS {Math.round(item.rsRate * 100)}%
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ink/60">연결된 코드 {item.codeCount}개</p>
              </div>

              {item.shareUrl ? (
                <button
                  type="button"
                  onClick={() => handleCopy(item.partner, item.shareUrl!)}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    isCopied
                      ? "bg-[#6A2C70] text-white"
                      : "bg-[#2B2430] text-white hover:bg-[#2B2430]/90"
                  }`}
                >
                  {isCopied ? "복사됨 ✓" : "제휴사 공유 주소 복사"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="shrink-0 cursor-not-allowed rounded-xl border border-[#2B2430]/15 bg-white/70 px-3.5 py-2 text-xs font-semibold text-ink/40"
                >
                  제휴사 공유 주소 복사
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
