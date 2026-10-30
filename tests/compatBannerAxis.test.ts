import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

const trackEventMock = vi.fn();

vi.mock("@/lib/gtag", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href, ...rest }: { children?: React.ReactNode; href?: string }) =>
    React.createElement("a", { href, ...rest }, children),
  usePathname: () => "/ko/compat/tok_020",
}));

import {
  DEFAULT_COMPAT_TOP_BANNER_TITLE,
  buildCompatTopBannerCopy,
  lowestPublicAxis,
  pickPublicBreakdown,
} from "@/lib/compatGauge";
import CompatResultClient, { trackCompatCheckoutClick } from "@/components/CompatResultClient";

const SAMPLE_COMPAT_BASE = {
  id: "compat_id_020",
  shareToken: "share_tok_020",
  relation: "love",
  score: 82,
  keywords: ["편안한 호흡", "다정한 대화", "안정감"],
  summaryKo: "두 사람은 편안하게 대화가 이어지는 인연이에요.",
  personA: { name: "지민", gender: "F" },
  personB: { name: "서준", gender: "M" },
};

const HANJA_RE = /[\u4E00-\u9FFF]/;
const FORBIDDEN_SAJU_JARGON_RE =
  /(오행|일간|천간|지지|일주|용신|희신|기신|상생|상극|십신|십성|신살|도화|역마|귀문|원진|대운|세운)/;
const FORBIDDEN_ALARM_RE = /(%|퍼센트|위험|무조건|반드시|절대|파국|이별\s*확정)/;

describe("20 궁합 잠금 배너 최저 비율 공개 지표 (argon/20-compat-banner-axis)", () => {
  beforeEach(() => {
    trackEventMock.mockReset();
  });

  it("1) 결정론: 같은 입력은 항상 같은 항목을 반환하며 잠긴 축(complement·branch)에 영향을 받지 않는다", () => {
    const input = Object.freeze({ stem: 25, balance: 7, yinYang: 10 });
    const first = lowestPublicAxis(input);
    expect(first).toEqual({ label: "두 사람 기운의 균형", score: 7, max: 10 });

    for (let i = 0; i < 50; i += 1) {
      expect(lowestPublicAxis(input)).toEqual(first);
    }

    // 잠긴 축(branch=5: 25%, complement=10: 33.3%)이 더 낮더라도 공개 3축만 비교한다
    const rawWithLowLocked = {
      stem: 25,
      complement: 10,
      branch: 5,
      balance: 7,
      yinYang: 10,
    };
    expect(lowestPublicAxis(pickPublicBreakdown(rawWithLowLocked))).toEqual(first);
    expect(lowestPublicAxis(rawWithLowLocked)).toEqual(first);
  });

  it("2) 비율 계산: 원점수(30점 만점 vs 10점 만점)가 아닌 (점수 ÷ max) 비율로 비교한다", () => {
    // 원점수로는 balance(7) < stem(20)이지만, 비율은 stem(20/30 = 66.7%) < balance(7/10 = 70%)
    expect(lowestPublicAxis({ stem: 20, balance: 7, yinYang: 10 })).toEqual({
      label: "타고난 성향 합",
      score: 20,
      max: 30,
    });

    // 원점수로는 balance(4)·yinYang(4) < stem(10)이지만, 비율은 stem(10/30 = 33.3%) < 4/10(40%)
    expect(lowestPublicAxis({ stem: 10, balance: 4, yinYang: 4 })).toEqual({
      label: "타고난 성향 합",
      score: 10,
      max: 30,
    });

    // yinYang(4/10 = 40%) < stem(20/30 = 66.7%) < balance(7/10 = 70%)
    expect(lowestPublicAxis({ stem: 20, balance: 7, yinYang: 4 })).toEqual({
      label: "에너지 온도 조화",
      score: 4,
      max: 10,
    });
  });

  it("3) 동점 처리: 비율이 같으면 COMPAT_GAUGE_SPECS 순서(stem → balance → yinYang)상 앞선 항목을 반환한다", () => {
    // 세 항목 모두 100% (30/30 === 10/10 === 10/10) → stem 우선
    expect(lowestPublicAxis({ stem: 30, balance: 10, yinYang: 10 })).toEqual({
      label: "타고난 성향 합",
      score: 30,
      max: 30,
    });

    // balance(7/10) === yinYang(7/10) < stem(30/30) → balance 우선
    expect(lowestPublicAxis({ stem: 30, balance: 7, yinYang: 7 })).toEqual({
      label: "두 사람 기운의 균형",
      score: 7,
      max: 10,
    });

    // balance(4/10) === yinYang(4/10) < stem(25/30) → balance 우선
    expect(lowestPublicAxis({ stem: 25, balance: 4, yinYang: 4 })).toEqual({
      label: "두 사람 기운의 균형",
      score: 4,
      max: 10,
    });
  });

  it("4) null 및 유효하지 않은 입력에 대해 null과 기본 배너 제목을 돌려준다", () => {
    const invalidInputs: unknown[] = [
      null,
      undefined,
      {},
      [],
      "invalid",
      { stem: 20, balance: 7 },
      { stem: 15, balance: 7, yinYang: 10 },
      { stem: Number.NaN, balance: 7, yinYang: 10 },
      { stem: "20", balance: 7, yinYang: 10 },
    ];

    for (const invalid of invalidInputs) {
      expect(lowestPublicAxis(invalid)).toBeNull();
      expect(buildCompatTopBannerCopy(invalid)).toEqual({
        title: DEFAULT_COMPAT_TOP_BANNER_TITLE,
        banner: "default",
      });
    }
  });

  it("4-1) 세 항목이 모두 만점이면 점수 문구 대신 기본 제목을 쓴다", () => {
    expect(buildCompatTopBannerCopy({ stem: 30, balance: 10, yinYang: 10 })).toEqual({
      title: DEFAULT_COMPAT_TOP_BANNER_TITLE,
      banner: "default",
    });
  });

  it("5) 공개 3축의 모든 유효 조합(36가지) 및 기본 문구에 한자·사주 전문용어·위험/%·단정적 예언이 없다", () => {
    const stems = [30, 25, 20, 10] as const;
    const balances = [10, 7, 4] as const;
    const yinYangs = [10, 7, 4] as const;
    const subtitle = "풀어 가는 법 · 이번 달 애정운 타이밍까지 전체 리포트로";

    const copiesToCheck: string[] = [DEFAULT_COMPAT_TOP_BANNER_TITLE, subtitle];

    for (const stem of stems) {
      for (const balance of balances) {
        for (const yinYang of yinYangs) {
          const axis = lowestPublicAxis({ stem, balance, yinYang });
          expect(axis).not.toBeNull();
          const copy = buildCompatTopBannerCopy({ stem, balance, yinYang });
          if (stem === 30 && balance === 10 && yinYang === 10) {
            expect(copy.banner).toBe("default");
            copiesToCheck.push(copy.title);
            continue;
          }
          expect(copy.banner).toBe("axis");
          expect(copy.title).toBe(
            `우리 '${axis!.label}' ${axis!.score}/${axis!.max}점, 어디서 부딪힐까?`,
          );
          copiesToCheck.push(copy.title);
        }
      }
    }

    expect(copiesToCheck).toHaveLength(36 + 2);
    for (const text of copiesToCheck) {
      expect(text).not.toMatch(HANJA_RE);
      expect(text).not.toMatch(FORBIDDEN_SAJU_JARGON_RE);
      expect(text).not.toMatch(FORBIDDEN_ALARM_RE);
    }
  });

  it("6) CompatResultClient 상단 배너 렌더링 및 click_top_cta GA4 banner('axis'|'default') 파라미터 검증", () => {
    const axisHtmlRaw = renderToStaticMarkup(
      React.createElement(CompatResultClient, {
        initialData: {
          ...SAMPLE_COMPAT_BASE,
          publicBreakdown: { stem: 20, balance: 7, yinYang: 10 },
        },
        locale: "ko",
      }),
    );
    const axisHtml = axisHtmlRaw.replace(/&#x27;/g, "'");
    expect(axisHtml).toContain("우리 '타고난 성향 합' 20/30점, 어디서 부딪힐까?");
    expect(axisHtml).toContain("풀어 가는 법 · 이번 달 애정운 타이밍까지 전체 리포트로");
    expect(axisHtml).not.toContain(DEFAULT_COMPAT_TOP_BANNER_TITLE);

    const defaultHtml = renderToStaticMarkup(
      React.createElement(CompatResultClient, {
        initialData: {
          ...SAMPLE_COMPAT_BASE,
          publicBreakdown: null,
        },
        locale: "ko",
      }),
    );
    expect(defaultHtml).toContain(DEFAULT_COMPAT_TOP_BANNER_TITLE);
    expect(defaultHtml).toContain("풀어 가는 법 · 이번 달 애정운 타이밍까지 전체 리포트로");

    const paidHtmlRaw = renderToStaticMarkup(
      React.createElement(CompatResultClient, {
        initialData: {
          ...SAMPLE_COMPAT_BASE,
          publicBreakdown: { stem: 20, balance: 7, yinYang: 10 },
        },
        locale: "ko",
        isPremium: true,
      }),
    );
    expect(paidHtmlRaw.replace(/&#x27;/g, "'")).not.toContain(
      "우리 '타고난 성향 합' 20/30점, 어디서 부딪힐까?",
    );

    // GA4 click_top_cta 이벤트 이름은 바꾸지 않고 banner: "axis" | "default"만 추가된다
    const axisCopy = buildCompatTopBannerCopy({ stem: 20, balance: 7, yinYang: 10 });
    trackCompatCheckoutClick("click_top_cta", "compat_id_020", "compat_basic", {
      banner: axisCopy.banner,
    });
    expect(trackEventMock).toHaveBeenLastCalledWith("click_top_cta", {
      compatId: "compat_id_020",
      productId: "compat_basic",
      banner: "axis",
    });

    const defaultCopy = buildCompatTopBannerCopy(null);
    trackCompatCheckoutClick("click_top_cta", "compat_id_020", "compat_basic", {
      banner: defaultCopy.banner,
    });
    expect(trackEventMock).toHaveBeenLastCalledWith("click_top_cta", {
      compatId: "compat_id_020",
      productId: "compat_basic",
      banner: "default",
    });

    // 다른 결제 클릭 이벤트는 기존 페이로드({ compatId, productId }) 그대로 유지
    trackCompatCheckoutClick("click_unlock_single", "compat_id_020", "compat_basic");
    expect(trackEventMock).toHaveBeenLastCalledWith("click_unlock_single", {
      compatId: "compat_id_020",
      productId: "compat_basic",
    });
  });
});
