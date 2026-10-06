import { describe, it, expect } from "vitest";
import { buildAudienceReport, normalizeContactEmail, type AudienceMember } from "@/lib/audienceStats";
import { buildPwaReport, parsePwaCounterKey, pwaCounterKey } from "@/lib/pwaStats";

const m = (over: Partial<AudienceMember>): AudienceMember => ({
  provider: "kakao",
  hasAccountEmail: false,
  hasContactEmail: false,
  consent: false,
  decided: false,
  pwaInstalled: false,
  ...over,
});

describe("연락할 수 있는 회원 집계", () => {
  it("보낼 수 있는 회원 = 수신 동의 + 이메일(계정 이메일이든 소식 받을 이메일이든)", () => {
    const r = buildAudienceReport([
      m({ provider: "google", hasAccountEmail: true, consent: true, decided: true }),
      m({ provider: "kakao", hasContactEmail: true, consent: true, decided: true }),
      // 동의했지만 이메일이 없으면 보낼 수 없다
      m({ provider: "kakao", consent: true, decided: true }),
      // 이메일은 있지만 동의하지 않았으면 보낼 수 없다
      m({ provider: "google", hasAccountEmail: true }),
      m({ provider: "naver", decided: true }),
    ]);
    expect(r.total).toEqual({ members: 5, withEmail: 3, consent: 3, reachable: 2, declined: 1, undecided: 1, pwaInstalled: 0 });
  });

  it("가입 경로별로 나누고 회원이 많은 순으로 보여 준다", () => {
    const r = buildAudienceReport([
      m({ provider: "naver" }),
      m({ provider: "kakao", pwaInstalled: true }),
      m({ provider: "kakao" }),
      m({ provider: "email", hasAccountEmail: true }),
    ]);
    expect(r.byProvider.map((p) => p.provider)).toEqual(["kakao", "email", "naver"]);
    expect(r.byProvider[0].members).toBe(2);
    expect(r.byProvider[0].pwaInstalled).toBe(1);
    expect(r.byProvider.reduce((a, p) => a + p.members, 0)).toBe(r.total.members);
  });

  it("회원이 없으면 모두 0", () => {
    const r = buildAudienceReport([]);
    expect(r.total.members).toBe(0);
    expect(r.byProvider).toEqual([]);
  });

  it("소식 받을 이메일은 형식을 검사하고 소문자로 다듬는다", () => {
    expect(normalizeContactEmail("  Hello@Example.COM ")).toBe("hello@example.com");
    expect(normalizeContactEmail("no-at-sign")).toBeNull();
    expect(normalizeContactEmail("a@b")).toBeNull();
    expect(normalizeContactEmail("a b@c.com")).toBeNull();
    expect(normalizeContactEmail("")).toBeNull();
    expect(normalizeContactEmail(123)).toBeNull();
    expect(normalizeContactEmail("x".repeat(250) + "@a.com")).toBeNull();
  });
});

describe("홈 화면 앱 설치 집계", () => {
  // 한국 2026-10-06 12:00
  const NOW = new Date("2026-10-06T03:00:00Z");

  it("집계 키를 만들고 다시 읽는다 — 모르는 종류는 버린다", () => {
    expect(pwaCounterKey("device", "2026-10-06")).toBe("pwa:device:2026-10-06");
    expect(parsePwaCounterKey("pwa:launch_member:2026-10-06")).toEqual({ kind: "launch_member", date: "2026-10-06" });
    expect(parsePwaCounterKey("pwa:hack:2026-10-06")).toBeNull();
    expect(parsePwaCounterKey("go:cd1:2026-10-06")).toBeNull();
    expect(parsePwaCounterKey("visitors")).toBeNull();
  });

  it("오늘·최근 7일·누적과 날짜별 표를 만든다", () => {
    const r = buildPwaReport(
      [
        { kind: "device", date: "2026-10-06", count: 2 },
        { kind: "launch", date: "2026-10-06", count: 5 },
        { kind: "launch_member", date: "2026-10-06", count: 3 },
        { kind: "install", date: "2026-10-05", count: 1 },
        { kind: "device", date: "2026-10-01", count: 4 },
        { kind: "device", date: "2026-09-20", count: 7 },
        { kind: "device", date: "2026-08-01", count: 10 },
      ],
      14,
      NOW
    );
    expect(r.today).toEqual({ install: 0, device: 2, launch: 5, launch_member: 3 });
    expect(r.last7.device).toBe(6);
    expect(r.last7.install).toBe(1);
    expect(r.total.device).toBe(23);
    expect(r.days).toHaveLength(14);
    expect(r.days[0]).toEqual({ date: "2026-10-06", install: 0, device: 2, launch: 5, launch_member: 3 });
    // 화면에 보이는 기간 밖의 것은 날짜별 표에는 없고 누적에만 들어간다
    expect(r.days.reduce((a, d) => a + d.device, 0)).toBe(6);
  });
});
