import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import enMessages from "@/messages/en.json";
import jaMessages from "@/messages/ja.json";
import zhMessages from "@/messages/zh.json";
import { COMPAT_GAUGE_SPECS, buildCompatGaugeItems } from "@/lib/compatGauge";
import {
  COMPAT_FREE_MARKS,
  parseCompatFreeText,
} from "@/lib/compatFreeText";
import {
  LOCALE_CONFIG,
  STRICT_NO_HANJA_RULE,
  buildCompatPrompt,
  compatContextBlock,
  validateCompatOutputLanguage,
} from "@/lib/destinyGen";
import {
  buildWelcomeTargetHref,
  detectPreferredWelcomeLang,
  isGlobalCoupleLocale,
  resolveGlobalCoupleGuardRedirect,
} from "@/lib/globalCoupleLocale";
import { findCampaignLink } from "@/lib/campaignLinks";

const EXPECTED_COMPAT_KEYWORDS = [
  "천생연분",
  "다정한 짝꿍",
  "거울 같은 소울메이트",
  "서로를 자극하는 관계",
  "서로의 부족함을 채워주는",
  "기운 찰떡궁합",
  "떨어질 수 없는 케미",
  "티격태격 밀당 케미",
  "에너지의 완벽한 조화",
  "운명적인 이끌림",
  "알아가는 재미",
  "맞춰가는 즐거움",
  "함께 성장하는 인연",
  "서서히 스며드는 케미",
] as const;

const EXPECTED_STEP_LABELS = [
  "찰떡 호흡",
  "서로 북돋는 흐름",
  "비슷해 편안한 결",
  "다름을 맞춰 가는 사이",
  "빈틈없이 채워 줌",
  "부분적으로 채워 줌",
  "각자 장점이 뚜렷함",
  "가까울수록 편안함",
  "무난하고 안정적",
  "섬세한 배려가 필요",
  "속도 조절이 꼭 필요",
  "고르고 단단한 균형",
  "대체로 고른 편",
  "특정 색깔이 뚜렷함",
  "온도가 딱 맞음",
  "자연스러운 온도 차",
  "한쪽 템포가 뚜렷함",
] as const;

describe("P-014 1. 키워드·지표 번역 표 완전성 (en / ja / zh)", () => {
  it("lib/compatibility.ts 의 모든 키워드 리터럴이 EXPECTED_COMPAT_KEYWORDS 에 빠짐없이 들어 있다", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/compatibility.ts"),
      "utf-8"
    );
    const fnBlock = src.slice(src.indexOf("function extractKeywords"));
    const matches = Array.from(fnBlock.matchAll(/'([^']+)'/g))
      .map((m) => m[1])
      .filter((s) => s !== "breakdown");
    expect(matches.sort()).toEqual([...EXPECTED_COMPAT_KEYWORDS].sort());
  });

  it("lib/compatGauge.ts 의 모든 단계 라벨이 EXPECTED_STEP_LABELS 에 빠짐없이 들어 있다", () => {
    const sampleScores = [0, 3, 5, 7, 10, 12, 15, 18, 22, 25, 30];
    const seenSteps = new Set<string>();
    for (const s of sampleScores) {
      const items = buildCompatGaugeItems(
        { stem: s, balance: s, yinYang: s },
        { stem: s, complement: s, branch: s, balance: s, yinYang: s }
      );
      for (const item of items ?? []) {
        if (item.step) seenSteps.add(item.step.stepLabel);
      }
    }
    for (const stepLabel of seenSteps) {
      expect(EXPECTED_STEP_LABELS).toContain(stepLabel);
    }
  });

  it.each([
    ["en", enMessages.Couple],
    ["ja", jaMessages.Couple],
    ["zh", zhMessages.Couple],
  ] as const)(
    "%s: 모든 궁합 키워드(14개)와 지표 라벨·단계(5축·17단계)가 번역되어 있고 한글이 섞이지 않는다",
    (locale, couple) => {
      expect(couple).toBeDefined();
      const kwMap = couple.keywords as Record<string, string>;
      for (const kw of EXPECTED_COMPAT_KEYWORDS) {
        const val = kwMap[kw];
        expect(val, `${locale} missing keyword: ${kw}`).toBeTruthy();
        expect(val).not.toMatch(/[가-힣ㄱ-ㅎㅏ-ㅣ]/);
        if (locale === "en") {
          expect(val).not.toMatch(/[\u4E00-\u9FFF]/);
        }
      }

      const axesMap = couple.gauges.axes as Record<
        string,
        { label: string; description: string }
      >;
      for (const spec of COMPAT_GAUGE_SPECS) {
        const axis = axesMap[spec.key];
        expect(axis?.label, `${locale} missing axis: ${spec.key}`).toBeTruthy();
        expect(axis.label).not.toMatch(/[가-힣ㄱ-ㅎㅏ-ㅣ]/);
        if (spec.isPublic) {
          expect(
            axis.description,
            `${locale} missing public axis description: ${spec.key}`
          ).toBeTruthy();
          expect(axis.description).not.toMatch(/[가-힣ㄱ-ㅎㅏ-ㅣ]/);
        }
      }

      const stepsMap = couple.gauges.steps as Record<string, string>;
      for (const stepLabel of EXPECTED_STEP_LABELS) {
        const val = stepsMap[stepLabel];
        expect(val, `${locale} missing step: ${stepLabel}`).toBeTruthy();
        expect(val).not.toMatch(/[가-힣ㄱ-ㅎㅏ-ㅣ]/);
        if (locale === "en") {
          expect(val).not.toMatch(/[\u4E00-\u9FFF]/);
        }
      }
    }
  );
});

describe("P-014 2. buildCompatPrompt 한국어 불변 및 외국어 분기", () => {
  const sampleContext = compatContextBlock({
    personA: {
      name: "Test A",
      gender: "F",
      dayMaster: "甲",
      elementsScore: { wood: 30, fire: 20, earth: 20, metal: 15, water: 15 },
    },
    personB: {
      name: "Test B",
      gender: "M",
      dayMaster: "己",
      elementsScore: { wood: 15, fire: 25, earth: 25, metal: 20, water: 15 },
    },
    relation: "love",
    compatResult: {
      score: 92,
      keywords: ["천생연분", "기운 찰떡궁합", "에너지의 완벽한 조화"],
      breakdown: { stem: 30, complement: 20, branch: 15, balance: 15, yinYang: 12 },
    },
  });

  it("lang 없이 부르면 한국어 프롬프트 문자열이 이전과 한 글자도 다르지 않다", () => {
    const koTone = LOCALE_CONFIG.ko.toneGuide;
    const freePrompt = buildCompatPrompt(false, sampleContext, koTone);

    expect(freePrompt).toContain(STRICT_NO_HANJA_RULE);
    expect(freePrompt).toContain(COMPAT_FREE_MARKS.scenes);
    expect(freePrompt).toContain(COMPAT_FREE_MARKS.unsaid);
    expect(freePrompt).toContain(
      'CRITICAL PRINCIPLE (2026-10-03): FREE makes them ask the question, PAID gives the answer.'
    );
    expect(freePrompt).toContain(
      '5. Absolutely NO Chinese characters (한자) and NO saju technical terms.'
    );

    const paidPrompt = buildCompatPrompt(
      true,
      sampleContext,
      koTone,
      "둘 중 한 사람은 연락할 때마다 망설여요."
    );
    expect(paidPrompt).toContain(STRICT_NO_HANJA_RULE);
    expect(paidPrompt).toContain("interface DeepReportContent {");
    expect(paidPrompt).toContain(
      'The free preview ended with this open question: "둘 중 한 사람은 연락할 때마다 망설여요."'
    );
  });

  it("lang 이 en | ja | zh 이면 STRICT_NO_HANJA_RULE 대신 외국어 전용 규칙과 [SCENES]/[UNSAID] 마커를 쓴다", () => {
    for (const lang of ["en", "ja", "zh"] as const) {
      const p = buildCompatPrompt(
        false,
        sampleContext,
        LOCALE_CONFIG[lang].toneGuide,
        null,
        lang
      );
      expect(p).not.toContain(STRICT_NO_HANJA_RULE);
      expect(p).toContain(COMPAT_FREE_MARKS.globalScenes);
      expect(p).toContain(COMPAT_FREE_MARKS.globalUnsaid);
      expect(p).toContain("No Korean (Hangul).");
    }
  });
});

describe("P-014 3. 출력 언어 검증(validateCompatOutputLanguage) 및 파서", () => {
  it("en: 한글이나 한자가 1글자라도 섞이면 실패하고 순수 영어는 통과한다", () => {
    const goodEn = `[SCENES]\nTest A always texts first in the morning, while Test B replies with a long thoughtful message at night.\nWhen choosing a restaurant, Test B narrows down three places and Test A picks the final spot in two seconds.\n[UNSAID]\nOne of the two quietly swallows small disappointments whenever plans change at the last minute, though neither has brought it up yet.`;
    expect(validateCompatOutputLanguage(goodEn, "en")).toEqual({ ok: true });
    expect(parseCompatFreeText(goodEn)).toEqual({
      kind: "scenes",
      scenes: [
        "Test A always texts first in the morning, while Test B replies with a long thoughtful message at night.",
        "When choosing a restaurant, Test B narrows down three places and Test A picks the final spot in two seconds.",
      ],
      unsaid:
        "One of the two quietly swallows small disappointments whenever plans change at the last minute, though neither has brought it up yet.",
    });

    expect(
      validateCompatOutputLanguage("Test A gets along with 나.", "en")
    ).toEqual({ ok: false, reason: "contains_hangul" });
    expect(
      validateCompatOutputLanguage("They have strong 火 energy.", "en")
    ).toEqual({ ok: false, reason: "contains_hanja" });
  });

  it("ja: 일본어 한자·히라가나·가타카나는 통과하고 한글이 섞이면 실패한다", () => {
    const goodJa = `[SCENES]\nTest Aさんは思いついたらすぐ連絡し、Test Bさんは少し考えてから丁寧に返事を送ります。\nデートの帰り道、Test Bさんが次の予定を自然に切り出すことが多いです。\n[UNSAID]\nふたりのうち一人は、返信が少し遅れたときに寂しさを飲み込んでいますが、まだ言葉にはしていません。`;
    expect(validateCompatOutputLanguage(goodJa, "ja")).toEqual({ ok: true });
    expect(
      validateCompatOutputLanguage(goodJa + "\n천생연분", "ja")
    ).toEqual({ ok: false, reason: "contains_hangul" });
  });

  it("zh: 중국어 간체 한자는 통과하고 한글이 섞이면 실패한다", () => {
    const goodZh = `[SCENES]\nTest A总是先发消息分享日常，而Test B会认真读完后给出温柔的回应。\n每次约会定地点时，Test B会先做好攻略，最后由Test A拍板决定。\n[UNSAID]\n两个人之中有一位在计划临时变动时会默默把失落咽回肚子里，只是都还没有说出口。`;
    expect(validateCompatOutputLanguage(goodZh, "zh")).toEqual({ ok: true });
    expect(
      validateCompatOutputLanguage(goodZh + "\n찰떡궁합", "zh")
    ).toEqual({ ok: false, reason: "contains_hangul" });
  });
});

describe("P-014 4. /couple 언어 제한 및 /welcome 언어 선택·캠페인 전달", () => {
  it("en / ja / zh 만 /couple 진입을 허용하고 나머지 로케일은 /ko/compat/new 로 보낸다", () => {
    expect(isGlobalCoupleLocale("en")).toBe(true);
    expect(isGlobalCoupleLocale("ja")).toBe(true);
    expect(isGlobalCoupleLocale("zh")).toBe(true);
    expect(isGlobalCoupleLocale("ko")).toBe(false);
    expect(isGlobalCoupleLocale("es")).toBe(false);

    expect(resolveGlobalCoupleGuardRedirect("en")).toBeNull();
    expect(resolveGlobalCoupleGuardRedirect("ja")).toBeNull();
    expect(resolveGlobalCoupleGuardRedirect("zh")).toBeNull();
    expect(resolveGlobalCoupleGuardRedirect("ko")).toBe("/ko/compat/new");
    expect(resolveGlobalCoupleGuardRedirect("es")).toBe("/ko/compat/new");
    expect(resolveGlobalCoupleGuardRedirect("de")).toBe("/ko/compat/new");
    expect(resolveGlobalCoupleGuardRedirect("fr")).toBe("/ko/compat/new");
  });

  it("navigator.language 에 따라 맨 위에 둘 언어를 판별한다", () => {
    expect(detectPreferredWelcomeLang("ko-KR")).toBe("ko");
    expect(detectPreferredWelcomeLang("ja-JP")).toBe("ja");
    expect(detectPreferredWelcomeLang("zh-CN")).toBe("zh");
    expect(detectPreferredWelcomeLang("zh-Hans")).toBe("zh");
    expect(detectPreferredWelcomeLang("en-US")).toBe("en");
    expect(detectPreferredWelcomeLang("fr-FR")).toBe("en");
  });

  it("/welcome 에서 언어를 고르면 utm_* 쿼리를 유지한 채 이동 주소를 만든다", () => {
    const q =
      "utm_source=ringuniv&utm_medium=partner&utm_campaign=partner_2026&utm_content=store_qr&evil=1";
    expect(buildWelcomeTargetHref("ko", q)).toBe(
      "/ko/compat/new?utm_source=ringuniv&utm_medium=partner&utm_campaign=partner_2026&utm_content=store_qr"
    );
    expect(buildWelcomeTargetHref("en", q)).toBe(
      "/en/couple?utm_source=ringuniv&utm_medium=partner&utm_campaign=partner_2026&utm_content=store_qr"
    );
    expect(buildWelcomeTargetHref("ja", q)).toBe(
      "/ja/couple?utm_source=ringuniv&utm_medium=partner&utm_campaign=partner_2026&utm_content=store_qr"
    );
    expect(buildWelcomeTargetHref("zh", q)).toBe(
      "/zh/couple?utm_source=ringuniv&utm_medium=partner&utm_campaign=partner_2026&utm_content=store_qr"
    );
  });

  it("kd-ringuniv 캠페인 링크의 도착 경로가 /welcome 이다", () => {
    const link = findCampaignLink("kd-ringuniv");
    expect(link?.path).toBe("/welcome");
  });
});
