import { describe, it, expect } from "vitest";
import { animalYearPage } from "@/lib/seo/zodiacYear";
import { ZODIAC } from "@/lib/seo/zodiac";

const HANJA = /[㐀-䶿一-鿿]/;
const JARGON = /오행|일간|천간|지지|용신|십신|대운수|도화살|역마살|편재|정재|편관|정관|식신|상관|비견|겁재/;
const PROPHECY = /반드시|무조건|100%|틀림없|확실히|대박/;

describe("띠별 2027년 운세 페이지(10-27)", () => {
  it("12띠 모두 화면 데이터가 있고, 없는 띠는 null", () => {
    for (const z of ZODIAC) expect(animalYearPage(z.slug), z.slug).not.toBeNull();
    expect(animalYearPage("cat")).toBeNull();
  });

  it("같은 입력이면 같은 결과(결정론)", () => {
    expect(animalYearPage("horse")).toEqual(animalYearPage("horse"));
  });

  it("2027년(양의 해) 관계: 말=단짝, 돼지·토끼=한 팀, 양=내 띠의 해, 소=정반대", () => {
    expect(animalYearPage("horse")!.flowLabel).toBe("올해와 손발이 잘 맞는 해");
    expect(animalYearPage("pig")!.flowLabel).toBe("같은 방향으로 밀어 주는 해");
    expect(animalYearPage("rabbit")!.flowLabel).toBe("같은 방향으로 밀어 주는 해");
    expect(animalYearPage("sheep")!.flowLabel).toBe("내 띠의 해, 나를 돌아보는 해");
    expect(animalYearPage("ox")!.flowLabel).toBe("변화가 많아 움직이게 되는 해");
  });

  it("2027년 삼재는 돼지·토끼·양띠의 마지막 해, 나머지는 해당 없음", () => {
    expect(animalYearPage("pig")!.samjae).toBe(3);
    expect(animalYearPage("rabbit")!.samjae).toBe(3);
    expect(animalYearPage("sheep")!.samjae).toBe(3);
    expect(animalYearPage("horse")!.samjae).toBeNull();
  });

  it("문장에 남은 자리표시·한자·전문용어·단정 표현이 없다", () => {
    for (const z of ZODIAC) {
      const p = animalYearPage(z.slug)!;
      const text = [...p.intro, ...p.faq.flatMap((f) => [f.q, f.a])].join("\n");
      expect(text, z.slug).not.toMatch(/\{[a-zA-Z]\}/);
      expect(HANJA.test(text), z.slug).toBe(false);
      expect(JARGON.exec(text)?.[0], z.slug).toBeUndefined();
      expect(PROPHECY.exec(text)?.[0], z.slug).toBeUndefined();
      expect(p.years.length).toBeGreaterThanOrEqual(4);
    }
  });
});
