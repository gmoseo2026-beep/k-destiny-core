import { describe, it, expect } from "vitest";
import { relation, isStrong, branchAdj, cycleLabel, charPoints } from "@/lib/premium/ganzhi";

describe("ganzhi", () => {
  it("관계", () => {
    expect(relation("wood", "fire")).toBe("output");
    expect(relation("metal", "fire")).toBe("pressure");
    expect(relation("water", "fire")).toBe("wealth");
    expect(relation("earth", "fire")).toBe("support");
    expect(relation("fire", "fire")).toBe("peer");
  });
  it("강약", () => {
    expect(isStrong("wood", { wood: 30, water: 20, fire: 20, earth: 15, metal: 15 })).toBe(true);
    expect(isStrong("wood", { wood: 10, water: 10, fire: 30, earth: 30, metal: 20 })).toBe(false);
  });
  it("지지 가중치", () => {
    expect(branchAdj("子", "午")).toBe(-6);
    expect(branchAdj("子", "丑")).toBe(4);
    expect(branchAdj("申", "子")).toBe(3);
  });
  it("라벨에 한자 없음", () => {
    expect(cycleLabel("庚辰")).toBe("단단한 바위와 용의 10년");
    // 받침 있는 말 뒤에는 "과"
    expect(cycleLabel("辛未")).toBe("빛나는 보석과 양의 10년");
    expect(cycleLabel("甲子")).toBe("큰 나무와 쥐의 10년");
    expect(cycleLabel("丙寅")).toBe("한낮의 태양과 호랑이의 10년");
  });
  it("알 수 없는 글자는 0점", () => {
    expect(charPoints("wood", "?", true)).toBe(0);
  });
});
