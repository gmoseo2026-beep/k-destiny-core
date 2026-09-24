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

  // T2 신규 필드
  icon3d: string;           // 3D 아이콘 웹 경로 (예: "/icons3d/wealth.webp")
  gridLabel: string;        // 4칸 격자용 짧은 이름 (6자 안팎)
  hook: string;             // 한 줄 후킹 문구 (두근이 말투, 해요체)
  recommendFor: string[];   // 이런 분께 추천해요 (정확히 3개)
  featuredOrder?: number;   // 추천 및 홈 격자 정렬 순서
  subtitle?: string;        // 질문형 부제 (상세 페이지 제목용)
  pointDesc?: Record<string, string>; // "이런 내용" 섹션별 요약
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
    icon3d: "/icons3d/free_personality.webp",
    gridLabel: "성격·기질",
    hook: "내 안에 숨어 있던 진짜 내 모습을 가만히 들여다봐요",
    subtitle: "남들이 보는 나와 내가 느끼는 진짜 나는 얼마나 다를까?",
    recommendFor: [
      "남들이 보는 나와 내가 느끼는 나의 차이가 궁금한 분",
      "나만의 타고난 강점과 성향을 더 잘 이해하고 싶은 분",
      "선택의 순간마다 나다운 결정을 내리고 싶은 분"
    ],
    featuredOrder: 3,
    pointDesc: {
      first_impression: "남이 보는 나의 첫인상과 내면의 차이",
      motivation: "내가 지치지 않고 앞으로 나아가게 하는 동기",
      relationship: "친구, 연인, 동료 앞에서 나타나는 관계 속 모습",
      recovery: "방전되었을 때 에너지를 채워주는 나만의 회복 루틴"
    }
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
    icon3d: "/icons3d/annual_2026.webp",
    gridLabel: "2026 총운",
    hook: "2026년 한 해, 나에게 찾아올 소중한 기회와 흐름을 짚어드려요",
    subtitle: "올 한 해 나를 기다리는 행운과 조심해야 할 순간은 언제일까?",
    recommendFor: [
      "2026년 한 해 동안 나에게 찾아올 주요 흐름이 궁금한 분",
      "월별로 조심해야 할 시기와 기회의 달을 미리 알고 싶은 분",
      "새해 계획을 똑똑하고 실속 있게 세우고 싶은 분"
    ],
    featuredOrder: 2,
    pointDesc: {
      yearly_overview: "2026년 한 해 전체를 관통하는 핵심 기운과 총평",
      monthly_flow: "1월부터 12월까지 계절별 운세의 오르내림",
      caution_points: "올해 특히 주의하고 현명하게 넘겨야 할 포인트",
      fortune_tips: "나에게 찾아올 좋은 기운을 살리는 행동 팁"
    }
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
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    requiresLogin: true,
    passCovered: true,
    icon3d: "/icons3d/annual_2027.webp",
    gridLabel: "2027 신년",
    hook: "남들보다 한 걸음 먼저 2027년의 새로운 바람을 준비해요",
    subtitle: "한 발 앞서 내다보는 2027년의 새로운 기운은 어떨까?",
    recommendFor: [
      "남들보다 한 해 일찍 미래를 준비하고 싶은 분",
      "2027년의 변화와 흐름을 미리 내다보고 싶은 분",
      "중장기 계획을 차분하게 세우고자 하는 분"
    ],
    featuredOrder: 15,
    pointDesc: {
      yearly_overview: "2027년의 전체적인 흐름과 새롭게 열리는 기운",
      monthly_flow: "상반기와 하반기 주요 시기별 운세 흐름",
      caution_points: "미리 알고 대비하면 피해갈 수 있는 주의점",
      fortune_tips: "2027년을 나의 해로 만드는 실천 조언"
    }
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
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    icon3d: "/icons3d/wealth.webp",
    gridLabel: "재물운",
    hook: "내 주머니를 채워줄 기운과 돈이 모이는 타이밍을 알아봐요",
    subtitle: "나에게 돈이 들어오는 길과 새는 구멍은 어디에 있을까?",
    recommendFor: [
      "돈이 모이지 않고 쉽게 새어나간다고 느끼는 분",
      "나에게 재물 기운이 가장 강하게 들어오는 시기가 궁금한 분",
      "재테크나 투자 타이밍에 참고하고 싶은 분"
    ],
    featuredOrder: 5,
    pointDesc: {
      wealth_capacity: "내가 담을 수 있는 재물의 그릇과 타고난 소비 성향",
      income_path: "직장 월급, 부업, 투자 중 나에게 더 맞는 길",
      spending_habit: "무심코 반복하던 지출 패턴을 끊어내는 법",
      yearly_flow: "앞으로 1년 동안 분기별로 찾아올 재물 흐름"
    }
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
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    icon3d: "/icons3d/career.webp",
    gridLabel: "취업·이직",
    hook: "내가 가장 빛날 수 있는 자리와 이직의 타이밍을 찾아드려요",
    subtitle: "지금 일터가 내게 맞을까, 새로운 도전의 타이밍은 언제일까?",
    recommendFor: [
      "지금 직장에서 이직을 고민하고 계신 분",
      "나의 재능을 가장 잘 펼칠 수 있는 업무 환경을 찾고 싶은 분",
      "올해 이직과 승진 등 커리어 이동수를 점검하고 싶은 분"
    ],
    featuredOrder: 6,
    pointDesc: {
      work_style: "혼자 일할 때와 함께 일할 때 나의 강점",
      best_environment: "나의 잠재력을 최대로 끌어올려 줄 직무와 환경",
      timing: "앞으로 1년 동안 이직과 이동에 유리한 타이밍",
      weapon: "면접과 연봉 협상에서 나를 돋보이게 할 진짜 무기"
    }
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
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    icon3d: "/icons3d/love_single.webp",
    gridLabel: "연애·인연",
    hook: "마음이 통하는 인연이 언제쯤 내 곁으로 다가올까요?",
    subtitle: "설레는 인연은 언제, 어디서, 어떤 모습으로 다가올까?",
    recommendFor: [
      "언제쯤 마음에 쏙 드는 인연을 만날지 기다려지는 분",
      "반복되는 연애 패턴에서 벗어나 새로운 시작을 원하는 분",
      "나와 성향이 잘 맞는 상대의 특징을 미리 알고 싶은 분"
    ],
    featuredOrder: 4,
    pointDesc: {
      love_style: "사랑에 빠졌을 때 나타나는 나의 진짜 연애 스타일",
      attraction: "단순히 끌리는 사람과 오래 편안하게 잘 맞는 사람의 차이",
      timing: "새로운 인연이 들어올 가능성이 높은 시기와 장소",
      break_pattern: "늘 비슷한 이유로 끝나던 아쉬운 패턴을 끊는 법"
    }
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
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    icon3d: "/icons3d/charm.webp",
    gridLabel: "매력·도화",
    hook: "나도 미처 몰랐던 사람들의 시선을 사로잡는 나만의 매력",
    subtitle: "남들의 눈에 비치는 나의 독보적인 매력 포인트는 무엇일까?",
    recommendFor: [
      "나만의 독보적인 분위기와 매력을 알고 싶은 분",
      "사람들에게 더 호감과 신뢰를 주고 싶은 분",
      "이성에게 자연스럽게 매력을 어필하고 싶은 분"
    ],
    featuredOrder: 10,
    pointDesc: {
      others_view: "주변 사람들이 나를 볼 때 가장 먼저 느끼는 매력",
      hidden_charm: "알면 알수록 빠져드는 나만의 숨은 반전 매력",
      best_moment: "사람들 사이에서 내 존재감이 가장 빛나는 순간",
      bad_habit: "매력을 반감시킬 수 있어 주의해야 할 사소한 습관"
    }
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
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    icon3d: "/icons3d/health.webp",
    gridLabel: "건강운",
    hook: "지치기 쉬운 계절, 내 몸이 보내는 작은 신호들을 미리 챙겨요",
    subtitle: "타고난 체질과 올 한 해 각별히 챙겨야 할 건강 포인트는?",
    recommendFor: [
      "평소 쉽게 피로하거나 특정 부위가 약하다고 느끼는 분",
      "올해 각별히 조심해야 할 계절과 건강 신호가 궁금한 분",
      "생활 습관과 컨디션을 건강하게 점검하고 싶은 분"
    ],
    featuredOrder: 12,
    pointDesc: {
      stamina: "타고난 체력의 리듬과 에너지가 소모되는 패턴",
      warning_sign: "피로가 쌓였을 때 몸이 먼저 보내는 주의 신호",
      recovery_routine: "지친 몸과 마음을 빠르게 회복시켜 주는 루틴",
      seasonal_care: "사계절 환절기마다 컨디션을 지키는 관리 팁"
    }
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
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    icon3d: "/mascot/transparent/expr_2_flame.webp",
    gridLabel: "매운맛 총운",
    hook: "돌려 말하지 않고 뼈를 때리는 두근이의 현실 조언",
    subtitle: "달콤한 위로보다 내 뼈를 때려줄 현실적인 조언이 필요하다면?",
    recommendFor: [
      "듣기 좋은 말보다 솔직하고 현실적인 팩폭이 필요한 분",
      "나태해진 마음을 다잡고 새 출발을 하고 싶은 분",
      "인생의 브레이크와 명쾌한 결단이 필요한 분"
    ],
    featuredOrder: 14,
    pointDesc: {
      summary: "올 한 해 나를 마주하는 직설적이고 명쾌한 진단",
      weakness: "알면서도 자꾸만 내 발목을 잡던 나만의 약점",
      drop_it: "더 나은 내일을 위해 지금 당장 버려야 할 습관과 생각",
      weapon: "어떤 위기 상황에서도 나를 든든하게 지켜줄 비장의 무기"
    }
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
    icon3d: "/mascot/transparent/couple_red_thread.webp",
    gridLabel: "정통 궁합",
    hook: "두근이가 살짝 재 본 우리 둘의 마음",
    subtitle: "두 사람의 타고난 기운이 만났을 때 생기는 설렘과 온도는?",
    recommendFor: [
      "지금 썸을 타거나 연애 중인 우리 사이가 궁금한 분",
      "서로의 성향과 끌림의 포인트를 확인하고 싶은 분",
      "앞으로 더 다정하게 관계를 가꿔가고 싶은 분"
    ],
    featuredOrder: 1,
    pointDesc: {
      chemistry: "둘만의 첫인상과 서로에게 빠져드는 매력 포인트",
      communication: "대화할 때의 티키타카와 감정의 온도",
      conflict: "사소한 일로 부딪히기 쉬운 순간과 서로를 배려하는 법",
      advice: "오래오래 다정하게 함께하기 위한 두근이의 현실 조언"
    }
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
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
    icon3d: "/icons3d/inner_mind.webp",
    gridLabel: "그 사람 속마음",
    hook: "겉으로는 차마 말하지 못한 그 사람의 속마음이 궁금할 때",
    subtitle: "알쏭달쏭한 태도 뒤에 숨겨진 그 사람의 진짜 생각은 무엇일까?",
    recommendFor: [
      "그 사람의 알쏭달쏭한 태도 때문에 밤잠 설치는 분",
      "표현하지 않는 상대방의 진짜 감정을 알고 싶은 분",
      "관계를 진전시키기 위한 확실한 힌트가 필요한 분"
    ],
    featuredOrder: 7,
    pointDesc: {
      view_on_me: "그 사람이 나를 바라보고 느끼는 솔직한 시선",
      hidden_mind: "겉으로 표현하지 못하고 마음속에 담아둔 생각",
      anxiety: "관계에서 그 사람이 남몰래 불안해하거나 망설이는 부분",
      open_mind: "그 사람의 마음 문을 스르륵 열어주는 다정한 대화법"
    }
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
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
    icon3d: "/icons3d/reunion.webp",
    gridLabel: "재회운",
    hook: "끝난 인연일까, 아직 이어져 있을까? 다시 만날 가능성을 살펴봐요",
    subtitle: "헤어진 우리, 다시 연락해도 될까? 다시 이어질 여지가 남아있을까?",
    recommendFor: [
      "헤어진 연인에게 아직 미련과 마음이 남아 있는 분",
      "먼저 연락해도 될지, 상대방 연락을 기다려야 할지 고민인 분",
      "다시 시작했을 때 같은 실수를 반복하지 않고 싶은 분"
    ],
    featuredOrder: 8,
    pointDesc: {
      real_reason: "겉으로 드러난 핑계 뒤에 숨겨진 진짜 이별의 이유",
      possibility: "두 사람 사이에 아직 남아 있는 감정과 재회 가능성",
      timing: "상대방의 마음이 열리는 적절한 연락 타이밍과 방법",
      important: "재회 자체보다 더 중요한, 서로를 위한 마음가짐"
    }
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
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
    icon3d: "/icons3d/cheating.webp",
    gridLabel: "바람기 분석",
    hook: "그 사람의 마음에 흔들림이 생기는 순간과 연애 패턴을 짚어봐요",
    subtitle: "그 사람의 숨겨진 유혹 취약점과 관계를 단단히 지키는 법은?",
    recommendFor: [
      "상대방의 사교성과 바람기 성향이 불안하게 느껴지는 분",
      "연인과의 신뢰를 다지기 위해 미리 주의점을 알고 싶은 분",
      "상대방이 연애에서 유혹에 취약해지는 시기를 알고 싶은 분"
    ],
    featuredOrder: 11,
    pointDesc: {
      tendency: "그 사람이 연애할 때 나타나는 본래의 애정 성향",
      weak_moment: "마음이 다른 곳으로 흔들리기 쉬운 상황과 타이밍",
      strengthen: "둘 사이의 믿음과 신뢰를 한층 더 단단하게 만드는 법",
      my_rule: "불안해하지 않고 나 자신을 지키며 대처하는 현명한 기준"
    }
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
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
    icon3d: "/icons3d/marriage.webp",
    gridLabel: "결혼 궁합",
    hook: "연애를 넘어 평생을 함께할 동반자로서 우리는 어떨까요?",
    subtitle: "연애와는 또 다른 결혼 생활, 둘이 함께하면 더 행복할까?",
    recommendFor: [
      "결혼을 진지하게 고민하고 있거나 준비 중인 커플",
      "결혼 후 생활 습관이나 경제관념 조율이 궁금한 분",
      "둘이 함께했을 때 더 풍요로워지는지 확인하고 싶은 분"
    ],
    featuredOrder: 9,
    pointDesc: {
      basic: "연애를 넘어 평생을 함께할 동반자로서의 기본 궁합",
      practical: "경제관념, 집안일, 가족 관계 등 현실적인 조화도",
      crisis: "결혼 생활에서 부딪히기 쉬운 위기의 지점과 예방법",
      promise: "함께 오래오래 사랑하며 살아가기 위해 나눌 약속"
    }
  },
  {
    id: "conflict",
    type: "COMPAT",
    name: "갈등과 해법",
    description: "우리가 자주 싸우는 진짜 이유와 풀어 가는 방법",
    category: "cat-reunion",
    target: "couple",
    price: 6900,
    originalPrice: 6900,
    icon: "Swords",
    promptKey: "conflict_resolution",
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
    icon3d: "/icons3d/conflict.webp",
    gridLabel: "갈등과 해법",
    hook: "우리가 자주 부딪히는 이유와 서로를 편안하게 해주는 해법",
    subtitle: "사소한 일로 자주 싸우는 우리, 어떻게 풀어가야 할까?",
    recommendFor: [
      "사소한 일로 자주 다투어 마음이 지친 커플",
      "대화만 하면 싸움으로 번지는 패턴을 깨고 싶은 분",
      "서로의 화법과 감정 표현 방식을 이해하고 싶은 분"
    ],
    featuredOrder: 11,
    pointDesc: {
      reason: "반복해서 다투게 되는 두 사람 사이의 진짜 원인",
      style: "화가 났을 때 각자가 감정을 표현하고 처리하는 방식",
      stop_word: "격해진 분위기를 가라앉히고 싸움을 멈추는 마법의 한마디",
      reconnect: "다툰 뒤 서먹해지지 않고 더 깊은 신뢰로 이어지는 법"
    }
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
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
    icon3d: "/icons3d/secret_love.webp",
    gridLabel: "속궁합",
    hook: "두 사람만의 숨겨진 케미와 은밀한 끌림의 온도를 확인해요",
    subtitle: "말로는 꺼내기 쑥스러웠던 둘만의 은밀한 케미는 어떨까?",
    recommendFor: [
      "서로의 숨겨진 밤의 취향과 케미가 궁금한 분",
      "스킨십과 친밀감을 더욱 높이고 싶은 커플",
      "말로 꺼내기 쑥스러웠던 속마음을 확인하고 싶은 분"
    ],
    featuredOrder: 13,
    pointDesc: {
      temperature: "두 사람 사이에 흐르는 정서적·신체적 친밀감의 온도",
      expression: "애정을 표현하고 교감할 때의 선호와 스타일",
      fulfill: "서로에게서 채워지는 감정적 만족과 특별한 유대감",
      keep_flutter: "익숙해진 연인 사이에서도 처음의 설렘을 지키는 비결"
    }
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
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
    icon3d: "/icons3d/set_this_person.webp",
    gridLabel: "이 사람 세트",
    hook: "궁합부터 속마음, 결혼까지 이 사람의 모든 것을 한 번에",
    subtitle: "궁합·속마음·결혼까지, 한 번에 확인해 보세요",
    recommendFor: [
      "현재 만나는 사람과의 모든 것을 깊이 있게 알고 싶은 분",
      "궁합, 속마음, 결혼까지 꼼꼼히 점검하고 싶은 분",
      "개별 구매보다 혜택 있는 구성으로 보고 싶은 분"
    ],
    featuredOrder: 20
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
    tier: "standard",
    inputKind: "couple",
    accessDays: 90,
    icon3d: "/icons3d/reunion.webp",
    gridLabel: "재회 세트",
    hook: "다시 닿고 싶은 마음, 재회와 갈등 해법을 함께 풀어요",
    subtitle: "이별 후의 속마음과 재회 가능성을 한 번에 풀어보세요",
    recommendFor: [
      "이별 후 재회의 가능성과 대화 해법을 모두 찾고 싶은 분",
      "그 사람의 속마음과 다시 만날 타이밍이 절실한 분",
      "과거의 갈등을 바로잡고 다시 시작하고 싶은 분"
    ],
    featuredOrder: 21
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
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    icon3d: "/icons3d/love_single.webp",
    gridLabel: "연애 세트",
    hook: "새로운 만남부터 숨은 매력까지 내 연애운의 모든 것",
    subtitle: "인연의 시기와 나만의 매력을 한눈에 정리해보세요",
    recommendFor: [
      "솔로 탈출을 위해 내 매력과 연애운을 총점검하고 싶은 분",
      "언제 누구와 사랑에 빠질지 미리 알고 싶은 분",
      "더 매력적인 모습으로 연애를 시작하고 싶은 분"
    ],
    featuredOrder: 22
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
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    requiresLogin: true,
    icon3d: "/icons3d/set_me.webp",
    gridLabel: "나 종합 세트",
    hook: "총운·재물·커리어·건강까지 나를 위한 종합 가이드",
    subtitle: "2026년 나의 한 해를 총운부터 재물·취업·건강까지",
    recommendFor: [
      "2026년 나의 총운, 재물, 커리어, 건강을 한눈에 보고 싶은 분",
      "인생의 중요한 한 해를 체계적으로 준비하고 싶은 분",
      "나 자신에 대해 깊이 있는 통찰을 얻고 싶은 분"
    ],
    featuredOrder: 23
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
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    requiresLogin: true,
    icon3d: "/icons3d/career.webp",
    gridLabel: "취업 세트",
    hook: "나에게 딱 맞는 커리어 방향과 올 한 해의 이동수",
    subtitle: "취업과 이직, 올 한 해 커리어 흐름을 한 번에",
    recommendFor: [
      "취업과 이직을 본격적으로 준비하며 새해 운세를 보고 싶은 분",
      "나의 커리어 타이밍과 이동수를 면밀히 살피고 싶은 분",
      "더 나은 조건으로 도약하고 싶은 직장인과 취준생"
    ],
    featuredOrder: 24
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
    tier: "standard",
    inputKind: "person",
    accessDays: 90,
    requiresLogin: true,
    icon3d: "/icons3d/annual_2027.webp",
    gridLabel: "2027 세트",
    hook: "2027년을 미리 준비하는 신년 종합 리포트",
    subtitle: "남들보다 앞서 준비하는 2027년 신년 종합 가이드",
    recommendFor: [
      "2027년의 재물, 일, 전체적인 운세를 미리 선점하고 싶은 분",
      "장기적인 사업이나 커리어 계획을 세우는 분",
      "다가올 기회를 놓치지 않고 차분히 준비하고 싶은 분"
    ],
    featuredOrder: 25
  },

  // --- PREMIUM 3종 ---
  {
    id: "premium_2027_daeun",
    type: "FORTUNE",
    tier: "premium",
    inputKind: "person",
    name: "2027 대운 프리미엄 리포트",
    description: "앞으로 10년의 큰 흐름 속 2027년의 자리와 12개월 상세 달력",
    category: "cat-premium",
    target: "individual",
    price: 19900,
    originalPrice: 19900,
    icon: "Crown",
    promptKey: "premium_2027_daeun",
    accessDays: 365,
    requiresLogin: true,
    icon3d: "/icons3d/premium_2027_daeun.webp",
    gridLabel: "10년 대운",
    hook: "10년 인생 대운의 길목에서 만나는 2027년 심층 리포트",
    subtitle: "10년의 거대한 대운 속에서 2027년은 어디쯤 위치해 있을까?",
    recommendFor: [
      "10년 대운의 거대한 흐름 속에서 내 인생을 조망하고 싶은 분",
      "2027년 12개월의 상세한 월별 달력과 전략이 필요한 분",
      "인생의 큰 전환점을 앞두고 깊이 있는 가이드가 필요한 분"
    ],
    featuredOrder: 30
  },
  {
    id: "premium_naming",
    type: "FORTUNE",
    tier: "premium",
    inputKind: "child_naming",
    name: "우리 아이 이름 짓기",
    description: "아이의 사주에 맞춘 좋은 이름 5개와 한 글자씩 담긴 이야기",
    category: "cat-premium",
    target: "individual",
    price: 39000,
    originalPrice: 39000,
    icon: "Baby",
    promptKey: "premium_naming",
    accessDays: 365,
    requiresLogin: true,
    icon3d: "/icons3d/premium_naming.webp",
    gridLabel: "이름 짓기",
    hook: "아이의 사주에 꼭 맞는 축복 가득한 이름 5가지",
    subtitle: "아이의 사주를 따뜻하게 보완해줄 평생의 이름을 선물하세요",
    recommendFor: [
      "소중한 우리 아이에게 평생의 선물이 될 이름을 지어주고 싶은 분",
      "사주의 타고난 기운을 따뜻하게 보완해줄 이름을 찾는 분",
      "좋은 뜻과 어감을 모두 갖춘 맞춤형 이름을 원하는 분"
    ],
    featuredOrder: 31
  },
  {
    id: "premium_date_pick",
    type: "FORTUNE",
    tier: "premium",
    inputKind: "date_selection",
    name: "길일 택일",
    description: "결혼·이사·개업·계약, 원하는 기간 안에서 가장 좋은 날 5곳",
    category: "cat-premium",
    target: "individual",
    price: 19900,
    originalPrice: 19900,
    icon: "CalendarHeart",
    promptKey: "premium_date_pick",
    accessDays: 365,
    requiresLogin: true,
    icon3d: "/icons3d/premium_date_pick.webp",
    gridLabel: "길일 택일",
    hook: "새로운 시작을 가장 좋은 날에 맞이하는 맞춤 택일",
    subtitle: "결혼·이사·개업, 내가 원하는 기간 안에서 가장 좋은 길일은?",
    recommendFor: [
      "결혼, 이사, 개업 등 인생의 중요한 날을 앞둔 분",
      "원하는 기간 중에서 가장 복된 길일을 선택하고 싶은 분",
      "후회 없는 특별한 날을 정하고 싶은 분"
    ],
    featuredOrder: 32
  },
];

export function getProduct(id: string): CatalogItem | undefined {
  return CATALOG.find((p) => p.id === id);
}

/**
 * 맛보기(TEASER)를 만들 상품 id. 세트는 서버가 세트 단위 생성을 거절하므로
 * 여기서 생성 가능한 첫 구성 상품(총운·정통 궁합은 전용 화면이라 제외)을 대표로 쓴다.
 */
export function teaserCatalogIdFor(p: CatalogItem): string {
  if (p.type !== "SET") return p.id;
  return p.items?.find((id) => !id.startsWith("annual_") && id !== "compat_basic") ?? p.id;
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
