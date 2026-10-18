// P-012: 유료 단품 12종의 "결과 예시" 샘플 리포트(data/samples/standard/<catalogId>.json)를 생성한다.
// 실제 리포트 생성 경로(app/api/reports/generate/route.ts)와 동일한 계산·프롬프트·검증 함수를 사용한다.
// - 한 사람 상품: 지민 (여, 1996-04-12, 14:30)
// - 두 사람 상품: 지민 (여, 1996-04-12, 14:30) + 서준 (남, 1994-09-03, 시간 모름), 관계 love
// - DB 쓰기 없음. 사전(sajuContentDictionary) 읽기 1회만 수행(실패 시 빈 문자열).
// - 저장 전 검사(한자·사주 전문용어·단정 표현·다른 실명)에 걸리면 해당 파일은 쓰지 않고 실패로 보고한다.
// - SAMPLES_ONLY=inner_mind,reunion 처럼 일부만 다시 만들 수 있다.
import fs from "fs";
import path from "path";
import { config } from "dotenv";

config({ path: ".env", quiet: true });

const SAMPLES_DIR = path.resolve(process.cwd(), "data/samples/standard");

const { getProduct } = await import("../lib/catalog");
const { calculateFourPillars } = await import("../lib/saju");
const { calculateCompatibility } = await import("../lib/compatibility");
const {
  LOCALE_CONFIG,
  PREMIUM_MODELS: STANDARD_MODELS,
  sajuContextBlock,
  compatContextBlock,
  calculateGenericScore,
  calculateGenericCompatScore,
} = await import("../lib/destinyGen");
const { PRODUCT_SPECS, buildStandardPrompt } = await import("../lib/prompts/productSpecs");
const { makeStandardReportValidator } = await import("../lib/reports/standard");
const { generateJson } = await import("../lib/gen/generateJson");
const { validateStandardSampleReport } = await import("../lib/reports/standardSampleGuard");
const { default: prisma } = await import("../lib/prisma");

export const STANDARD_SAMPLE_IDS = [
  "wealth",
  "career",
  "love_single",
  "charm",
  "health",
  "spicy_annual",
  "inner_mind",
  "reunion",
  "cheating",
  "marriage",
  "conflict",
  "secret_love",
] as const;

const JIMIN = {
  name: "지민",
  dob: "1996-04-12",
  time: "14:30",
  gender: "F" as const,
};

const SEOJUN = {
  name: "서준",
  dob: "1994-09-03",
  time: null as string | null,
  gender: "M" as const,
};

const only = (process.env.SAMPLES_ONLY ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const want = (id: string) => only.length === 0 || only.includes(id);

const sajuJimin = calculateFourPillars(JIMIN.dob, JIMIN.time, JIMIN.gender, "Seoul, KR");
const sajuSeojun = calculateFourPillars(SEOJUN.dob, SEOJUN.time, SEOJUN.gender, "Seoul, KR");
const compatJiminSeojun = calculateCompatibility(sajuJimin, sajuSeojun);

// 사전(sajuContentDictionary) 읽기 1회만 수행 (DB 쓰기 일절 없음)
let jiminDictionaryContext = "";
try {
  const row = await prisma.sajuContentDictionary.findFirst({
    where: { signKey: sajuJimin.dayMasterSignKey },
  });
  if (row) jiminDictionaryContext = row.englishContent;
} catch {
  // 사전 조회 실패 시 빈 문자열로 진행 (route.ts와 동일)
} finally {
  await prisma.$disconnect().catch(() => {});
}

fs.mkdirSync(SAMPLES_DIR, { recursive: true });

interface GenerationSummary {
  catalogId: string;
  score: number;
  ms: number;
  saved: boolean;
  headline: string;
  validation: ReturnType<typeof validateStandardSampleReport>;
}

const summaries: GenerationSummary[] = [];

for (const catalogId of STANDARD_SAMPLE_IDS) {
  if (!want(catalogId)) continue;

  const product = getProduct(catalogId);
  if (!product) {
    throw new Error(`상품을 찾을 수 없습니다: ${catalogId}`);
  }
  const spec = PRODUCT_SPECS[product.promptKey];
  if (!spec) {
    throw new Error(`PRODUCT_SPECS 누락: ${product.promptKey}`);
  }

  let contextBlock: string;
  let score: number;
  let targetName: string;

  if (product.inputKind === "person") {
    contextBlock = sajuContextBlock({
      name: JIMIN.name,
      gender: JIMIN.gender,
      dayMaster: sajuJimin.dayMasterSignKey,
      fourPillars: sajuJimin.fourPillars,
      elementsScore: sajuJimin.elementsScore,
      dictionaryContext: jiminDictionaryContext,
    });
    score = calculateGenericScore({
      productKey: product.id,
      dayMaster: sajuJimin.dayMasterSignKey,
      fourPillars: sajuJimin.fourPillars,
      elementsScore: sajuJimin.elementsScore,
    });
    targetName = "지민 (예시 · 가상 인물)";
  } else {
    contextBlock = compatContextBlock({
      personA: {
        name: JIMIN.name,
        gender: JIMIN.gender,
        dayMaster: sajuJimin.dayMaster,
        elementsScore: sajuJimin.elementsScore,
      },
      personB: {
        name: SEOJUN.name,
        gender: SEOJUN.gender,
        dayMaster: sajuSeojun.dayMaster,
        elementsScore: sajuSeojun.elementsScore,
      },
      relation: "love",
      compatResult: {
        score: compatJiminSeojun.score,
        keywords: compatJiminSeojun.keywords,
        breakdown: compatJiminSeojun.breakdown as unknown as Record<string, number>,
      },
    });
    score = calculateGenericCompatScore({
      productKey: product.id,
      personADayMaster: sajuJimin.dayMaster,
      personBDayMaster: sajuSeojun.dayMaster,
    });
    targetName = "지민 · 서준 (예시 · 가상 인물)";
  }

  const prompt = buildStandardPrompt(
    spec,
    contextBlock,
    score,
    "FULL",
    LOCALE_CONFIG.ko.toneGuide,
  );

  const t0 = Date.now();
  const baseValidate = makeStandardReportValidator(spec);
  const { data: report } = await generateJson({
    label: `sample:${catalogId}`,
    prompt,
    models: STANDARD_MODELS,
    maxOutputTokens: 6144,
    thinkingBudget: 0,
    validate: (v: unknown): v is ReturnType<typeof baseValidate> extends boolean ? Parameters<typeof validateStandardSampleReport>[0] & { headline: string } : never => {
      if (!baseValidate(v)) return false;
      const check = validateStandardSampleReport(v, product.target);
      if (!check.ok) {
        console.warn(`[standard-samples] ${catalogId} attempt rejected by sample guard:`, JSON.stringify(check));
        return false;
      }
      return true;
    },
  });
  const ms = Date.now() - t0;
  console.log(`[standard-samples] ${catalogId} generated in ${ms}ms (score=${score})`);

  const check = validateStandardSampleReport(report, product.target);
  const outPath = path.join(SAMPLES_DIR, `${catalogId}.json`);

  if (!check.ok) {
    console.error(
      `[standard-samples] SKIP ${catalogId} — 저장 전 검사 실패:`,
      JSON.stringify(check),
    );
    summaries.push({
      catalogId,
      score,
      ms,
      saved: false,
      headline: report.headline,
      validation: check,
    });
    continue;
  }

  const samplePayload = {
    version: 1,
    meta: {
      targetName,
      isSample: true,
      catalogId,
      generatedAt: new Date().toISOString(),
    },
    score,
    report,
  };

  fs.writeFileSync(outPath, JSON.stringify(samplePayload, null, 2) + "\n", "utf8");
  console.log(`[standard-samples] WROTE data/samples/standard/${catalogId}.json`);
  summaries.push({
    catalogId,
    score,
    ms,
    saved: true,
    headline: report.headline,
    validation: check,
  });
}

console.log("[standard-samples] SUMMARY:", JSON.stringify(summaries, null, 2));
