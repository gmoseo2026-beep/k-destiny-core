export type ProductCategory =
  | "cat-fortune"
  | "cat-compat"
  | "cat-wealth"
  | "cat-reunion"
  | "cat-career";

export type ProductTarget = "individual" | "couple";

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
  items?: string[]; // for SETs
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
  },
  {
    id: "annual_2026",
    type: "FORTUNE",
    name: "2026년 총운",
    description: "2026년 한 해의 흐름과 월별 운세, 조심해야 할 점",
    category: "cat-fortune",
    target: "individual",
    price: 6900,
    originalPrice: 15000,
    icon: "Calendar",
    promptKey: "annual_2026",
    isPopular: true,
  },
  {
    id: "annual_2027",
    type: "FORTUNE",
    name: "2027년 신년운",
    description: "남들보다 한 발 앞서 준비하는 2027년의 흐름",
    category: "cat-fortune",
    target: "individual",
    price: 6900,
    originalPrice: 15000,
    icon: "Sparkles",
    promptKey: "annual_2027",
    isNew: true,
  },
  {
    id: "wealth",
    type: "FORTUNE",
    name: "재물운 심층분석",
    description: "나의 타고난 재물 그릇과 돈이 들어오는 시기",
    category: "cat-wealth",
    target: "individual",
    price: 6900,
    originalPrice: 15000,
    icon: "Coins",
    promptKey: "wealth_analysis",
    isPopular: true,
  },
  {
    id: "career",
    type: "FORTUNE",
    name: "취업/이직운",
    description: "나에게 맞는 직업과 올해의 이동수",
    category: "cat-career",
    target: "individual",
    price: 6900,
    originalPrice: 15000,
    icon: "Briefcase",
    promptKey: "career_analysis",
  },
  {
    id: "love_single",
    type: "FORTUNE",
    name: "연애운과 인연",
    description: "나의 연애 스타일과 진짜 인연이 나타나는 시기",
    category: "cat-compat",
    target: "individual",
    price: 6900,
    originalPrice: 15000,
    icon: "Heart",
    promptKey: "love_single_analysis",
  },
  {
    id: "charm",
    type: "FORTUNE",
    name: "타고난 매력과 도화",
    description: "사주로 보는 나의 치명적인 매력 포인트",
    category: "cat-compat",
    target: "individual",
    price: 6900,
    originalPrice: 15000,
    icon: "Sparkle",
    promptKey: "charm_analysis",
  },
  {
    id: "health",
    type: "FORTUNE",
    name: "건강운",
    description: "타고난 체질과 각별히 주의해야 할 건강 포인트",
    category: "cat-fortune",
    target: "individual",
    price: 6900,
    originalPrice: 15000,
    icon: "Activity",
    promptKey: "health_analysis",
  },
  {
    id: "spicy_annual",
    type: "FORTUNE",
    name: "매운맛 팩폭 총운",
    description: "돌려 말하지 않는 두근이의 매운맛 현실 조언",
    category: "cat-reunion",
    target: "individual",
    price: 6900,
    originalPrice: 15000,
    icon: "Flame",
    promptKey: "spicy_annual",
    isNew: true,
  },

  // --- RELATIONSHIP (관계/궁합) ---
  {
    id: "compat_basic",
    type: "COMPAT",
    name: "정통 궁합",
    description: "오행으로 풀어내는 우리 두 사람의 궁합 점수",
    category: "cat-compat",
    target: "couple",
    price: 6900,
    originalPrice: 15000,
    icon: "HeartHandshake",
    promptKey: "compat_basic",
    isPopular: true,
  },
  {
    id: "inner_mind",
    type: "COMPAT",
    name: "그 사람의 속마음",
    description: "말하지 않는 그 사람의 진짜 속마음",
    category: "cat-compat",
    target: "couple",
    price: 6900,
    originalPrice: 15000,
    icon: "MessageCircleHeart",
    promptKey: "inner_mind",
  },
  {
    id: "reunion",
    type: "COMPAT",
    name: "재회운",
    description: "헤어진 우리, 다시 만날 수 있을까요?",
    category: "cat-reunion",
    target: "couple",
    price: 6900,
    originalPrice: 15000,
    icon: "Undo2",
    promptKey: "reunion",
    isPopular: true,
  },
  {
    id: "cheating",
    type: "COMPAT",
    name: "바람기 분석",
    description: "그 사람의 숨겨진 바람기와 연애 성향",
    category: "cat-reunion",
    target: "couple",
    price: 6900,
    originalPrice: 15000,
    icon: "Eye",
    promptKey: "cheating_tendency",
  },
  {
    id: "marriage",
    type: "COMPAT",
    name: "결혼 궁합",
    description: "연애를 넘어 결혼 상대로서의 우리는 어떨까?",
    category: "cat-compat",
    target: "couple",
    price: 6900,
    originalPrice: 15000,
    icon: "Gem",
    promptKey: "marriage_compat",
  },
  {
    id: "conflict",
    type: "COMPAT",
    name: "갈등과 해법",
    description: "우리가 자주 싸우는 진짜 이유와 완벽한 해결책",
    category: "cat-reunion",
    target: "couple",
    price: 6900,
    originalPrice: 15000,
    icon: "Swords",
    promptKey: "conflict_resolution",
  },
  {
    id: "secret_love",
    type: "COMPAT",
    name: "은밀한 속궁합",
    description: "누구에게도 말 못할 두 사람만의 비밀스러운 궁합",
    category: "cat-compat",
    target: "couple",
    price: 6900,
    originalPrice: 15000,
    icon: "Moon",
    promptKey: "secret_love",
    isNew: true,
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
    originalPrice: 20700,
    icon: "Users",
    promptKey: "SET",
    items: ["compat_basic", "inner_mind", "marriage"],
    isPopular: true,
  },
  {
    id: "set_reunion",
    type: "SET",
    name: "재회 세트",
    description: "재회운 + 속마음 + 갈등과 해법",
    category: "cat-reunion",
    target: "couple",
    price: 12900,
    originalPrice: 20700,
    icon: "HeartCrack",
    promptKey: "SET",
    items: ["reunion", "inner_mind", "conflict"],
  },
  {
    id: "set_love",
    type: "SET",
    name: "연애 종합 세트",
    description: "연애운과 인연 + 타고난 매력",
    category: "cat-compat",
    target: "individual",
    price: 12900,
    originalPrice: 13800,
    icon: "HeartHandshake",
    promptKey: "SET",
    items: ["love_single", "charm"],
  },
  {
    id: "set_me",
    type: "SET",
    name: "나 종합 세트",
    description: "2026년 총운 + 재물 + 취업 + 건강",
    category: "cat-fortune",
    target: "individual",
    price: 12900,
    originalPrice: 27600,
    icon: "Star",
    promptKey: "SET",
    items: ["annual_2026", "wealth", "career", "health"],
  },
  {
    id: "set_career",
    type: "SET",
    name: "취업/이직 세트",
    description: "취업이직운 + 2026년 총운",
    category: "cat-career",
    target: "individual",
    price: 12900,
    originalPrice: 13800,
    icon: "Briefcase",
    promptKey: "SET",
    items: ["career", "annual_2026"],
  },
  {
    id: "set_2027",
    type: "SET",
    name: "2027 신년 종합 세트",
    description: "2027년 신년운 + 재물 + 취업",
    category: "cat-fortune",
    target: "individual",
    price: 16900,
    originalPrice: 20700,
    icon: "Sparkles",
    promptKey: "SET",
    items: ["annual_2027", "wealth", "career"],
    isNew: true,
  },
];

export function getProduct(id: string): CatalogItem | undefined {
  return CATALOG.find((p) => p.id === id);
}

export function getProductsByTarget(target: ProductTarget): CatalogItem[] {
  return CATALOG.filter((p) => p.target === target && p.type !== "SET");
}

export function getSetsByTarget(target: ProductTarget): CatalogItem[] {
  return CATALOG.filter((p) => p.target === target && p.type === "SET");
}

export function getAllProducts(): CatalogItem[] {
  return CATALOG;
}
