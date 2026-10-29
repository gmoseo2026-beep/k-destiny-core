import { describe, it, expect } from "vitest";
import { containsHanjaDeep } from "@/lib/gen/hanjaGuard";
import {
  buildSajuDisplayForPerson,
  buildSajuDisplayFromPillars,
} from "@/lib/sajuDisplay";

describe("lib/sajuDisplay — 사주 여덟 글자 카드 + 매력 기운 배지", () => {
  it("같은 생년월일·시간 입력은 항상 완전히 동일한 카드와 배지를 반환한다 (결정론)", () => {
    const a = buildSajuDisplayForPerson({
      name: "지민",
      dob: "1995-05-15",
      time: "14:30",
      gender: "F",
    });
    const b = buildSajuDisplayForPerson({
      name: "지민",
      dob: "1995-05-15",
      time: "14:30",
      gender: "F",
    });

    expect(a).not.toBeNull();
    expect(a).toEqual(b);
    expect(a!.card.timeKnown).toBe(true);
    expect(a!.card.totalKnownChars).toBe(8);
    expect(a!.card.pillars).toHaveLength(4);
    const sum = a!.card.elements.reduce((acc, el) => acc + el.count, 0);
    expect(sum).toBe(8);
  });

  it("태어난 시간을 모르면 시(時) 위·아래 두 칸이 '모름'이 되고 다섯 기운 개수 합은 6이다", () => {
    const res = buildSajuDisplayForPerson({
      name: "서준",
      dob: "1993-10-20",
      time: null,
      gender: "M",
    });

    expect(res).not.toBeNull();
    const card = res!.card;
    expect(card.timeKnown).toBe(false);
    expect(card.totalKnownChars).toBe(6);
    expect(card.pillars[3].slot).toBe("time");
    expect(card.pillars[3].slotLabel).toBe("시");
    expect(card.pillars[3].top.label).toBe("모름");
    expect(card.pillars[3].bottom.label).toBe("모름");
    expect(card.pillars[3].top.element).toBe("unknown");
    expect(card.pillars[3].bottom.element).toBe("unknown");

    const sum = card.elements.reduce((acc, el) => acc + el.count, 0);
    expect(sum).toBe(6);
  });

  it("출력 전체에 한자·전문용어·퍼센트·순위·'상위' 표현이 단 한 글자도 없다", () => {
    const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

    for (let i = 0; i < 12; i++) {
      const card = buildSajuDisplayFromPillars({
        year: `${stems[i % 10]}${branches[i]}`,
        month: `${stems[(i + 3) % 10]}${branches[(i + 4) % 12]}`,
        day: `${stems[(i + 6) % 10]}${branches[(i + 7) % 12]}`,
        time: `${stems[(i + 9) % 10]}${branches[(i + 10) % 12]}`,
      });
      expect(card).not.toBeNull();
      expect(containsHanjaDeep(card)).toBe(false);

      const serialized = JSON.stringify(card);
      expect(serialized).not.toContain("%");
      expect(serialized).not.toContain("상위");
      expect(serialized).not.toContain("순위");
      expect(serialized).not.toContain("오행");
      expect(serialized).not.toContain("일간");
      expect(serialized).not.toContain("천간");
      expect(serialized).not.toContain("지지");
      expect(serialized).not.toContain("도화살");
      expect(serialized).not.toContain("홍염살");
      expect(serialized).not.toContain("역마살");
    }
  });

  it("매력 기운 배지 경계값 — 해당 기운이 전혀 없으면 빈 배열([])을 반환한다", () => {
    // 연: 甲辰 (신자진 → 도화 酉, 역마 寅), 월: 戊辰, 일: 戊戌 (인오술 → 도화 卯, 역마 申 / 일간 戊 홍염 → 辰 인데 월·연에 辰이 있으므로 辰 대신 丑으로 검증)
    const noBadgeCard = buildSajuDisplayFromPillars({
      year: "己丑", // 사유축 → 도화 午, 역마 亥
      month: "己丑",
      day: "戊戌", // 인오술 → 도화 卯, 역마 申 / 일간 戊 홍염 → 辰
      time: null,
    });

    expect(noBadgeCard).not.toBeNull();
    expect(noBadgeCard!.badges).toEqual([]);
  });

  it("매력 기운 배지 경계값 — 도화·홍염·역마 각각의 성립 조건과 시간 유무 경계를 정확히 판정한다", () => {
    // 1) 도화만 성립: 연지 寅(인오술 → 도화 卯, 역마 申), 월지 卯, 일주 己丑(사유축 → 도화 午, 역마 亥 / 己 홍염 → 辰)
    const dohwaOnly = buildSajuDisplayFromPillars({
      year: "甲寅",
      month: "丁卯",
      day: "己丑",
      time: null,
    });
    expect(dohwaOnly!.badges.map((b) => b.label)).toEqual([
      "도화(사람을 끄는 매력)",
    ]);

    // 2) 시지에만 도화(午)가 있을 때: 시간 미상이면 미부여, 시간 입력 시 부여
    const withoutTime = buildSajuDisplayFromPillars({
      year: "己丑", // 사유축 → 도화 午
      month: "己丑",
      day: "戊戌",
      time: null,
    });
    const withTime = buildSajuDisplayFromPillars({
      year: "己丑",
      month: "己丑",
      day: "戊戌",
      time: "戊午",
    });
    expect(withoutTime!.badges).toEqual([]);
    expect(withTime!.badges.map((b) => b.label)).toEqual([
      "도화(사람을 끄는 매력)",
    ]);

    // 3) 홍염만 성립: 일주 甲午(甲 홍염 → 午 / 일지 午 도화 卯, 역마 申), 연·월 己丑(사유축 → 도화 午가 걸리므로 연·월을 戊戌로 설정: 인오술 도화 卯, 역마 申)
    const hongyeomOnly = buildSajuDisplayFromPillars({
      year: "戊戌",
      month: "戊戌",
      day: "甲午",
      time: null,
    });
    expect(hongyeomOnly!.badges.map((b) => b.label)).toEqual([
      "홍염(한 번 빠지면 깊은 매력)",
    ]);

    // 4) 역마만 성립: 일지 子(신자진 → 도화 酉, 역마 寅), 연·월 甲寅(인오술 → 도화 卯, 역마 申), 일간 戊(홍염 → 辰)
    const yeokmaOnly = buildSajuDisplayFromPillars({
      year: "甲寅",
      month: "甲寅",
      day: "戊子",
      time: null,
    });
    expect(yeokmaOnly!.badges.map((b) => b.label)).toEqual([
      "역마(움직임이 많은)",
    ]);

    // 5) 도화 + 홍염 + 역마 3개 모두 성립:
    // 일주 甲午 (일간 甲 + 일지 午 → 홍염 성립; 인오술 기준 도화 卯, 역마 申)
    // 연지 卯 (도화 성립), 월지 申 (역마 성립)
    const allThree = buildSajuDisplayFromPillars({
      year: "乙卯",
      month: "庚申",
      day: "甲午",
      time: null,
    });
    expect(allThree!.badges.map((b) => b.label)).toEqual([
      "도화(사람을 끄는 매력)",
      "홍염(한 번 빠지면 깊은 매력)",
      "역마(움직임이 많은)",
    ]);
  });
});
