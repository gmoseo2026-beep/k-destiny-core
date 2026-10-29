import { NextRequest, NextResponse } from "next/server";
import { grantPreviewShareBonus } from "@/lib/previewLimit";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * POST /api/preview/bonus
 * 결과 카드 공유 시트가 열렸을 때 기기(kd_vid) 기준 오늘의 무료 미리보기 한도를 하루 1번만 +3 한다.
 */
export async function POST(req: NextRequest) {
  const result = grantPreviewShareBonus(req);
  const res = NextResponse.json(
    {
      ok: true,
      granted: result.granted,
      alreadyGranted: result.alreadyGranted,
      bonus: result.bonus,
    },
    { status: 200, headers: NO_STORE },
  );

  for (const cookie of result.setCookies) {
    res.headers.append("Set-Cookie", cookie);
  }

  return res;
}
