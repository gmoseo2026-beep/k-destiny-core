import { describe, it, expect } from "vitest";
import { convertLunarToSolar, formatLunarConversionNotice } from "@/lib/lunarInput";
import { buildCoupleLunarLines } from "@/lib/lunarNoticeStorage";
import { getDaysInMonth, resolveBirthValuesToSolar } from "@/components/forms/BirthFields";

describe("lib/lunarInput (Argon 05 음력 생일 입력 변환)", () => {
  it("음력 1990-01-01을 양력 1990-01-27로 정확히 변환하고 결과 안내 문구를 만든다", () => {
    const res = convertLunarToSolar({
      year: 1990,
      month: 1,
      day: 1,
      isLunar: true,
      isLeapMonth: false,
    });
    expect(res).toEqual({
      ok: true,
      isLunar: true,
      isLeapMonth: false,
      solarYear: 1990,
      solarMonth: 1,
      solarDay: 27,
      solarDob: "1990-01-27",
      lunarMonth: 1,
      lunarDay: 1,
      notice: "음력 1월 1일(양력 1월 27일)로 봤어요",
    });
  });

  it("음력 2023 윤2월 1일을 양력 2023-03-22로 정확히 변환한다", () => {
    const res = convertLunarToSolar({
      year: "2023",
      month: "2",
      day: "1",
      isLunar: true,
      isLeapMonth: true,
    });
    expect(res).toEqual({
      ok: true,
      isLunar: true,
      isLeapMonth: true,
      solarYear: 2023,
      solarMonth: 3,
      solarDay: 22,
      solarDob: "2023-03-22",
      lunarMonth: 2,
      lunarDay: 1,
      notice: "음력 윤2월 1일(양력 3월 22일)로 봤어요",
    });
  });

  it("해당 연도에 없는 윤달은 '그해에는 윤○월이 없어요' 안내와 함께 거부한다", () => {
    // 2024년은 윤달이 없는 해
    const noLeapYear = convertLunarToSolar({
      year: 2024,
      month: 2,
      day: 1,
      isLunar: true,
      isLeapMonth: true,
    });
    expect(noLeapYear).toEqual({
      ok: false,
      reason: "NO_LEAP_MONTH",
      error: "그해에는 윤2월이 없어요",
    });

    // 2023년은 윤2월만 있고 윤3월은 없음
    const wrongLeapMonth = convertLunarToSolar({
      year: 2023,
      month: 3,
      day: 10,
      isLunar: true,
      isLeapMonth: true,
    });
    expect(wrongLeapMonth).toEqual({
      ok: false,
      reason: "NO_LEAP_MONTH",
      error: "그해에는 윤3월이 없어요",
    });
  });

  it("작은달(29일)인 음력 달에 30일을 넣으면 거부한다", () => {
    // 1990년 음력 1월은 29일까지 있음
    const res = convertLunarToSolar({
      year: 1990,
      month: 1,
      day: 30,
      isLunar: true,
      isLeapMonth: false,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("INVALID_LUNAR_DATE");
      expect(res.error).toBe("그해 음력 1월에는 30일이 없어요");
    }
  });

  it("양력 입력은 그대로 통과하며 안내 문구는 null이고, 없는 양력 날짜(2월 30일)는 거부한다", () => {
    const okRes = convertLunarToSolar({
      year: 1995,
      month: 5,
      day: 14,
      isLunar: false,
    });
    expect(okRes).toEqual({
      ok: true,
      isLunar: false,
      isLeapMonth: false,
      solarYear: 1995,
      solarMonth: 5,
      solarDay: 14,
      solarDob: "1995-05-14",
      notice: null,
    });

    const badSolar = convertLunarToSolar({
      year: 2025,
      month: 2,
      day: 29,
      isLunar: false,
    });
    expect(badSolar.ok).toBe(false);
  });

  it("BirthFields 음력 모드에서는 2월에도 30일까지 선택할 수 있고 resolveBirthValuesToSolar가 양력 dob를 돌려준다", async () => {
    expect(getDaysInMonth("1990", "2", false)).toBe(28);
    expect(getDaysInMonth("1990", "2", true)).toBe(30);

    const resolved = await resolveBirthValuesToSolar({
      name: "김콩닥",
      year: "1990",
      month: "1",
      day: "1",
      gender: "F",
      ampm: "AM",
      hour: "9",
      min: "30",
      isLunar: true,
      isLeapMonth: false,
    });
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.formatted.dob).toBe("1990-01-27");
      expect(resolved.formatted.time).toBe("09:30");
      expect(resolved.notice).toBe(
        formatLunarConversionNotice({
          lunarMonth: 1,
          lunarDay: 1,
          isLeapMonth: false,
          solarMonth: 1,
          solarDay: 27,
        }),
      );
    }
  });

  it("커플 결과용 buildCoupleLunarLines는 음력으로 넣은 사람만 원문 문구를 유지해 생성한다", () => {
    const lines = buildCoupleLunarLines({
      notices: {
        aNotice: "음력 1월 1일(양력 1월 27일)로 봤어요",
        bNotice: null,
      },
      nameA: "나",
      nameB: "상대방",
    });
    expect(lines).toEqual(["음력 1월 1일(양력 1월 27일)로 봤어요"]);

    const both = buildCoupleLunarLines({
      notices: {
        aNotice: "음력 1월 1일(양력 1월 27일)로 봤어요",
        bNotice: "음력 윤2월 1일(양력 3월 22일)로 봤어요",
      },
      nameA: "콩이",
      nameB: "닥이",
    });
    expect(both).toEqual([
      "콩이님 · 음력 1월 1일(양력 1월 27일)로 봤어요",
      "닥이님 · 음력 윤2월 1일(양력 3월 22일)로 봤어요",
    ]);
  });
});
