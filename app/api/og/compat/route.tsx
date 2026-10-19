import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { isValidInviteToken, relationLabel } from "@/lib/compatInviteClient";
import enMessages from "@/messages/en.json";
import jaMessages from "@/messages/ja.json";
import zhMessages from "@/messages/zh.json";

export const runtime = "nodejs";

type GlobalOgLocale = "en" | "ja" | "zh";

const COUPLE_KEYWORD_MAPS: Record<GlobalOgLocale, Record<string, string>> = {
  en: (enMessages.Couple?.keywords ?? {}) as Record<string, string>,
  ja: (jaMessages.Couple?.keywords ?? {}) as Record<string, string>,
  zh: (zhMessages.Couple?.keywords ?? {}) as Record<string, string>,
};

const CJK_OR_KANA_RE = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

let fontDataCache: ArrayBuffer | null = null;
const cjkSubsetCache = new Map<string, ArrayBuffer>();

async function getPretendardFont(): Promise<ArrayBuffer> {
  if (!fontDataCache) {
    const fontPath = path.join(process.cwd(), "public", "fonts", "Pretendard-Bold.ttf");
    const buffer = await fs.readFile(fontPath);
    fontDataCache = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }
  return fontDataCache;
}

/**
 * Fetch a lightweight Google Fonts TTF/OTF subset for Japanese/Chinese characters so
 * Satori never renders tofu (□). Returns null on timeout/offline so caller can fall back to English.
 */
async function fetchCjkFontSubset(
  locale: GlobalOgLocale,
  text: string
): Promise<ArrayBuffer | null> {
  const uniqueChars = Array.from(new Set(Array.from(text))).join("");
  if (!uniqueChars) return null;
  const family = locale === "ja" ? "Noto+Sans+JP" : "Noto+Sans+SC";
  const cacheKey = `${family}:${uniqueChars}`;
  const cached = cjkSubsetCache.get(cacheKey);
  if (cached) return cached;

  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:wght@700&text=${encodeURIComponent(
      uniqueChars
    )}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const cssRes = await fetch(cssUrl, {
      headers: {
        // Older UA makes Google Fonts return truetype/opentype instead of woff2 (which Satori doesn't support)
        "User-Agent":
          "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
      },
      signal: controller.signal,
    });
    if (!cssRes.ok) {
      clearTimeout(timer);
      return null;
    }
    const cssText = await cssRes.text();
    const match = cssText.match(/src:\s*url\(([^)]+)\)\s*format\(['"](?:truetype|opentype)['"]\)/);
    if (!match?.[1]) {
      clearTimeout(timer);
      return null;
    }
    const fontRes = await fetch(match[1], { signal: controller.signal });
    clearTimeout(timer);
    if (!fontRes.ok) return null;
    const buf = await fontRes.arrayBuffer();
    if (cjkSubsetCache.size > 60) {
      const firstKey = cjkSubsetCache.keys().next().value;
      if (firstKey) cjkSubsetCache.delete(firstKey);
    }
    cjkSubsetCache.set(cacheKey, buf);
    return buf;
  } catch {
    return null;
  }
}

/**
 * GET /api/og/compat
 * 콩닥 궁합 공유 카드 및 인스타 스토리용 이미지 동적 생성 (@vercel/og)
 *
 * Query Params:
 * - shareToken: DB에서 결과 조회용 토큰
 * - inviteToken: 반쪽 궁합 초대장 토큰 (nameA와 ?만 표시)
 * - score, nameA, nameB, k1, k2, k3 (fallback용 파라미터)
 * - lang: "en" | "ja" | "zh" (외국어 공유 카드 지정용)
 * - w: 가로 너비 (기본 1200, 스토리 1080)
 * - h: 세로 높이 (기본 630, 스토리 1350)
 * - download: "true"일 경우 Content-Disposition: attachment 헤더 추가
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shareToken = searchParams.get("shareToken");
    const inviteToken = searchParams.get("inviteToken");
    const download = searchParams.get("download") === "true";
    const langParam = searchParams.get("lang");

    let cardLocale: GlobalOgLocale | null =
      !inviteToken && (langParam === "en" || langParam === "ja" || langParam === "zh")
        ? langParam
        : null;

    let score = searchParams.get("score") || "91";
    let nameA = searchParams.get("nameA") || (cardLocale ? "Person A" : "나");
    let nameB = searchParams.get("nameB") || (cardLocale ? "Person B" : "상대방");
    let keywords = [
      searchParams.get("k1") || "천생연분",
      searchParams.get("k2") || "기운 찰떡궁합",
      searchParams.get("k3") || "운명적 케미",
    ];

    // 미인증 공개 엔드포인트이므로 크기를 반드시 검증·제한한다.
    // (NaN 이면 ImageResponse 가 스트리밍 중 throw 하여 응답이 끊기고,
    //  큰 값이면 요청 1건이 수십 초의 CPU 를 먹는 DoS 벡터가 된다)
    const clampDim = (raw: string | null, fallback: number, min: number, max: number) => {
      const n = Number.parseInt(raw ?? "", 10);
      if (!Number.isFinite(n)) return fallback;
      return Math.min(max, Math.max(min, n));
    };
    const width = clampDim(searchParams.get("w"), 1200, 200, 1200);
    const height = clampDim(searchParams.get("h"), 630, 200, 1350);
    const isStory = height > 1000; // 1080x1350 세로 스토리 모드 여부

    // [P-008] 반쪽 궁합 초대장 카드: nameA와 ?만 그린다(점수·관계 외 정보 없음)
    if (inviteToken) {
      let inviteRelation = "love";
      nameA = "상대방";
      nameB = "?";
      score = "?";

      if (isValidInviteToken(inviteToken)) {
        const invite = await prisma.compatInvite
          .findUnique({
            where: { token: inviteToken },
            select: {
              personA: true,
              relation: true,
              completedCompatId: true,
            },
          })
          .catch(() => null);

        if (invite) {
          inviteRelation = invite.relation;
          const pA = invite.personA as { name?: unknown } | null;
          if (typeof pA?.name === "string" && pA.name.trim()) {
            nameA = pA.name.trim();
          } else if (invite.completedCompatId) {
            const completedCompat = await prisma.compatibility
              .findUnique({
                where: { id: invite.completedCompatId },
                select: { personA: true },
              })
              .catch(() => null);
            const cpA = completedCompat?.personA as { name?: unknown } | null;
            if (typeof cpA?.name === "string" && cpA.name.trim()) {
              nameA = cpA.name.trim();
            }
          }
        }
      }

      keywords = [
        `${relationLabel(inviteRelation)} 반쪽 초대장`,
        `${nameA}님 입력 완료`,
        "내 생년월일만 채우면 완성",
      ];
    } else if (shareToken) {
      // DB에서 shareToken으로 최신 정보 조회 (locale 컬럼이 아직 없는 DB에서도 안전하게 동작하도록 폴백)
      const compat = await prisma.compatibility
        .findUnique({
          where: { shareToken },
          select: {
            score: true,
            keywords: true,
            personA: true,
            personB: true,
            locale: true,
          },
        })
        .catch(async () =>
          prisma.compatibility
            .findUnique({
              where: { shareToken },
              select: {
                score: true,
                keywords: true,
                personA: true,
                personB: true,
              },
            })
            .catch(() => null)
        );

      if (compat) {
        score = String(compat.score);
        if (Array.isArray(compat.keywords) && compat.keywords.length > 0) {
          keywords = compat.keywords.slice(0, 3);
        }
        const pA = compat.personA as { name?: string } | null;
        const pB = compat.personB as { name?: string } | null;
        if (pA?.name) nameA = pA.name;
        if (pB?.name) nameB = pB.name;
        const dbLocale = (compat as { locale?: string | null }).locale;
        if (dbLocale === "en" || dbLocale === "ja" || dbLocale === "zh") {
          cardLocale = dbLocale;
        }
      }
    }

    const pretendardFont = await getPretendardFont();
    let cjkFont: ArrayBuffer | null = null;

    if (cardLocale) {
      if (nameA === "나") nameA = "Person A";
      if (nameB === "상대방") nameB = "Person B";

      const rawKeywords = [...keywords];
      const dict = COUPLE_KEYWORD_MAPS[cardLocale];
      const enDict = COUPLE_KEYWORD_MAPS.en;
      keywords = rawKeywords
        .map((kw) => dict[kw] || enDict[kw] || (!/[가-힣]/.test(kw) ? kw : ""))
        .filter(Boolean);

      const combinedText = `${nameA}${nameB}${keywords.join("")}`;
      if (CJK_OR_KANA_RE.test(combinedText)) {
        cjkFont = await fetchCjkFontSubset(cardLocale, combinedText);
        if (!cjkFont) {
          // If Google Fonts subset cannot be fetched, fall back to English keywords & safe names so □ never renders
          keywords = rawKeywords
            .map((kw) => enDict[kw] || (!CJK_OR_KANA_RE.test(kw) && !/[가-힣]/.test(kw) ? kw : ""))
            .filter(Boolean);
          if (CJK_OR_KANA_RE.test(nameA)) nameA = "Person A";
          if (CJK_OR_KANA_RE.test(nameB)) nameB = "Person B";
        }
      }
    }

    const response = new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(145deg, #FF8AA1 0%, #FF5C77 45%, #6A2C70 100%)",
            padding: isStory ? "80px 60px" : "48px 60px",
            fontFamily: cjkFont ? "Pretendard, NotoCJK, sans-serif" : "Pretendard, sans-serif",
            color: "#ffffff",
          }}
        >
          {/* Top Brand Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
            }}
          >
            {/* Heart & Spark Symbol */}
            <svg
              width={isStory ? "48" : "40"}
              height={isStory ? "48" : "40"}
              viewBox="0 0 64 64"
              fill="none"
            >
              <path
                d="M32 55 C 12 41, 6 30, 6 21 C 6 13.5, 11.5 9, 18 9 C 25 9, 30 15, 32 19 L 32 55 Z"
                fill="#ffffff"
                opacity="0.95"
              />
              <path
                d="M32 55 C 52 41, 58 30, 58 21 C 58 13.5, 52.5 9, 46 9 C 39 9, 34 15, 32 19 L 32 55 Z"
                fill="#FFD9E0"
              />
              <path
                d="M14 31 H24 L28 22 L34 40 L38 31 H50"
                stroke="#6A2C70"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="50" cy="14" r="4" fill="#FFC24B" />
            </svg>
            {cardLocale ? (
              <span
                style={{
                  fontSize: isStory ? "36px" : "30px",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                }}
              >
                kongdak
              </span>
            ) : (
              <span
                style={{
                  fontSize: isStory ? "36px" : "30px",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                }}
              >
                콩닥 <span style={{ opacity: 0.85, fontSize: isStory ? "24px" : "20px", fontWeight: 600 }}>kongdak</span>
              </span>
            )}
          </div>

          {/* Center Card Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255, 255, 255, 0.15)",
              border: "2px solid rgba(255, 255, 255, 0.3)",
              borderRadius: isStory ? "40px" : "32px",
              padding: isStory ? "60px 40px" : "32px 48px",
              width: "100%",
              maxWidth: isStory ? "900px" : "960px",
              boxShadow: "0 20px 50px rgba(106, 44, 112, 0.35)",
            }}
          >
            {/* Couple Names */}
            <div
              style={{
                fontSize: isStory ? "40px" : "32px",
                fontWeight: 700,
                color: "#FFF6F1",
                marginBottom: isStory ? "20px" : "12px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span>{nameA}</span>
              <span style={{ color: "#FFC24B", fontSize: isStory ? "36px" : "28px" }}>❤️</span>
              <span>{nameB}</span>
              <span style={{ opacity: 0.9, fontSize: isStory ? "32px" : "26px", fontWeight: 500 }}>
                {cardLocale ? "'s Compatibility" : "의 궁합"}
              </span>
            </div>

            {/* Score Display */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "center",
                margin: isStory ? "20px 0" : "8px 0",
              }}
            >
              <span
                style={{
                  fontSize: isStory ? "140px" : "108px",
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "#ffffff",
                  textShadow: "0 8px 24px rgba(106, 44, 112, 0.4)",
                  letterSpacing: "-0.03em",
                }}
              >
                {score}
              </span>
              <span
                style={{
                  fontSize: isStory ? "54px" : "40px",
                  fontWeight: 800,
                  color: "#FFC24B",
                  marginLeft: "8px",
                }}
              >
                {cardLocale ? "pts" : "점"}
              </span>
            </div>

            {/* Keywords Chips */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginTop: isStory ? "30px" : "16px",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {keywords.map((kw, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#ffffff",
                    color: "#6A2C70",
                    borderRadius: "999px",
                    padding: isStory ? "14px 28px" : "10px 22px",
                    fontSize: isStory ? "26px" : "20px",
                    fontWeight: 700,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  {kw}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Viral CTA Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(43, 36, 48, 0.5)",
              borderRadius: "999px",
              padding: isStory ? "18px 36px" : "12px 28px",
              border: "1px solid rgba(255, 255, 255, 0.25)",
            }}
          >
            {cardLocale ? (
              <span
                style={{
                  fontSize: isStory ? "26px" : "20px",
                  fontWeight: 700,
                  color: "#FFF6F1",
                  letterSpacing: "-0.01em",
                }}
              >
                ✨ Check your compatibility in 30s → <span style={{ color: "#FFC24B" }}>kongdak.kr</span>
              </span>
            ) : (
              <span
                style={{
                  fontSize: isStory ? "26px" : "20px",
                  fontWeight: 700,
                  color: "#FFF6F1",
                  letterSpacing: "-0.01em",
                }}
              >
                ✨ 내 궁합도 30초면 확인 → <span style={{ color: "#FFC24B" }}>kongdak.kr</span>
              </span>
            )}
          </div>
        </div>
      ),
      {
        width,
        height,
        fonts: [
          {
            name: "Pretendard",
            data: pretendardFont,
            style: "normal",
            weight: 700,
          },
          ...(cjkFont
            ? [
                {
                  name: "NotoCJK",
                  data: cjkFont,
                  style: "normal" as const,
                  weight: 700 as const,
                },
              ]
            : []),
        ],
      }
    );

    // next.config.ts 의 전역 `no-store` 가 이 라우트에도 걸리면 카카오/구글 크롤러가
    // 공유 스크랩마다 PNG 를 새로 렌더링하게 되어(satori+resvg) 스크랩 타임아웃 →
    // 공유 카드 미표시로 이어진다. 결과는 shareToken 당 불변이므로 장기 캐시한다.
    response.headers.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800, immutable"
    );
    // next.config.ts 의 전역 보안 헤더 블록에서 api/og 를 제외했으므로 여기서 직접 부여한다.
    response.headers.set("X-Content-Type-Options", "nosniff");

    if (download) {
      response.headers.set(
        "Content-Disposition",
        `attachment; filename="kongdak_compat_${score}pts.png"`
      );
      // 다운로드 응답은 사용자 조작 결과이므로 공유 캐시에 남기지 않는다.
      response.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    }

    return response;
  } catch (error) {
    console.error("[OG Compat] Error generating image:", error);
    return new Response("Failed to generate OG image", { status: 500 });
  }
}
