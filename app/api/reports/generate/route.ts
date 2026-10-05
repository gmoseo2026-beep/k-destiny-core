import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { isViewableFor, type CatalogItem } from "@/lib/catalog";
import { getEffectiveProduct } from "@/lib/catalogVisibility";
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
import { pickTeaser, clipTeaserForView } from "@/lib/reports/teaser";
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
// 표준 리포트는 생각 예산 0(빠른 응답)으로 만든다 → Pro 는 예산 0 을 거절(400)하므로 Flash 계열만 쓴다
import { PREMIUM_MODELS as STANDARD_MODELS } from "@/lib/destinyGen";
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
import { logGeneration, errorCode } from "@/lib/reports/genLog";
import { checkPreviewQuota, previewLimitFor, MEMBER_PREVIEW_DAILY_LIMIT } from "@/lib/previewLimit";

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

/** 주인 없는(비회원 때 만든) 미리보기에 회원을 이어 둔다. 응답을 기다리게 하지 않고, 실패해도 무시한다. */
function linkTeaserToMember(reportId: string, userId: string): void {
  try {
    void prisma.generatedReport
      .updateMany({ where: { id: reportId, userId: null, kind: "TEASER" }, data: { userId } })
      .catch(() => {});
  } catch {
    // 이어보기는 덤이다
  }
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
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

  const product = await getEffectiveProduct(catalogId);
  if (!product) return err(404, "상품을 찾을 수 없어요.");
  if (catalogId.startsWith("annual_")) return err(400, "총운은 /api/fortune/annual 을 사용하세요.");
  if (catalogId === "compat_basic") return err(400, "정통 궁합은 궁합 결과 화면에서 열어 주세요.");
  if (product.type === "SET") return err(400, "세트는 구성 상품별로 요청하세요.");
  if (product.tier !== "standard" && product.tier !== "premium") return err(400, "지원하지 않는 상품입니다.");

  let kind: ReportKind;
  if (product.isFree) kind = "FREE";
  else if (body.kind === "TEASER" || body.kind === "FULL") kind = body.kind;
  else return err(400, "kind 가 필요합니다.");

  // A11-4: 공개 판정(isViewableFor)은 TEASER/FREE에만 적용하고, FULL은 Unlock 권한(orderGrants)으로만 판정한다.
  if (kind !== "FULL" && !isViewableFor(product, preview)) {
    return err(404, "상품을 찾을 수 없어요.");
  }

  // 1) 권한 판정을 입력 처리보다 먼저 한다 — 미결제자가 계산·AI 비용을 유발하지 못하게
  let orderDbId: string | null = null;
  if (kind === "FULL") {
    if (!orderId) return err(400, "주문 정보가 필요합니다.");
    const order = await prisma.order.findUnique({ where: { orderId }, include: { unlocks: true } });
    if (!order) return err(403, "열람 권한이 없어요.");
    const grant = orderGrants(order, { catalogId, compatId, now: new Date(), sessionUserId, presentedOrderId: orderId });
    if (!grant.ok) return grant.reason === "NOT_PAID" ? err(402, "결제가 완료되지 않았어요.") : err(403, "열람 권한이 없어요.");
    orderDbId = order.id;

    // 이미 만들어 둔 리포트는 입력 없이 바로 준다. 결제한 비회원이 새 탭·다음 날 다시 들어오면
    // 생년월일 입력값(sessionStorage)이 없는데, 그때마다 다시 입력하게 하지 않는다(한 주문 = 한 리포트).
    const saved = await prisma.generatedReport.findUnique({ where: { cacheKey: `FULL:${order.id}:${catalogId}` } });
    const savedEnv = saved?.status === "READY" && saved.content ? readEnvelope(saved.content) : null;
    if (saved && savedEnv) {
      await markViewed(saved.id);
      void logGeneration({ catalogId, kind: "FULL", ok: true, cached: true });
      return NextResponse.json({ kind: "FULL", reportId: saved.id, score: savedEnv.score, data: savedEnv.data }, { headers: NO_STORE });
    }
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
        void logGeneration({ catalogId, kind: "TEASER", ok: true, ms: Date.now() - t0 });
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
        void logGeneration({ catalogId, kind: "FULL", ok: true, cached: true });
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
        void logGeneration({ catalogId, kind: "FULL", ok: true, ms: Date.now() - t0 });
        return NextResponse.json({ kind: "FULL", reportId: claim.reportId, score, data: content }, { headers: NO_STORE });
      } catch (e) {
        await failGeneration(claim.reportId);
        void logGeneration({ catalogId, kind: "FULL", ok: false, ms: Date.now() - t0, error: errorCode(e) });
        console.error(`[reports/generate] premium 2027 failed`, e);
        return err(500, "리포트를 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
      }
    }

    if (product.id === "premium_naming") {
      const namingInput: ChildNamingInput | null = parseChildNamingInput(body.input, SURNAMES_MAP);
      if (!namingInput) return err(400, "작명 입력 정보를 확인해 주세요.");

      if (kind === "TEASER") {
        const teaser = buildNamingTeaser(namingInput);
        void logGeneration({ catalogId, kind: "TEASER", ok: true, ms: Date.now() - t0 });
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
        void logGeneration({ catalogId, kind: "FULL", ok: true, cached: true });
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
        void logGeneration({ catalogId, kind: "FULL", ok: true, ms: Date.now() - t0 });
        return NextResponse.json({ kind: "FULL", reportId: claim.reportId, score, data: content }, { headers: NO_STORE });
      } catch (e) {
        await failGeneration(claim.reportId);
        void logGeneration({ catalogId, kind: "FULL", ok: false, ms: Date.now() - t0, error: errorCode(e) });
        console.error(`[reports/generate] premium naming failed`, e);
        return err(500, "리포트를 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
      }
    }

    if (product.id === "premium_date_pick") {
      const dateInput: DateSelectionInput | null = parseDateSelectionInput(body.input, todayKST());
      if (!dateInput) return err(400, "택일 입력 정보를 확인해 주세요.");

      if (kind === "TEASER") {
        const teaser = buildDateSelectionTeaser(dateInput);
        void logGeneration({ catalogId, kind: "TEASER", ok: true, ms: Date.now() - t0 });
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
        void logGeneration({ catalogId, kind: "FULL", ok: true, cached: true });
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
        void logGeneration({ catalogId, kind: "FULL", ok: true, ms: Date.now() - t0 });
        return NextResponse.json({ kind: "FULL", reportId: claim.reportId, score, data: content }, { headers: NO_STORE });
      } catch (e) {
        await failGeneration(claim.reportId);
        void logGeneration({ catalogId, kind: "FULL", ok: false, ms: Date.now() - t0, error: errorCode(e) });
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

  // 유료 상품 무료 미리보기는 기기당 하루 PREVIEW_DAILY_LIMIT 개까지(같은 미리보기 다시 보기는 제외).
  // 한도에 닿으면 화면이 미리보기 대신 결제 안내를 보여 준다(code: PREVIEW_LIMIT).
  let previewCookie: string | undefined;
  if (kind === "TEASER" && !preview) {
    const limit = previewLimitFor(!!sessionUserId);
    const quota = checkPreviewQuota(req, cacheKey, limit);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `무료 미리보기는 하루 ${limit}개까지 볼 수 있어요.`,
          code: "PREVIEW_LIMIT",
          limit,
          // 비회원이면 가입으로 더 볼 수 있는 개수(회원 한도 − 지금까지 본 개수). 회원은 0.
          signupBonus: sessionUserId ? 0 : Math.max(0, MEMBER_PREVIEW_DAILY_LIMIT - quota.used),
        },
        { status: 429, headers: NO_STORE },
      );
    }
    previewCookie = quota.setCookie;
  }
  const ok = (payload: Record<string, unknown>, status = 200) => {
    const res = NextResponse.json(payload, { status, headers: NO_STORE });
    if (previewCookie) res.headers.append("Set-Cookie", previewCookie);
    return res;
  };

  // 미리보기는 무료 본문을 앞 절반만 내보낸다(저장본은 전체 그대로). 무료 상품·결제 리포트는 손대지 않는다.
  const viewData = (d: unknown): unknown => {
    if (kind !== "TEASER") return d;
    const t = pickTeaser(d);
    return t ? clipTeaserForView(t) : d;
  };

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
    // 비회원 때 만든 미리보기를 가입 후 다시 본 경우: 주인 없는 미리보기에 회원을 이어 둔다("이어보기" 카드용)
    if (kind === "TEASER" && sessionUserId) linkTeaserToMember(claim.reportId, sessionUserId);
    void logGeneration({ catalogId, kind, ok: true, cached: true });
    return ok({ kind, reportId: claim.reportId, score: env.score, data: viewData(env.data) });
  }
  if (claim.state === "BUSY") return ok({ status: "GENERATING", reportId: claim.reportId }, 202);
  if (claim.state === "GAVE_UP") return err(409, "리포트 생성에 반복 실패했어요. 고객센터로 문의해 주세요.");

  try {
    const toneGuide = LOCALE_CONFIG[locale].toneGuide;
    const mode = kind === "TEASER" ? "TEASER" : "FULL";
    // 전체 리포트는 이 사람이 본 미리보기(잠긴 칸 문구·열린 질문)에 답한다
    let promised: { hooks?: string[]; unsaid?: string } | undefined;
    if (mode === "FULL") {
      try {
        const seen = await prisma.generatedReport.findUnique({
          where: { cacheKey: `TEASER:${catalogId}:${subject.subjectHash}:${compatId ?? "-"}` },
          select: { content: true },
        });
        const env = seen?.content ? readEnvelope(seen.content) : null;
        const t = env ? pickTeaser(env.data) : null;
        if (t) promised = { hooks: t.hooks, unsaid: t.unsaid };
      } catch {
        // 미리보기를 못 찾으면 약속 없이 만든다(리포트 자체는 막지 않는다)
      }
    }
    const prompt = buildStandardPrompt(spec, subject.contextBlock, subject.score, mode, toneGuide, promised);
    let data: unknown;
    let model: string;
    if (mode === "TEASER") {
      const r = await generateJson({
        label: `teaser:${catalogId}`, prompt, models: STANDARD_MODELS,
        maxOutputTokens: 3072, thinkingBudget: 0, validate: makeStandardTeaserValidator(spec),
      });
      data = pickTeaser(r.data);
      model = r.model;
    } else {
      const r = await generateJson({
        label: `full:${catalogId}`, prompt, models: STANDARD_MODELS,
        maxOutputTokens: 6144, thinkingBudget: 0, validate: makeStandardReportValidator(spec),
      });
      data = r.data;
      model = r.model;
    }
    const envelope: ReportEnvelope = { version: 1, score: subject.score, data };
    await completeGeneration(claim.reportId, JSON.parse(JSON.stringify(envelope)) as Prisma.InputJsonValue, model);
    if (kind === "FULL") await markViewed(claim.reportId);
    void logGeneration({ catalogId, kind, ok: true, ms: Date.now() - t0 });
    return ok({ kind, reportId: claim.reportId, score: subject.score, data: viewData(data) });
  } catch (e) {
    await failGeneration(claim.reportId);
    void logGeneration({ catalogId, kind, ok: false, ms: Date.now() - t0, error: errorCode(e) });
    console.error(`[reports/generate] ${kind} ${catalogId} failed`, e);
    return err(500, "리포트를 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
  }
}
