import React from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import CompatNewClient, {
  COMPAT_TEASER_STORY_LABEL,
  CompatTeaserStoryAction,
  buildCompatTeaserStoryUrl,
} from "@/components/CompatNewClient";

describe("17 커플 상품 미리보기 스토리 카드 버튼 (argon/17-teaser-story)", () => {
  it("1) 미리보기 결과(teaserResult)가 없을 때는 버튼이 렌더링되지 않고, 결과가 있을 때만 '📸 우리 기운 카드 저장·공유' 버튼이 렌더링된다", () => {
    // 전체 CompatNewClient 초기 입력 화면(teaserResult === null)에는 스토리 카드 버튼이 없어야 한다
    const initialFormHtml = renderToStaticMarkup(
      React.createElement(CompatNewClient, {
        locale: "ko",
        productId: "inner_mind",
      })
    );
    expect(initialFormHtml).not.toContain(COMPAT_TEASER_STORY_LABEL);

    // teaserCompatId가 없을 때(null / 빈 문자열)는 렌더링되지 않는다
    expect(
      renderToStaticMarkup(
        React.createElement(CompatTeaserStoryAction, { teaserCompatId: null })
      )
    ).toBe("");
    expect(
      renderToStaticMarkup(
        React.createElement(CompatTeaserStoryAction, { teaserCompatId: "   " })
      )
    ).toBe("");

    // teaserResult가 있을 때는 정확히 지정 문구의 버튼이 렌더링된다
    const teaserHtml = renderToStaticMarkup(
      React.createElement(CompatTeaserStoryAction, {
        teaserCompatId: "compat_abc_123",
      })
    );
    expect(teaserHtml).toContain("📸 우리 기운 카드 저장·공유");
  });

  it("2) 스토리 카드 이미지 주소에는 오직 compatId 쿼리 파라미터 하나만 들어가며 개인정보가 없다", () => {
    const url = buildCompatTeaserStoryUrl("compat_xyz_789");
    expect(url).toBe("/api/og/story?compatId=compat_xyz_789");

    const parsed = new URL(`https://kongdak.kr${url}`);
    expect(parsed.pathname).toBe("/api/og/story");
    expect(Array.from(parsed.searchParams.keys())).toEqual(["compatId"]);
    expect(parsed.searchParams.get("compatId")).toBe("compat_xyz_789");
  });

  it("3) 개인 상품 미리보기(FortuneNewClient)에는 달지 않고, 공유 보너스(+3) API 호출도 연결하지 않는다", () => {
    const fortuneClientSrc = fs.readFileSync(
      path.join(process.cwd(), "components", "FortuneNewClient.tsx"),
      "utf8"
    );
    expect(fortuneClientSrc).not.toContain("우리 기운 카드 저장·공유");
    expect((fortuneClientSrc.match(/<StoryCardSaveButton/g) ?? []).length).toBe(1);
    expect(fortuneClientSrc).toContain('source="free_personality"');

    const storyBtnSrc = fs.readFileSync(
      path.join(process.cwd(), "components", "share", "StoryCardSaveButton.tsx"),
      "utf8"
    );
    expect(storyBtnSrc).not.toContain("/api/preview/bonus");
  });
});
