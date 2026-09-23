import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getProduct, isViewableFor, type CatalogItem } from "@/lib/catalog";
import { canPreview } from "@/lib/preview";
import { parsePersonInput, type PersonInput } from "@/lib/validation/inputs";
import { orderGrants } from "@/lib/entitlementRules";
import { claimGeneration, completeGeneration, failGeneration, type ReportKind } from "@/lib/reports/generationLock";
import { generateJson } from "@/lib/gen/generateJson";
import { PRODUCT_SPECS, buildStandardPrompt } from "@/lib/prompts/productSpecs";
import { makeStandardReportValidator, makeStandardTeaserValidator, readEnvelope, type ReportEnvelope } from "@/lib/reports/standard";
import { pickTeaser } from "@/lib/reports/teaser";
import { personSubject, coupleSubject } from "@/lib/reports/subjectKey";
import {
  PREMIUM_MODELS, LOCALE_CONFIG, sajuContextBlock, compatContextBlock,
  calculateGenericScore, calculateGenericCompatScore,
} from "@/lib/destinyGen";
import { calculateFourPillars } from "@/lib/saju";
import { checkRateLimit, checkGlobalAiCap, getClientIp } from "@/lib/rateLimiter";

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
    // [M6] 점수는 생성 전에 결정론으로 계산해 프롬프트에 사실로 주입한다(생성 후 덮어쓰기 금지)
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
  if (product.tier !== "standard") return err(400, "지원하지 않는 상품입니다."); // 프리미엄은 Phase 3~4에서 연결
  const spec = PRODUCT_SPECS[product.promptKey];
  if (!spec) {
    console.error(`[reports/generate] missing spec for ${product.promptKey}`);
    return err(500, "상품 설정 오류입니다.");
  }

  let kind: ReportKind;
  if (product.isFree) kind = "FREE";
  else if (body.kind === "TEASER" || body.kind === "FULL") kind = body.kind;
  else return err(400, "kind 가 필요합니다.");

  // 1) 권한 판정을 입력 처리보다 먼저 한다 — 미결제자가 계산·AI 비용을 유발하지 못하게
  let orderDbId: string | null = null;
  if (kind === "FULL") {
    if (!orderId) return err(400, "주문 정보가 필요합니다.");
    const order = await prisma.order.findUnique({ where: { orderId }, include: { unlocks: true } });
    if (!order) return err(403, "열람 권한이 없어요."); // 존재 여부를 노출하지 않는다
    const grant = orderGrants(order, { catalogId, compatId, now: new Date(), sessionUserId, presentedOrderId: orderId });
    if (!grant.ok) return grant.reason === "NOT_PAID" ? err(402, "결제가 완료되지 않았어요.") : err(403, "열람 권한이 없어요.");
    orderDbId = order.id;
  } else {
    const rate = await checkRateLimit(getClientIp(req));
    if (!rate.allowed || !(await checkGlobalAiCap())) {
      return err(429, "오늘 준비된 무료 분석이 모두 소진됐어요. 내일 다시 찾아 주세요.");
    }
  }

  // 2) 입력 → 컨텍스트·점수·HMAC 해시 (원문 PII 는 어디에도 저장하지 않는다)
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
    kind === "FULL" ? `FULL:${orderDbId}:${catalogId}` // [H2] 주문 1건 × 상품 = 리포트 1건. 입력과 무관
    : kind === "FREE" ? `FREE:${catalogId}:${subject.subjectHash}`
    : `TEASER:${catalogId}:${subject.subjectHash}:${compatId ?? "-"}`;

  const claim = await claimGeneration({
    cacheKey, kind, catalogId, orderId: orderDbId, userId: sessionUserId, compatId, subjectHash: subject.subjectHash,
  });

  if (claim.state === "READY") {
    const env = readEnvelope(claim.content);
    if (!env) {
      // 과거 형식·손상 행 → 실패 처리해 다음 요청이 재생성하게 한다
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
      data = pickTeaser(r.data); // [불변식 5] 화이트리스트 통과분만 저장·반환
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
