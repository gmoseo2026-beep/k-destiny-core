import { afterEach, describe, expect, it, vi } from "vitest";
import { SEASON_PROMO_ENDS_AT } from "@/lib/catalog";
import {
  getAnnualScoreRating,
  getAnnualSeasonPromo,
} from "@/app/[locale]/fortune/annual/AnnualFortuneClient";

describe("AnnualFortuneClient season promo & score rating helpers (P-013)", () => {
  const during = Date.parse("2026-10-18T12:00:00+09:00");
  const after = SEASON_PROMO_ENDS_AT;

  afterEach(() => {
    vi.useRealTimers();
  });

  it("특가 중(2026 총운): 입력 화면 한 줄과 취소선·특가 배지 값을 돌려준다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(during);

    const promo = getAnnualSeasonPromo(2026, during);
    expect(promo).toEqual({
      inputLine: "연말 특가 · 전체 리포트 4,900원 → 3,000원 · 12/31까지",
      strikePriceLabel: "4,900원",
      priceLabel: "3,000원",
      badgeText: "연말 특가 · 12/31까지",
    });
  });

  it("특가 종료 후(2027-01-01 00:00 KST 이후): 2026 총운도 null을 돌려줘 특가 표시가 사라진다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(after);

    expect(getAnnualSeasonPromo(2026, after)).toBeNull();
  });

  it("특가 대상이 아닌 2027 신년운: 특가 기간 중에도 null을 돌려줘 화면이 바뀌지 않는다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(during);

    expect(getAnnualSeasonPromo(2027, during)).toBeNull();
  });

  it("점수 꼬리표는 한자어 운세 용어 없이 쉬운 한국어로 돌려준다", () => {
    expect(getAnnualScoreRating(95)).toEqual({
      label: "최고의 상승운",
      badgeBg: "bg-coral text-white",
    });
    expect(getAnnualScoreRating(85)).toEqual({
      label: "안정된 도약",
      badgeBg: "bg-[#FFC24B] text-ink",
    });
    expect(getAnnualScoreRating(75)).toEqual({
      label: "노력이 결실 맺는 해",
      badgeBg: "bg-emerald-500 text-white",
    });
    expect(getAnnualScoreRating(65)).toEqual({
      label: "지혜롭게 준비하는 해",
      badgeBg: "bg-[#6A2C70] text-white",
    });
  });
});
