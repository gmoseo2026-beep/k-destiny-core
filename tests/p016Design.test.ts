import fs from "fs";
import path from "path";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/i18n/routing", () => ({
  Link: () => null,
  usePathname: () => "/",
}));
import {
  HERO_POSTER_SLIDES,
  getHeroPosterSlides,
  getHeroSlideMeta,
} from "@/components/home/HomeHeroCompact";
import { PRODUCT_COVER_MAP } from "@/components/home/HomeExplore";
import { shouldShowMobileTabBar, activeMobileTabForPath } from "@/components/MobileBottomTabBar";
import { splitLeadSentence, clampGaugePercent } from "@/lib/reportSectionLead";

describe("P-016-5 · P-018 홈·리포트 디자인 단위 테스트", () => {
  it("홈 상단 포스터 슬라이드 4장이 지정된 .webp 표지 파일과 상황별 문구를 가진다", () => {
    expect(HERO_POSTER_SLIDES).toHaveLength(4);
    expect(HERO_POSTER_SLIDES.map((s) => s.id)).toEqual([
      "inner_mind",
      "annual_2027",
      "premium_2027_daeun",
      "compat_basic",
    ]);

    for (const slide of HERO_POSTER_SLIDES) {
      expect(slide.coverSrc).toMatch(/^\/covers\/cover_.*\.webp$/);
      const diskPath = path.join(process.cwd(), "public", slide.coverSrc);
      expect(fs.existsSync(diskPath), `${slide.coverSrc} 파일 존재`).toBe(true);
      expect(slide.headline.length).toBeGreaterThan(5);
      expect(slide.getHref("ko")).toMatch(/^\/ko\//);
    }

    expect(PRODUCT_COVER_MAP).toEqual({
      inner_mind: "/covers/cover_inner_mind.webp",
      annual_2027: "/covers/cover_2027.webp",
      premium_2027_daeun: "/covers/cover_premium_2027_daeun.webp",
      compat_basic: "/covers/cover_compat_basic.webp",
    });
  });

  it("2026-11-01 00:00 KST 경계에서 홈 상단 슬라이드가 속마음(①) 우선에서 2027 신년운·2027 대운(②③) 우선으로 자동 전환된다", () => {
    const beforeNov = Date.parse("2026-10-31T23:59:59+09:00");
    const atNov = Date.parse("2026-11-01T00:00:00+09:00");

    expect(getHeroPosterSlides(beforeNov).map((s) => s.id)).toEqual([
      "inner_mind",
      "annual_2027",
      "premium_2027_daeun",
      "compat_basic",
    ]);
    expect(getHeroPosterSlides(atNov).map((s) => s.id)).toEqual([
      "annual_2027",
      "premium_2027_daeun",
      "inner_mind",
      "compat_basic",
    ]);
  });

  it("대운 슬라이드는 특가 기간 중 배지 2개(프리미엄 + 연말 특가)와 취소선 19,900원 → 9,900원을 표시하고, 2027-01-01 이후 취소선이 사라진다", () => {
    const duringPromo = Date.parse("2026-10-25T12:00:00+09:00");
    const afterPromo = Date.parse("2027-01-01T00:00:00+09:00");

    const metaDuring = getHeroSlideMeta("premium_2027_daeun", duringPromo);
    expect(metaDuring.isPremium).toBe(true);
    expect(metaDuring.promoBadge).toBe("연말 특가 · 12/31까지");
    expect(metaDuring.strikePriceText).toBe("19,900원");
    expect(metaDuring.priceText).toBe("9,900원");

    const metaAfter = getHeroSlideMeta("premium_2027_daeun", afterPromo);
    expect(metaAfter.isPremium).toBe(true);
    expect(metaAfter.promoBadge).toBeNull();
    expect(metaAfter.strikePriceText).toBeNull();
    expect(metaAfter.priceText).toBe("19,900원");
  });

  it("모바일 하단 떠 있는 탭바는 기존 하단 고정 버튼이 있는 경로에서 자동으로 숨겨진다", () => {
    // 표시되어야 하는 경로
    expect(shouldShowMobileTabBar("/")).toBe(true);
    expect(shouldShowMobileTabBar("/me")).toBe(true);
    expect(shouldShowMobileTabBar("/dashboard")).toBe(true);
    expect(shouldShowMobileTabBar("/report/rep_123")).toBe(true);
    expect(shouldShowMobileTabBar("/zodiac")).toBe(true);

    // 기존 하단 고정 CTA 버튼과 겹치지 않도록 숨겨야 하는 경로
    expect(shouldShowMobileTabBar("/products/inner_mind")).toBe(false);
    expect(shouldShowMobileTabBar("/compat/new")).toBe(false);
    expect(shouldShowMobileTabBar("/compat/share_tok")).toBe(false);
    expect(shouldShowMobileTabBar("/fortune/new")).toBe(false);
    expect(shouldShowMobileTabBar("/fortune/annual")).toBe(false);
    expect(shouldShowMobileTabBar("/pay/complete")).toBe(false);
    expect(shouldShowMobileTabBar("/checkout/success")).toBe(false);

    // 활성 탭 매핑 확인
    expect(activeMobileTabForPath("/")).toBe("home");
    expect(activeMobileTabForPath("/compat/new")).toBe("compat");
    expect(activeMobileTabForPath("/fortune/2027")).toBe("fortune");
    expect(activeMobileTabForPath("/me")).toBe("me");
  });

  it("리포트 섹션 본문에서 첫 문장('한 줄 결론')과 나머지 본문을 정확히 분리한다", () => {
    const multi =
      "겉으로는 무덤덤해 보여도 속으로는 당신의 연락을 기다리고 있어요.\n\n특히 밤늦은 시간에 혼자 생각이 많아지는 흐름이에요.";
    const res = splitLeadSentence(multi);
    expect(res.lead).toBe("겉으로는 무덤덤해 보여도 속으로는 당신의 연락을 기다리고 있어요.");
    expect(res.rest).toBe("특히 밤늦은 시간에 혼자 생각이 많아지는 흐름이에요.");

    // 한 문장뿐인 짧은 본문은 중복 노출 방지를 위해 lead = null
    const single = "올해 하반기 금전 흐름이 아주 좋습니다.";
    expect(splitLeadSentence(single)).toEqual({
      lead: null,
      rest: single,
    });
  });

  it("이미 있는 점수(0~100)를 게이지 퍼센트로 안전하게 변환한다", () => {
    expect(clampGaugePercent(88)).toBe(88);
    expect(clampGaugePercent(120)).toBe(100);
    expect(clampGaugePercent(-5)).toBe(0);
    expect(clampGaugePercent(Number.NaN)).toBe(0);
  });
});
