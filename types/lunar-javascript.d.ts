declare module 'lunar-javascript' {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar;
    getLunar(): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    toYmd(): string;
  }

  export class LunarYear {
    static fromYear(lunarYear: number): LunarYear;
    getLeapMonth(): number;
  }

  export class Lunar {
    static fromYmd(lunarYear: number, lunarMonth: number, lunarDay: number): Lunar;
    getSolar(): Solar;
    getEightChar(): EightChar;
    getMonthInGanZhiExact(): string;
    getDayJi(): string[];
    getDayYi(): string[];
    getDayZhi(): string;
    getDayTianShenLuck(): string;
    getZhiXing(): string;
    getTimes(): LunarTime[];
    getDayInGanZhi(): string;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
  }

  export class LunarTime {
    getZhi(): string;
    getTianShenLuck(): string;
  }

  export class EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getYun(gender: number): Yun;
  }

  export class Yun {
    getDaYun(): DaYun[];
  }

  export class DaYun {
    getIndex(): number;
    getStartYear(): number;
    getEndYear(): number;
    getStartAge(): number;
    getGanZhi(): string;
  }
}
