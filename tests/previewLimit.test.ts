import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  checkPreviewQuota,
  grantPreviewShareBonus,
  PREVIEW_DAILY_LIMIT,
  PREVIEW_SHARE_BONUS,
  resetPreviewBonusLedgerForTests,
} from "@/lib/previewLimit";
import { POST as postPreviewBonus } from "@/app/api/preview/bonus/route";

const reqWith = (cookie?: string) =>
  new Request("https://kongdak.kr/api/reports/generate", {
    headers: cookie ? { cookie } : {},
  });
const cookiePair = (setCookie: string) => setCookie.split(";")[0];

describe("무료 미리보기 하루 한도", () => {
  beforeEach(() => {
    resetPreviewBonusLedgerForTests();
  });

  it(`서로 다른 미리보기는 ${PREVIEW_DAILY_LIMIT}개까지 허용하고 그다음은 막는다`, () => {
    let cookie: string | undefined;
    for (let i = 1; i <= PREVIEW_DAILY_LIMIT; i++) {
      const q = checkPreviewQuota(reqWith(cookie), `TEASER:product${i}:subject`);
      expect(q.allowed).toBe(true);
      expect(q.used).toBe(i);
      cookie = cookiePair(q.setCookie!);
    }
    const over = checkPreviewQuota(reqWith(cookie), "TEASER:another:subject");
    expect(over.allowed).toBe(false);
    expect(over.setCookie).toBeUndefined();
  });

  it("같은 미리보기를 다시 여는 것은 세지 않는다(한도를 넘긴 뒤에도 열린다)", () => {
    let cookie: string | undefined;
    for (let i = 1; i <= PREVIEW_DAILY_LIMIT; i++) {
      cookie = cookiePair(checkPreviewQuota(reqWith(cookie), `TEASER:p${i}`).setCookie!);
    }
    const again = checkPreviewQuota(reqWith(cookie), "TEASER:p1");
    expect(again.allowed).toBe(true);
    expect(again.setCookie).toBeUndefined();
    expect(again.used).toBe(PREVIEW_DAILY_LIMIT);
  });

  it("손댄 쿠키·지난 날짜 쿠키는 무시하고 새로 센다", () => {
    const first = cookiePair(checkPreviewQuota(reqWith(), "TEASER:p1").setCookie!);
    const tampered = first.replace(/.$/, (c) => (c === "0" ? "1" : "0"));
    expect(checkPreviewQuota(reqWith(tampered), "TEASER:p2").used).toBe(1);

    const [name, value] = first.split("=");
    const [, list, sig] = decodeURIComponent(value).split("|");
    const stale = `${name}=${encodeURIComponent(`2020-01-01|${list}|${sig}`)}`;
    expect(checkPreviewQuota(reqWith(stale), "TEASER:p2").used).toBe(1);
  });

  it("쿠키에는 날짜와 해시만 담긴다(상품·입력값 원문 없음)", () => {
    const set = checkPreviewQuota(reqWith(), "TEASER:secret_love:1990-01-01").setCookie!;
    expect(set).toContain("HttpOnly");
    expect(decodeURIComponent(set)).not.toContain("secret_love");
    expect(decodeURIComponent(set)).not.toContain("1990");
  });
});

// 2026-10-04: 비회원 3개, 회원 6개. 기기(쿠키) 기준이라 비회원으로 3개 본 뒤 가입하면 3개가 더 열린다.
describe("회원 한도와 가입 후 추가 미리보기", () => {
  beforeEach(() => {
    resetPreviewBonusLedgerForTests();
  });

  it("회원 한도는 비회원보다 크다", async () => {
    const m = await import("@/lib/previewLimit");
    expect(m.previewLimitFor(false)).toBe(PREVIEW_DAILY_LIMIT);
    expect(m.previewLimitFor(true)).toBe(m.MEMBER_PREVIEW_DAILY_LIMIT);
    expect(m.MEMBER_PREVIEW_DAILY_LIMIT).toBeGreaterThan(PREVIEW_DAILY_LIMIT);
  });

  it("비회원으로 한도까지 본 기기는 막히고, 같은 쿠키로 회원 한도를 주면 이어서 열린다", async () => {
    const { MEMBER_PREVIEW_DAILY_LIMIT } = await import("@/lib/previewLimit");
    let cookie: string | undefined;
    for (let i = 1; i <= PREVIEW_DAILY_LIMIT; i++) {
      cookie = cookiePair(checkPreviewQuota(reqWith(cookie), `TEASER:p${i}`).setCookie!);
    }
    expect(checkPreviewQuota(reqWith(cookie), "TEASER:next").allowed).toBe(false);

    for (let i = PREVIEW_DAILY_LIMIT + 1; i <= MEMBER_PREVIEW_DAILY_LIMIT; i++) {
      const q = checkPreviewQuota(reqWith(cookie), `TEASER:p${i}`, MEMBER_PREVIEW_DAILY_LIMIT);
      expect(q.allowed).toBe(true);
      expect(q.used).toBe(i);
      cookie = cookiePair(q.setCookie!);
    }
    expect(checkPreviewQuota(reqWith(cookie), "TEASER:over", MEMBER_PREVIEW_DAILY_LIMIT).allowed).toBe(false);
  });
});

describe("공유하면 오늘 3번 더(기기 kd_vid 기준 하루 1회 +3)", () => {
  beforeEach(() => {
    resetPreviewBonusLedgerForTests();
  });

  it("kd_vid 기기에 하루 1회만 +3 한도를 부여하고 두 번째 요청은 추가 부여하지 않는다", () => {
    const day = "2026-10-30";
    const vidCookie = "kd_vid=device-alpha-001";
    let pvCookie = "";

    for (let i = 1; i <= PREVIEW_DAILY_LIMIT; i++) {
      const q = checkPreviewQuota(
        reqWith([vidCookie, pvCookie].filter(Boolean).join("; ")),
        `TEASER:item_${i}`,
        PREVIEW_DAILY_LIMIT,
        day,
      );
      expect(q.allowed).toBe(true);
      pvCookie = cookiePair(q.setCookie!);
    }

    const blocked = checkPreviewQuota(
      reqWith(`${vidCookie}; ${pvCookie}`),
      "TEASER:item_4",
      PREVIEW_DAILY_LIMIT,
      day,
    );
    expect(blocked.allowed).toBe(false);
    expect(blocked.shareBonusUsed).toBe(false);

    // 1차 공유 보너스 요청 → 허용(+3)
    const grant1 = grantPreviewShareBonus(reqWith(`${vidCookie}; ${pvCookie}`), day);
    expect(grant1.granted).toBe(true);
    expect(grant1.alreadyGranted).toBe(false);
    expect(grant1.bonus).toBe(PREVIEW_SHARE_BONUS);
    const bonusCookie = cookiePair(grant1.setCookies[0]);

    // 같은 날 2차 공유 보너스 요청(보너스 쿠키를 지우고 재시도해도) → 거부(하루 1번만)
    const grant2 = grantPreviewShareBonus(reqWith(vidCookie), day);
    expect(grant2.granted).toBe(false);
    expect(grant2.alreadyGranted).toBe(true);

    // +3 범위(4, 5, 6번째)는 열리고 7번째는 막힌다
    for (
      let i = PREVIEW_DAILY_LIMIT + 1;
      i <= PREVIEW_DAILY_LIMIT + PREVIEW_SHARE_BONUS;
      i++
    ) {
      const q = checkPreviewQuota(
        reqWith(`${vidCookie}; ${pvCookie}; ${bonusCookie}`),
        `TEASER:item_${i}`,
        PREVIEW_DAILY_LIMIT,
        day,
      );
      expect(q.allowed).toBe(true);
      expect(q.effectiveLimit).toBe(PREVIEW_DAILY_LIMIT + PREVIEW_SHARE_BONUS);
      expect(q.shareBonusUsed).toBe(true);
      pvCookie = cookiePair(q.setCookie!);
    }

    const overAfterBonus = checkPreviewQuota(
      reqWith(`${vidCookie}; ${pvCookie}; ${bonusCookie}`),
      "TEASER:item_7",
      PREVIEW_DAILY_LIMIT,
      day,
    );
    expect(overAfterBonus.allowed).toBe(false);
    expect(overAfterBonus.shareBonusUsed).toBe(true);
  });

  it("다른 kd_vid 기기는 남의 보너스 쿠키를 재사용할 수 없고, 다음 날(KST)에는 새로 받을 수 있다", async () => {
    const day1 = "2026-10-30";
    const day2 = "2026-10-31";
    const grantA = grantPreviewShareBonus(reqWith("kd_vid=device-a"), day1);
    const bonusCookieA = cookiePair(grantA.setCookies[0]);

    // 다른 기기(device-b)가 device-a의 보너스 쿠키를 붙여도 인정되지 않는다
    const stolenCheck = checkPreviewQuota(
      reqWith(`kd_vid=device-b; ${bonusCookieA}`),
      "TEASER:p1",
      PREVIEW_DAILY_LIMIT,
      day1,
    );
    expect(stolenCheck.shareBonusUsed).toBe(false);
    expect(stolenCheck.effectiveLimit).toBe(PREVIEW_DAILY_LIMIT);

    // 다음 날에는 device-a가 다시 하루 1회 보너스를 받을 수 있다
    const nextDayGrant = grantPreviewShareBonus(reqWith("kd_vid=device-a"), day2);
    expect(nextDayGrant.granted).toBe(true);

    // POST /api/preview/bonus 라우트: kd_vid가 없는 첫 요청에 kd_vid + kd_pvb 모두 발급
    const res = await postPreviewBonus(
      new NextRequest("https://kongdak.kr/api/preview/bonus", { method: "POST" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      granted: true,
      alreadyGranted: false,
      bonus: 3,
    });
    expect(res.headers.get("set-cookie")).toContain("kd_vid=");
    expect(res.headers.get("set-cookie")).toContain("kd_pvb=");
  });
});
