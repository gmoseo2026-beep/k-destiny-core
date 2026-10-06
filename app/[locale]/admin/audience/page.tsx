import Link from "next/link";
import prisma from "@/lib/prisma";
import { buildAudienceReport, type AudienceMember, type AudienceTotals } from "@/lib/audienceStats";
import { PWA_COUNTER_PREFIX, buildPwaReport, parsePwaCounterKey, type PwaKind } from "@/lib/pwaStats";
import { rateLabel } from "@/lib/campaignStats";

/**
 * 관리자 > 회원·설치: (1) 홍보 소식을 보낼 수 있는 회원이 얼마나 쌓였는지 (2) 홈 화면에 앱을 설치한 사람이 얼마나 되는지.
 * 권한 검사는 admin/layout.tsx 가 한다. 숫자만 보여 준다(이메일 주소 등은 읽어도 화면에 내지 않는다).
 */
export const dynamic = "force-dynamic";

const DAYS_SHOWN = 14;
const PROVIDER_LABEL: Record<string, string> = { kakao: "카카오", naver: "네이버", google: "구글", email: "이메일 가입" };

export default async function AdminAudiencePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const [users, counters, pushTotal] = await Promise.all([
    prisma.user.findMany({
      where: { role: "USER" },
      select: {
        email: true,
        contactEmail: true,
        marketingConsent: true,
        marketingConsentAt: true,
        pwaInstalledAt: true,
        accounts: { select: { provider: true }, take: 1 },
      },
    }),
    prisma.siteCounter.findMany({ where: { key: { startsWith: PWA_COUNTER_PREFIX } }, select: { key: true, value: true } }),
    prisma.pushSubscription.count(),
  ]);

  const members: AudienceMember[] = users.map((u) => ({
    provider: u.accounts[0]?.provider ?? "email",
    hasAccountEmail: Boolean(u.email),
    hasContactEmail: Boolean(u.contactEmail),
    consent: u.marketingConsent,
    decided: Boolean(u.marketingConsentAt),
    pwaInstalled: Boolean(u.pwaInstalledAt),
  }));
  const audience = buildAudienceReport(members);

  const pwaRows: Array<{ kind: PwaKind; date: string; count: number }> = [];
  for (const c of counters) {
    const parsed = parsePwaCounterKey(c.key);
    if (parsed) pwaRows.push({ ...parsed, count: Number(c.value) });
  }
  const pwa = buildPwaReport(pwaRows, DAYS_SHOWN);

  const th = "px-3 py-2 text-left text-[11px] font-bold text-ink/60 whitespace-nowrap";
  const td = "px-3 py-2.5 text-sm text-ink whitespace-nowrap";
  const t = audience.total;

  const tiles: Array<{ label: string; value: string; hint: string; strong?: boolean }> = [
    { label: "지금 소식을 보낼 수 있는 회원", value: `${t.reachable}명`, hint: "수신 동의 + 이메일 있음", strong: true },
    { label: "수신 동의", value: `${t.consent}명`, hint: `전체 회원의 ${rateLabel(t.consent, t.members)}` },
    { label: "이메일을 아는 회원", value: `${t.withEmail}명`, hint: `전체 ${t.members}명 중 ${rateLabel(t.withEmail, t.members)}` },
    { label: "아직 묻지 않은 회원", value: `${t.undecided}명`, hint: `거절 ${t.declined}명` },
  ];
  const row = (label: string, x: AudienceTotals) => (
    <>
      <td className={`${td} font-semibold`}>{label}</td>
      <td className={td}>{x.members}</td>
      <td className={td}>{x.withEmail}</td>
      <td className={td}>{x.consent}</td>
      <td className={`${td} font-bold text-coral`}>{x.reachable}</td>
      <td className={td}>{x.declined}</td>
      <td className={td}>{x.undecided}</td>
      <td className={td}>{x.pwaInstalled}</td>
    </>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">회원·설치</h1>
          <p className="mt-1 text-sm text-ink/60">
            홍보 소식을 보낼 수 있는 회원이 얼마나 쌓였는지, 홈 화면에 콩닥을 설치한 사람이 얼마나 되는지 봅니다.
          </p>
        </div>
        <Link href={`/${locale}/admin`} className="rounded-xl border border-[#2B2430]/10 bg-white px-4 py-2 text-sm font-semibold text-ink">
          ← 관리자 홈
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-base font-black text-ink">연락할 수 있는 회원</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((x) => (
            <div key={x.label} className="rounded-2xl border border-[#2B2430]/10 bg-white p-5">
              <p className="text-xs font-bold text-ink/60">{x.label}</p>
              <p className={`mt-1 text-2xl font-black ${x.strong ? "text-coral" : "text-ink"}`}>{x.value}</p>
              <p className="mt-1 text-[11px] text-ink/60">{x.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[#2B2430]/10 bg-white">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-[#2B2430]/10 bg-[#FFF6F1]">
              <tr>
                <th className={th}>가입 경로</th>
                <th className={th}>회원</th>
                <th className={th}>이메일 있음</th>
                <th className={th}>수신 동의</th>
                <th className={th}>보낼 수 있음</th>
                <th className={th}>거절</th>
                <th className={th}>아직 안 물음</th>
                <th className={th}>앱 설치</th>
              </tr>
            </thead>
            <tbody>
              {audience.byProvider.map((p) => (
                <tr key={p.provider} className="border-b border-[#2B2430]/5 last:border-0">
                  {row(PROVIDER_LABEL[p.provider] ?? p.provider, p)}
                </tr>
              ))}
              <tr className="bg-[#FFF6F1] font-bold">{row("합계", t)}</tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-black text-ink">홈 화면 앱 설치</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#2B2430]/10 bg-white p-5">
            <p className="text-xs font-bold text-ink/60">설치한 기기 (누적)</p>
            <p className="mt-1 text-2xl font-black text-coral">{pwa.total.device}대</p>
            <p className="mt-1 text-[11px] text-ink/60">최근 7일 {pwa.last7.device}대 · 오늘 {pwa.today.device}대</p>
          </div>
          <div className="rounded-2xl border border-[#2B2430]/10 bg-white p-5">
            <p className="text-xs font-bold text-ink/60">앱을 설치한 회원</p>
            <p className="mt-1 text-2xl font-black text-ink">{t.pwaInstalled}명</p>
            <p className="mt-1 text-[11px] text-ink/60">설치된 앱에서 로그인한 적이 있는 회원</p>
          </div>
          <div className="rounded-2xl border border-[#2B2430]/10 bg-white p-5">
            <p className="text-xs font-bold text-ink/60">앱으로 연 횟수 (최근 7일)</p>
            <p className="mt-1 text-2xl font-black text-ink">{pwa.last7.launch}회</p>
            <p className="mt-1 text-[11px] text-ink/60">그중 회원 {pwa.last7.launch_member}회 · 오늘 {pwa.today.launch}회</p>
          </div>
          <div className="rounded-2xl border border-[#2B2430]/10 bg-white p-5">
            <p className="text-xs font-bold text-ink/60">알림 구독</p>
            <p className="mt-1 text-2xl font-black text-ink">{pushTotal}건</p>
            <p className="mt-1 text-[11px] text-ink/60">알림을 켠 기기 수</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[#2B2430]/10 bg-white">
          <table className="w-full min-w-[520px]">
            <thead className="border-b border-[#2B2430]/10 bg-[#FFF6F1]">
              <tr>
                <th className={th}>날짜</th>
                <th className={th}>새로 설치한 기기</th>
                <th className={th}>설치 알림(안드로이드·PC)</th>
                <th className={th}>앱으로 연 횟수</th>
                <th className={th}>그중 회원</th>
              </tr>
            </thead>
            <tbody>
              {pwa.days.map((d) => (
                <tr key={d.date} className="border-b border-[#2B2430]/5 last:border-0">
                  <td className={td}>{d.date}</td>
                  <td className={`${td} font-bold`}>{d.device}</td>
                  <td className={td}>{d.install}</td>
                  <td className={td}>{d.launch}</td>
                  <td className={td}>{d.launch_member}</td>
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
            <b>보낼 수 있음</b> = 수신에 동의했고 이메일을 아는 회원. 이 숫자만 홍보 메일 대상입니다(보낼 때 제목에 (광고) 표기와 수신
            거부 방법이 필요합니다).
          </li>
          <li>회원 홈에서 한 번 묻습니다. 받겠다·괜찮다 중 하나를 고르면 다시 묻지 않고, 보관함에서 언제든 바꿀 수 있습니다.</li>
          <li>
            <b>설치한 기기</b> = 설치된 앱으로 처음 연 기기 수(아이폰 포함). 집계를 시작한 2026년 10월 6일 이전에 설치한 기기는 다음에
            앱을 열 때 한 번 세어집니다. 같은 사람이 폰을 바꾸거나 앱 데이터를 지우면 다시 세어질 수 있습니다.
          </li>
          <li>&lsquo;설치 알림&rsquo;은 브라우저가 설치 순간을 알려 준 횟수로, 아이폰은 이 신호가 없어 0으로 나옵니다.</li>
        </ul>
      </section>
    </div>
  );
}
