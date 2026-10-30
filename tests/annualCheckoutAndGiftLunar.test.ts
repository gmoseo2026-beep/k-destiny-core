import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

import { annualBirthTime, annualFormPrefill } from "@/app/[locale]/fortune/annual/AnnualFortuneClient";
import { resolveGiftBirth } from "@/components/gift/GiftRedeemClient";
import { checkoutOptionsFor, getProduct } from "@/lib/catalog";

const birth = { name: "수령인", gender: "F" as const, ampm: "", hour: "1", min: "00" };

describe("선물 수령 — 음력 생일", () => {
  it("음력으로 넣으면 양력으로 바꿔 넘긴다", async () => {
    const r = await resolveGiftBirth({ ...birth, year: "1990", month: "1", day: "1", isLunar: true });
    expect(r.ok && r.input.dob).toBe("1990-01-27");
    expect(r.ok && r.notice).toBeTruthy();
  });

  it("양력은 그대로 두고 안내 문구도 없다", async () => {
    const r = await resolveGiftBirth({ ...birth, year: "1990", month: "1", day: "1" });
    expect(r.ok && r.input.dob).toBe("1990-01-01");
    expect(r.ok && r.notice).toBeNull();
  });

  it("없는 날짜는 막는다", async () => {
    const r = await resolveGiftBirth({ ...birth, year: "1990", month: "2", day: "30" });
    expect(r.ok).toBe(false);
  });
});

describe("총운 결제창 — 세트 사다리", () => {
  it("2027 신년운 결제창에 단품과 2027 세트가 나온다", () => {
    const options = checkoutOptionsFor(getProduct("annual_2027"), ["annual_2027", "set_2027"]);
    expect(options.map((o) => o.id)).toEqual(["annual_2027", "set_2027"]);
  });

  it("결제창이 고른 상품으로 결제하고, 세트면 입력값을 넘겨 리포트 화면으로 보낸다", () => {
    const src = readFileSync("app/[locale]/fortune/annual/AnnualFortuneClient.tsx", "utf8");
    expect(src).toContain("options={checkoutOptionsFor(annualProduct, visibleIds ?? [])}");
    expect(src).toContain("productId: checkoutId,");
    expect(src).toContain("savePendingInput(checkoutId, input)");
    expect(src).toContain("/report/new?c=${checkoutId}");
    expect(readFileSync("app/[locale]/fortune/annual/page.tsx", "utf8")).toContain("visibleIds={visibleIds}");
  });
});

describe("총운 입력 칸", () => {
  it("다른 화면에서 넣은 내 정보로 채운다(분은 선택지 값 형식)", () => {
    expect(annualFormPrefill({ name: "나", dob: "1995-03-07", time: "13:00", gender: "M" })).toEqual({
      name: "",
      birthYear: "1995",
      birthMonth: "3",
      birthDay: "7",
      gender: "M",
      ampm: "PM",
      hour: "1",
      min: "0",
    });
  });

  it("결제 전에 저장하는 태어난 시간을 잃지 않는다", () => {
    expect(annualBirthTime("PM", "1", "5")).toBe("13:05");
    expect(annualBirthTime("AM", "12", "0")).toBe("00:00");
    expect(annualBirthTime("", "1", "0")).toBeNull();
  });
});
