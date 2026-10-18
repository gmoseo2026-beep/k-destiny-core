import { afterEach, describe, expect, it, vi } from "vitest";
import * as gtag from "@/lib/gtag";
import { revealUnlockPanel, trackTeaserUnlock } from "@/components/report/TeaserUnlockPanel";

describe("TeaserUnlockPanel helpers (P-011)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("revealUnlockPanel()은 문서나 #teaser-unlock이 없을 때 false를 돌려준다", () => {
    expect(revealUnlockPanel()).toBe(false);

    vi.stubGlobal("document", {
      getElementById: vi.fn(() => null),
    });
    expect(revealUnlockPanel()).toBe(false);
  });

  it("revealUnlockPanel()은 #teaser-unlock이 있을 때 스크롤·포커스·1.2초 테두리 강조 후 true를 돌려준다", () => {
    vi.useFakeTimers();
    const scrollIntoView = vi.fn();
    const focus = vi.fn();
    const add = vi.fn();
    const remove = vi.fn();

    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: false })),
    });
    vi.stubGlobal("document", {
      getElementById: vi.fn((id: string) =>
        id === "teaser-unlock"
          ? { scrollIntoView, focus, classList: { add, remove } }
          : null,
      ),
    });

    expect(revealUnlockPanel()).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(add).toHaveBeenCalledWith("ring-2", "ring-coral");
    expect(remove).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1200);
    expect(remove).toHaveBeenCalledWith("ring-2", "ring-coral");
    vi.useRealTimers();
  });

  it("revealUnlockPanel()은 prefers-reduced-motion: reduce일 때 behavior: auto로 스크롤한다", () => {
    const scrollIntoView = vi.fn();
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: true })),
    });
    vi.stubGlobal("document", {
      getElementById: vi.fn(() => ({
        scrollIntoView,
        focus: vi.fn(),
        classList: { add: vi.fn(), remove: vi.fn() },
      })),
    });

    expect(revealUnlockPanel()).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "auto" });
  });

  it("trackTeaserUnlock()은 기존 click_unlock_teaser 이벤트에 선택적 to(panel | checkout) 값을 담아 보낸다", () => {
    const spy = vi.spyOn(gtag, "trackEvent").mockImplementation(() => {});

    trackTeaserUnlock("inner_mind", "locked_card", "panel");
    expect(spy).toHaveBeenLastCalledWith("click_unlock_teaser", {
      productId: "inner_mind",
      source: "locked_card",
      to: "panel",
    });

    trackTeaserUnlock("inner_mind", "inline", "checkout");
    expect(spy).toHaveBeenLastCalledWith("click_unlock_teaser", {
      productId: "inner_mind",
      source: "inline",
      to: "checkout",
    });

    trackTeaserUnlock("inner_mind", "limit");
    expect(spy).toHaveBeenLastCalledWith("click_unlock_teaser", {
      productId: "inner_mind",
      source: "limit",
    });
  });
});
