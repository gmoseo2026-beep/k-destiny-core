import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { trackEventMock, pushMock } = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/lib/gtag", () => ({
  trackEvent: trackEventMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import IljuChecker, { submitIljuCheck } from "@/components/seo/IljuChecker";
import IljuCompatBridgeCta, {
  buildIljuCompatHref,
} from "@/components/seo/IljuCompatBridgeCta";
import * as reportHandoff from "@/lib/reportHandoff";

function installMockSessionStorage() {
  const store = new Map<string, string>();
  const mockStorage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };

  Object.defineProperty(globalThis, "window", {
    value: { sessionStorage: mockStorage },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    value: mockStorage,
    configurable: true,
    writable: true,
  });

  return store;
}

describe("16 일주 페이지 → 궁합 바로 연결 (argon/16-ilju-bridge)", () => {
  beforeEach(() => {
    trackEventMock.mockReset();
    pushMock.mockReset();
    installMockSessionStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1) 음력(및 윤달) 입력이 양력으로 변환돼 /api/ilju/check로 전송된다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ slug: "byeongja", name: "병자일주" }),
    });

    // 음력 1990-01-01 -> 양력 1990-01-27
    const res = await submitIljuCheck({
      year: "1990",
      month: "1",
      day: "1",
      isLunar: true,
      isLeapMonth: false,
      gender: "F",
      locale: "ko",
      source: "ilju_hub",
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/ilju/check");
    expect(JSON.parse(String(init?.body))).toEqual({ dob: "1990-01-27" });

    // 음력 2023 윤2월 1일 -> 양력 2023-03-22
    fetchMock.mockClear();
    const leapRes = await submitIljuCheck({
      year: "2023",
      month: "2",
      day: "1",
      isLunar: true,
      isLeapMonth: true,
      gender: "M",
      locale: "ko",
      source: "ilju:gapja",
      fetchFn: fetchMock as unknown as typeof fetch,
    });
    expect(leapRes.ok).toBe(true);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      dob: "2023-03-22",
    });

    // 없는 윤달(2024년 윤2월)은 API 호출 전에 막힌다
    fetchMock.mockClear();
    const badLeap = await submitIljuCheck({
      year: "2024",
      month: "2",
      day: "1",
      isLunar: true,
      isLeapMonth: true,
      gender: "F",
      locale: "ko",
      source: "ilju_hub",
      fetchFn: fetchMock as unknown as typeof fetch,
    });
    expect(badLeap.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("2) 성별을 고르지 않으면 제출이 막히고 API나 saveLastPerson이 호출되지 않는다", async () => {
    const fetchMock = vi.fn();
    const saveSpy = vi.spyOn(reportHandoff, "saveLastPerson");

    const res = await submitIljuCheck({
      year: "1995",
      month: "5",
      day: "15",
      isLunar: false,
      isLeapMonth: false,
      gender: null,
      locale: "ko",
      source: "ilju_hub",
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    expect(res).toEqual({
      ok: false,
      error: "성별을 선택해 주세요.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(saveSpy).not.toHaveBeenCalled();
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("3) 확인 성공 시 saveLastPerson이 호출되고, URL·쿼리스트링·GA 값 어디에도 생년월일이 들어가지 않는다", async () => {
    const saveSpy = vi.spyOn(reportHandoff, "saveLastPerson");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ slug: "gapja", name: "갑자일주" }),
    });

    const res = await submitIljuCheck({
      year: "1990",
      month: "1",
      day: "1",
      isLunar: true,
      isLeapMonth: false,
      gender: "F",
      locale: "ko",
      source: "ilju_hub",
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    expect(res).toEqual({
      ok: true,
      slug: "gapja",
      solarDob: "1990-01-27",
      redirectTo: "/ko/ilju/gapja",
    });

    expect(saveSpy).toHaveBeenCalledWith({
      name: "나",
      dob: "1990-01-27",
      time: null,
      gender: "F",
    });
    expect(reportHandoff.loadLastPerson()).toEqual({
      name: "나",
      dob: "1990-01-27",
      time: null,
      gender: "F",
    });

    expect(trackEventMock).toHaveBeenCalledWith("ilju_check", {
      ilju: "gapja",
      source: "ilju_hub",
      lunar: true,
    });
    const gaPayloadStr = JSON.stringify(trackEventMock.mock.calls);
    expect(gaPayloadStr).not.toContain("1990-01-27");
    expect(gaPayloadStr).not.toContain("1990-01-01");
    expect(res.ok && res.redirectTo).not.toContain("1990");
    expect(res.ok && res.redirectTo).not.toContain("?");
  });

  it("4) 일주 확인 칸 안내 문구·성별 버튼·음력 토글과 상세 CTA href(생년월일 미포함)를 검증한다", () => {
    const checkerHtml = renderToStaticMarkup(
      React.createElement(IljuChecker, { locale: "ko", source: "ilju_hub" })
    );
    expect(checkerHtml).toContain(
      "입력한 생년월일은 서버에 저장하지 않고, 이 창을 닫으면 지워져요"
    );
    expect(checkerHtml).not.toContain("입력한 생년월일은 저장되지 않아요");
    expect(checkerHtml).toContain("양력");
    expect(checkerHtml).toContain("음력");
    expect(checkerHtml).toContain("여자");
    expect(checkerHtml).toContain("남자");

    const midCtaHtml = renderToStaticMarkup(
      React.createElement(IljuCompatBridgeCta, {
        locale: "ko",
        slug: "gapja",
        iljuName: "갑자일주",
        position: "mid",
      })
    );
    expect(midCtaHtml).toContain("갑자일주인 나 × 그 사람, 궁합은 몇 점일까?");
    expect(midCtaHtml).toContain("상대 생일만 넣고 무료로 보기");
    expect(midCtaHtml).toContain('href="/ko/compat/new"');

    const href = buildIljuCompatHref("ko");
    expect(href).toBe("/ko/compat/new");
    expect(href).not.toContain("?");
    expect(href).not.toMatch(/\d{4}/);
  });
});
