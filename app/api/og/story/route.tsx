import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import type { SajuResult } from "@/lib/saju";
import { buildSajuDisplayFromPillars, type CharmBadgeLabel } from "@/lib/sajuDisplay";
import { parseCompatFreeText } from "@/lib/compatFreeText";
import { isViewableFor } from "@/lib/catalog";
import { getEffectiveProduct } from "@/lib/catalogVisibility";
import { readEnvelope } from "@/lib/reports/standard";
import {
  decodePersonalityStoryCodes,
  formatStoryTitle,
  mergeStoryCharmBadges,
  sanitizeStoryOneLineSummary,
} from "@/lib/storyCard";

export const runtime = "nodejs";

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

let fontDataCache: ArrayBuffer | null = null;
let mascotDataUriCache: string | null = null;

async function getPretendardFont(): Promise<ArrayBuffer> {
  if (!fontDataCache) {
    const fontPath = path.join(process.cwd(), "public", "fonts", "Pretendard-Bold.ttf");
    const buffer = await fs.readFile(fontPath);
    fontDataCache = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
  }
  return fontDataCache;
}

async function getDoogeunDataUri(): Promise<string> {
  if (!mascotDataUriCache) {
    const mascotPath = path.join(
      process.cwd(),
      "public",
      "mascot",
      "kongdak-mascot-256.png",
    );
    const buffer = await fs.readFile(mascotPath);
    mascotDataUriCache = `data:image/png;base64,${buffer.toString("base64")}`;
  }
  return mascotDataUriCache;
}

interface StoredCompatPerson {
  name?: string;
  fourPillars?: SajuResult["fourPillars"];
}

/**
 * GET /api/og/story
 * 인스타 스토리용 9:16(1080×1920) 결과 카드 생성
 * - 무료 궁합: ?shareToken=<token>
 * - 무료 성격: ?reportId=<id>&dt=<0..9>&db=<0..11>&el=<code >&b=<badges>
 * 개인정보(생년월일·실명) 및 임의 자유 문장 파라미터는 받지 않는다.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shareToken = searchParams.get("shareToken")?.trim() || null;
    const compatId = searchParams.get("compatId")?.trim() || null;
    const reportId = searchParams.get("reportId")?.trim() || null;
    const productId = searchParams.get("productId")?.trim() || null;
    const download = searchParams.get("download") === "true";

    let badgeHeader = "콩닥 사주 궁합";
    let title = "나 × 그 사람";
    let score = 91;
    let keywords: string[] = ["천생연분", "기운 찰떡궁합", "설레는 케미"];
    let charmBadges: CharmBadgeLabel[] = [];
    let summaryLine = "서로의 결이 자연스럽게 스며드는 다정한 흐름이에요.";

    if (shareToken || compatId) {
      const compat = await prisma.compatibility
        .findUnique({
          where: shareToken ? { shareToken } : { id: compatId! },
          select: {
            score: true,
            keywords: true,
            summaryKo: true,
            personA: true,
            personB: true,
          },
        })
        .catch(() => null);

      if (compat) {
        const pA = (compat.personA ?? null) as StoredCompatPerson | null;
        const pB = (compat.personB ?? null) as StoredCompatPerson | null;
        title = formatStoryTitle("compat", pA?.name, pB?.name);
        score = compat.score;
        if (Array.isArray(compat.keywords) && compat.keywords.length > 0) {
          keywords = compat.keywords.slice(0, 3);
        }
        const cardA = buildSajuDisplayFromPillars(pA?.fourPillars);
        const cardB = buildSajuDisplayFromPillars(pB?.fourPillars);
        charmBadges = mergeStoryCharmBadges([cardA, cardB]);

        const parsed = parseCompatFreeText(compat.summaryKo);
        const rawSummary =
          parsed?.kind === "scenes"
            ? parsed.scenes[0]
            : parsed?.kind === "legacy"
              ? parsed.text
              : compat.summaryKo;
        summaryLine = sanitizeStoryOneLineSummary(rawSummary, [
          pA?.name,
          pB?.name,
        ]);
      }
    } else if (reportId) {
      badgeHeader = "콩닥 타고난 성격 · 매력";
      title = formatStoryTitle("personality");
      const decoded = decodePersonalityStoryCodes(searchParams);
      keywords = [...decoded.keywords];
      charmBadges = decoded.badges;

      const reportRow = await prisma.generatedReport
        .findUnique({
          where: { id: reportId },
          select: {
            kind: true,
            catalogId: true,
            status: true,
            content: true,
          },
        })
        .catch(() => null);

      if (
        reportRow &&
        reportRow.kind === "FREE" &&
        reportRow.catalogId === "free_personality" &&
        reportRow.status === "READY" &&
        reportRow.content
      ) {
        const env = readEnvelope(reportRow.content);
        if (env) {
          score = env.score;
          const dataObj =
            env.data && typeof env.data === "object"
              ? (env.data as { headline?: unknown; summary?: unknown })
              : null;
          const rawLine =
            typeof dataObj?.headline === "string" && dataObj.headline.trim()
              ? dataObj.headline
              : typeof dataObj?.summary === "string"
                ? dataObj.summary
                : null;
          summaryLine = sanitizeStoryOneLineSummary(rawLine);
        }
      } else {
        score = 88;
        summaryLine = "겉은 부드럽고 속은 단단하게 중심을 지키는 매력이에요.";
      }
    } else if (productId) {
      const found = await getEffectiveProduct(productId).catch(() => undefined);
      const viewable = isViewableFor(found ?? undefined, false) ? found : undefined;
      if (viewable) {
        badgeHeader = "콩닥 사주 리포트";
        title = viewable.name;
        keywords = ["타고난 기운", "쉬운 사주 풀이", "두근이 리포트"];
        summaryLine = sanitizeStoryOneLineSummary(viewable.hook);
      }
    }

    const [pretendardFont, mascotDataUri] = await Promise.all([
      getPretendardFont(),
      getDoogeunDataUri(),
    ]);

    const response = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            background:
              "linear-gradient(165deg, #140B18 0%, #3A1B40 48%, #6A2C70 100%)",
            padding: "108px 72px 96px",
            fontFamily: "Pretendard, sans-serif",
            color: "#F6EEF3",
          }}
        >
          {/* Top Brand Tag */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
              background: "rgba(255, 92, 119, 0.18)",
              border: "2px solid rgba(255, 138, 161, 0.45)",
              borderRadius: "999px",
              padding: "16px 36px",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "14px",
                height: "14px",
                borderRadius: "999px",
                background: "#FF5C77",
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: "28px",
                fontWeight: 700,
                color: "#FFF6F1",
                letterSpacing: "-0.02em",
              }}
            >
              {badgeHeader}
            </div>
          </div>

          {/* Main Story Card */}
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(34, 20, 42, 0.88)",
              border: "2px solid rgba(255, 255, 255, 0.16)",
              borderRadius: "52px",
              padding: "68px 54px",
              boxShadow: "0 28px 68px rgba(0, 0, 0, 0.45)",
            }}
          >
            {/* Doogeun Mascot */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mascotDataUri}
              alt=""
              width={216}
              height={216}
              style={{
                width: "216px",
                height: "216px",
                objectFit: "contain",
                marginBottom: "22px",
              }}
            />

            {/* Nickname / Default Pair Label */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
                fontWeight: 700,
                color: "#FFF6F1",
                marginBottom: "18px",
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </div>

            {/* Score */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "center",
                marginBottom: "34px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "156px",
                  fontWeight: 700,
                  lineHeight: 1,
                  color: "#FFFFFF",
                  letterSpacing: "-0.04em",
                }}
              >
                {String(score)}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "54px",
                  fontWeight: 700,
                  color: "#FFC24B",
                  marginLeft: "10px",
                }}
              >
                점
              </div>
            </div>

            {/* 3 Engine Keywords */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: "14px",
                marginBottom: charmBadges.length > 0 ? "24px" : "36px",
              }}
            >
              {keywords.slice(0, 3).map((kw, idx) => (
                <div
                  key={`${kw}-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255, 92, 119, 0.22)",
                    border: "2px solid rgba(255, 138, 161, 0.5)",
                    color: "#FFF6F1",
                    borderRadius: "999px",
                    padding: "14px 28px",
                    fontSize: "27px",
                    fontWeight: 700,
                  }}
                >
                  {kw}
                </div>
              ))}
            </div>

            {/* Charm Badges (Task 06 — only rendered when present) */}
            {charmBadges.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  marginBottom: "36px",
                }}
              >
                {charmBadges.map((badge) => (
                  <div
                    key={badge}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      background: "rgba(255, 194, 75, 0.16)",
                      border: "2px solid rgba(255, 194, 75, 0.55)",
                      color: "#FFC24B",
                      borderRadius: "999px",
                      padding: "11px 24px",
                      fontSize: "23px",
                      fontWeight: 700,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: "10px",
                        height: "10px",
                        borderRadius: "999px",
                        background: "#FFC24B",
                      }}
                    />
                    <div style={{ display: "flex" }}>{badge}</div>
                  </div>
                ))}
              </div>
            )}

            {/* One-Line Summary */}
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                background: "rgba(20, 11, 24, 0.78)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "32px",
                padding: "32px 36px",
                fontSize: "30px",
                fontWeight: 700,
                lineHeight: 1.45,
                color: "#F6EEF3",
                wordBreak: "keep-all",
              }}
            >
              {`“${summaryLine}”`}
            </div>
          </div>

          {/* Bottom Watermark */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "24px",
                color: "rgba(246, 238, 243, 0.72)",
                fontWeight: 700,
              }}
            >
              생년월일만으로 보는 쉬운 사주 · 궁합
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(20, 11, 24, 0.65)",
                border: "2px solid rgba(255, 194, 75, 0.45)",
                borderRadius: "999px",
                padding: "14px 40px",
                fontSize: "32px",
                fontWeight: 700,
                color: "#FFC24B",
                letterSpacing: "0.02em",
              }}
            >
              kongdak.kr
            </div>
          </div>
        </div>
      ),
      {
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        fonts: [
          {
            name: "Pretendard",
            data: pretendardFont,
            style: "normal",
            weight: 700,
          },
        ],
      },
    );

    response.headers.set("X-Content-Type-Options", "nosniff");
    if (download) {
      response.headers.set(
        "Content-Disposition",
        `attachment; filename="kongdak_story_${score}pts.png"`,
      );
      response.headers.set(
        "Cache-Control",
        "private, max-age=0, must-revalidate",
      );
    } else {
      response.headers.set(
        "Cache-Control",
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      );
    }

    return response;
  } catch (error) {
    console.error("[OG Story] Error generating story image:", error);
    return new Response("Failed to generate story card", { status: 500 });
  }
}
