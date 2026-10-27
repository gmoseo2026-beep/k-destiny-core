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

describe("인앱 브라우저 결제", () => {
  it("일반 브라우저는 바로 결제", async () => {
    const m = await load(CHROME);
    const choice = vi.fn();
    expect(m.blockPaymentIfInApp(choice, vi.fn())).toBe(false);
    expect(choice).not.toHaveBeenCalled();
  });

  it("인앱에서도 선택 창 없이 바로 결제한다(결제 직전 이탈 방지)", async () => {
    const m = await load(IG_IOS);
    const choice = vi.fn();
    expect(m.isInAppBrowser()).toBe(true);
    expect(m.blockPaymentIfInApp(choice, vi.fn())).toBe(false);
    expect(choice).not.toHaveBeenCalled();
  });
});

// 2026-10-04: 스레드 앱의 UA 는 "Barcelona …" 이고 "Threads"/"Instagram" 글자가 없다 → 'other' 로 잡히고 있었다
describe("접속 환경 라벨", () => {
  const THREADS_ANDROID =
    "Mozilla/5.0 (Linux; Android 16; SM-F966N Build/BP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0 Mobile Safari/537.36 Barcelona 444.0.0.45.85 Android (36/16; 420dpi)";
  const PC = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

  it("스레드 인앱은 threads:m", async () => {
    const m = await load(THREADS_ANDROID);
    expect(m.getInAppProvider()).toBe("threads");
    expect(m.clientEnvLabel()).toBe("threads:m");
  });
  it("인스타 인앱은 instagram:m, 일반 브라우저는 browser:m / browser:pc", async () => {
    expect((await load(IG_IOS)).clientEnvLabel()).toBe("instagram:m");
    expect((await load(CHROME)).clientEnvLabel()).toBe("browser:m");
    expect((await load(PC)).clientEnvLabel()).toBe("browser:pc");
  });
});

describe("틱톡 앱 안 브라우저 인식(10-23 실제 UA)", () => {
  const TT_NEW = "Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.8059.43 Mobile Safari/537.36 trill";
  const TT_VER = "Mozilla/5.0 (Linux; Android 12; SM-G977N Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.8059.43 Mobile Safari/537.36 trill_47.0.3";
  const TT_OLD = "Mozilla/5.0 (Linux; Android 10; M2006C3MNG; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0 Mobile Safari/537.36 musical_ly_2023102050 JsSdk/1.0 BytedanceWebview/d8a21c6";

  it.each([TT_NEW, TT_VER, TT_OLD])("앱 안 브라우저로 보고 tiktok:m 으로 기록한다", async (ua) => {
    const m = await load(ua);
    expect(m.isInAppBrowser()).toBe(true);
    expect(m.getInAppProvider()).toBe("tiktok");
    expect(m.clientEnvLabel()).toBe("tiktok:m");
  });

  it("일반 크롬은 그대로 browser:m", async () => {
    const m = await load(CHROME);
    expect(m.isInAppBrowser()).toBe(false);
    expect(m.clientEnvLabel()).toBe("browser:m");
  });
});

// 2026-10-27: 틱톡 앱(안드로이드) 결제는 크롬으로 넘겨 거기서 결제창을 다시 연다
describe("틱톡 앱 결제 크롬 넘기기", () => {
  const TIKTOK_ANDROID =
    "Mozilla/5.0 (Linux; Android 14; SM-S928N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 trill_370504 BytedanceWebview/d8a21c6";
  async function loadAt(ua: string, href: string) {
    vi.resetModules();
    const loc = { href };
    const replaced: string[] = [];
    vi.stubGlobal("navigator", { userAgent: ua });
    vi.stubGlobal("document", { cookie: "" });
    vi.stubGlobal("window", {
      location: loc,
      history: { state: null, replaceState: (_s: unknown, _t: string, url: string) => replaced.push(url) },
      sessionStorage: { getItem: () => null, setItem: () => {} },
    });
    const m = await import("@/lib/inAppBrowser");
    return { m, loc, replaced };
  }

  it("틱톡 안드로이드는 크롬 intent 로 넘기고, 주소에 pay·ho·from 을 싣는다", async () => {
    const { m, loc } = await loadAt(TIKTOK_ANDROID, "https://kongdak.kr/ko/compat/new?productId=inner_mind");
    expect(m.handoffPaymentToChrome("inner_mind", { from: "cmabc" })).toBe(true);
    expect(loc.href.startsWith("intent://kongdak.kr/ko/compat/new?")).toBe(true);
    expect(loc.href).toContain("package=com.android.chrome");
    expect(loc.href).toContain("pay=inner_mind");
    expect(loc.href).toContain("ho=1");
    expect(loc.href).toContain("from=cmabc");
  });

  it("이미 넘겨받은 화면(ho=1)이나 틱톡이 아니면 넘기지 않는다", async () => {
    expect((await loadAt(TIKTOK_ANDROID, "https://kongdak.kr/ko/compat/x?ho=1")).m.handoffPaymentToChrome("compat_basic")).toBe(false);
    expect((await loadAt(CHROME, "https://kongdak.kr/ko/compat/x")).m.handoffPaymentToChrome("compat_basic")).toBe(false);
    expect((await loadAt(IG_IOS, "https://kongdak.kr/ko/compat/x")).m.handoffPaymentToChrome("compat_basic")).toBe(false);
  });

  it("넘겨받은 크롬은 pay 값을 한 번 꺼내고 주소에서 지운다(ho 는 남김)", async () => {
    const { m, replaced } = await loadAt(CHROME, "https://kongdak.kr/ko/compat/new?productId=inner_mind&from=cmabc&pay=inner_mind&ho=1");
    expect(m.takePayHandoff()).toBe("inner_mind");
    expect(replaced[0]).toBe("/ko/compat/new?productId=inner_mind&from=cmabc&ho=1");
    const plain = await loadAt(CHROME, "https://kongdak.kr/ko/compat/new?productId=inner_mind");
    expect(plain.m.takePayHandoff()).toBeNull();
  });
});
