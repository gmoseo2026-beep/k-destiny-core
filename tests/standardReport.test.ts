import { describe, it, expect } from "vitest";
import {
  makeStandardReportValidator,
  makeStandardTeaserValidator,
  readEnvelope,
  type StandardReport,
} from "@/lib/reports/standard";
import { PRODUCT_SPECS, buildStandardPrompt } from "@/lib/prompts/productSpecs";
import { STYLE_GUIDE } from "@/lib/destinyGen";

describe("Standard Report & Teaser Validators", () => {
  const spec = PRODUCT_SPECS.personality_basic;

  const validReport: StandardReport = {
    headline: "자신만의 고유한 빛을 발하는 사람",
    summary: "남들이 보는 모습과 실제 내면이 조화를 이룹니다.",
    sections: [
      { key: "first_impression", title: "첫인상과 진짜 나", body: "첫인상은 온화하지만 내면은 단단합니다." },
      { key: "motivation", title: "나를 움직이는 힘", body: "스스로 세운 목표가 가장 큰 원동력입니다." },
      { key: "relationship", title: "관계에서의 나", body: "배려심 깊고 신뢰를 중시합니다." },
      { key: "recovery", title: "나를 지치게 하는 것과 회복법", body: "혼자만의 시간을 통해 충전합니다." },
    ],
    advice: {
      do: ["자신을 믿기", "충분한 휴식 갖기", "솔직하게 표현하기"],
      dont: ["과도한 눈치 보기", "무리한 약속 잡기", "감정 억누르기"],
    },
    closing: "당신의 걸음을 언제나 응원합니다.",
  };

  it("정상 FULL 샘플은 통과한다", () => {
    const validator = makeStandardReportValidator(spec);
    expect(validator(validReport)).toBe(true);
  });

  it("섹션 3개면 실패한다", () => {
    const validator = makeStandardReportValidator(spec);
    const bad = {
      ...validReport,
      sections: validReport.sections.slice(0, 3),
    };
    expect(validator(bad)).toBe(false);
  });

  it("key 순서가 뒤바뀌면 실패한다", () => {
    const validator = makeStandardReportValidator(spec);
    const bad = {
      ...validReport,
      sections: [
        validReport.sections[1],
        validReport.sections[0],
        validReport.sections[2],
        validReport.sections[3],
      ],
    };
    expect(validator(bad)).toBe(false);
  });

  it("advice.do 가 2개면 실패한다", () => {
    const validator = makeStandardReportValidator(spec);
    const bad = {
      ...validReport,
      advice: {
        do: ["하나", "둘"],
        dont: ["하나", "둘", "셋"],
      },
    };
    expect(validator(bad)).toBe(false);
  });

  it("빈 body 가 있으면 실패한다", () => {
    const validator = makeStandardReportValidator(spec);
    const bad = {
      ...validReport,
      sections: [
        { ...validReport.sections[0], body: "   " },
        validReport.sections[1],
        validReport.sections[2],
        validReport.sections[3],
      ],
    };
    expect(validator(bad)).toBe(false);
  });

  it("TEASER 는 hooks 가 2개면 실패한다", () => {
    const validator = makeStandardTeaserValidator(spec);
    const badTeaser = {
      headline: "미리보기 헤드라인",
      summary: "미리보기 요약입니다.",
      freeSection: {
        key: "first_impression",
        title: "첫인상",
        body: "첫인상에 대한 설명입니다.",
      },
      hooks: ["훅 1번 대기 중—", "훅 2번 대기 중—"],
    };
    expect(validator(badTeaser)).toBe(false);

    const goodTeaser = {
      ...badTeaser,
      hooks: ["훅 1번 대기 중—", "훅 2번 대기 중—", "훅 3번 대기 중—"],
    };
    expect(validator(goodTeaser)).toBe(true);
  });

  it("readEnvelope 는 버전 없는 데이터({headline:'Test'})에 null 을 반환한다", () => {
    expect(readEnvelope({ headline: "Test" })).toBeNull();
    expect(readEnvelope(null)).toBeNull();
    expect(readEnvelope({ version: 1, score: 85, data: { headline: "Test" } })).toEqual({
      version: 1,
      score: 85,
      data: { headline: "Test" },
    });
  });

  it("buildStandardPrompt 결과에 STYLE_GUIDE 첫 60자, 'sections', 'Output ONLY the JSON object' 포함", () => {
    const prompt = buildStandardPrompt(
      spec,
      "CONTEXT BLOCK SAMPLE",
      88,
      "FULL",
      "다정하고 세심한 톤"
    );

    const stylePrefix = STYLE_GUIDE.slice(0, 60);
    expect(prompt.includes(stylePrefix)).toBe(true);
    expect(prompt.includes('"sections"')).toBe(true);
    expect(prompt.includes("Output ONLY the JSON object.")).toBe(true);
  });
});
