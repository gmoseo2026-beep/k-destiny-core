/**
 * Master Recommendation Engine
 * 
 * Maps the user's Day Master (일간) element to the most compatible master
 * using the Five Elements mutual generation cycle (오행 상생).
 * 
 * 상생 관계:
 * 木 → 火 → 土 → 金 → 水 → 木
 * (Wood feeds Fire, Fire creates Earth, Earth bears Metal, Metal collects Water, Water nourishes Wood)
 */

import { MASTERS, type Master } from "./masters";

/** Day Master element extracted from the dayMaster string (e.g., "갑목(甲木)" → "wood") */
type Element = "wood" | "fire" | "earth" | "metal" | "water";

/** Maps Day Master keywords to elements */
function extractElement(dayMaster: string): Element {
  const dm = dayMaster.toLowerCase();
  if (dm.includes("목") || dm.includes("wood") || dm.includes("甲") || dm.includes("乙")) return "wood";
  if (dm.includes("화") || dm.includes("fire") || dm.includes("丙") || dm.includes("丁")) return "fire";
  if (dm.includes("토") || dm.includes("earth") || dm.includes("戊") || dm.includes("己")) return "earth";
  if (dm.includes("금") || dm.includes("metal") || dm.includes("庚") || dm.includes("辛")) return "metal";
  if (dm.includes("수") || dm.includes("water") || dm.includes("壬") || dm.includes("癸")) return "water";
  return "earth"; // fallback
}

/**
 * Element → Best Master mapping based on 상생 (mutual generation)
 * The master's element GENERATES the user's element = "support" relationship
 */
const ELEMENT_MASTER_MAP: Record<Element, number> = {
  wood: 1,   // Master Hana (Calm Water) — 수생목
  fire: 3,   // Master Jay (Wind Chaser) — 목생화
  earth: 5,  // Master Karma (Wealth Energy) — 화생토
  metal: 2,  // Master Ian (Iron Will) — 토생금
  water: 6,  // Master Muwi (Void Flow) — 금생수
};

/** Reason text for the recommendation (i18n key mapping) */
const ELEMENT_REASON: Record<Element, { ko: string; en: string }> = {
  wood: {
    ko: "당신의 木(목) 기운에 水(수)의 자양이 필요합니다. Master Hana의 고요한 물의 에너지가 당신의 성장을 촉진합니다.",
    en: "Your Wood energy needs Water's nourishment. Master Hana's calm water energy accelerates your growth.",
  },
  fire: {
    ko: "당신의 火(화) 기운에 木(목)의 연료가 필요합니다. Master Jay의 바람의 에너지가 당신의 열정에 불을 지핍니다.",
    en: "Your Fire energy needs Wood as fuel. Master Jay's wind energy fans the flames of your passion.",
  },
  earth: {
    ko: "당신의 土(토) 기운에 火(화)의 온기가 필요합니다. Master Karma의 재물 에너지가 당신의 기반을 단단하게 합니다.",
    en: "Your Earth energy needs Fire's warmth. Master Karma's wealth energy strengthens your foundation.",
  },
  metal: {
    ko: "당신의 金(금) 기운에 土(토)의 보호가 필요합니다. Master Ian의 철의 의지가 당신을 단련합니다.",
    en: "Your Metal energy needs Earth's protection. Master Ian's iron will tempers your spirit.",
  },
  water: {
    ko: "당신의 水(수) 기운에 金(금)의 정화가 필요합니다. Master Muwi의 무의 흐름이 당신의 지혜를 맑게 합니다.",
    en: "Your Water energy needs Metal's purification. Master Muwi's void flow clarifies your wisdom.",
  },
};

export interface MasterRecommendation {
  master: Master;
  reason: { ko: string; en: string };
  element: Element;
  compatibility: number; // 0-100 score for display
}

/**
 * Recommend the best master based on the user's Day Master.
 */
export function recommendMaster(dayMaster: string): MasterRecommendation {
  const element = extractElement(dayMaster);
  const masterId = ELEMENT_MASTER_MAP[element];
  const master = MASTERS.find((m) => m.id === masterId) || MASTERS[0];
  const reason = ELEMENT_REASON[element];

  // Compatibility score: 85-98 range for dramatic effect
  const baseScore = 88;
  const hash = dayMaster.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const compatibility = baseScore + (hash % 11); // 88-98

  return { master, reason, element, compatibility };
}

/**
 * Get all masters sorted by compatibility with the user's Day Master.
 * The recommended master gets the highest score; others get decreasing scores.
 */
export function rankMasters(dayMaster: string): (Master & { score: number })[] {
  const rec = recommendMaster(dayMaster);
  
  return MASTERS.map((m) => {
    if (m.id === rec.master.id) {
      return { ...m, score: rec.compatibility };
    }
    // Other masters get 60-80 range
    const hash = (m.id * 17 + dayMaster.charCodeAt(0)) % 21;
    return { ...m, score: 60 + hash };
  }).sort((a, b) => b.score - a.score);
}
