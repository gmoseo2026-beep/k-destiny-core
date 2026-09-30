import prisma from "@/lib/prisma";

export type GenLogKind = "TEASER" | "FREE" | "FULL" | "COMPAT" | "SUMMARY" | "DAILY";

export interface GenLogEntry {
  catalogId: string;
  kind: GenLogKind;
  ok: boolean;
  /** 이미 만든 저장본을 돌려준 경우(생성 성공·실패 집계에서는 뺀다) */
  cached?: boolean;
  ms?: number;
  /** 짧은 오류 이름만(원문 메시지·개인정보 금지) */
  error?: string;
}

/**
 * 어드민 지표용 생성 기록. 실패해도 사용자 요청에는 영향이 없어야 하므로 예외를 삼킨다.
 * 개인정보(이름·생년월일·이메일·주문번호)는 넣지 않는다.
 */
export async function logGeneration(e: GenLogEntry): Promise<void> {
  try {
    await prisma.reportGenLog.create({
      data: {
        catalogId: e.catalogId.slice(0, 64),
        kind: e.kind,
        ok: e.ok,
        cached: e.cached ?? false,
        ms: typeof e.ms === "number" ? Math.max(0, Math.round(e.ms)) : null,
        error: e.error ? e.error.slice(0, 80) : null,
      },
    });
  } catch (err) {
    console.warn("[genLog] 기록 실패(무시)", (err as Error)?.name ?? "error");
  }
}

/** 오류 객체에서 개인정보 없는 짧은 이름만 뽑는다 */
export function errorCode(e: unknown): string {
  if (e instanceof Error) return (e.name && e.name !== "Error" ? e.name : e.message.split(/[:\n]/)[0]).slice(0, 80);
  return "unknown";
}

/**
 * 미리보기 저장본 cacheKey 에서 상품 id 를 꺼낸다.
 *   TEASER:<상품>:<해시>:<궁합|->  ·  FREE:<상품>:<해시>
 * (예전 어드민은 세 번째 칸(해시)을 상품으로 읽어 미리보기 수가 항상 0이었다)
 */
export function teaserCatalogFromCacheKey(cacheKey: string): string | null {
  const [kind, catalogId] = cacheKey.split(":");
  return (kind === "TEASER" || kind === "FREE") && catalogId ? catalogId : null;
}
