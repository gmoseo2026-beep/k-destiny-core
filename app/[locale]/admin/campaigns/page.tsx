import Link from "next/link";
import prisma from "@/lib/prisma";
import { BASE_URL } from "@/lib/seo";
import {
  CAMPAIGN_COUNTER_PREFIX,
  CAMPAIGN_LINKS,
  campaignTag,
  kstDateKey,
  parseCampaignCounterKey,
} from "@/lib/campaignLinks";

/**
 * 관리자 > 배너 유입: 제휴 배너 전용 주소(/ko/go/<코드>)별 클릭 → 결제 집계.
 * 권한 검사는 admin/layout.tsx 가 한다. 숫자만 보여 주고 개인정보는 읽지 않는다.
 */
export const dynamic = "force-dynamic";

const DAYS_SHOWN = 14;
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

function lastDates(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(kstDateKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
  return out;
}

export default async function AdminCampaignsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const tags = CAMPAIGN_LINKS.map(campaignTag);

  const [counters, orderGroups] = await Promise.all([
    prisma.siteCounter.findMany({ where: { key: { startsWith: CAMPAIGN_COUNTER_PREFIX } }, select: { key: true, value: true } }),
    prisma.order.groupBy({
      by: ["campaign", "status"],
      where: { campaign: { in: tags } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  // 코드별 · 날짜별 클릭
  const clicks = new Map<string, Map<string, number>>();
  for (const c of counters) {
    const parsed = parseCampaignCounterKey(c.key);
    if (!parsed) continue;
    if (!clicks.has(parsed.code)) clicks.set(parsed.code, new Map());
    clicks.get(parsed.code)!.set(parsed.date, Number(c.value));
  }

  const dates = lastDates(DAYS_SHOWN);
  const today = dates[0];
  const week = new Set(dates.slice(0, 7));

  const rows = CAMPAIGN_LINKS.map((link) => {
    const byDate = clicks.get(link.code) ?? new Map<string, number>();
    let total = 0;
    let last7 = 0;
    for (const [d, v] of byDate) {
      total += v;
      if (week.has(d)) last7 += v;
    }
    const mine = orderGroups.filter((g) => g.campaign === campaignTag(link));
    const started = mine.reduce((a, g) => a + g._count._all, 0);
    const paid = mine.filter((g) => g.status === "PAID");
    const paidCount = paid.reduce((a, g) => a + g._count._all, 0);
    const paidAmount = paid.reduce((a, g) => a + (g._sum.amount ?? 0), 0);
    return { link, byDate, total, last7, today: byDate.get(today) ?? 0, started, paidCount, paidAmount };
  });

  const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + pick(r), 0);
  const th = "px-3 py-2 text-left text-[11px] font-bold text-ink/60 whitespace-nowrap";
  const td = "px-3 py-2.5 text-sm text-ink whitespace-nowrap";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">배너 유입</h1>
          <p className="mt-1 text-sm text-ink/60">
            제휴 배너마다 준 전용 주소의 클릭 수와, 그 주소로 들어온 사람의 결제입니다. 클릭은 서버가 직접 센 값(봇 제외)이에요.
          </p>
        </div>
        <Link href={`/${locale}/admin`} className="rounded-xl border border-[#2B2430]/10 bg-white px-4 py-2 text-sm font-semibold text-ink">
          ← 관리자 홈
        </Link>
      </div>

      <section className="overflow-x-auto rounded-2xl border border-[#2B2430]/10 bg-white">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-[#2B2430]/10 bg-[#FFF6F1]">
            <tr>
              <th className={th}>배너</th>
              <th className={th}>전용 주소</th>
              <th className={th}>오늘 클릭</th>
              <th className={th}>최근 7일</th>
              <th className={th}>누적 클릭</th>
              <th className={th}>결제 시작</th>
              <th className={th}>결제 완료</th>
              <th className={th}>결제 금액</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.link.code} className="border-b border-[#2B2430]/5 last:border-0">
                <td className={`${td} font-semibold`}>{r.link.label}</td>
                <td className={`${td} font-mono text-xs text-coral`}>{`${BASE_URL}/ko/go/${r.link.code}`}</td>
                <td className={td}>{r.today}</td>
                <td className={td}>{r.last7}</td>
                <td className={`${td} font-bold`}>{r.total}</td>
                <td className={td}>{r.started}</td>
                <td className={`${td} font-bold`}>{r.paidCount}</td>
                <td className={td}>{won(r.paidAmount)}</td>
              </tr>
            ))}
            <tr className="bg-[#FFF6F1] font-bold">
              <td className={td}>합계</td>
              <td className={td} />
              <td className={td}>{sum((r) => r.today)}</td>
              <td className={td}>{sum((r) => r.last7)}</td>
              <td className={td}>{sum((r) => r.total)}</td>
              <td className={td}>{sum((r) => r.started)}</td>
              <td className={td}>{sum((r) => r.paidCount)}</td>
              <td className={td}>{won(sum((r) => r.paidAmount))}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-3 text-base font-black text-ink">날짜별 클릭 (최근 {DAYS_SHOWN}일)</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#2B2430]/10 bg-white">
          <table className="w-full min-w-[420px]">
            <thead className="border-b border-[#2B2430]/10 bg-[#FFF6F1]">
              <tr>
                <th className={th}>날짜</th>
                {rows.map((r) => (
                  <th key={r.link.code} className={th}>
                    {r.link.code}
                  </th>
                ))}
                <th className={th}>합계</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((d) => (
                <tr key={d} className="border-b border-[#2B2430]/5 last:border-0">
                  <td className={td}>{d}</td>
                  {rows.map((r) => (
                    <td key={r.link.code} className={td}>
                      {r.byDate.get(d) ?? 0}
                    </td>
                  ))}
                  <td className={`${td} font-bold`}>{rows.reduce((a, r) => a + (r.byDate.get(d) ?? 0), 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[#2B2430]/10 bg-white p-5 text-sm leading-relaxed text-ink/80">
        <h2 className="mb-2 text-base font-black text-ink">읽는 법</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>결제 시작 = 이 주소로 들어온 뒤 30일 안에 같은 기기에서 결제창을 연 횟수, 결제 완료 = 그중 결제된 건.</li>
          <li>
            중간 단계(궁합 결과를 본 사람 수 등)는 GA4 에서 봅니다: 보고서 → 획득 → 트래픽 획득 → 검색창에 <b>couplediary</b>. 배너별
            구분은 측정기준에 &lsquo;세션 수동 광고 콘텐츠&rsquo;를 추가하면 b02·b06·b07·b09 로 나뉩니다.
          </li>
          <li>배너 문구·도착 화면을 바꾸려면 <code>lib/campaignLinks.ts</code> 만 고치면 됩니다(제휴사에 준 주소는 그대로).</li>
        </ul>
      </section>
    </div>
  );
}
