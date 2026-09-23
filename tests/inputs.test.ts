import { describe, it, expect, vi } from "vitest";
import {
  isValidDateString,
  isValidTimeString,
  parsePersonInput,
  parseDateSelectionInput,
  todayKST
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
});
