"use client";

import { useState } from "react";
import {
  rateLabel,
  type PartnerPeriodKey,
  type PartnerReportViewData,
} from "@/lib/campaignStats";

const PERIOD_TABS: Array<{ key: PartnerPeriodKey; label: string }> = [
  { key: "this_month", label: "이번 달" },
  { key: "last_month", label: "지난달" },
  { key: "all", label: "전체" },
];

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default function PartnerReportClient({
  data,
  initialPeriod = "this_month",
}: {
  data: PartnerReportViewData;
  initialPeriod?: PartnerPeriodKey;
}) {
  const [period, setPeriod] = useState<PartnerPeriodKey>(initialPeriod);
  const current = data.periods[period];
  const hasRs = typeof data.rsRate === "number" && data.rsRate > 0;
  const rsPercent = hasRs && data.rsRate ? Math.round(data.rsRate * 100) : null;

  const th = "px-3 py-2.5 text-left text-[11px] font-bold text-[#2B2430]/60 whitespace-nowrap";
  const td = "px-3 py-2.5 text-sm text-[#2B2430] whitespace-nowrap";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10 space-y-6">
      {/* 상단 제목 및 기간 탭 */}
      <header className="rounded-2xl border border-[#2B2430]/10 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#FFF6F1] px-3 py-1 text-xs font-bold text-[#6A2C70]">
              제휴 성과 리포트 (읽기 전용)
            </span>
            <h1 className="mt-2 text-xl sm:text-2xl font-black text-[#2B2430]">
              {data.partnerName} · 제휴 유입 및 정산 현황
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#2B2430]/65">
              조회 기간: <strong className="font-bold text-[#2B2430]">{current.rangeLabel}</strong> (한국 시간 기준)
            </p>
          </div>

          <div
            role="tablist"
            aria-label="조회 기간 선택"
            className="inline-flex rounded-xl border border-[#2B2430]/10 bg-[#FFF6F1] p-1"
          >
            {PERIOD_TABS.map((t) => {
              const active = period === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPeriod(t.key)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-bold transition ${
                    active
                      ? "bg-[#2B2430] text-white shadow-sm"
                      : "text-[#2B2430]/70 hover:text-[#2B2430]"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* 핵심 요약 카드 */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#2B2430]/10 bg-white p-4">
          <p className="text-xs font-bold text-[#2B2430]/60">클릭 수</p>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#2B2430]">
            {current.summary.clicks.toLocaleString("ko-KR")}
          </p>
          <p className="mt-1 text-[11px] text-[#2B2430]/55">전용 링크 유입 (봇 제외)</p>
        </div>

        <div className="rounded-2xl border border-[#2B2430]/10 bg-white p-4">
          <p className="text-xs font-bold text-[#2B2430]/60">신규 가입</p>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#2B2430]">
            {current.summary.signups.toLocaleString("ko-KR")}
          </p>
          <p className="mt-1 text-[11px] text-[#2B2430]/55">
            클릭→가입 {rateLabel(current.summary.signups, current.summary.clicks)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#2B2430]/10 bg-white p-4">
          <p className="text-xs font-bold text-[#2B2430]/60">결제 건수</p>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#2B2430]">
            {current.summary.paid.toLocaleString("ko-KR")}건
          </p>
          <p className="mt-1 text-[11px] text-[#2B2430]/55">
            클릭→결제 {rateLabel(current.summary.paid, current.summary.clicks)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#2B2430]/10 bg-white p-4">
          <p className="text-xs font-bold text-[#2B2430]/60">결제 금액</p>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#2B2430]">
            {won(current.summary.revenue)}
          </p>
          <p className="mt-1 text-[11px] text-[#2B2430]/55">환불·취소 제외</p>
        </div>

        <div className="rounded-2xl border border-[#2B2430]/10 bg-white p-4">
          <p className="text-xs font-bold text-[#2B2430]/60">정산 기준 금액</p>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#6A2C70]">
            {won(current.summary.settlementBase)}
          </p>
          <p className="mt-1 text-[11px] text-[#2B2430]/55">
            결제 금액 − 부가세(금액/1.1) · PG 수수료 차감 전
          </p>
        </div>

        {hasRs && current.summary.estimatedPayout !== null && (
          <div className="rounded-2xl border border-[#FF5C77]/30 bg-[#FFF6F1] p-4">
            <p className="text-xs font-bold text-[#6A2C70]">
              예상 정산액 (RS {rsPercent}%)
            </p>
            <p className="mt-1 text-xl sm:text-2xl font-black text-[#FF5C77]">
              {won(current.summary.estimatedPayout)}
            </p>
            <p className="mt-1 text-[11px] text-[#2B2430]/65">PG 수수료 차감 전</p>
          </div>
        )}
      </section>

      {/* 코드·소재별 성과 표 */}
      <section className="space-y-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-black text-[#2B2430]">
            코드·소재별 성과 ({current.label})
          </h2>
          <span className="text-xs text-[#2B2430]/60">
            정산 기준 금액·예상 정산액은 PG 수수료 차감 전 금액입니다.
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#2B2430]/10 bg-white">
          <table className="w-full min-w-[680px]">
            <thead className="border-b border-[#2B2430]/10 bg-[#FFF6F1]">
              <tr>
                <th className={th}>코드</th>
                <th className={th}>배너·소재</th>
                <th className={th}>클릭</th>
                <th className={th}>가입</th>
                <th className={th}>결제 건수</th>
                <th className={th}>결제 금액</th>
                <th className={th}>정산 기준 금액</th>
                {hasRs && <th className={th}>예상 정산액 ({rsPercent}%)</th>}
              </tr>
            </thead>
            <tbody>
              {current.rows.map((r) => (
                <tr key={r.code} className="border-b border-[#2B2430]/5 last:border-0">
                  <td className={`${td} font-mono text-xs font-bold text-[#6A2C70]`}>{r.code}</td>
                  <td className={`${td} font-semibold`}>{r.label}</td>
                  <td className={td}>{r.clicks.toLocaleString("ko-KR")}</td>
                  <td className={td}>{r.signups.toLocaleString("ko-KR")}</td>
                  <td className={`${td} font-bold`}>{r.paid.toLocaleString("ko-KR")}</td>
                  <td className={td}>{won(r.revenue)}</td>
                  <td className={`${td} font-semibold text-[#6A2C70]`}>{won(r.settlementBase)}</td>
                  {hasRs && (
                    <td className={`${td} font-bold text-[#FF5C77]`}>
                      {r.estimatedPayout !== null ? won(r.estimatedPayout) : "—"}
                    </td>
                  )}
                </tr>
              ))}
              <tr className="bg-[#FFF6F1] font-bold">
                <td className={td}>합계</td>
                <td className={td} />
                <td className={td}>{current.summary.clicks.toLocaleString("ko-KR")}</td>
                <td className={td}>{current.summary.signups.toLocaleString("ko-KR")}</td>
                <td className={td}>{current.summary.paid.toLocaleString("ko-KR")}</td>
                <td className={td}>{won(current.summary.revenue)}</td>
                <td className={`${td} text-[#6A2C70]`}>{won(current.summary.settlementBase)}</td>
                {hasRs && (
                  <td className={`${td} text-[#FF5C77]`}>
                    {current.summary.estimatedPayout !== null ? won(current.summary.estimatedPayout) : "—"}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 일자별 합계 표 */}
      <section className="space-y-2.5">
        <h2 className="text-base font-black text-[#2B2430]">
          일별 합계 ({current.label})
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-[#2B2430]/10 bg-white">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-[#2B2430]/10 bg-[#FFF6F1]">
              <tr>
                <th className={th}>날짜 (KST)</th>
                {data.codes.map((c) => (
                  <th key={c.code} className={th}>
                    {c.code} 클릭
                  </th>
                ))}
                <th className={th}>클릭 합계</th>
                <th className={th}>가입</th>
                <th className={th}>결제 건수</th>
                <th className={th}>결제 금액</th>
                <th className={th}>정산 기준 금액</th>
                {hasRs && <th className={th}>예상 정산액</th>}
              </tr>
            </thead>
            <tbody>
              {current.days.map((d) => (
                <tr key={d.date} className="border-b border-[#2B2430]/5 last:border-0">
                  <td className={td}>{d.date}</td>
                  {data.codes.map((c) => (
                    <td key={c.code} className={td}>
                      {(d.clicksByCode[c.code] ?? 0).toLocaleString("ko-KR")}
                    </td>
                  ))}
                  <td className={`${td} font-bold`}>{d.clicks.toLocaleString("ko-KR")}</td>
                  <td className={td}>{d.signups.toLocaleString("ko-KR")}</td>
                  <td className={`${td} font-bold`}>{d.paid.toLocaleString("ko-KR")}</td>
                  <td className={td}>{won(d.revenue)}</td>
                  <td className={`${td} text-[#6A2C70]`}>{won(d.settlementBase)}</td>
                  {hasRs && (
                    <td className={`${td} font-bold text-[#FF5C77]`}>
                      {d.estimatedPayout !== null ? won(d.estimatedPayout) : "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 정산 기준 안내 */}
      <section className="rounded-2xl border border-[#2B2430]/10 bg-white p-5 text-xs sm:text-sm leading-relaxed text-[#2B2430]/75">
        <h2 className="mb-2 text-sm font-black text-[#2B2430]">집계 및 정산 기준 안내</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>인정 범위</b>: 전용 주소(<code>/ko/go/코드</code>)를 마지막으로 누른 뒤 <b>30일 이내</b>에 발생한 가입 및 결제를 집계합니다(인앱 웹뷰에서 외부 브라우저로 전환한 경우도 이어집니다).
          </li>
          <li>
            <b>결제 금액</b>: 결제 완료 건의 합계이며, 환불·취소된 건은 제외됩니다.
          </li>
          <li>
            <b>정산 기준 금액</b>: 결제 금액에서 부가세(<code>금액 / 1.1</code>)와 환불·취소를 제외한 금액입니다(<b>PG 수수료 차감 전</b>). 실제 월말 정산 시에는 계약된 결제 대행(PG) 실비 수수료를 차감한 뒤 정산 비율을 곱해 익월 10일에 지급합니다.
          </li>
          <li>
            개인정보 보호를 위해 주문번호·이메일·이름·생년월일·개별 주문 시각은 표시하지 않고 일 단위 합계만 제공합니다.
          </li>
        </ul>
      </section>
    </main>
  );
}
