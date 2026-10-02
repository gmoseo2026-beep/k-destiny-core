// 홈 첫 화면 "탐색" 구성(탭·두근이 추천). 순수 함수 — 서버가 공개 판정한 목록만 받는다.
import type { CatalogItem } from "@/lib/catalog";

export type ExploreTabId = "popular" | "love" | "me" | "money" | "premium";

export interface ExploreTab {
  id: ExploreTabId;
  label: string;
  items: CatalogItem[];
}

// 두근이 추천(큐레이션). 실제 판매 순위가 아니므로 화면에 "인기 1위" 같은 순위 표현을 쓰지 않는다.
export const PICK_IDS = ["secret_love", "inner_mind", "cheating", "spicy_annual"] as const;

const TAB_IDS: Record<Exclude<ExploreTabId, "premium">, readonly string[]> = {
  // 추천 카드(PICK_IDS)에 이미 나온 상품은 여기서 뺀다
  popular: ["compat_basic", "reunion", "love_single", "marriage", "annual_2026", "wealth", "charm", "free_personality"],
  love: ["compat_basic", "inner_mind", "secret_love", "marriage", "reunion", "cheating", "conflict", "love_single", "charm"],
  me: ["free_personality", "annual_2026", "annual_2027", "spicy_annual", "health"],
  money: ["wealth", "career"],
};

const LABELS: Record<ExploreTabId, string> = {
  popular: "인기",
  love: "연애·궁합",
  me: "나",
  money: "돈·일",
  premium: "프리미엄",
};

function pick(ids: readonly string[], byId: Map<string, CatalogItem>): CatalogItem[] {
  return ids.map((id) => byId.get(id)).filter((p): p is CatalogItem => !!p && !p.isHidden);
}

/** 공개 상품으로 탭을 만든다. 숨긴 상품은 빠지고, 비어 버린 탭은 내보내지 않는다. */
export function buildExploreTabs(visible: CatalogItem[]): { tabs: ExploreTab[]; picks: CatalogItem[] } {
  const byId = new Map(visible.map((p) => [p.id, p]));
  const tabs: ExploreTab[] = (["popular", "love", "me", "money"] as const).map((id) => ({
    id,
    label: LABELS[id],
    items: pick(TAB_IDS[id], byId),
  }));
  tabs.push({
    id: "premium",
    label: LABELS.premium,
    items: visible.filter((p) => p.tier === "premium" && !p.isHidden),
  });
  return { tabs: tabs.filter((t) => t.items.length > 0), picks: pick(PICK_IDS, byId) };
}
