import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  CAMPAIGN_COUNTER_PREFIX,
  campaignTag,
  linksForPartner,
  parseCampaignCounterKey,
} from "@/lib/campaignLinks";
import { buildPartnerReportViewData, type ClickRow } from "@/lib/campaignStats";
import { verifyPartnerReportKey } from "@/lib/partnerReport";
import PartnerReportClient from "@/components/partner/PartnerReportClient";

/**
 * 제휴사별 읽기 전용 성과 화면(/ko/partner/<partner>/<key>).
 * - 환경변수 PARTNER_REPORT_SECRET 이 없거나 열쇠가 틀리면 404(존재 여부를 드러내지 않음).
 * - 해당 partner 의 코드만 조회·집계하며 개인정보(주문번호·이메일·이름·생년월일·궁합 id·개별 주문 시각)는 읽지도 내보내지도 않는다.
 * - 열쇠는 로그에 남기지 않는다.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "제휴 성과 리포트 · 콩닥",
  robots: { index: false, follow: false },
};

export default async function PartnerReportPage({
  params,
}: {
  params: Promise<{ locale: string; partner: string; key: string }>;
}) {
  const { partner, key } = await params;

  if (!verifyPartnerReportKey(partner, key)) {
    notFound();
  }

  const partnerLinks = linksForPartner(partner);
  if (partnerLinks.length === 0) {
    notFound();
  }

  const tags = partnerLinks.map(campaignTag);
  const counterPrefixes = partnerLinks.map((l) => `${CAMPAIGN_COUNTER_PREFIX}${l.code}:`);

  const [counters, members, orders] = await Promise.all([
    prisma.siteCounter.findMany({
      where: { OR: counterPrefixes.map((p) => ({ key: { startsWith: p } })) },
      select: { key: true, value: true },
    }),
    prisma.user.findMany({
      where: { campaign: { in: tags } },
      select: { campaign: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { OR: [{ campaign: { in: tags } }, { user: { campaign: { in: tags } } }] },
      select: {
        campaign: true,
        status: true,
        amount: true,
        createdAt: true,
        user: { select: { campaign: true } },
      },
    }),
  ]);

  const clicks: ClickRow[] = [];
  for (const c of counters) {
    const parsed = parseCampaignCounterKey(c.key);
    if (parsed) clicks.push({ code: parsed.code, date: parsed.date, count: Number(c.value) });
  }

  const viewData = buildPartnerReportViewData(
    partner,
    clicks,
    members.flatMap((m) => (m.campaign ? [{ campaign: m.campaign, createdAt: m.createdAt }] : [])),
    orders.flatMap((o) => {
      const campaign = o.campaign ?? o.user?.campaign ?? null;
      return campaign ? [{ campaign, status: o.status, amount: o.amount, createdAt: o.createdAt }] : [];
    })
  );

  if (!viewData) {
    notFound();
  }

  return <PartnerReportClient data={viewData} />;
}
