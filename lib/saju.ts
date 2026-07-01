import { Solar } from 'lunar-javascript';

export interface SajuResult {
  fourPillars: {
    year: string;
    month: string;
    day: string;
    time: string | null;
  };
  dayMaster: string; // 일간 (천간) — 한자 원본 (예: 甲)
  dayMasterSignKey: string; // DB 조회용 영문 키 (예: WOOD_YANG)
  elementLacks: string[]; // 결핍 원소 키 (예: ['LACK_FIRE', 'LACK_METAL'])
  elementsScore: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
}

// ─── 천간(天干) → DB signKey 매핑 ───
// SajuContentDictionary 테이블의 signKey와 정확히 일치해야 함
export const DAY_MASTER_SIGN_MAP: Record<string, string> = {
  '甲': 'WOOD_YANG', '乙': 'WOOD_YIN',
  '丙': 'FIRE_YANG', '丁': 'FIRE_YIN',
  '戊': 'EARTH_YANG', '己': 'EARTH_YIN',
  '庚': 'METAL_YANG', '辛': 'METAL_YIN',
  '壬': 'WATER_YANG', '癸': 'WATER_YIN',
};

// 오행 매핑 딕셔너리 (한자 -> 영어 식별자)
const ELEMENT_MAP: Record<string, keyof SajuResult['elementsScore']> = {
  // 목 (Wood)
  '甲': 'wood', '乙': 'wood', '寅': 'wood', '卯': 'wood',
  // 화 (Fire)
  '丙': 'fire', '丁': 'fire', '巳': 'fire', '午': 'fire',
  // 토 (Earth)
  '戊': 'earth', '己': 'earth', '辰': 'earth', '戌': 'earth', '丑': 'earth', '未': 'earth',
  // 금 (Metal)
  '庚': 'metal', '辛': 'metal', '申': 'metal', '酉': 'metal',
  // 수 (Water)
  '壬': 'water', '癸': 'water', '亥': 'water', '子': 'water',
};

// 결핍 원소 → DB signKey 매핑
const ELEMENT_LACK_MAP: Record<string, string> = {
  wood: 'LACK_WOOD',
  fire: 'LACK_FIRE',
  earth: 'LACK_EARTH',
  metal: 'LACK_METAL',
  water: 'LACK_WATER',
};

/**
 * 사용자의 생년월일시를 바탕으로 사주(Four Pillars)와 오행(5 Elements)을 계산합니다.
 * @param date "YYYY-MM-DD" 포맷
 * @param time "HH:MM" (24시간제) 포맷 또는 null (모를 경우)
 * @param gender "M" 또는 "F"
 * @param location "City, Country" 포맷 (현재 버전에서는 진태양시 보정 없이 표준시 기준)
 */
export function calculateFourPillars(
  date: string,
  time: string | null,
  gender: string,
  location: string
): SajuResult {
  // 1. 날짜 및 시간 파싱
  const [year, month, day] = date.split('-').map(Number);
  
  // 시간을 모르는 경우 기본적으로 정오(12:00)로 설정하되, 시주(Time Pillar)는 null 처리할 수 있도록 플래그 설정
  const isTimeUnknown = !time;
  const timeStr = isTimeUnknown ? '12:00' : time.split('-')[0].trim();
  const [hour, minute] = timeStr.split(':').map(Number);

  // 2. 만세력 엔진 (lunar-javascript) 인스턴스 생성
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  // 3. 8글자 (천간/지지) 추출
  const yearPillar = eightChar.getYear();   // 년주 (예: 甲子)
  const monthPillar = eightChar.getMonth(); // 월주
  const dayPillar = eightChar.getDay();     // 일주
  const timePillar = eightChar.getTime();   // 시주

  const yearGan = eightChar.getYearGan();
  const yearZhi = eightChar.getYearZhi();
  const monthGan = eightChar.getMonthGan();
  const monthZhi = eightChar.getMonthZhi();
  const dayGan = eightChar.getDayGan(); // 일간 (Day Master)
  const dayZhi = eightChar.getDayZhi();
  const timeGan = eightChar.getTimeGan();
  const timeZhi = eightChar.getTimeZhi();

  // 4. 오행 밸런스(Elements Score) 계산
  const elementsScore = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };

  const increaseScore = (char: string) => {
    const element = ELEMENT_MAP[char];
    if (element) {
      elementsScore[element] += 1; // 기호에 따라 점수 가중치를 둘 수 있으나, 기본은 1글자당 1점
    }
  };

  // 년, 월, 일의 6글자 반영
  [yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi].forEach(increaseScore);

  // 시(Time)를 아는 경우에만 시주의 2글자 반영
  if (!isTimeUnknown) {
    [timeGan, timeZhi].forEach(increaseScore);
  }

  // 5. 결핍 원소 산출 (점수가 0인 원소)
  const elementLacks: string[] = [];
  for (const [element, score] of Object.entries(elementsScore)) {
    if (score === 0) {
      const lackKey = ELEMENT_LACK_MAP[element];
      if (lackKey) elementLacks.push(lackKey);
    }
  }

  // 6. 최종 결과 포맷팅
  return {
    fourPillars: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      time: isTimeUnknown ? null : timePillar,
    },
    dayMaster: dayGan,
    dayMasterSignKey: DAY_MASTER_SIGN_MAP[dayGan] || dayGan,
    elementLacks,
    elementsScore,
  };
}
