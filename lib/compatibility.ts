import { SajuResult } from './saju';

export interface CompatibilityResult {
  score: number;
  keywords: string[];
  breakdown: {
    stem: number;       // 일간 관계 (30)
    complement: number; // 오행 상보성 (30)
    branch: number;     // 지지 관계 (20)
    balance: number;    // 오행 균형 (10)
    yinYang: number;    // 음양 조화 (10)
    rawTotal: number;   // 원점수 합계
  };
}

const STEM_ELEMENTS: Record<string, string> = {
  '甲': 'wood', '乙': 'wood',
  '丙': 'fire', '丁': 'fire',
  '戊': 'earth', '己': 'earth',
  '庚': 'metal', '辛': 'metal',
  '壬': 'water', '癸': 'water',
};

// 상생 (A generates B)
const GENERATES: Record<string, string> = {
  'wood': 'fire',
  'fire': 'earth',
  'earth': 'metal',
  'metal': 'water',
  'water': 'wood',
};

// 천간합 짝
const STEM_COMBINATIONS = new Set([
  '甲己', '己甲',
  '乙庚', '庚乙',
  '丙辛', '辛丙',
  '丁壬', '壬丁',
  '戊癸', '癸戊'
]);

// 양/음 판별
const YANG_CHARS = new Set(['甲', '丙', '戊', '庚', '壬', '子', '寅', '辰', '午', '申', '戌']);

type ElementKey = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

// 지지 합/충/형/원진 테이블
export const BRANCH_SIX_COMBO = new Set([
  '子丑', '丑子', '寅亥', '亥寅', '卯戌', '戌卯', '辰酉', '酉辰', '巳申', '申巳', '午未', '未午'
]);

export const BRANCH_THREE_COMBO = new Set([
  // 해묘미 (木국)
  '亥卯', '卯亥', '卯未', '未卯', '亥未', '未亥',
  // 인오술 (火국)
  '寅午', '午寅', '午戌', '戌午', '寅戌', '戌寅',
  // 사유축 (金국)
  '巳酉', '酉巳', '酉丑', '丑酉', '巳丑', '丑巳',
  // 신자진 (水국)
  '申子', '子申', '子辰', '辰子', '申辰', '辰申'
]);

export const BRANCH_CLASH = new Set([
  '子午', '午子', '丑未', '未丑', '寅申', '申寅', '卯酉', '酉卯', '辰戌', '戌辰', '巳亥', '亥巳'
]);

// 형(刑): 寅申·丑未는 육충(六沖)에 단일 배치하고 형에서는 중복 제거
export const BRANCH_PUNISH = new Set([
  // 인사신 삼형 (寅申 제외)
  '寅巳', '巳寅', '巳申', '申巳',
  // 축술미 삼형 (丑未 제외)
  '丑戌', '戌丑', '戌未', '未戌',
  // 자묘 상형
  '子卯', '卯子',
  // 자형 (辰辰, 午午, 酉酉, 亥亥)
  '辰辰', '午午', '酉酉', '亥亥'
]);

export const BRANCH_HARM_ENMITY = new Set([
  // 원진 (6쌍)
  '子未', '未子', '丑午', '午丑', '寅酉', '酉寅', '卯申', '申卯', '辰亥', '亥辰', '巳戌', '戌巳',
  // 육해 (형·원진에 안 겹치는 해 3쌍)
  '卯辰', '辰卯', '申亥', '亥申', '酉戌', '戌酉',
  // 육파 (합·형에 안 겹치는 파 3쌍: '自由','由自' 오타 교정 -> '子酉','酉子')
  '子酉', '酉子', '丑辰', '辰丑', '卯午', '午卯'
]);

/**
 * 1. 일간 관계 (30점)
 */
function getStemScore(a: string, b: string): number {
  if (STEM_COMBINATIONS.has(a + b)) return 30; // 천간합
  const elA = STEM_ELEMENTS[a];
  const elB = STEM_ELEMENTS[b];
  if (GENERATES[elA] === elB || GENERATES[elB] === elA) return 25; // 상생
  if (elA === elB) return 20; // 비화
  return 10; // 상극
}

/**
 * 2. 오행 상보성 (30점)
 */
function getComplementScore(a: SajuResult, b: SajuResult): number {
  const getLacks = (res: SajuResult) =>
    (Object.entries(res.elementsScore) as [ElementKey, number][])
      .filter(([, v]) => v === 0)
      .map(([k]) => k);
  
  const aLacks = getLacks(a);
  const bLacks = getLacks(b);
  
  if (aLacks.length === 0 && bLacks.length === 0) return 30;

  const totalLacks = aLacks.length + bLacks.length;
  let covered = 0;

  for (const lack of aLacks) {
    if (b.elementsScore[lack] > 0) covered++;
  }
  for (const lack of bLacks) {
    if (a.elementsScore[lack] > 0) covered++;
  }

  if (totalLacks === 0) return 30;
  const coverage = covered / totalLacks;
  
  if (coverage === 1) return 30;
  if (coverage > 0) return 20;
  return 10;
}

/**
 * 3. 지지 관계 (20점)
 */
function getBranchScore(aBranch: string, bBranch: string): number {
  const pair = aBranch + bBranch;
  if (BRANCH_SIX_COMBO.has(pair) || BRANCH_THREE_COMBO.has(pair)) return 20;
  if (BRANCH_CLASH.has(pair) || BRANCH_PUNISH.has(pair)) return 5;
  if (BRANCH_HARM_ENMITY.has(pair)) return 10;
  return 15; // 무난
}

/**
 * 4. 오행 균형 (10점)
 */
function getBalanceScore(a: SajuResult, b: SajuResult): number {
  let zeroCount = 0;
  const elements: ElementKey[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  for (const el of elements) {
    const sum = a.elementsScore[el] + b.elementsScore[el];
    if (sum === 0) zeroCount++;
  }
  if (zeroCount === 0) return 10;
  if (zeroCount === 1) return 7;
  return 4;
}

/**
 * 5. 음양 조화 (10점)
 */
function getYinYangScore(a: SajuResult, b: SajuResult): number {
  let yang = 0;
  let total = 0;

  const countYinYang = (res: SajuResult) => {
    const pillars = [res.fourPillars.year, res.fourPillars.month, res.fourPillars.day];
    if (res.fourPillars.time) pillars.push(res.fourPillars.time);
    
    for (const p of pillars) {
      if (!p) continue;
      for (const char of p) {
        if (YANG_CHARS.has(char)) yang++;
        total++;
      }
    }
  };

  countYinYang(a);
  countYinYang(b);

  if (total === 0) return 10; // 방어 코드

  const ratio = yang / total;
  if (ratio >= 0.4 && ratio <= 0.6) return 10;
  if ((ratio >= 0.25 && ratio < 0.4) || (ratio > 0.6 && ratio <= 0.75)) return 7;
  return 4;
}

/**
 * 궁합 키워드 추출 로직
 */
function extractKeywords(breakdown: CompatibilityResult['breakdown']): string[] {
  const keywords: string[] = [];

  if (breakdown.stem === 30) keywords.push('천생연분');
  else if (breakdown.stem === 25) keywords.push('다정한 짝꿍');
  else if (breakdown.stem === 20) keywords.push('거울 같은 소울메이트');
  else if (breakdown.stem === 10) keywords.push('서로를 자극하는 관계');

  if (breakdown.complement === 30) keywords.push('서로의 부족함을 채워주는');
  if (breakdown.balance === 10) keywords.push('기운 찰떡궁합');
  if (breakdown.branch === 20) keywords.push('떨어질 수 없는 케미');
  if (breakdown.branch === 5) keywords.push('티격태격 밀당 케미');
  if (breakdown.yinYang === 10) keywords.push('에너지의 완벽한 조화');

  // fallback 키워드
  const fallbacks = [
    breakdown.rawTotal >= 80 ? '운명적인 이끌림' : (breakdown.rawTotal >= 60 ? '알아가는 재미' : '맞춰가는 즐거움'),
    '함께 성장하는 인연',
    '서서히 스며드는 케미'
  ];

  for (const fb of fallbacks) {
    if (keywords.length >= 3) break;
    if (!keywords.includes(fb)) keywords.push(fb);
  }

  // 3개만 반환
  return keywords.slice(0, 3);
}

/**
 * 콩닥 Phase A 궁합 계산 메인 함수
 * 결정론적 방식으로 두 사람의 사주를 통해 60~99점의 점수와 키워드 반환
 */
export function calculateCompatibility(personA: SajuResult, personB: SajuResult): CompatibilityResult {
  const aBranch = personA.fourPillars.day.charAt(1);
  const bBranch = personB.fourPillars.day.charAt(1);

  const stemScore = getStemScore(personA.dayMaster, personB.dayMaster);
  const complementScore = getComplementScore(personA, personB);
  const branchScore = getBranchScore(aBranch, bBranch);
  const balanceScore = getBalanceScore(personA, personB);
  const yinYangScore = getYinYangScore(personA, personB);

  const rawTotal = stemScore + complementScore + branchScore + balanceScore + yinYangScore;
  
  // 원점수(33~100)를 60~99로 매핑
  const minRaw = 33;
  const maxRaw = 100;
  const targetMin = 60;
  const targetMax = 99;
  
  let mappedScore = targetMin + Math.round((rawTotal - minRaw) * ((targetMax - targetMin) / (maxRaw - minRaw)));
  mappedScore = Math.max(targetMin, Math.min(targetMax, mappedScore)); // clamp

  const breakdown = {
    stem: stemScore,
    complement: complementScore,
    branch: branchScore,
    balance: balanceScore,
    yinYang: yinYangScore,
    rawTotal,
  };

  const keywords = extractKeywords(breakdown);

  return {
    score: mappedScore,
    keywords,
    breakdown,
  };
}
