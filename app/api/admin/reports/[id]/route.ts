import { NextResponse } from "next/server";
import { getAdminSessionOrThrow, logAdminAction } from "@/lib/adminAuth";
import { readEnvelope } from "@/lib/reports/standard";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "리포트 ID가 필요합니다." }, { status: 400 });
  }

  const report = await prisma.generatedReport.findUnique({
    where: { id },
  });

  if (!report) {
    return NextResponse.json({ error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  }

  // 관리자의 리포트 내용 조회를 감사 로그로 기록 (A6 필수)
  await logAdminAction({
    adminUserId: admin.id,
    action: "REPORT_VIEW",
    targetType: "REPORT",
    targetId: id,
    detail: {
      reportId: id,
      cacheKey: report.cacheKey,
      kind: report.kind,
      status: report.status,
    },
  });

  const envelope = readEnvelope(report.content);

  return NextResponse.json(
    {
      success: true,
      report: {
        id: report.id,
        cacheKey: report.cacheKey,
        kind: report.kind,
        status: report.status,
        attempts: report.attempts,
        firstViewedAt: report.firstViewedAt,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        envelope,
        rawContent: report.content,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
