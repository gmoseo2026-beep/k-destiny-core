import Link from "next/link";
import prisma from "@/lib/prisma";
import { BASE_URL } from "@/lib/seo";
import { CAMPAIGN_COUNTER_PREFIX, CAMPAIGN_LINKS, campaignTag, parseCampaignCounterKey } from "@/lib/campaignLinks";
import { buildCampaignReport, rateLabel, type CampaignTotals, type ClickRow } from "@/lib/campaignStats";

/**
 * 관리자 > 배너 유입: 제휴 배너 전용 주소(/ko/go/<코드>)별 클릭 → 가입 → 결제 → 매출.
 * 권한 검사는 admin/layout.tsx 가 한다. 숫자만 보여 주고 개인정보는 읽지 않는다.
 */
export const dynamic = "force-dynamic";

const DAYS_SHOWN = 14;
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default async function AdminCampaignsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const tags = CAMPAIGN_LINKS.map(campaignTag);

  const [counters, members, orders] = await Promise.all([
    prisma.siteCounter.findMany({ where: { key: { startsWith: CAMPAIGN_COUNTER_PREFIX } }, select: { key: true, value: true } }),
    prisma.user.findMany({ where: { campaign: { in: tags } }, select: { campaign: true, createdAt: true } }),
    // 배너를 누른 기기에서 만든 주문 + 배너로 가입한 회원이 (다른 기기에서라도) 만든 주문
    prisma.order.findMany({
      where: { OR: [{ campaign: { in: tags } }, { user: { campaign: { in: tags } } }] },
      select: { campaign: true, status: true, amount: true, createdAt: true, user: { select: { campaign: true } } },
    }),
  ]);

  const clicks: ClickRow[] = [];
  for (const c of counters) {
    const parsed = parseCampaignCounterKey(c.key);
    if (parsed) clicks.push({ code: parsed.code, date: parsed.date, count: Number(c.value) });
  }

  const report = buildCampaignReport(
    CAMPAIGN_LINKS,
    clicks,
    members.flatMap((m) => (m.campaign ? [{ campaign: m.campaign, createdAt: m.createdAt }] : [])),
    orders.flatMap((o) => {
      const campaign = o.campaign ?? o.user?.campaign ?? null;
      return campaign ? [{ campaign, status: o.status, amount: o.amount, createdAt: o.createdAt }] : [];
    }),
    DAYS_SHOWN
  );

  const th = "px-3 py-2 text-left text-[11px] font-bold text-ink/60 whitespace-nowrap";
  const td = "px-3 py-2.5 text-sm text-ink whitespace-nowrap";

  const summary: Array<{ label: string; t: CampaignTotals }> = [
    { label: "오늘", t: report.sum.today },
    { label: "최근 7일", t: report.sum.last7 },
    { label: "누적", t: report.sum.total },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">배너 유입</h1>
          <p className="mt-1 text-sm text-ink/60">
            제휴 배너마다 준 전용 주소로 들어온 사람의 클릭 → 가입 → 결제 → 매출입니다. 서버가 직접 센 값이에요(봇 제외).
          </p>
        </div>
        <Link href={`/${locale}/admin`} className="rounded-xl border border-[#2B2430]/10 bg-white px-4 py-2 text-sm font-semibold text-ink">
          ← 관리자 홈
        </Link>
      </div>

      {/* 한눈에: 기간별 합계 */}
      <section className="grid gap-3 sm:grid-cols-3">
        {summary.map(({ label, t }) => (
          <div key={label} className="rounded-2xl border border-[#2B2430]/10 bg-white p-5">
            <p className="text-xs font-bold text-ink/60">{label}</p>
            <p className="mt-1 text-2xl font-black text-coral">{won(t.revenue)}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-[11px] text-ink/60">클릭</dt>
                <dd className="text-base font-bold text-ink">{t.clicks}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-ink/60">가입</dt>
                <dd className="text-base font-bold text-ink">{t.signups}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-ink/60">결제 완료</dt>
                <dd className="text-base font-bold text-ink">{t.paid}</dd>
              </div>
            </dl>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-base font-black text-ink">배너별 (누적)</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#2B2430]/10 bg-white">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-[#2B2430]/10 bg-[#FFF6F1]">
              <tr>
                <th className={th}>배너</th>
                <th className={th}>전용 주소</th>
                <th className={th}>클릭</th>
                <th className={th}>가입</th>
                <th className={th}>결제 시작</th>
                <th className={th}>결제 완료</th>
                <th className={th}>매출</th>
                <th className={th}>클릭→가입</th>
                <th className={th}>클릭→결제</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.link.code} className="border-b border-[#2B2430]/5 last:border-0">
                  <td className={`${td} font-semibold`}>{r.link.label}</td>
                  <td className={`${td} font-mono text-xs text-coral`}>{`${BASE_URL}/ko/go/${r.link.code}`}</td>
                  <td className={td}>{r.total.clicks}</td>
                  <td className={`${td} font-bold`}>{r.total.signups}</td>
                  <td className={td}>{r.total.checkouts}</td>
                  <td className={`${td} font-bold`}>{r.total.paid}</td>
                  <td className={`${td} font-bold text-coral`}>{won(r.total.revenue)}</td>
                  <td className={td}>{rateLabel(r.total.signups, r.total.clicks)}</td>
                  <td className={td}>{rateLabel(r.total.paid, r.total.clicks)}</td>
                </tr>
              ))}
              <tr className="bg-[#FFF6F1] font-bold">
                <td className={td}>합계</td>
                <td className={td} />
                <td className={td}>{report.sum.total.clicks}</td>
                <td className={td}>{report.sum.total.signups}</td>
                <td className={td}>{report.sum.total.checkouts}</td>
                <td className={td}>{report.sum.total.paid}</td>
                <td className={`${td} text-coral`}>{won(report.sum.total.revenue)}</td>
                <td className={td}>{rateLabel(report.sum.total.signups, report.sum.total.clicks)}</td>
                <td className={td}>{rateLabel(report.sum.total.paid, report.sum.total.clicks)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-black text-ink">날짜별 (최근 {DAYS_SHOWN}일)</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#2B2430]/10 bg-white">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-[#2B2430]/10 bg-[#FFF6F1]">
              <tr>
                <th className={th}>날짜</th>
                {report.rows.map((r) => (
                  <th key={r.link.code} className={th}>
                    {r.link.code} 클릭
                  </th>
                ))}
                <th className={th}>클릭 합계</th>
                <th className={th}>가입</th>
                <th className={th}>결제 완료</th>
                <th className={th}>매출</th>
              </tr>
            </thead>
            <tbody>
              {report.days.map((d) => (
                <tr key={d.date} className="border-b border-[#2B2430]/5 last:border-0">
                  <td className={td}>{d.date}</td>
                  {report.rows.map((r) => (
                    <td key={r.link.code} className={td}>
                      {d.clicksByCode[r.link.code] ?? 0}
                    </td>
                  ))}
                  <td className={`${td} font-bold`}>{d.total.clicks}</td>
                  <td className={`${td} font-bold`}>{d.total.signups}</td>
                  <td className={td}>{d.total.paid}</td>
                  <td className={`${td} font-bold text-coral`}>{won(d.total.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[#2B2430]/10 bg-white p-5 text-sm leading-relaxed text-ink/80">
        <h2 className="mb-2 text-base font-black text-ink">읽는 법</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>가입</b> = 배너를 누른 뒤(30일 안, 같은 기기) 새로 만든 계정 수. 원래 회원이 배너를 눌러 들어온 것은 세지 않습니다.
          </li>
          <li>
            <b>결제 시작</b> = 결제창을 연 횟수, <b>결제 완료·매출</b> = 그중 결제된 건과 금액(환불·취소된 건은 빠집니다). 배너로
            가입한 회원이 나중에 다른 기기에서 결제해도 포함됩니다.
          </li>
          <li>클릭은 같은 사람이 여러 번 누르면 그만큼 올라갑니다. 비회원 결제는 가입 수에는 없고 매출에는 들어갑니다.</li>
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
