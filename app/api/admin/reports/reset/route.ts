import { NextResponse } from "next/server";
import { getAdminSessionOrThrow, logAdminAction } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  let admin;
  try {
    admin = await getAdminSessionOrThrow();
  } catch (err: unknown) {
    const errorObj = err as { message?: string; status?: number } | undefined;
    return NextResponse.json(
      { error: errorObj?.message || "관리자 권한이 없습니다." },
      { status: errorObj?.status || 403 }
    );
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { reportId, reason } = (body || {}) as {
    reportId?: string;
    reason?: string;
  };

  if (!reportId || typeof reportId !== "string") {
    return NextResponse.json({ error: "reportId는 필수입니다." }, { status: 400 });
  }

  const report = await prisma.generatedReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    return NextResponse.json({ error: "해당 리포트를 찾을 수 없습니다." }, { status: 404 });
  }

  // 완성본(READY)이나 생성 중(10분 이내 GENERATING)을 리셋하면 고객 리포트가 새로 생성돼 내용이 바뀐다 → 실패 건만 허용
  const STALE_MS = 10 * 60 * 1000;
  const isStaleGenerating =
    report.status === "GENERATING" && Date.now() - report.updatedAt.getTime() >= STALE_MS;
  if (report.status === "READY" || (report.status === "GENERATING" && !isStaleGenerating)) {
    return NextResponse.json(
      { error: "생성에 실패한 리포트만 재시도를 허용할 수 있습니다." },
      { status: 409 }
    );
  }

  // content 는 보존하면서 status: "FAILED", attempts: 0 으로 갱신 (claimGeneration 이 재시도할 수 있도록)
  const updated = await prisma.generatedReport.update({
    where: { id: reportId },
    data: {
      status: "FAILED",
      attempts: 0,
    },
  });

  await logAdminAction({
    adminUserId: admin.id,
    action: "REPORT_RESET",
    targetType: "REPORT",
    targetId: reportId,
    detail: {
      reportId,
      previousStatus: report.status,
      previousAttempts: report.attempts,
      reason: typeof reason === "string" ? reason.trim() : "재시도 허용",
    },
  });

  return NextResponse.json(
    {
      success: true,
      reportId: updated.id,
      status: updated.status,
      attempts: updated.attempts,
      message: "리포트 생성이 재시도 가능한 상태로 초기화되었습니다.",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
