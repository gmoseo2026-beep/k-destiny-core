import { describe, it, expect } from "vitest";
import {
  VISITOR_COUNTER_MIN_DISPLAY,
  shouldDisplayVisitorCounter,
  VISITOR_PILL_MIN_DISPLAY,
  shouldDisplayVisitorPill,
  formatVisitorCount,
  formatStartedAt,
} from "@/lib/home/visitors";

describe("visitors pure functions", () => {
  it("문턱 판정: 1000 미만이면 false, 1000 이상이면 true", () => {
    expect(VISITOR_COUNTER_MIN_DISPLAY).toBe(1000);
    expect(shouldDisplayVisitorCounter(0)).toBe(false);
    expect(shouldDisplayVisitorCounter(999)).toBe(false);
    expect(shouldDisplayVisitorCounter(BigInt(999))).toBe(false);
    expect(shouldDisplayVisitorCounter(1000)).toBe(true);
    expect(shouldDisplayVisitorCounter(1001)).toBe(true);
    expect(shouldDisplayVisitorCounter(BigInt(5000))).toBe(true);
  });

  it("맨 위 한 줄은 900명부터, 아래 큰 칸보다 먼저 켜진다", () => {
    expect(VISITOR_PILL_MIN_DISPLAY).toBeLessThan(VISITOR_COUNTER_MIN_DISPLAY);
    expect(shouldDisplayVisitorPill(0)).toBe(false);
    expect(shouldDisplayVisitorPill(899)).toBe(false);
    expect(shouldDisplayVisitorPill(900)).toBe(true);
    expect(shouldDisplayVisitorPill(995)).toBe(true);
    expect(shouldDisplayVisitorPill(BigInt(1200))).toBe(true);
    expect(shouldDisplayVisitorPill(Number.NaN)).toBe(false);
  });

  it("숫자 포맷: toLocaleString(ko-KR)에 '명' 추가", () => {
    expect(formatVisitorCount(1234)).toBe("1,234명");
    expect(formatVisitorCount(BigInt(1884277))).toBe("1,884,277명");
  });

  it("시작일 문구: YYYY년 M월 D일 형식", () => {
    const d = new Date("2026-09-23T00:00:00Z");
    expect(formatStartedAt(d)).toMatch(/2026년 9월 23일/);
  });
});
