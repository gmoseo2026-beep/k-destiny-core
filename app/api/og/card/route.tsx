import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import { isViewableFor } from "@/lib/catalog";
import { getEffectiveProduct } from "@/lib/catalogVisibility";
import { FORTUNE_TARGET_YEAR, birthYearFacts, isBirthYearInRange, parsePairSlug } from "@/lib/seo/zodiac";

export const runtime = "nodejs";

let fontDataCache: ArrayBuffer | null = null;

async function getPretendardFont(): Promise<ArrayBuffer> {
  if (!fontDataCache) {
    const fontPath = path.join(process.cwd(), "public", "fonts", "Pretendard-Bold.ttf");
    const buffer = await fs.readFile(fontPath);
    fontDataCache = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }
  return fontDataCache;
}

// 홈 링크를 공유했을 때의 카드. 답을 주지 않는 질문 하나로 "눌러 봐야 아는" 상태를 만든다.
const HOME_CARD = {
  question: "그 사람, 지금 나를 어떻게 생각할까?",
  label: "궁합 · 속마음 · 속궁합",
};

/** 검색용 페이지 카드 문구. 값이 올바르지 않으면 null(홈 카드로 대신한다). */
function seoCard(pair: string | null, year: string | null): { question: string; label: string } | null {
  if (pair) {
    const parsed = parsePairSlug(pair);
    if (!parsed) return null;
    return { question: `${parsed.a.name}띠와 ${parsed.b.name}띠 궁합, 잘 맞을까?`, label: "띠 궁합" };
  }
  if (year && /^[0-9]{4}$/.test(year) && isBirthYearInRange(Number(year))) {
    const f = birthYearFacts(Number(year));
    return {
      question: `${f.birthYear}년생 ${f.animal.name}띠, ${FORTUNE_TARGET_YEAR}년은 어떤 해일까?`,
      label: `${FORTUNE_TARGET_YEAR}년 운세`,
    };
  }
  return null;
}

/**
 * GET /api/og/card            — 홈 공유 카드
 * GET /api/og/card?p=<상품 id> — 상품 링크 공유 카드(상품의 질문형 hook 을 크게)
 * GET /api/og/card?z=<띠 쌍>   — 띠 궁합 페이지 카드(예: rat-ox)
 * GET /api/og/card?y=<출생연도> — 출생연도별 운세 페이지 카드(예: 1995)
 *
 * 개인정보를 받지 않는 공개 엔드포인트다. 자유 문장은 받지 않는다 — 상품 id·띠 쌍·출생연도처럼
 * 정해진 값만 받아 문구를 서버가 만든다(남이 임의 문구를 콩닥 카드로 찍어 내지 못하게).
 */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const productId = sp.get("p");
  const seo = seoCard(sp.get("z"), sp.get("y"));
  // 숨긴 상품은 홈 카드로 대신한다(공개 판정은 관리자 설정을 반영한 isViewableFor 로만)
  const found = productId ? await getEffectiveProduct(productId).catch(() => undefined) : undefined;
  const product = isViewableFor(found ?? undefined, false) ? found : undefined;
  const question = seo ? seo.question : product ? product.hook : HOME_CARD.question;
  const label = seo ? seo.label : product ? product.name : HOME_CARD.label;

  const font = await getPretendardFont();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(140deg, #2B2430 0%, #4A2150 55%, #6A2C70 100%)",
          padding: "56px 72px",
          fontFamily: "Pretendard, sans-serif",
          color: "#FFF6F1",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
            <path
              d="M32 56 C 12 42, 6 31, 6 21 C 6 13.5, 11.5 8, 18.5 8 C 25 8, 30 13, 32 18 C 34 13, 39 8, 45.5 8 C 52.5 8, 58 13.5, 58 21 C 58 31, 52 42, 32 56 Z"
              fill="#FF5C77"
            />
          </svg>
          <div style={{ display: "flex", fontSize: "34px", fontWeight: 700 }}>콩닥</div>
          <div
            style={{
              display: "flex",
              marginLeft: "12px",
              padding: "6px 18px",
              borderRadius: "999px",
              border: "2px solid rgba(255,138,161,0.6)",
              color: "#FF8AA1",
              fontSize: "24px",
            }}
          >
            {label}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: question.length > 26 ? "62px" : "72px",
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: "-1.5px",
            maxWidth: "1040px",
            wordBreak: "keep-all",
          }}
        >
          {question}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: "28px", color: "rgba(255,246,241,0.82)" }}>
            생년월일만 넣으면 30초 · 무료로 먼저 보기
          </div>
          <div
            style={{
              display: "flex",
              padding: "14px 30px",
              borderRadius: "999px",
              background: "#FF5C77",
              color: "#ffffff",
              fontSize: "28px",
              fontWeight: 700,
            }}
          >
            kongdak.kr
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Pretendard", data: font, weight: 700, style: "normal" }],
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    }
  );
}
