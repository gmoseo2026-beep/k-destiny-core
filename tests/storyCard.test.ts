import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { buildSajuDisplayForPerson } from "@/lib/sajuDisplay";
import {
  buildPersonalityStoryUrl,
  decodePersonalityStoryCodes,
  derivePersonalityKeywordsFromCard,
  formatStoryTitle,
  mergeStoryCharmBadges,
  sanitizeStoryNickname,
  sanitizeStoryOneLineSummary,
} from "@/lib/storyCard";

const { mockCompatFindUnique, mockReportFindUnique } = vi.hoisted(() => ({
  mockCompatFindUnique: vi.fn(),
  mockReportFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    compatibility: {
      findUnique: mockCompatFindUnique,
    },
    generatedReport: {
      findUnique: mockReportFindUnique,
    },
  },
}));

import { GET as getStoryOg } from "@/app/api/og/story/route";

describe("lib/storyCard", () => {
  beforeEach(() => {
    mockCompatFindUnique.mockReset();
    mockReportFindUnique.mockReset();
  });

  it("masks real Korean names, birthdates, emails, and defaults to '나 × 그 사람' while keeping cute nicknames", () => {
    expect(sanitizeStoryNickname("")).toBeNull();
    expect(sanitizeStoryNickname("나")).toBeNull();
    expect(sanitizeStoryNickname("상대방")).toBeNull();
    expect(sanitizeStoryNickname("김민수")).toBeNull();
    expect(sanitizeStoryNickname("이서연")).toBeNull();
    expect(sanitizeStoryNickname("박지훈")).toBeNull();
    expect(sanitizeStoryNickname("1995-03-14")).toBeNull();
    expect(sanitizeStoryNickname("user@test.com")).toBeNull();
    expect(sanitizeStoryNickname("甲子")).toBeNull();

    expect(formatStoryTitle("compat", "김민수", "이서연")).toBe("나 × 그 사람");
    expect(formatStoryTitle("compat", "나", "상대방")).toBe("나 × 그 사람");
    expect(formatStoryTitle("compat", "다람쥐", "썸남")).toBe("다람쥐 × 썸남");
    expect(formatStoryTitle("compat", "고양이", "김민수")).toBe(
      "고양이 × 그 사람",
    );
    expect(formatStoryTitle("personality", "김민수")).toBe("나의 타고난 매력");
    expect(formatStoryTitle("personality", "다람쥐")).toBe(
      "다람쥐의 타고난 매력",
    );
  });

  it("scrubs raw names, honorifics, birthdates, and Hanja from 1-line summary", () => {
    const cleaned = sanitizeStoryOneLineSummary(
      "김민수 님과 이서연 님은 1995-05-12(甲子) 말하지 않아도 속도를 맞춰 주는 다정한 사이예요. 두 번째 문장은 자릅니다.",
      ["김민수", "이서연"],
    );

    expect(cleaned).not.toContain("김민수");
    expect(cleaned).not.toContain("이서연");
    expect(cleaned).not.toContain("1995");
    expect(cleaned).not.toMatch(/[\u4E00-\u9FFF]/);
    expect(cleaned).not.toContain("두 번째 문장");
    expect(cleaned.length).toBeGreaterThan(8);
  });

  it("encodes and decodes closed personality story codes deterministically without PII", () => {
    const person = buildSajuDisplayForPerson({
      name: "김민수",
      dob: "1994-05-15",
      time: "12:00",
      gender: "F",
    });
    expect(person).not.toBeNull();
    const card = person!.card;

    const url = buildPersonalityStoryUrl("rep_free_123", card);
    expect(url).toContain("reportId=rep_free_123");
    expect(url).not.toContain("김민수");
    expect(url).not.toContain("1994");
    expect(url).not.toContain("05-15");

    const parsedUrl = new URL(`https://kongdak.kr${url}`);
    const decoded = decodePersonalityStoryCodes(parsedUrl.searchParams);
    expect(decoded.keywords).toEqual(derivePersonalityKeywordsFromCard(card));
    expect(decoded.badges).toEqual(mergeStoryCharmBadges([card]));

    const forged = decodePersonalityStoryCodes(
      new URLSearchParams("dt=999&db=-2&el=hack&b=fake,dohwa"),
    );
    expect(forged.keywords).toEqual([
      "타고난 중심",
      "다정한 온기",
      "고른 다섯 기운",
    ]);
    expect(forged.badges).toEqual(["도화(사람을 끄는 매력)"]);
  });

  it("renders a valid 1080x1920 PNG for free compatibility and free personality", async () => {
    mockCompatFindUnique.mockResolvedValueOnce({
      score: 93,
      keywords: ["천생연분", "속깊은 배려", "설레는 호흡"],
      summaryKo:
        "[맞히는 장면]\n- 김민수 님이 말을 아껴도 이서연 님이 먼저 알아채고 웃어 주는 순간이 자주 있어요.\n[아직 말하지 않은 것]\n- 누가 먼저 서운함을 삼킬까요?",
      personA: {
        name: "김민수",
        fourPillars: { year: "甲午", month: "丙辰", day: "甲午", time: "丁卯" },
      },
      personB: {
        name: "이서연",
        fourPillars: { year: "壬子", month: "戊戌", day: "辛酉", time: null },
      },
    });

    const compatRes = await getStoryOg(
      new NextRequest("https://kongdak.kr/api/og/story?shareToken=tok_123"),
    );
    expect(compatRes.status).toBe(200);
    expect(compatRes.headers.get("content-type")).toContain("image/png");

    const compatBuf = Buffer.from(await compatRes.arrayBuffer());
    // PNG magic signature + IHDR width/height (bytes 16..23)
    expect(compatBuf.subarray(0, 4).toString("hex")).toBe("89504e47");
    expect(compatBuf.readUInt32BE(16)).toBe(1080);
    expect(compatBuf.readUInt32BE(20)).toBe(1920);

    mockReportFindUnique.mockResolvedValueOnce({
      kind: "FREE",
      catalogId: "free_personality",
      status: "READY",
      content: {
        version: 1,
        score: 89,
        data: {
          headline: "겉은 부드럽고 속은 단단하게 중심을 지키는 사람이에요.",
          summary: "주변을 편안하게 만드는 따뜻한 기운이 있어요.",
        },
      },
    });

    const personalityRes = await getStoryOg(
      new NextRequest(
        "https://kongdak.kr/api/og/story?reportId=rep_1&dt=1&db=3&el=fire&b=dohwa&download=true",
      ),
    );
    expect(personalityRes.status).toBe(200);
    expect(personalityRes.headers.get("content-disposition")).toContain(
      "attachment;",
    );
    const personalityBuf = Buffer.from(await personalityRes.arrayBuffer());
    expect(personalityBuf.readUInt32BE(16)).toBe(1080);
    expect(personalityBuf.readUInt32BE(20)).toBe(1920);
  }, 15000);
});
