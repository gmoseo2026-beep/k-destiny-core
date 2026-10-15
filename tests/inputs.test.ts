import { describe, it, expect } from "vitest";
import {
  isValidDateString,
  isValidTimeString,
  parsePersonInput,
  parseDateSelectionInput,
  parseChildNamingInput,
  buildDateSelectionPayload,
  type RawBirthFields,
} from "@/lib/validation/inputs";

describe("Input Validation", () => {
  it("isValidDateString boundary checks", () => {
    const fixedNow = new Date("2026-05-10T12:00:00Z"); // fixed date for testing
    expect(isValidDateString("2026-02-30", fixedNow)).toBe(false);
    expect(isValidDateString("2023-02-29", fixedNow)).toBe(false);
    expect(isValidDateString("1899-12-31", fixedNow)).toBe(false);
    expect(isValidDateString("2026-05-12", fixedNow)).toBe(false); // future
    expect(isValidDateString("2026-05-10", fixedNow)).toBe(true); // today is fine
    expect(isValidDateString("1995-12-30", fixedNow)).toBe(true);
    expect(isValidDateString(null, fixedNow)).toBe(false);
    expect(isValidDateString("invalid", fixedNow)).toBe(false);
  });

  it("isValidTimeString boundary checks", () => {
    expect(isValidTimeString("24:00")).toBe(false);
    expect(isValidTimeString("23:60")).toBe(false);
    expect(isValidTimeString("-1:00")).toBe(false);
    expect(isValidTimeString("09:30")).toBe(true);
    expect(isValidTimeString("00:00")).toBe(true);
    expect(isValidTimeString("23:59")).toBe(true);
    expect(isValidTimeString(null)).toBe(true);
    expect(isValidTimeString("")).toBe(true);
  });

  it("parsePersonInput", () => {
    const fixedNow = new Date("2026-05-10T12:00:00Z");
    const valid = parsePersonInput({ name: " 홍길동 ", dob: "1990-01-01", time: "12:30", gender: "M" }, fixedNow);
    expect(valid).toEqual({ name: "홍길동", dob: "1990-01-01", time: "12:30", gender: "M" });
    
    const invalidType = parsePersonInput("not an object", fixedNow);
    expect(invalidType).toBeNull();
  });

  it("parseDateSelectionInput duration checks", () => {
    const today = "2026-05-10";
    const people = [
      { name: "A", dob: "1990-01-01", time: "12:00", gender: "M" as const },
      { name: "B", dob: "1990-02-02", time: "12:00", gender: "F" as const },
    ];
    
    // start should be >= tomorrow
    const r1 = parseDateSelectionInput({ purpose: "WEDDING", start: "2026-05-10", end: "2026-06-10", people }, today);
    expect(r1).toBeNull();

    // 6 days duration (end - start = 5 days) -> total 6 days
    const r2 = parseDateSelectionInput({ purpose: "WEDDING", start: "2026-05-11", end: "2026-05-16", people }, today);
    expect(r2).toBeNull(); // < 7 days

    // 181 days duration
    const r3 = parseDateSelectionInput({ purpose: "WEDDING", start: "2026-05-11", end: "2026-11-07", people }, today);
    expect(r3).toBeNull(); // > 180 days

    // valid duration 7 days
    const r4 = parseDateSelectionInput({ purpose: "WEDDING", start: "2026-05-11", end: "2026-05-17", people }, today);
    expect(r4).not.toBeNull();
  });

  it("parseDateSelectionInput WEDDING people check", () => {
    const today = "2026-05-10";
    const people = [
      { name: "A", dob: "1990-01-01", time: "12:00", gender: "M" as const },
    ];
    // Wedding needs 2 people
    const r1 = parseDateSelectionInput({ purpose: "WEDDING", start: "2026-05-11", end: "2026-05-20", people }, today);
    expect(r1).toBeNull();
  });

  it("parseDateSelectionInput excludeDates outside range", () => {
    const today = "2026-05-10";
    const people = [
      { name: "A", dob: "1990-01-01", time: "12:00", gender: "M" as const },
    ];
    const r1 = parseDateSelectionInput({ purpose: "MOVING", start: "2026-05-11", end: "2026-05-20", people, excludeDates: ["2026-05-21"] }, today);
    expect(r1).toBeNull(); // outside range
  });

  it("buildDateSelectionPayload blocks empty birth fields and accepts complete inputs", () => {
    const today = "2026-05-10";
    const emptyM: RawBirthFields = { name: "", year: "", month: "", day: "", gender: "M", ampm: "", hour: "1", min: "00" };
    const emptyF: RawBirthFields = { name: "", year: "", month: "", day: "", gender: "F", ampm: "", hour: "1", min: "00" };
    const filledM: RawBirthFields = { name: "", year: "1993", month: "4", day: "8", gender: "M", ampm: "AM", hour: "9", min: "30" };
    const filledF: RawBirthFields = { name: "", year: "1995", month: "11", day: "22", gender: "F", ampm: "", hour: "1", min: "00" };

    // 1. 둘 다 빈 초기값이면 null (제출 차단)
    expect(
      buildDateSelectionPayload({
        purpose: "WEDDING",
        start: "2026-05-11",
        end: "2026-06-10",
        person1: emptyM,
        person2: emptyF,
        includePerson2: true,
        weekdays: [5, 6, 0],
        excludeDates: [],
        today,
      }),
    ).toBeNull();

    // 2. 결혼(WEDDING)에서 첫 번째 사람만 채우고 두 번째 사람이 비어 있으면 null
    expect(
      buildDateSelectionPayload({
        purpose: "WEDDING",
        start: "2026-05-11",
        end: "2026-06-10",
        person1: filledM,
        person2: emptyF,
        includePerson2: true,
        weekdays: [5, 6, 0],
        excludeDates: [],
        today,
      }),
    ).toBeNull();

    // 3. 이사(MOVING)에서 동반자 포함(includePerson2=true)인데 두 번째 사람이 비어 있으면 null
    expect(
      buildDateSelectionPayload({
        purpose: "MOVING",
        start: "2026-05-11",
        end: "2026-06-10",
        person1: filledM,
        person2: emptyF,
        includePerson2: true,
        weekdays: [5, 6, 0],
        excludeDates: [],
        today,
      }),
    ).toBeNull();

    // 4. 이사(MOVING)에서 1인(includePerson2=false)이고 첫 번째 사람이 채워지면 통과 (빈 이름은 "나")
    const moving1 = buildDateSelectionPayload({
      purpose: "MOVING",
      start: "2026-05-11",
      end: "2026-06-10",
      person1: filledM,
      person2: emptyF,
      includePerson2: false,
      weekdays: [5, 6, 0],
      excludeDates: [],
      today,
    });
    expect(moving1?.people).toEqual([{ name: "나", dob: "1993-04-08", time: "09:30", gender: "M" }]);

    // 5. 결혼(WEDDING)에서 두 사람 모두 채워지면 통과
    const wedding2 = buildDateSelectionPayload({
      purpose: "WEDDING",
      start: "2026-05-11",
      end: "2026-06-10",
      person1: filledM,
      person2: filledF,
      includePerson2: true,
      weekdays: [5, 6, 0],
      excludeDates: [],
      today,
    });
    expect(wedding2?.people).toEqual([
      { name: "나", dob: "1993-04-08", time: "09:30", gender: "M" },
      { name: "나", dob: "1995-11-22", time: null, gender: "F" },
    ]);
  });

  it("formatBirthInput & parseBirthInput roundtrip", async () => {
    const { formatBirthInput, parseBirthInput } = await import("@/components/forms/BirthFields");
    const v1 = {
      name: "김콩닥",
      year: "1995",
      month: "3",
      day: "15",
      gender: "F" as const,
      ampm: "PM",
      hour: "2",
      min: "30",
    };
    const formatted1 = formatBirthInput(v1);
    expect(formatted1).toEqual({
      name: "김콩닥",
      dob: "1995-03-15",
      time: "14:30",
      gender: "F",
    });
    const parsed1 = parseBirthInput(formatted1);
    expect(parsed1).toEqual(v1);

    // Midnight check
    const v2 = {
      name: "홍길동",
      year: "2000",
      month: "12",
      day: "31",
      gender: "M" as const,
      ampm: "AM",
      hour: "12",
      min: "15",
    };
    const formatted2 = formatBirthInput(v2);
    expect(formatted2).toEqual({
      name: "홍길동",
      dob: "2000-12-31",
      time: "00:15",
      gender: "M",
    });
    expect(parseBirthInput(formatted2)).toEqual(v2);

    // No time check
    const v3 = {
      name: "",
      year: "1988",
      month: "7",
      day: "7",
      gender: "F" as const,
      ampm: "",
      hour: "1",
      min: "00",
    };
    const formatted3 = formatBirthInput(v3);
    expect(formatted3).toEqual({
      name: "나",
      dob: "1988-07-07",
      time: null,
      gender: "F",
    });
    expect(parseBirthInput(formatted3)).toEqual(v3);
  });
});

describe("작명 입력 — 법정대리인 동의(만 14세 미만 아동 정보)", () => {
  const surnames = { 김: ["金"] };
  const raw = {
    surnameHangul: "김", surnameHanja: "金", gender: "F", dob: "2025-03-01", time: null,
    dollim: null, tags: [], avoidSyllables: [],
  };
  const now = new Date("2026-09-23T00:00:00Z");

  it("guardianConsent 가 true 가 아니면 null", () => {
    expect(parseChildNamingInput(raw, surnames, now)).toBeNull();
    expect(parseChildNamingInput({ ...raw, guardianConsent: false }, surnames, now)).toBeNull();
    expect(parseChildNamingInput({ ...raw, guardianConsent: "true" }, surnames, now)).toBeNull();
  });

  it("guardianConsent: true 면 통과하고 결과에 동의가 남는다", () => {
    expect(parseChildNamingInput({ ...raw, guardianConsent: true }, surnames, now)?.guardianConsent).toBe(true);
  });
});

