import { NextResponse } from "next/server";
import { findIljuByBirthDate } from "@/lib/seo/ilju";

export async function POST(req: Request) {
  try {
    let body: { dob?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "잘못된 요청 형식입니다." },
        { status: 400 }
      );
    }

    if (typeof body?.dob !== "string") {
      return NextResponse.json(
        { error: "생년월일을 선택해 주세요." },
        { status: 400 }
      );
    }

    const entry = findIljuByBirthDate(body.dob.trim());
    if (!entry) {
      return NextResponse.json(
        { error: "올바른 생년월일(1900년 이후 유효한 날짜)을 선택해 주세요." },
        { status: 400 }
      );
    }

    // [PII 보호] 생년월일 원문과 한자 원국은 응답·로그 어디에도 남기지 않는다
    return NextResponse.json({
      slug: entry.slug,
      name: entry.name,
    });
  } catch {
    return NextResponse.json(
      { error: "일주 확인 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
