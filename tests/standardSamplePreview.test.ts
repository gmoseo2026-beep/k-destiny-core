import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { getProduct } from "@/lib/catalog";
import { validateStandardSampleReport } from "@/lib/reports/standardSampleGuard";
import {
  clipFirstSectionBody,
  extractFirstSentence,
  loadStandardSamplePreview,
} from "@/lib/reports/standardSamplePreview";

const TARGET_IDS = [
  "wealth",
  "career",
  "love_single",
  "charm",
  "health",
  "spicy_annual",
  "inner_mind",
  "reunion",
  "cheating",
  "marriage",
  "conflict",
  "secret_love",
] as const;

describe("P-012 단품 샘플 조각 만들기 및 저장 전 검사", () => {
  it("clipFirstSectionBody는 문장 끝 기준으로 300자 안팎에서 자르고 뒷문장을 남기지 않는다", () => {
    const s1 = "지민 님은 평소 감정을 쉽게 드러내지 않는 편이지만, 한 번 마음을 주면 깊고 단단하게 자리를 지키는 사람이에요."; // ~64자
    const s2 = "남들이 보기엔 늘 차분하고 흔들림 없어 보여도, 사실 속으로는 상대방의 사소한 말투 하나에도 오래 생각에 잠기곤 하죠."; // ~66자
    const s3 = "특히 가까워질수록 내 약한 모습을 들키기 싫어서 오히려 더 담담한 척 거리를 두는 순간이 찾아옵니다."; // ~55자
    const s4 = "그럴 때 상대방은 지민 님이 자신에게 관심이 식었다고 오해하기 쉬워서, 작은 표현 하나가 관계의 온도를 크게 바꾸어 놓아요."; // ~68자
    const s5 = "이 뒷문장은 300자 뒤에 오는 마지막 문장이라 결과 예시 조각에 절대 포함되면 안 됩니다.";
    const full = `${s1} ${s2}\n\n${s3} ${s4} ${s5}`;

    const clipped = clipFirstSectionBody(full, 300);
    expect(clipped).toContain(s1);
    expect(clipped).not.toContain(s5);
    expect(clipped.endsWith(".") || clipped.endsWith("요.") || clipped.endsWith("죠.")).toBe(true);
    expect(clipped.length).toBeGreaterThanOrEqual(180);
    expect(clipped.length).toBeLessThanOrEqual(340);
  });

  it("extractFirstSentence는 첫 문장만 뽑고 60자를 넘으면 최대 60자로 자른다", () => {
    const shortBody = "첫 번째 문장은 짧아요. 두 번째 문장은 나오면 안 됩니다.";
    expect(extractFirstSentence(shortBody, 60)).toBe("첫 번째 문장은 짧아요.");

    const longBody =
      "첫 번째 문장이 육십 자를 훌쩍 넘어가도록 아주 길게 작성된 경우에는 예쁘게 말줄임표로 잘라 주어야 화면에서 한 줄로 깔끔하게 보입니다. 두 번째 문장입니다.";
    const res = extractFirstSentence(longBody, 60);
    expect(res.length).toBeLessThanOrEqual(60);
    expect(res.endsWith("…")).toBe(true);
    expect(res).not.toContain("두 번째 문장");
  });

  it("loadStandardSamplePreview는 제외 대상이거나 샘플 파일이 없을 때 null을 돌려준다", () => {
    expect(loadStandardSamplePreview("free_personality")).toBeNull();
    expect(loadStandardSamplePreview("compat_basic")).toBeNull();
    expect(loadStandardSamplePreview("annual_2026")).toBeNull();
    expect(loadStandardSamplePreview("annual_2027")).toBeNull();
    expect(loadStandardSamplePreview("set_love")).toBeNull();
    expect(loadStandardSamplePreview("premium_naming")).toBeNull();
    expect(loadStandardSamplePreview("nonexistent_product")).toBeNull();
    // 파일이 없는 빈 폴더를 지정했을 때도 null
    expect(loadStandardSamplePreview("inner_mind", path.resolve(process.cwd(), "data/samples/nonexistent_dir"))).toBeNull();
  });

  it("validateStandardSampleReport는 한자·전문용어·단정 표현·다른 실명을 정확히 걸러낸다", () => {
    expect(
      validateStandardSampleReport(
        {
          headline: "지민 님과 서준 님의 다정한 흐름",
          summary: "서로 무너지지 않고 지지해 주는 관계예요. 상관없이 편안해요.",
        },
        "couple",
      ).ok,
    ).toBe(true);

    // 한자 포함
    expect(validateStandardSampleReport({ headline: "甲木 기운" }, "individual").hasHanja).toBe(true);

    // 전문용어 포함
    const jargonRes = validateStandardSampleReport(
      { headline: "일간과 천간, 도화살이 강해요" },
      "individual",
    );
    expect(jargonRes.ok).toBe(false);
    expect(jargonRes.jargonHits).toEqual(expect.arrayContaining(["일간", "천간", "도화살"]));

    // 단정 표현 포함
    const certainRes = validateStandardSampleReport(
      { headline: "올해는 무조건 100% 반드시 틀림없이 잘됩니다" },
      "individual",
    );
    expect(certainRes.ok).toBe(false);
    expect(certainRes.certainHits).toEqual(["반드시", "무조건", "100%", "틀림없이"]);

    // 다른 실명 포함 (한 사람 상품에 서준님/민수님 등장)
    const nameRes = validateStandardSampleReport(
      { headline: "지민 님과 민수님의 이야기" },
      "individual",
    );
    expect(nameRes.ok).toBe(false);
    expect(nameRes.otherNameHits).toContain("민수");
  });

  it("생성된 12개 단품 샘플 JSON이 모두 존재하고 저장 전 검사와 조각 추출을 통과한다", () => {
    for (const id of TARGET_IDS) {
      const product = getProduct(id);
      expect(product).toBeDefined();

      const rawPath = path.resolve(process.cwd(), "data/samples/standard", `${id}.json`);
      expect(fs.existsSync(rawPath)).toBe(true);
      const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));

      expect(raw.meta?.isSample).toBe(true);
      expect(raw.meta?.targetName).toContain("예시 · 가상 인물");

      const validation = validateStandardSampleReport(raw.report, product!.target);
      expect(validation).toEqual({
        ok: true,
        hasHanja: false,
        jargonHits: [],
        certainHits: [],
        otherNameHits: [],
      });

      const preview = loadStandardSamplePreview(id);
      expect(preview).not.toBeNull();
      expect(preview!.targetLabel).toBe(raw.meta.targetName);
      // 첫 섹션 조각은 전체 첫 섹션 본문보다 짧아야 한다(뒷문장이 클라이언트로 나가지 않음)
      expect(preview!.firstSection.bodyExcerpt.length).toBeLessThan(raw.report.sections[0].body.length);
      expect(preview!.lockedSections.length).toBe(3);
      for (const sec of preview!.lockedSections) {
        expect(sec.firstSentence.length).toBeGreaterThan(0);
        expect(sec.firstSentence.length).toBeLessThanOrEqual(60);
      }
    }
  });
});
