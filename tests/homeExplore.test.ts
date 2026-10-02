import { describe, it, expect } from "vitest";
import { CATALOG } from "@/lib/catalog";
import { buildExploreTabs, PICK_IDS } from "@/lib/home/explore";

const visible = CATALOG.map((p) => ({ ...p, isHidden: false }));

describe("홈 탐색 탭", () => {
  it("공개된 단건·프리미엄 상품은 모두 '인기' 외의 탭 어딘가에 들어 있다(세트 제외)", () => {
    const { tabs } = buildExploreTabs(visible);
    const inTabs = new Set(tabs.filter((t) => t.id !== "popular").flatMap((t) => t.items.map((p) => p.id)));
    const missing = visible.filter((p) => p.type !== "SET" && !inTabs.has(p.id)).map((p) => p.id);
    expect(missing).toEqual([]);
  });

  it("숨긴 상품은 탭과 추천에서 빠지고, 비어 버린 탭은 나오지 않는다", () => {
    const hidden = new Set(["wealth", "career", "secret_love"]);
    const { tabs, picks } = buildExploreTabs(visible.map((p) => ({ ...p, isHidden: hidden.has(p.id) })));
    for (const t of tabs) for (const p of t.items) expect(hidden.has(p.id), `${t.id}:${p.id}`).toBe(false);
    expect(tabs.find((t) => t.id === "money")).toBeUndefined();
    expect(picks.map((p) => p.id)).toEqual(["inner_mind", "cheating", "spicy_annual"]);
  });

  it("두근이 추천은 속궁합·매운맛 총운이고, 탭 순서는 인기→연애·궁합→나→돈·일→프리미엄", () => {
    const { tabs, picks } = buildExploreTabs(visible);
    expect(picks.map((p) => p.id)).toEqual([...PICK_IDS]);
    expect(tabs.map((t) => t.label)).toEqual(["인기", "연애·궁합", "나", "돈·일", "프리미엄"]);
    expect(tabs.find((t) => t.id === "premium")!.items.every((p) => p.tier === "premium")).toBe(true);
  });
});
