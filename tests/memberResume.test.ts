import { describe, it, expect } from "vitest";
import { getProduct } from "@/lib/catalog";
import { pickResumeItems, RESUME_MAX_AGE_DAYS, type PaidRef, type ResumeCandidate } from "@/lib/member/resume";

const NOW = new Date("2026-10-05T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
const find = (id: string) => getProduct(id);
const teaser = (catalogId: string, days: number, compatId: string | null = null): ResumeCandidate => ({
  kind: "teaser",
  catalogId,
  compatId,
  at: daysAgo(days),
});

describe("이어보기 — 미리보기만 보고 결제하지 않은 것 고르기", () => {
  it("최근 것부터 최대 2개, 같은 입력이면 같은 결과", () => {
    const c = [teaser("wealth", 3), teaser("career", 1), teaser("charm", 2)];
    const a = pickResumeItems(c, [], find, "ko", NOW);
    expect(a.map((i) => i.catalogId)).toEqual(["career", "charm"]);
    expect(pickResumeItems([...c].reverse(), [], find, "ko", NOW)).toEqual(a);
  });

  it("개인 상품은 저장된 내 정보로 바로 미리보기 주소", () => {
    const [it0] = pickResumeItems([teaser("wealth", 1)], [], find, "ko", NOW);
    expect(it0.href).toBe("/ko/fortune/new?productId=wealth&auto=1");
  });

  it("커플 상품은 봤던 두 사람으로 이어지는 주소", () => {
    const [it0] = pickResumeItems([teaser("inner_mind", 1, "cmp1")], [], find, "ko", NOW);
    expect(it0.href).toBe("/ko/compat/new?productId=inner_mind&from=cmp1");
  });

  it("무료 궁합만 본 경우는 그 궁합 결과 화면으로", () => {
    const c: ResumeCandidate[] = [{ kind: "compat", catalogId: "compat_basic", compatId: "cmp9", at: daysAgo(1) }];
    const [it0] = pickResumeItems(c, [], find, "ko", NOW);
    expect(it0.href).toBe("/ko/compat/cmp9");
  });

  it("이미 산 것은 빼고, 그 상품이 든 세트를 산 경우도 뺀다", () => {
    const c = [teaser("wealth", 1), teaser("career", 2)];
    const paidSelf: PaidRef[] = [{ catalogId: "wealth", compatId: null }];
    expect(pickResumeItems(c, paidSelf, find, "ko", NOW).map((i) => i.catalogId)).toEqual(["career"]);
    // set_2027 = annual_2027 + wealth + career
    const paidSet: PaidRef[] = [{ catalogId: "set_2027", compatId: null }];
    expect(pickResumeItems(c, paidSet, find, "ko", NOW)).toEqual([]);
  });

  it("커플 상품은 다른 두 사람 것을 샀다면 그대로 보여 준다", () => {
    const c = [teaser("inner_mind", 1, "cmpA")];
    const other: PaidRef[] = [{ catalogId: "inner_mind", compatId: "cmpB" }];
    expect(pickResumeItems(c, other, find, "ko", NOW)).toHaveLength(1);
    const same: PaidRef[] = [{ catalogId: "inner_mind", compatId: "cmpA" }];
    expect(pickResumeItems(c, same, find, "ko", NOW)).toEqual([]);
  });

  it("같은 상품은 가장 최근 것 하나만", () => {
    const c = [teaser("inner_mind", 5, "old"), teaser("inner_mind", 1, "new")];
    const out = pickResumeItems(c, [], find, "ko", NOW);
    expect(out).toHaveLength(1);
    expect(out[0].compatId).toBe("new");
  });

  it("너무 오래된 것·숨긴 상품·세트·프리미엄·두 사람이 없는 커플 상품은 뺀다", () => {
    expect(pickResumeItems([teaser("wealth", RESUME_MAX_AGE_DAYS + 1)], [], find, "ko", NOW)).toEqual([]);
    expect(pickResumeItems([teaser("wealth", 1)], [], () => undefined, "ko", NOW)).toEqual([]);
    expect(pickResumeItems([teaser("set_me", 1)], [], find, "ko", NOW)).toEqual([]);
    expect(pickResumeItems([teaser("premium_naming", 1)], [], find, "ko", NOW)).toEqual([]);
    expect(pickResumeItems([teaser("inner_mind", 1, null)], [], find, "ko", NOW)).toEqual([]);
    expect(pickResumeItems([teaser("free_personality", 1)], [], find, "ko", NOW)).toEqual([]);
  });
});
