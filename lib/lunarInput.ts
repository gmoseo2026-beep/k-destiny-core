import { Lunar, LunarYear } from "lunar-javascript";

export interface LunarConversionInput {
  year: number | string;
  month: number | string;
  day: number | string;
  isLunar?: boolean;
  isLeapMonth?: boolean;
}

export type LunarConversionResult =
  | {
      ok: true;
      isLunar: boolean;
      isLeapMonth: boolean;
      solarYear: number;
      solarMonth: number;
      solarDay: number;
      solarDob: string;
      lunarMonth?: number;
      lunarDay?: number;
      notice: string | null;
    }
  | {
      ok: false;
      reason: "NO_LEAP_MONTH" | "INVALID_LUNAR_DATE" | "INVALID_SOLAR_DATE";
      error: string;
    };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatLunarConversionNotice(args: {
  lunarMonth: number;
  lunarDay: number;
  isLeapMonth?: boolean;
  solarMonth: number;
  solarDay: number;
}): string {
  const monthLabel = args.isLeapMonth ? `윤${args.lunarMonth}월` : `${args.lunarMonth}월`;
  return `음력 ${monthLabel} ${args.lunarDay}일(양력 ${args.solarMonth}월 ${args.solarDay}일)로 봤어요`;
}

/**
 * 양력 또는 음력(윤달 포함) 생년월일을 검증하고 양력 YYYY-MM-DD 로 변환한다.
 * - 음력 변환 산식: `Lunar.fromYmd(y, isLeapMonth ? -m : m, d).getSolar()`
 * - 해당 연도에 없는 윤달이면 `"그해에는 윤○월이 없어요"`를 돌려주고 제출을 막는다.
 */
export function convertLunarToSolar(input: LunarConversionInput): LunarConversionResult {
  const y = Number(input.year);
  const m = Number(input.month);
  const d = Number(input.day);
  const isLunar = Boolean(input.isLunar);
  const isLeapMonth = Boolean(isLunar && input.isLeapMonth);

  if (!Number.isInteger(y) || y < 1900 || y > 2100) {
    return {
      ok: false,
      reason: isLunar ? "INVALID_LUNAR_DATE" : "INVALID_SOLAR_DATE",
      error: "올바른 출생 연도를 선택해 주세요.",
    };
  }
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    return {
      ok: false,
      reason: isLunar ? "INVALID_LUNAR_DATE" : "INVALID_SOLAR_DATE",
      error: "올바른 출생 월을 선택해 주세요.",
    };
  }
  if (!Number.isInteger(d) || d < 1 || d > 31) {
    return {
      ok: false,
      reason: isLunar ? "INVALID_LUNAR_DATE" : "INVALID_SOLAR_DATE",
      error: "올바른 출생 일을 선택해 주세요.",
    };
  }

  if (!isLunar) {
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (
      dt.getUTCFullYear() !== y ||
      dt.getUTCMonth() + 1 !== m ||
      dt.getUTCDate() !== d
    ) {
      return {
        ok: false,
        reason: "INVALID_SOLAR_DATE",
        error: `${y}년 ${m}월에는 ${d}일이 없어요.`,
      };
    }
    return {
      ok: true,
      isLunar: false,
      isLeapMonth: false,
      solarYear: y,
      solarMonth: m,
      solarDay: d,
      solarDob: `${y}-${pad2(m)}-${pad2(d)}`,
      notice: null,
    };
  }

  // 윤달 존재 여부를 먼저 확인한다.
  if (isLeapMonth) {
    let leapMonthOfYear = 0;
    try {
      leapMonthOfYear = LunarYear.fromYear(y).getLeapMonth();
    } catch {
      return {
        ok: false,
        reason: "NO_LEAP_MONTH",
        error: `그해에는 윤${m}월이 없어요`,
      };
    }
    if (leapMonthOfYear !== m) {
      return {
        ok: false,
        reason: "NO_LEAP_MONTH",
        error: `그해에는 윤${m}월이 없어요`,
      };
    }
  }

  try {
    const solar = Lunar.fromYmd(y, isLeapMonth ? -m : m, d).getSolar();
    const solarYear = solar.getYear();
    const solarMonth = solar.getMonth();
    const solarDay = solar.getDay();
    const solarDob = `${solarYear}-${pad2(solarMonth)}-${pad2(solarDay)}`;
    return {
      ok: true,
      isLunar: true,
      isLeapMonth,
      solarYear,
      solarMonth,
      solarDay,
      solarDob,
      lunarMonth: m,
      lunarDay: d,
      notice: formatLunarConversionNotice({
        lunarMonth: m,
        lunarDay: d,
        isLeapMonth,
        solarMonth,
        solarDay,
      }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (isLeapMonth && /month\s*-/i.test(msg)) {
      return {
        ok: false,
        reason: "NO_LEAP_MONTH",
        error: `그해에는 윤${m}월이 없어요`,
      };
    }
    const monthLabel = isLeapMonth ? `윤${m}월` : `${m}월`;
    return {
      ok: false,
      reason: "INVALID_LUNAR_DATE",
      error: `그해 음력 ${monthLabel}에는 ${d}일이 없어요`,
    };
  }
}
