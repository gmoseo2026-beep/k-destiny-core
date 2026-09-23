import { describe, it, expect } from "vitest";
import { scoreDate, selectTopDates } from "@/lib/premium/dateSelection";

const me = { dayBranch: "巳", yearBranch: "亥" }; // 1995-03-15 생 실측

describe("scoreDate — 2027-04-17 실측", () => {
  it("결혼: 50+20(宜)+10(황도)+8(开)-4(寅巳 형) = 84", () => {
    expect(scoreDate("2027-04-17", "WEDDING", [me])?.score).toBe(84);
  });
  it("이사: 宜 미포함, 손 없는 날 아님 → 64", () => {
    const s = scoreDate("2027-04-17", "MOVING", [me]);
    expect(s?.score).toBe(64);
    expect(s?.sonEomneun).toBe(false);
  });
  it("일지 申 과 충돌하면 제외", () => {
    expect(scoreDate("2027-04-17", "WEDDING", [{ dayBranch: "申", yearBranch: "亥" }])).toBeNull();
  });
  it("좋은 시간 2개(07:30~19:30 사이 吉)", () => {
    expect(scoreDate("2027-04-17", "WEDDING", [me])?.goodHours).toEqual(["07:30~09:30", "09:30~11:30"]);
  });
});

describe("selectTopDates", () => {
  const base = { purpose: "WEDDING" as const, start: "2027-04-01", end: "2027-06-30", weekdays: [], excludeDates: [] };
  it("결정론", () => {
    expect(selectTopDates(base, [me])).toEqual(selectTopDates(base, [me]));
  });
  it("최대 5개, 점수 내림차순", () => {
    const r = selectTopDates(base, [me]);
    expect(r.picks.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < r.picks.length; i++) expect(r.picks[i - 1].score).toBeGreaterThanOrEqual(r.picks[i].score);
  });
  it("주말 필터 준수", () => {
    const r = selectTopDates({ ...base, weekdays: [0, 6] }, [me]);
    for (const p of r.picks) expect([0, 6]).toContain(new Date(p.date + "T00:00:00Z").getUTCDay());
  });
});
