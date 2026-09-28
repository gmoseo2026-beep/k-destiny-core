import { describe, it, expect, vi, beforeEach } from "vitest";

// 모듈 상태(이 탭에서 "여기서 결제"를 골랐는지)를 테스트마다 새로 시작한다
async function load(ua: string) {
  vi.resetModules();
  const store = new Map<string, string>();
  vi.stubGlobal("navigator", { userAgent: ua });
  vi.stubGlobal("window", {
    location: { href: "https://kongdak.kr/ko/compat/abc" },
    sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
  });
  return import("@/lib/inAppBrowser");
}

const IG_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0";
const CHROME = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

beforeEach(() => vi.unstubAllGlobals());

describe("인앱 브라우저 결제 선택", () => {
  it("일반 브라우저는 선택 창 없이 바로 결제", async () => {
    const m = await load(CHROME);
    const choice = vi.fn();
    expect(m.blockPaymentIfInApp(choice, vi.fn())).toBe(false);
    expect(choice).not.toHaveBeenCalled();
  });

  it("인앱이면 선택 창을 띄우고 결제를 멈춘다(외부 브라우저로 강제 이동하지 않음)", async () => {
    const m = await load(IG_IOS);
    const choice = vi.fn();
    const retry = vi.fn();
    expect(m.blockPaymentIfInApp(choice, retry)).toBe(true);
    expect(choice).toHaveBeenCalledTimes(1);
    expect(retry).not.toHaveBeenCalled();
  });

  it("[여기서 바로 결제하기]를 고르면 막혔던 결제를 이어서 열고, 이후엔 다시 묻지 않는다", async () => {
    const m = await load(IG_IOS);
    const retry = vi.fn();
    m.blockPaymentIfInApp(vi.fn(), retry);
    m.continueInAppPayment();
    expect(retry).toHaveBeenCalledTimes(1);
    const choice = vi.fn();
    expect(m.blockPaymentIfInApp(choice, vi.fn())).toBe(false);
    expect(choice).not.toHaveBeenCalled();
  });
});
