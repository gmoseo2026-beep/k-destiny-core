import { NextRequest, NextResponse } from "next/server";
import { validateAskThreeQuestions } from "@/lib/askThreeSafety";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const rawQuestions =
      body && typeof body === "object" && "questions" in body
        ? (body as { questions?: unknown }).questions
        : undefined;

    const result = validateAskThreeQuestions(rawQuestions);
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: "UNSAFE_QUESTION",
          category: result.category,
          index: result.index,
          error: result.message,
        },
        { status: 400, headers: NO_STORE },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        questions: result.questions,
      },
      { status: 200, headers: NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "질문 확인 중 문제가 생겼어요. 다시 시도해 주세요." },
      { status: 400, headers: NO_STORE },
    );
  }
}
