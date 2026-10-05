/**
 * "지난번에 보던 것 이어보기" — 미리보기만 보고 결제하지 않은 회원이 다시 왔을 때 보여 줄 항목 고르기.
 *
 * 2026-10-05: 구매 회원 6명 전원이 가입 후 10분 안에 결제했고, 나중에 돌아와 결제한 사람은 없었다.
 * 광고성 연락은 수신 동의가 없어 보낼 수 없으므로, 돌아온 사람에게 사이트 안에서 보던 곳을 바로 이어 준다.
 *
 * 순수 함수(같은 입력 = 같은 결과). DB 읽기는 app/api/user/resume 이 한다.
 */
import type { CatalogItem } from "@/lib/catalog";
import { grantingCatalogIds } from "@/lib/productIdentity";

export interface ResumeCandidate {
  /** teaser = 유료 리포트의 무료 미리보기를 봄, compat = 무료 궁합 결과를 봄(심층 미결제) */
  kind: "teaser" | "compat";
  catalogId: string;
  compatId: string | null;
  at: Date;
}

/** 결제한 것: 카탈로그 id + (커플 상품이면) 어느 두 사람 것인지 */
export interface PaidRef {
  catalogId: string;
  compatId: string | null;
}

export interface ResumeItem {
  kind: "teaser" | "compat";
  catalogId: string;
  compatId: string | null;
  href: string;
}

export const RESUME_MAX_ITEMS = 2;
export const RESUME_MAX_AGE_DAYS = 60;

export function resumeHref(locale: string, c: ResumeCandidate, product: CatalogItem): string {
  if (c.kind === "compat" && c.compatId) return `/${locale}/compat/${c.compatId}`;
  // 커플 상품은 봤던 두 사람으로 입력 없이 미리보기를 다시 연다
  if (product.target === "couple" && c.compatId) {
    return `/${locale}/compat/new?productId=${product.id}&from=${c.compatId}`;
  }
  // 개인 상품은 저장된 내 정보로 바로 미리보기(없으면 입력 화면이 그 상품으로 열린다)
  return `/${locale}/fortune/new?productId=${product.id}&auto=1`;
}

function isPaid(c: ResumeCandidate, product: CatalogItem, paid: PaidRef[]): boolean {
  const granting = new Set(grantingCatalogIds(c.catalogId));
  return paid.some((p) => {
    if (!granting.has(p.catalogId)) return false;
    // 커플 상품은 같은 두 사람 것을 샀을 때만 "이미 샀다"
    if (product.target === "couple") return !p.compatId || !c.compatId || p.compatId === c.compatId;
    return true;
  });
}

/**
 * @param findProduct 지금 팔고 있는(공개된) 상품만 돌려준다. 숨긴 상품·세트·프리미엄은 undefined.
 */
export function pickResumeItems(
  candidates: ResumeCandidate[],
  paid: PaidRef[],
  findProduct: (catalogId: string) => CatalogItem | undefined,
  locale: string,
  now: Date = new Date()
): ResumeItem[] {
  const oldest = now.getTime() - RESUME_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const seen = new Set<string>();
  const out: ResumeItem[] = [];
  const sorted = [...candidates].sort((a, b) => b.at.getTime() - a.at.getTime());
  for (const c of sorted) {
    if (out.length >= RESUME_MAX_ITEMS) break;
    if (c.at.getTime() < oldest) continue;
    const product = findProduct(c.catalogId);
    if (!product || product.type === "SET" || product.tier !== "standard" || product.isFree) continue;
    if (product.target === "couple" && !c.compatId) continue;
    // 같은 상품은 한 번만(가장 최근 것)
    if (seen.has(c.catalogId)) continue;
    if (isPaid(c, product, paid)) continue;
    seen.add(c.catalogId);
    out.push({ kind: c.kind, catalogId: c.catalogId, compatId: c.compatId, href: resumeHref(locale, c, product) });
  }
  return out;
}
