export type ProductCategory =
  | "cat-fortune"
  | "cat-compat"
  | "cat-wealth"
  | "cat-reunion"
  | "cat-career"
  | "cat-premium";

export type ProductTarget = "individual" | "couple";
export type ProductTier = "standard" | "premium";
export type InputKind = "person" | "couple" | "child_naming" | "date_selection";

export interface CatalogItem {
  id: string; // productKey e.g. "annual_2026", "compat_basic"
  type: "FORTUNE" | "COMPAT" | "SET"; // productType (for order/unlock)
  name: string;
  description: string;
  category: ProductCategory;
  target: ProductTarget;
  price: number;
  originalPrice: number;
  icon: string; // lucide icon name or emoji
  promptKey: string; // used for destinyGen
  isNew?: boolean;
  isPopular?: boolean;
  isFree?: boolean;
  isHidden?: boolean;
  items?: string[]; // for SETs
  tier: ProductTier;
  inputKind: InputKind;
  accessDays: number;       // Unlock 유효기간(일). 표준 90, 프리미엄 365
  requiresLogin?: boolean;  // 결제에 로그인 필수 (annual_*, 총운 포함 세트, 프리미엄)
  passCovered?: boolean;    // 레거시 기간권 보유자 열람 허용 (compat_basic, annual_*)
}

export const FIRST_PURCHASE_PRICE = 4900; // 사장님 결정 D3: 회원 첫 결제 1회

export function isViewable(p: CatalogItem | undefined): p is CatalogItem {
  return !!p && !p.isHidden;
}
export function isSellable(p: CatalogItem | undefined): p is CatalogItem {
  return isViewable(p) && !p.isFree && p.price > 0;
}
export function isViewableFor(p: CatalogItem | undefined, preview: boolean): p is CatalogItem {
  return !!p && (!p.isHidden || preview);
}
export function isSellableFor(p: CatalogItem | undefined, preview: boolean): p is CatalogItem {
  return isViewableFor(p, preview) && !p.isFree && p.price > 0;
}
export function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

/** 화면 가격 표기의 유일한 출처(감사 B2). 서버 order route 의 계산 규칙과 반드시 같아야 한다. */
export function priceLabel(p: CatalogItem): string {
  if (p.isFree) return "무료";
  if (p.tier === "standard" && p.type !== "SET") {
    return `${formatWon(p.price)} · 회원 첫 결제 ${formatWon(FIRST_PURCHASE_PRICE)}`;
  }
  return formatWon(p.price);
}
export function getPremiumProducts(): CatalogItem[] {
  return CATALOG.filter((p) => p.tier === "premium" && !p.isHidden);
}

export const CATALOG: CatalogItem[] = [
  // --- INDIVIDUAL (개인 운세) ---
  {
    id: "free_personality",
    type: "FORTUNE",
    name: "타고난 성격과 기질",
    description: "내 사주에 숨겨진 진짜 내 모습을 확인해보세요",
    category: "cat-fortune",
    target: "individual",
    price: 0,
    originalPrice: 0,
    icon: "User",
    promptKey: "personality_basic",
    isFree: true,
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
  },
  {
    id: "annual_2026",
    type: "FORTUNE",
    name: "2026년 총운",
    description: "2026년 한 해의 흐름과 월별 운세, 조심해야 할 점",
    category: "cat-fortune",
    target: "individual",
    price: 6900,
    originalPrice: 6900,
    icon: "Calendar",
    promptKey: "annual_2026",
    isPopular: true,
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    requiresLogin: true,
    passCovered: true,
  },
  {
    id: "annual_2027",
    type: "FORTUNE",
    name: "2027년 신년운",
    description: "남들보다 한 발 앞서 준비하는 2027년의 흐름",
    category: "cat-fortune",
    target: "individual",
    price: 6900,
    originalPrice: 6900,
    icon: "Sparkles",
    promptKey: "annual_2027",
    isNew: true,
    isHidden: true,
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    requiresLogin: true,
    passCovered: true,
  },
  {
    id: "wealth",
    type: "FORTUNE",
    name: "재물운 심층분석",
    description: "나의 타고난 재물 그릇과 돈이 들어오는 시기",
    category: "cat-wealth",
    target: "individual",
    price: 6900,
    originalPrice: 6900,
    icon: "Coins",
    promptKey: "wealth_analysis",
    isPopular: true,
    isHidden: true,
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
  },
  {
    id: "career",
    type: "FORTUNE",
    name: "취업/이직운",
    description: "나에게 맞는 직업과 올해의 이동수",
    category: "cat-career",
    target: "individual",
    price: 6900,
    originalPrice: 6900,
    icon: "Briefcase",
    promptKey: "career_analysis",
    isHidden: true,
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
  },
  {
    id: "love_single",
    type: "FORTUNE",
    name: "연애운과 인연",
    description: "나의 연애 스타일과 진짜 인연이 나타나는 시기",
    category: "cat-compat",
    target: "individual",
    price: 6900,
    originalPrice: 6900,
    icon: "Heart",
    promptKey: "love_single_analysis",
    isHidden: true,
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
  },
  {
    id: "charm",
    type: "FORTUNE",
    name: "타고난 매력과 도화",
    description: "사주로 보는 나의 치명적인 매력 포인트",
    category: "cat-compat",
    target: "individual",
    price: 6900,
    originalPrice: 6900,
    icon: "Sparkle",
    promptKey: "charm_analysis",
    isHidden: true,
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
  },
  {
    id: "health",
    type: "FORTUNE",
    name: "건강운",
    description: "타고난 체질과 각별히 주의해야 할 건강 포인트",
    category: "cat-fortune",
    target: "individual",
    price: 6900,
    originalPrice: 6900,
    icon: "Activity",
    promptKey: "health_analysis",
    isHidden: true,
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
  },
  {
    id: "spicy_annual",
    type: "FORTUNE",
    name: "매운맛 팩폭 총운",
    description: "돌려 말하지 않는 두근이의 매운맛 현실 조언",
    category: "cat-reunion",
    target: "individual",
    price: 6900,
    originalPrice: 6900,
    icon: "Flame",
    promptKey: "spicy_annual",
    isNew: true,
    isHidden: true,
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
  },

  // --- RELATIONSHIP (관계/궁합) ---
  {
    id: "compat_basic",
    type: "COMPAT",
    name: "정통 궁합",
    description: "두 사람의 타고난 기운으로 보는 우리 궁합 점수",
    category: "cat-compat",
    target: "couple",
    price: 6900,
    originalPrice: 6900,
    icon: "HeartHandshake",
    promptKey: "compat_basic",
    isPopular: true,
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
    passCovered: true,
  },
  {
    id: "inner_mind",
    type: "COMPAT",
    name: "그 사람의 속마음",
    description: "말하지 않는 그 사람의 진짜 속마음",
    category: "cat-compat",
    target: "couple",
    price: 6900,
    originalPrice: 6900,
    icon: "MessageCircleHeart",
    promptKey: "inner_mind",
    isHidden: true,
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
  },
  {
    id: "reunion",
    type: "COMPAT",
    name: "재회운",
    description: "헤어진 우리, 다시 만날 수 있을까요?",
    category: "cat-reunion",
    target: "couple",
    price: 6900,
    originalPrice: 6900,
    icon: "Undo2",
    promptKey: "reunion",
    isPopular: true,
    isHidden: true,
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
  },
  {
    id: "cheating",
    type: "COMPAT",
    name: "바람기 분석",
    description: "그 사람의 숨겨진 바람기와 연애 성향",
    category: "cat-reunion",
    target: "couple",
    price: 6900,
    originalPrice: 6900,
    icon: "Eye",
    promptKey: "cheating_tendency",
    isHidden: true,
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
  },
  {
    id: "marriage",
    type: "COMPAT",
    name: "결혼 궁합",
    description: "연애를 넘어 결혼 상대로서의 우리는 어떨까?",
    category: "cat-compat",
    target: "couple",
    price: 6900,
    originalPrice: 6900,
    icon: "Gem",
    promptKey: "marriage_compat",
    isHidden: true,
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
  },
  {
    id: "conflict",
    type: "COMPAT",
    name: "갈등과 해법",
    description: "우리가 자주 싸우는 진짜 이유와 완벽한 해결책",
    category: "cat-reunion",
    target: "couple",
    price: 6900,
    originalPrice: 6900,
    icon: "Swords",
    promptKey: "conflict_resolution",
    isHidden: true,
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
  },
  {
    id: "secret_love",
    type: "COMPAT",
    name: "은밀한 속궁합",
    description: "누구에게도 말 못할 두 사람만의 비밀스러운 궁합",
    category: "cat-compat",
    target: "couple",
    price: 6900,
    originalPrice: 6900,
    icon: "Moon",
    promptKey: "secret_love",
    isNew: true,
    isHidden: true,
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
  },

  // --- SETS (세트 상품) ---
  {
    id: "set_this_person",
    type: "SET",
    name: "이 사람 세트",
    description: "정통 궁합 + 속마음 + 결혼 궁합",
    category: "cat-compat",
    target: "couple",
    price: 12900,
    originalPrice: 12900,
    icon: "Users",
    promptKey: "SET",
    items: ["compat_basic", "inner_mind", "marriage"],
    isPopular: true,
    isHidden: true,
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
  },
  {
    id: "set_reunion",
    type: "SET",
    name: "재회 세트",
    description: "재회운 + 속마음 + 갈등과 해법",
    category: "cat-reunion",
    target: "couple",
    price: 12900,
    originalPrice: 12900,
    icon: "HeartCrack",
    promptKey: "SET",
    items: ["reunion", "inner_mind", "conflict"],
    isHidden: true,
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
  },
  {
    id: "set_love",
    type: "SET",
    name: "연애 종합 세트",
    description: "연애운과 인연 + 타고난 매력",
    category: "cat-compat",
    target: "individual",
    price: 12900,
    originalPrice: 12900,
    icon: "HeartHandshake",
    promptKey: "SET",
    items: ["love_single", "charm"],
    isHidden: true,
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
  },
  {
    id: "set_me",
    type: "SET",
    name: "나 종합 세트",
    description: "2026년 총운 + 재물 + 취업 + 건강",
    category: "cat-fortune",
    target: "individual",
    price: 12900,
    originalPrice: 12900,
    icon: "Star",
    promptKey: "SET",
    items: ["annual_2026", "wealth", "career", "health"],
    isHidden: true,
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    requiresLogin: true,
  },
  {
    id: "set_career",
    type: "SET",
    name: "취업/이직 세트",
    description: "취업이직운 + 2026년 총운",
    category: "cat-career",
    target: "individual",
    price: 12900,
    originalPrice: 12900,
    icon: "Briefcase",
    promptKey: "SET",
    items: ["career", "annual_2026"],
    isHidden: true,
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    requiresLogin: true,
  },
  {
    id: "set_2027",
    type: "SET",
    name: "2027 신년 종합 세트",
    description: "2027년 신년운 + 재물 + 취업",
    category: "cat-fortune",
    target: "individual",
    price: 16900,
    originalPrice: 16900,
    icon: "Sparkles",
    promptKey: "SET",
    items: ["annual_2027", "wealth", "career"],
    isNew: true,
    isHidden: true,
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    requiresLogin: true,
  },
  // --- PREMIUM 3종 ---
  {
    id: "premium_2027_daeun", type: "FORTUNE", tier: "premium", inputKind: "person",
    name: "2027 대운 프리미엄 리포트",
    description: "앞으로 10년의 큰 흐름 속 2027년의 자리와 12개월 상세 달력",
    category: "cat-premium", target: "individual", price: 19900, originalPrice: 19900,
    icon: "Crown", promptKey: "premium_2027_daeun", accessDays: 365, requiresLogin: true, isHidden: true,
  },
  {
    id: "premium_naming", type: "FORTUNE", tier: "premium", inputKind: "child_naming",
    name: "우리 아이 이름 짓기",
    description: "아이의 사주에 맞춘 좋은 이름 5개와 한 글자씩 담긴 이야기",
    category: "cat-premium", target: "individual", price: 39000, originalPrice: 39000,
    icon: "Baby", promptKey: "premium_naming", accessDays: 365, requiresLogin: true, isHidden: true,
  },
  {
    id: "premium_date_pick", type: "FORTUNE", tier: "premium", inputKind: "date_selection",
    name: "길일 택일",
    description: "결혼·이사·개업·계약, 원하는 기간 안에서 가장 좋은 날 5곳",
    category: "cat-premium", target: "individual", price: 19900, originalPrice: 19900,
    icon: "CalendarHeart", promptKey: "premium_date_pick", accessDays: 365, requiresLogin: true, isHidden: true,
  },
];

export function getProduct(id: string): CatalogItem | undefined {
  return CATALOG.find((p) => p.id === id);
}

export function getProductsByTarget(target: ProductTarget): CatalogItem[] {
  return CATALOG.filter((p) => p.tier === "standard" && p.target === target && p.type !== "SET" && !p.isHidden);
}

export function getSetsByTarget(target: ProductTarget): CatalogItem[] {
  return CATALOG.filter((p) => p.tier === "standard" && p.target === target && p.type === "SET" && !p.isHidden);
}

export function getAllProducts(): CatalogItem[] {
  return CATALOG.filter((p) => p.tier === "standard" && !p.isHidden);
}
