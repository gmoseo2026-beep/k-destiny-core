import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const STALE_MS = 3 * 60 * 1000;
const MAX_ATTEMPTS = 3;

export type ReportKind = "TEASER" | "FULL" | "FREE";
export interface ReportKey {
  cacheKey: string;
  kind: ReportKind;
  catalogId: string;
  orderId: string | null;
  userId: string | null;
  compatId: string | null;
  subjectHash: string;
}

export type ClaimResult =
  | { state: "READY"; reportId: string; content: Prisma.JsonValue }
  | { state: "OWNED"; reportId: string }
  | { state: "BUSY"; reportId: string }
  | { state: "GAVE_UP"; reportId: string };

/** 같은 cacheKey 생성 시 동시에 들어온 요청을 하나만 실행한다. 나머지는 READY/BUSY를 받는다. */
export async function claimGeneration(key: ReportKey): Promise<ClaimResult> {
  try {
    const created = await prisma.generatedReport.create({ data: { ...key, status: "GENERATING", attempts: 1 } });
    return { state: "OWNED", reportId: created.id };
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }
  
  const row = await prisma.generatedReport.findUnique({ where: { cacheKey: key.cacheKey } });
  if (!row) throw new Error("claimGeneration: row vanished");
  
  if (row.status === "READY" && row.content !== null) {
    return { state: "READY", reportId: row.id, content: row.content };
  }
  
  const stale = row.updatedAt.getTime() < Date.now() - STALE_MS;
  if (row.status === "GENERATING" && !stale) {
    return { state: "BUSY", reportId: row.id };
  }
  
  if (row.attempts >= MAX_ATTEMPTS) {
    return { state: "GAVE_UP", reportId: row.id };
  }
  
  // FAILED 거나 멈춘 GENERATING 은 updatedAt 조건으로 잠금을 획득하여 재시도
  const res = await prisma.generatedReport.updateMany({
    where: { id: row.id, updatedAt: row.updatedAt },
    data: { status: "GENERATING", attempts: { increment: 1 } },
  });
  
  return res.count === 1 ? { state: "OWNED", reportId: row.id } : { state: "BUSY", reportId: row.id };
}

export async function completeGeneration(reportId: string, content: Prisma.InputJsonValue, model: string): Promise<void> {
  await prisma.generatedReport.update({ where: { id: reportId }, data: { status: "READY", content, model } });
}

export async function failGeneration(reportId: string): Promise<void> {
  await prisma.generatedReport.update({ where: { id: reportId }, data: { status: "FAILED" } });
}
