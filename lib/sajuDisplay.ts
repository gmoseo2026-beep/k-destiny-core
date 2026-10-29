import { calculateFourPillars, type SajuResult } from "@/lib/saju";

export type SajuElementKey = "wood" | "fire" | "earth" | "metal" | "water";
export type SajuCellElement = SajuElementKey | "unknown";

export type SajuElementLabel = "나무" | "불" | "흙" | "쇠" | "물";

export interface SajuCellDisplay {
  /** 한자 없는 쉬운 자연물 이름 (시간 미상 시 "모름") */
  label: string;
  /** 다섯 기운 키 (시간 미상 시 "unknown") */
  element: SajuCellElement;
  /** 다섯 기운 한글 이름 (시간 미상 시 "모름") */
  elementLabel: SajuElementLabel | "모름";
}

export interface SajuPillarDisplay {
  slot: "year" | "month" | "day" | "time";
  slotLabel: "연" | "월" | "일" | "시";
  top: SajuCellDisplay;
  bottom: SajuCellDisplay;
}

export interface SajuElementCountItem {
  key: SajuElementKey;
  label: SajuElementLabel;
  count: number;
}

export type CharmBadgeId = "dohwa" | "hongyeom" | "yeokma";

export type CharmBadgeLabel =
  | "도화(사람을 끄는 매력)"
  | "홍염(한 번 빠지면 깊은 매력)"
  | "역마(움직임이 많은)";

export interface CharmBadgeDisplay {
  id: CharmBadgeId;
  label: CharmBadgeLabel;
}

export interface SajuDisplayCard {
  /** 연·월·일·시 4열 × 위·아래 2행 = 8칸 */
  pillars: [
    SajuPillarDisplay,
    SajuPillarDisplay,
    SajuPillarDisplay,
    SajuPillarDisplay,
  ];
  /** 나무·불·흙·쇠·물 실제 글자 개수 (시간 알면 합 8, 모르면 합 6) */
  elements: [
    SajuElementCountItem,
    SajuElementCountItem,
    SajuElementCountItem,
    SajuElementCountItem,
    SajuElementCountItem,
  ];
  totalKnownChars: 6 | 8;
  timeKnown: boolean;
  /** 결정론 판정으로 있을 때만 포함되는 매력 기운 배지 */
  badges: CharmBadgeDisplay[];
}

export interface SajuDisplayPerson {
  name: string;
  card: SajuDisplayCard;
}

const ELEMENT_LABEL_MAP: Record<SajuElementKey, SajuElementLabel> = {
  wood: "나무",
  fire: "불",
  earth: "흙",
  metal: "쇠",
  water: "물",
};

const TOP_CHAR_MAP: Record<string, { label: string; element: SajuElementKey }> = {
  "\u7532": { label: "큰 나무", element: "wood" }, // 甲
  "\u4e59": { label: "풀꽃", element: "wood" }, // 乙
  "\u4e19": { label: "태양", element: "fire" }, // 丙
  "\u4e01": { label: "촛불", element: "fire" }, // 丁
  "\u620a": { label: "큰 산", element: "earth" }, // 戊
  "\u5df1": { label: "고운 흙", element: "earth" }, // 己
  "\u5e9a": { label: "큰 바위", element: "metal" }, // 庚
  "\u8f9b": { label: "보석", element: "metal" }, // 辛
  "\u58ec": { label: "바다", element: "water" }, // 壬
  "\u7678": { label: "단비", element: "water" }, // 癸
};

const BOTTOM_CHAR_MAP: Record<string, { label: string; element: SajuElementKey }> = {
  "\u5bc5": { label: "봄 숲", element: "wood" }, // 寅
  "\u536f": { label: "새싹", element: "wood" }, // 卯
  "\u5df3": { label: "여름 볕", element: "fire" }, // 巳
  "\u5348": { label: "불꽃", element: "fire" }, // 午
  "\u8fb0": { label: "봄 들판", element: "earth" }, // 辰
  "\u620c": { label: "가을 언덕", element: "earth" }, // 戌
  "\u4e11": { label: "겨울 땅", element: "earth" }, // 丑
  "\u672a": { label: "여름 땅", element: "earth" }, // 未
  "\u7533": { label: "원석", element: "metal" }, // 申
  "\u9149": { label: "맑은 쇠", element: "metal" }, // 酉
  "\u4ea5": { label: "깊은 물", element: "water" }, // 亥
  "\u5b50": { label: "샘물", element: "water" }, // 子
};

const UNKNOWN_CELL: SajuCellDisplay = {
  label: "모름",
  element: "unknown",
  elementLabel: "모름",
};

/**
 * 도화 판정 기준표 (정통 삼합 연·일 기준):
 * - 인·오·술 → 묘
 * - 신·자·진 → 유
 * - 사·유·축 → 오
 * - 해·묘·미 → 자
 */
const DOHWA_TARGET_BY_BRANCH: Record<string, string> = {
  "\u5bc5": "\u536f", // 寅 -> 卯
  "\u5348": "\u536f", // 午 -> 卯
  "\u620c": "\u536f", // 戌 -> 卯
  "\u7533": "\u9149", // 申 -> 酉
  "\u5b50": "\u9149", // 子 -> 酉
  "\u8fb0": "\u9149", // 辰 -> 酉
  "\u5df3": "\u5348", // 巳 -> 午
  "\u9149": "\u5348", // 酉 -> 午
  "\u4e11": "\u5348", // 丑 -> 午
  "\u4ea5": "\u5b50", // 亥 -> 子
  "\u536f": "\u5b50", // 卯 -> 子
  "\u672a": "\u5b50", // 未 -> 子
};

/**
 * 역마 판정 기준표 (정통 삼합 연·일 기준):
 * - 인·오·술 → 신
 * - 신·자·진 → 인
 * - 사·유·축 → 해
 * - 해·묘·미 → 사
 */
const YEOKMA_TARGET_BY_BRANCH: Record<string, string> = {
  "\u5bc5": "\u7533", // 寅 -> 申
  "\u5348": "\u7533", // 午 -> 申
  "\u620c": "\u7533", // 戌 -> 申
  "\u7533": "\u5bc5", // 申 -> 寅
  "\u5b50": "\u5bc5", // 子 -> 寅
  "\u8fb0": "\u5bc5", // 辰 -> 寅
  "\u5df3": "\u4ea5", // 巳 -> 亥
  "\u9149": "\u4ea5", // 酉 -> 亥
  "\u4e11": "\u4ea5", // 丑 -> 亥
  "\u4ea5": "\u5df3", // 亥 -> 巳
  "\u536f": "\u5df3", // 卯 -> 巳
  "\u672a": "\u5df3", // 未 -> 巳
};

/**
 * 홍염 판정 기준표 (일주 위 글자 기준 아래 글자 대조):
 * - 갑·을 → 오, 병 → 인, 정 → 미, 무·기 → 진, 경 → 술, 신 → 유, 임 → 자, 계 → 신
 */
const HONGYEOM_TARGET_BY_DAY_TOP: Record<string, string> = {
  "\u7532": "\u5348", // 甲 -> 午
  "\u4e59": "\u5348", // 乙 -> 午
  "\u4e19": "\u5bc5", // 丙 -> 寅
  "\u4e01": "\u672a", // 丁 -> 未
  "\u620a": "\u8fb0", // 戊 -> 辰
  "\u5df1": "\u8fb0", // 己 -> 辰
  "\u5e9a": "\u620c", // 庚 -> 戌
  "\u8f9b": "\u9149", // 辛 -> 酉
  "\u58ec": "\u5b50", // 壬 -> 子
  "\u7678": "\u7533", // 癸 -> 申
};

function parseTwoCharPillar(raw: unknown): {
  topRaw: string;
  bottomRaw: string;
  top: SajuCellDisplay;
  bottom: SajuCellDisplay;
} | null {
  if (typeof raw !== "string") return null;
  const chars = Array.from(raw.trim());
  if (chars.length !== 2) return null;
  const topInfo = TOP_CHAR_MAP[chars[0]];
  const bottomInfo = BOTTOM_CHAR_MAP[chars[1]];
  if (!topInfo || !bottomInfo) return null;

  return {
    topRaw: chars[0],
    bottomRaw: chars[1],
    top: {
      label: topInfo.label,
      element: topInfo.element,
      elementLabel: ELEMENT_LABEL_MAP[topInfo.element],
    },
    bottom: {
      label: bottomInfo.label,
      element: bottomInfo.element,
      elementLabel: ELEMENT_LABEL_MAP[bottomInfo.element],
    },
  };
}

/**
 * `lib/saju.ts`의 `fourPillars` 결과만 읽어 한자·전문용어 없는 8칸 표시 카드와 매력 기운 배지를 결정론으로 계산한다.
 */
export function buildSajuDisplayFromPillars(
  fourPillars: SajuResult["fourPillars"] | null | undefined,
): SajuDisplayCard | null {
  if (!fourPillars || typeof fourPillars !== "object") return null;

  const yearParsed = parseTwoCharPillar(fourPillars.year);
  const monthParsed = parseTwoCharPillar(fourPillars.month);
  const dayParsed = parseTwoCharPillar(fourPillars.day);
  if (!yearParsed || !monthParsed || !dayParsed) return null;

  const hasTimeInput =
    typeof fourPillars.time === "string" && fourPillars.time.trim().length > 0;
  const timeParsed = hasTimeInput ? parseTwoCharPillar(fourPillars.time) : null;
  if (hasTimeInput && !timeParsed) return null;

  const pillars: SajuDisplayCard["pillars"] = [
    {
      slot: "year",
      slotLabel: "연",
      top: yearParsed.top,
      bottom: yearParsed.bottom,
    },
    {
      slot: "month",
      slotLabel: "월",
      top: monthParsed.top,
      bottom: monthParsed.bottom,
    },
    {
      slot: "day",
      slotLabel: "일",
      top: dayParsed.top,
      bottom: dayParsed.bottom,
    },
    {
      slot: "time",
      slotLabel: "시",
      top: timeParsed ? timeParsed.top : UNKNOWN_CELL,
      bottom: timeParsed ? timeParsed.bottom : UNKNOWN_CELL,
    },
  ];

  const counts: Record<SajuElementKey, number> = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };

  for (const pillar of pillars) {
    if (pillar.top.element !== "unknown") {
      counts[pillar.top.element] += 1;
    }
    if (pillar.bottom.element !== "unknown") {
      counts[pillar.bottom.element] += 1;
    }
  }

  const elements: SajuDisplayCard["elements"] = [
    { key: "wood", label: "나무", count: counts.wood },
    { key: "fire", label: "불", count: counts.fire },
    { key: "earth", label: "흙", count: counts.earth },
    { key: "metal", label: "쇠", count: counts.metal },
    { key: "water", label: "물", count: counts.water },
  ];

  const knownBranches = [
    yearParsed.bottomRaw,
    monthParsed.bottomRaw,
    dayParsed.bottomRaw,
    ...(timeParsed ? [timeParsed.bottomRaw] : []),
  ];

  const dohwaFromYear = DOHWA_TARGET_BY_BRANCH[yearParsed.bottomRaw];
  const dohwaFromDay = DOHWA_TARGET_BY_BRANCH[dayParsed.bottomRaw];
  const hasDohwa =
    (dohwaFromYear ? knownBranches.includes(dohwaFromYear) : false) ||
    (dohwaFromDay ? knownBranches.includes(dohwaFromDay) : false);

  const hongyeomTarget = HONGYEOM_TARGET_BY_DAY_TOP[dayParsed.topRaw];
  const hasHongyeom = hongyeomTarget
    ? knownBranches.includes(hongyeomTarget)
    : false;

  const yeokmaFromYear = YEOKMA_TARGET_BY_BRANCH[yearParsed.bottomRaw];
  const yeokmaFromDay = YEOKMA_TARGET_BY_BRANCH[dayParsed.bottomRaw];
  const hasYeokma =
    (yeokmaFromYear ? knownBranches.includes(yeokmaFromYear) : false) ||
    (yeokmaFromDay ? knownBranches.includes(yeokmaFromDay) : false);

  const badges: CharmBadgeDisplay[] = [];
  if (hasDohwa) {
    badges.push({ id: "dohwa", label: "도화(사람을 끄는 매력)" });
  }
  if (hasHongyeom) {
    badges.push({ id: "hongyeom", label: "홍염(한 번 빠지면 깊은 매력)" });
  }
  if (hasYeokma) {
    badges.push({ id: "yeokma", label: "역마(움직임이 많은)" });
  }

  return {
    pillars,
    elements,
    totalKnownChars: timeParsed ? 8 : 6,
    timeKnown: Boolean(timeParsed),
    badges,
  };
}

export function buildSajuDisplayFromSajuResult(
  saju: Pick<SajuResult, "fourPillars"> | null | undefined,
): SajuDisplayCard | null {
  if (!saju) return null;
  return buildSajuDisplayFromPillars(saju.fourPillars);
}

export function buildSajuDisplayForPerson(input: {
  name?: string | null;
  dob: string;
  time: string | null;
  gender: string;
  location?: string;
}): SajuDisplayPerson | null {
  const saju = calculateFourPillars(
    input.dob,
    input.time || null,
    input.gender,
    input.location ?? "Seoul, KR",
  );
  const card = buildSajuDisplayFromPillars(saju.fourPillars);
  if (!card) return null;
  return {
    name: input.name?.trim() || "나",
    card,
  };
}
