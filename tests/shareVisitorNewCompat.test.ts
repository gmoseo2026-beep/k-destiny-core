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
  usePathname: () => "/ko/compat/tok_abc",
}));

import CompatResultClient, {
  SHARE_VISITOR_NEW_COMPAT_LABEL,
  ShareVisitorNewCompatCard,
  buildShareVisitorNewCompatHref,
} from "@/components/CompatResultClient";

const SAMPLE_COMPAT_DATA = {
  id: "compat_id_019",
  shareToken: "share_tok_019",
  relation: "love",
  score: 86,
  keywords: ["설레는 케미", "다정한 대화", "안정감"],
  summaryKo: "두 사람은 편안하게 대화가 이어지는 인연이에요.",
  publicBreakdown: { stem: 25, balance: 7, yinYang: 10 },
  personA: { name: "지민", gender: "F" },
  personB: { name: "서준", gender: "M" },
};

describe("19 공유 방문자 상단 '나도 궁합 보기' 카드 (argon/19-share-new-compat)", () => {
  beforeEach(() => {
    trackEventMock.mockReset();
  });

  it("1) refToken이 있을 때만 상단 카드가 렌더링되고, 맨 아래 기존 링크는 그대로 유지된다", () => {
    const withoutRefHtml = renderToStaticMarkup(
      React.createElement(CompatResultClient, {
        initialData: SAMPLE_COMPAT_DATA,
        locale: "ko",
      }),
    );
    expect(withoutRefHtml).not.toContain(SHARE_VISITOR_NEW_COMPAT_LABEL);
    expect(withoutRefHtml).toContain("다른 사람과의 궁합도 새로 알아보기 →");

    const emptyRefHtml = renderToStaticMarkup(
      React.createElement(CompatResultClient, {
        initialData: SAMPLE_COMPAT_DATA,
        locale: "ko",
        refToken: "   ",
      }),
    );
    expect(emptyRefHtml).not.toContain(SHARE_VISITOR_NEW_COMPAT_LABEL);

    const withRefHtml = renderToStaticMarkup(
      React.createElement(CompatResultClient, {
        initialData: SAMPLE_COMPAT_DATA,
        locale: "ko",
        refToken: "share_tok_019",
      }),
    );
    expect(withRefHtml).toContain(SHARE_VISITOR_NEW_COMPAT_LABEL);
    expect(withRefHtml).toContain("다른 사람과의 궁합도 새로 알아보기 →");

    // 첫 화면에 보이도록 점수 카드보다 위에 있는지 확인
    const mainScoreIdx = withRefHtml.indexOf("우리 두 사람의 사주 궁합");
    const visitorCardIdx = withRefHtml.indexOf(SHARE_VISITOR_NEW_COMPAT_LABEL);
    expect(mainScoreIdx).toBeGreaterThan(-1);
    expect(visitorCardIdx).toBeGreaterThan(-1);
    expect(visitorCardIdx).toBeLessThan(mainScoreIdx);
  });

  it("2) 초대 수령자(isInviteReceiver / via=invite_receiver) 및 결제 후(isPremium / unlockToken / deepReport)에는 렌더링되지 않는다", () => {
    // 초대 수령자 (via="invite_receiver")
    const inviteReceiverHtml = renderToStaticMarkup(
      React.createElement(CompatResultClient, {
        initialData: SAMPLE_COMPAT_DATA,
        locale: "ko",
        refToken: "share_tok_019",
        via: "invite_receiver",
      }),
    );
    expect(inviteReceiverHtml).not.toContain(SHARE_VISITOR_NEW_COMPAT_LABEL);

    // 유료 열람(isPremium=true)
    const premiumHtml = renderToStaticMarkup(
      React.createElement(CompatResultClient, {
        initialData: SAMPLE_COMPAT_DATA,
        locale: "ko",
        refToken: "share_tok_019",
        isPremium: true,
      }),
    );
    expect(premiumHtml).not.toContain(SHARE_VISITOR_NEW_COMPAT_LABEL);

    // 게스트 unlockToken 보유 또는 심층 리포트 로드 완료 상태에서도 숨김
    expect(
      renderToStaticMarkup(
        React.createElement(ShareVisitorNewCompatCard, {
          locale: "ko",
          compatId: "compat_id_019",
          refToken: "share_tok_019",
          unlockToken: "ord_guest_123",
        }),
      ),
    ).toBe("");

    expect(
      renderToStaticMarkup(
        React.createElement(ShareVisitorNewCompatCard, {
          locale: "ko",
          compatId: "compat_id_019",
          refToken: "share_tok_019",
          hasDeepReport: true,
        }),
      ),
    ).toBe("");

    expect(
      renderToStaticMarkup(
        React.createElement(ShareVisitorNewCompatCard, {
          locale: "ko",
          compatId: "compat_id_019",
          refToken: "share_tok_019",
          isInviteReceiver: true,
        }),
      ),
    ).toBe("");
  });

  it("3) href에는 /{locale}/compat/new와 ref 쿼리 외의 값(이름·생년월일 등)이 없고, 클릭 GA4 이벤트는 { compatId }만 보낸다", () => {
    const href = buildShareVisitorNewCompatHref("ko", "tok_with space/123");
    expect(href).toBe("/ko/compat/new?ref=tok_with%20space%2F123");

    const parsed = new URL(`https://kongdak.kr${href}`);
    expect(parsed.pathname).toBe("/ko/compat/new");
    expect(Array.from(parsed.searchParams.keys())).toEqual(["ref"]);
    expect(parsed.searchParams.get("ref")).toBe("tok_with space/123");

    // 렌더된 카드의 실제 a[href] 검증
    const cardHtml = renderToStaticMarkup(
      React.createElement(ShareVisitorNewCompatCard, {
        locale: "ko",
        compatId: "compat_id_019",
        refToken: "share_tok_019",
      }),
    );
    expect(cardHtml).toContain('href="/ko/compat/new?ref=share_tok_019"');
    expect(cardHtml).not.toContain("지민");
    expect(cardHtml).not.toContain("서준");

    // onClick GA4 이벤트 페이로드 검증 ({ compatId } 단독)
    const tree = ShareVisitorNewCompatCard({
      locale: "ko",
      compatId: "compat_id_019",
      refToken: "share_tok_019",
    });
    expect(tree).not.toBeNull();
    const linkEl = (tree as React.ReactElement<{ children: React.ReactElement<{ onClick: () => void }> }>).props
      .children;
    linkEl.props.onClick();
    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenCalledWith("share_visitor_new_compat_click", {
      compatId: "compat_id_019",
    });
  });
});
