import fs from "fs";
import path from "path";
import type { StandardReport } from "@/lib/reports/standard";
import { maskKeyWordForPreview } from "@/lib/teaserBlurCopy";

export { maskKeyWordForPreview };

export interface StandardSamplePreview {
  targetLabel: string;
  score: number;
  headline: string;
  summary: string;
  firstSection: {
    title: string;
    bodyExcerpt: string;
  };
  lockedSections: Array<{
    title: string;
    firstSentence: string;
  }>;
}

interface RawSampleFile {
  version: number;
  meta: {
    targetName: string;
    isSample: boolean;
    catalogId: string;
    generatedAt?: string;
  };
  score: number;
  report: StandardReport;
}

const ALLOWED_SAMPLE_IDS = new Set([
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
]);

/**
 * 첫 섹션 본문을 문장 끝(. ! ? …) 기준으로 300자 안팎에서 자른다.
 * 전체 본문이 클라이언트로 넘어가지 않도록 반드시 뒷문장은 잘라낸다.
 */
export function clipFirstSectionBody(body: string, targetChars = 300): string {
  const full = body.trim();
  if (!full) return "";

  const sentences = full.split(/(?<=[.!?…])\s+/).filter(Boolean);
  if (sentences.length <= 1) {
    if (full.length <= targetChars) return full;
    return `${full.slice(0, Math.max(1, targetChars - 1)).trimEnd()}…`;
  }

  // 마지막 문장 전까지의 문장 경계 후보들 중 targetChars(300자)에 가장 가까운 지점을 고른다
  const candidates: string[] = [];
  let cursor = 0;
  for (let i = 0; i < sentences.length - 1; i++) {
    const s = sentences[i];
    const at = full.indexOf(s, cursor);
    const end = at >= 0 ? at + s.length : cursor + s.length;
    cursor = end;
    candidates.push(full.slice(0, end).trimEnd());
  }

  let best = candidates[0];
  let bestDiff = Math.abs(best.length - targetChars);
  for (const cand of candidates.slice(1)) {
    const diff = Math.abs(cand.length - targetChars);
    if (diff < bestDiff) {
      best = cand;
      bestDiff = diff;
    }
  }

  // 만약 첫 문장 하나만으로도 targetChars + 80자를 훌쩍 넘으면 targetChars에서 자른다
  if (best.length > targetChars + 80) {
    return `${best.slice(0, Math.max(1, targetChars - 1)).trimEnd()}…`;
  }

  return best;
}

/**
 * 나머지 섹션의 첫 문장만 뽑고, 60자를 넘으면 최대 60자(말줄임표 포함)로 자른다.
 */
export function extractFirstSentence(body: string, maxChars = 60): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const first = normalized.split(/(?<=[.!?…])\s+/)[0] ?? normalized;
  if (first.length <= maxChars) return first;
  return `${first.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

/**
 * 서버 페이지 전용: 해당 상품(12종 유료 단품)의 샘플 JSON 1개만 읽어 화면에 필요한 조각만 돌려준다.
 * 잠긴 섹션의 첫 문장은 핵심 단어를 서버에서 `●●●`로 가린 뒤 전달하여 원문 단어가 브라우저로 나가지 않게 한다.
 */
export function loadStandardSamplePreview(
  catalogId: string,
  baseDir: string = path.resolve(process.cwd(), "data/samples/standard"),
): StandardSamplePreview | null {
  if (!ALLOWED_SAMPLE_IDS.has(catalogId)) return null;

  const filePath = path.join(baseDir, `${catalogId}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as RawSampleFile;
    if (
      !raw ||
      !raw.meta?.isSample ||
      typeof raw.meta.targetName !== "string" ||
      typeof raw.score !== "number" ||
      !raw.report ||
      !Array.isArray(raw.report.sections) ||
      raw.report.sections.length === 0
    ) {
      return null;
    }

    const [firstSec, ...restSecs] = raw.report.sections;
    return {
      targetLabel: raw.meta.targetName,
      score: raw.score,
      headline: raw.report.headline,
      summary: raw.report.summary,
      firstSection: {
        title: firstSec.title,
        bodyExcerpt: clipFirstSectionBody(firstSec.body, 300),
      },
      lockedSections: restSecs.map((sec) => ({
        title: sec.title,
        firstSentence: maskKeyWordForPreview(extractFirstSentence(sec.body, 58), 60),
      })),
    };
  } catch {
    return null;
  }
}
