import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getProduct, isViewableFor, type CatalogItem } from "@/lib/catalog";
import { canPreview } from "@/lib/preview";
import {
  parsePersonInput,
  parseChildNamingInput,
  parseDateSelectionInput,
  todayKST,
  type PersonInput,
  type ChildNamingInput,
  type DateSelectionInput,
} from "@/lib/validation/inputs";
import { orderGrants } from "@/lib/entitlementRules";
import { claimGeneration, completeGeneration, failGeneration, type ReportKind } from "@/lib/reports/generationLock";
import { generateJson } from "@/lib/gen/generateJson";
import { PRODUCT_SPECS, buildStandardPrompt } from "@/lib/prompts/productSpecs";
import { makeStandardReportValidator, makeStandardTeaserValidator, readEnvelope, type ReportEnvelope } from "@/lib/reports/standard";
import { pickTeaser } from "@/lib/reports/teaser";
import {
  personSubject,
  coupleSubject,
  premium2027Subject,
  namingSubject,
  datesSubject,
} from "@/lib/reports/subjectKey";
import {
  LOCALE_CONFIG, sajuContextBlock, compatContextBlock,
  calculateGenericScore, calculateGenericCompatScore,
} from "@/lib/destinyGen";
import { PREMIUM_MODELS } from "@/lib/premium/models";
import { calculateFourPillars } from "@/lib/saju";
import { checkRateLimit, checkGlobalAiCap, getClientIp } from "@/lib/rateLimiter";
import {
  buildDaeun2027Teaser,
  buildNamingTeaser,
  buildDateSelectionTeaser,
} from "@/lib/premium/teasers";
import { generate2027Report } from "@/lib/premium/generate2027";
import { generateNamingReport } from "@/lib/premium/generateNaming";
import { generateDatesReport } from "@/lib/premium/generateDates";
import surnamesRaw from "@/data/naming/surnames.json";

const SURNAMES_MAP: Record<string, string[]> = Object.fromEntries(
  Object.entries(surnamesRaw as Record<string, Array<{ hanja: string }>>).map(([hangul, arr]) => [
    hangul,
    arr.map((item) => item.hanja),
  ]),
);

const NO_STORE = { "Cache-Control": "no-store" };
type Subject = { contextBlock: string; score: number; subjectHash: string };
type CompatPerson = { name?: string; gender: string; dayMaster: string; elementsScore: Record<string, number> };

function err(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

async function buildPersonSubject(product: CatalogItem, p: PersonInput): Promise<Subject> {
  const saju = calculateFourPillars(p.dob, p.time, p.gender, "Seoul, KR");
  let dictionaryContext = "";
  try {
    const row = await prisma.sajuContentDictionary.findFirst({ where: { signKey: saju.dayMasterSignKey } });
    if (row) dictionaryContext = row.englishContent;
  } catch {
    // 사전 조회 실패 시 기본 컨텍스트로 진행
  }
  return {
    contextBlock: sajuContextBlock({
      name: p.name, gender: p.gender, dayMaster: saju.dayMasterSignKey,
      fourPillars: saju.fourPillars, elementsScore: saju.elementsScore, dictionaryContext,
    }),
    score: calculateGenericScore({
      productKey: product.id, dayMaster: saju.dayMasterSignKey,
      fourPillars: saju.fourPillars, elementsScore: saju.elementsScore,
    }),
    subjectHash: personSubject(p),
  };
}

async function buildCoupleSubject(product: CatalogItem, compatId: string): Promise<Subject | null> {
  const row = await prisma.compatibility.findUnique({ where: { id: compatId } });
  if (!row) return null;
  const a = row.personA as unknown as CompatPerson;
  const b = row.personB as unknown as CompatPerson;
  return {
    contextBlock: compatContextBlock({
      personA: a, personB: b, relation: row.relation,
      compatResult: { score: row.score, keywords: row.keywords, breakdown: row.breakdown as unknown as Record<string, number> },
    }),
    score: calculateGenericCompatScore({ productKey: product.id, personADayMaster: a.dayMaster, personBDayMaster: b.dayMaster }),
    subjectHash: coupleSubject(compatId),
  };
}

async function markViewed(reportId: string) {
  await prisma.generatedReport.updateMany({ where: { id: reportId, firstViewedAt: null }, data: { firstViewedAt: new Date() } });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const b: unknown = await req.json();
    if (!b || typeof b !== "object") return err(400, "잘못된 요청입니다.");
    body = b as Record<string, unknown>;
  } catch {
    return err(400, "잘못된 요청입니다.");
  }

  const catalogId = typeof body.catalogId === "string" ? body.catalogId : "";
  const compatId = typeof body.compatId === "string" ? body.compatId : null;
  const orderId = typeof body.orderId === "string" ? body.orderId : null;
  const locale = typeof body.locale === "string" && Object.hasOwn(LOCALE_CONFIG, body.locale) ? body.locale : "ko";

  const session = await getServerSession(authOptions).catch(() => null);
  const sessionUserId = session?.user?.id ?? null;
  const preview = canPreview(session?.user?.email);

  const product = getProduct(catalogId);
  if (!isViewableFor(product, preview)) return err(404, "상품을 찾을 수 없어요.");
  if (catalogId.startsWith("annual_")) return err(400, "총운은 /api/fortune/annual 을 사용하세요.");
  if (product.type === "SET") return err(400, "세트는 구성 상품별로 요청하세요.");
  if (product.tier !== "standard" && product.tier !== "premium") return err(400, "지원하지 않는 상품입니다.");

  let kind: ReportKind;
  if (product.isFree) kind = "FREE";
  else if (body.kind === "TEASER" || body.kind === "FULL") kind = body.kind;
  else return err(400, "kind 가 필요합니다.");

  // 1) 권한 판정을 입력 처리보다 먼저 한다 — 미결제자가 계산·AI 비용을 유발하지 못하게
  let orderDbId: string | null = null;
  if (kind === "FULL") {
    if (!orderId) return err(400, "주문 정보가 필요합니다.");
    const order = await prisma.order.findUnique({ where: { orderId }, include: { unlocks: true } });
    if (!order) return err(403, "열람 권한이 없어요.");
    const grant = orderGrants(order, { catalogId, compatId, now: new Date(), sessionUserId, presentedOrderId: orderId });
    if (!grant.ok) return grant.reason === "NOT_PAID" ? err(402, "결제가 완료되지 않았어요.") : err(403, "열람 권한이 없어요.");
    orderDbId = order.id;
  } else {
    const rate = await checkRateLimit(getClientIp(req));
    if (!rate.allowed || !(await checkGlobalAiCap())) {
      return err(429, "오늘 준비된 무료 분석이 모두 소진됐어요. 내일 다시 찾아 주세요.");
    }
  }

  // 2) 프리미엄 상품 분기
  if (product.tier === "premium") {
    if (product.id === "premium_2027_daeun") {
      const p = parsePersonInput(body.input);
      if (!p) return err(400, "생년월일 정보를 확인해 주세요.");

      if (kind === "TEASER") {
        const teaser = buildDaeun2027Teaser(p);
        return NextResponse.json({ kind: "TEASER", score: teaser.yearScore, data: teaser }, { headers: NO_STORE });
      }

      const sh = premium2027Subject(p);
      const cacheKey = `FULL:${orderDbId}:${catalogId}`;
      const claim = await claimGeneration({
        cacheKey,
        kind: "FULL",
        catalogId,
        orderId: orderDbId,
        userId: sessionUserId,
        compatId: null,
        subjectHash: sh,
      });

      if (claim.state === "READY") {
        const env = readEnvelope(claim.content);
        if (!env) {
          await failGeneration(claim.reportId);
          return err(503, "리포트를 다시 준비하고 있어요. 잠시 후 다시 시도해 주세요.");
        }
        await markViewed(claim.reportId);
        return NextResponse.json({ kind: "FULL", reportId: claim.reportId, score: env.score, data: env.data }, { headers: NO_STORE });
      }
      if (claim.state === "BUSY") return NextResponse.json({ status: "GENERATING", reportId: claim.reportId }, { status: 202, headers: NO_STORE });
      if (claim.state === "GAVE_UP") return err(409, "리포트 생성에 반복 실패했어요. 고객센터로 문의해 주세요.");

      try {
        const content = await generate2027Report(p);
        const score = content.engine.yearScore;
        const envelope: ReportEnvelope = { version: 1, score, data: content };
        await completeGeneration(claim.reportId, JSON.parse(JSON.stringify(envelope)) as Prisma.InputJsonValue, PREMIUM_MODELS[0]);
        await markViewed(claim.reportId);
        return NextResponse.json({ kind: "FULL", reportId: claim.reportId, score, data: content }, { headers: NO_STORE });
      } catch (e) {
        await failGeneration(claim.reportId);
        console.error(`[reports/generate] premium 2027 failed`, e);
        return err(500, "리포트를 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
      }
    }

    if (product.id === "premium_naming") {
      const namingInput: ChildNamingInput | null = parseChildNamingInput(body.input, SURNAMES_MAP);
      if (!namingInput) return err(400, "작명 입력 정보를 확인해 주세요.");

      if (kind === "TEASER") {
        const teaser = buildNamingTeaser(namingInput);
        return NextResponse.json({ kind: "TEASER", score: 0, data: teaser }, { headers: NO_STORE });
      }

      const sh = namingSubject(namingInput);
      const cacheKey = `FULL:${orderDbId}:${catalogId}`;
      const claim = await claimGeneration({
        cacheKey,
        kind: "FULL",
        catalogId,
        orderId: orderDbId,
        userId: sessionUserId,
        compatId: null,
        subjectHash: sh,
      });

      if (claim.state === "READY") {
        const env = readEnvelope(claim.content);
        if (!env) {
          await failGeneration(claim.reportId);
          return err(503, "리포트를 다시 준비하고 있어요. 잠시 후 다시 시도해 주세요.");
        }
        await markViewed(claim.reportId);
        return NextResponse.json({ kind: "FULL", reportId: claim.reportId, score: env.score, data: env.data }, { headers: NO_STORE });
      }
      if (claim.state === "BUSY") return NextResponse.json({ status: "GENERATING", reportId: claim.reportId }, { status: 202, headers: NO_STORE });
      if (claim.state === "GAVE_UP") return err(409, "리포트 생성에 반복 실패했어요. 고객센터로 문의해 주세요.");

      try {
        const content = await generateNamingReport(namingInput);
        const score = content.engine.names[0]?.score ?? 90;
        const envelope: ReportEnvelope = { version: 1, score, data: content };
        await completeGeneration(claim.reportId, JSON.parse(JSON.stringify(envelope)) as Prisma.InputJsonValue, PREMIUM_MODELS[0]);
        await markViewed(claim.reportId);
        return NextResponse.json({ kind: "FULL", reportId: claim.reportId, score, data: content }, { headers: NO_STORE });
      } catch (e) {
        await failGeneration(claim.reportId);
        console.error(`[reports/generate] premium naming failed`, e);
        return err(500, "리포트를 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
      }
    }

    if (product.id === "premium_date_selection") {
      const dateInput: DateSelectionInput | null = parseDateSelectionInput(body.input, todayKST());
      if (!dateInput) return err(400, "택일 입력 정보를 확인해 주세요.");

      if (kind === "TEASER") {
        const teaser = buildDateSelectionTeaser(dateInput);
        return NextResponse.json({ kind: "TEASER", score: 0, data: teaser }, { headers: NO_STORE });
      }

      const sh = datesSubject(dateInput, dateInput.people);
      const cacheKey = `FULL:${orderDbId}:${catalogId}`;
      const claim = await claimGeneration({
        cacheKey,
        kind: "FULL",
        catalogId,
        orderId: orderDbId,
        userId: sessionUserId,
        compatId: null,
        subjectHash: sh,
      });

      if (claim.state === "READY") {
        const env = readEnvelope(claim.content);
        if (!env) {
          await failGeneration(claim.reportId);
          return err(503, "리포트를 다시 준비하고 있어요. 잠시 후 다시 시도해 주세요.");
        }
        await markViewed(claim.reportId);
        return NextResponse.json({ kind: "FULL", reportId: claim.reportId, score: env.score, data: env.data }, { headers: NO_STORE });
      }
      if (claim.state === "BUSY") return NextResponse.json({ status: "GENERATING", reportId: claim.reportId }, { status: 202, headers: NO_STORE });
      if (claim.state === "GAVE_UP") return err(409, "리포트 생성에 반복 실패했어요. 고객센터로 문의해 주세요.");

      try {
        const content = await generateDatesReport({
          purpose: dateInput.purpose,
          start: dateInput.start,
          end: dateInput.end,
          people: dateInput.people,
          weekdays: dateInput.weekdays,
          excludeDates: dateInput.excludeDates,
        });
        const score = content.engine.picks[0]?.score ?? 85;
        const envelope: ReportEnvelope = { version: 1, score, data: content };
        await completeGeneration(claim.reportId, JSON.parse(JSON.stringify(envelope)) as Prisma.InputJsonValue, PREMIUM_MODELS[0]);
        await markViewed(claim.reportId);
        return NextResponse.json({ kind: "FULL", reportId: claim.reportId, score, data: content }, { headers: NO_STORE });
      } catch (e) {
        await failGeneration(claim.reportId);
        console.error(`[reports/generate] premium dates failed`, e);
        return err(500, "리포트를 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
      }
    }

    return err(400, "지원하지 않는 상품입니다.");
  }

  // 3) 표준 상품 처리
  const spec = PRODUCT_SPECS[product.promptKey];
  if (!spec) {
    console.error(`[reports/generate] missing spec for ${product.promptKey}`);
    return err(500, "상품 설정 오류입니다.");
  }

  let subject: Subject | null;
  if (product.inputKind === "person") {
    const p = parsePersonInput(body.input);
    if (!p) return err(400, "생년월일 정보를 확인해 주세요.");
    subject = await buildPersonSubject(product, p);
  } else if (product.inputKind === "couple") {
    if (!compatId) return err(400, "궁합 정보가 필요합니다.");
    subject = await buildCoupleSubject(product, compatId);
    if (!subject) return err(404, "궁합 정보를 찾을 수 없어요.");
  } else {
    return err(400, "지원하지 않는 입력입니다.");
  }

  const cacheKey =
    kind === "FULL" ? `FULL:${orderDbId}:${catalogId}`
    : kind === "FREE" ? `FREE:${catalogId}:${subject.subjectHash}`
    : `TEASER:${catalogId}:${subject.subjectHash}:${compatId ?? "-"}`;

  const claim = await claimGeneration({
    cacheKey, kind, catalogId, orderId: orderDbId, userId: sessionUserId, compatId, subjectHash: subject.subjectHash,
  });

  if (claim.state === "READY") {
    const env = readEnvelope(claim.content);
    if (!env) {
      await failGeneration(claim.reportId);
      return err(503, "리포트를 다시 준비하고 있어요. 잠시 후 다시 시도해 주세요.");
    }
    if (kind === "FULL") await markViewed(claim.reportId);
    return NextResponse.json({ kind, reportId: claim.reportId, score: env.score, data: env.data }, { headers: NO_STORE });
  }
  if (claim.state === "BUSY") return NextResponse.json({ status: "GENERATING", reportId: claim.reportId }, { status: 202, headers: NO_STORE });
  if (claim.state === "GAVE_UP") return err(409, "리포트 생성에 반복 실패했어요. 고객센터로 문의해 주세요.");

  try {
    const toneGuide = LOCALE_CONFIG[locale].toneGuide;
    const mode = kind === "TEASER" ? "TEASER" : "FULL";
    const prompt = buildStandardPrompt(spec, subject.contextBlock, subject.score, mode, toneGuide);
    let data: unknown;
    let model: string;
    if (mode === "TEASER") {
      const r = await generateJson({
        label: `teaser:${catalogId}`, prompt, models: PREMIUM_MODELS,
        maxOutputTokens: 3072, thinkingBudget: 0, validate: makeStandardTeaserValidator(spec),
      });
      data = pickTeaser(r.data);
      model = r.model;
    } else {
      const r = await generateJson({
        label: `full:${catalogId}`, prompt, models: PREMIUM_MODELS,
        maxOutputTokens: 6144, thinkingBudget: 0, validate: makeStandardReportValidator(spec),
      });
      data = r.data;
      model = r.model;
    }
    const envelope: ReportEnvelope = { version: 1, score: subject.score, data };
    await completeGeneration(claim.reportId, JSON.parse(JSON.stringify(envelope)) as Prisma.InputJsonValue, model);
    if (kind === "FULL") await markViewed(claim.reportId);
    return NextResponse.json({ kind, reportId: claim.reportId, score: subject.score, data }, { headers: NO_STORE });
  } catch (e) {
    await failGeneration(claim.reportId);
    console.error(`[reports/generate] ${kind} ${catalogId} failed`, e);
    return err(500, "리포트를 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
  }
}
