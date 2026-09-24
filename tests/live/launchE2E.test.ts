// 출시 전 실검증: 상품마다 "결제 완료 주문 → 권한 → 실제 AI 생성"을 끝까지 돌린다.
// DB 는 메모리 가짜로 대체하고 Gemini 는 실제로 호출한다(비용 발생) → LIVE_E2E=1 일 때만 실행.
//   LIVE_E2E=1 npx vitest run tests/live/launchE2E.test.ts
// 결과 원문은 LIVE_E2E_OUT(기본: OS 임시폴더) 에 상품별 JSON 으로 저장해 사람이 품질을 읽는다.
import { describe, it, expect, vi, beforeAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const store = vi.hoisted(() => ({
  reports: new Map<string, Record<string, unknown>>(),
  compat: null as null | Record<string, unknown>,
  seq: 0,
}));

vi.mock("@/lib/prisma", async () => {
  const { Prisma } = await import("@prisma/client");
  const byId = (id: string) => [...store.reports.values()].find((r) => r.id === id);
  const db = {
    order: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(async () => ({ tier: "FREE", premiumEndDate: null })) },
    subscription: { findFirst: vi.fn(async () => null) },
    unlock: { findMany: vi.fn(async () => []) },
    userSajuProfile: { findUnique: vi.fn(async () => null) },
    annualFortune: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => data),
    },
    deepReport: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => data),
    },
    compatibility: { findUnique: vi.fn(async () => store.compat) },
    sajuContentDictionary: { findFirst: vi.fn(async () => null) },
    // 출시 후 상태를 검증한다: 모든 상품 공개 오버라이드
    productVisibility: {
      findMany: vi.fn(async () => {
        const { CATALOG } = await import("@/lib/catalog");
        return CATALOG.map((c) => ({ catalogId: c.id, visible: true }));
      }),
    },
    generatedReport: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (store.reports.has(String(data.cacheKey))) {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint", { code: "P2002", clientVersion: "7" });
        }
        const row = { id: `r${++store.seq}`, content: null, updatedAt: new Date(), ...data };
        store.reports.set(String(data.cacheKey), row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: { where: { cacheKey?: string; id?: string } }) =>
        where.cacheKey ? store.reports.get(where.cacheKey) ?? null : byId(String(where.id)) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = byId(where.id);
        if (row) Object.assign(row, data);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = byId(where.id);
        if (row) Object.assign(row, data);
        return { count: row ? 1 : 0 };
      }),
    },
  };
  return { default: db, prisma: db };
});
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => ({ user: { id: "u_live", email: "live@test.local" } })) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
vi.mock("@/lib/rateLimiter", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
  checkGlobalAiCap: vi.fn(async () => true),
  getClientIp: () => "1.1.1.1",
}));

import prisma from "@/lib/prisma";
import { POST } from "@/app/api/reports/generate/route";
import { POST as ANNUAL_POST } from "@/app/api/fortune/annual/route";
import { POST as DEEP_POST } from "@/app/api/compat/deep-report/route";
import { CATALOG } from "@/lib/catalog";
import { toStorageKey } from "@/lib/productIdentity";
import { calculateFourPillars } from "@/lib/saju";
import { calculateCompatibility } from "@/lib/compatibility";
import { containsHanjaDeep } from "@/lib/gen/hanjaGuard";

const LIVE = process.env.LIVE_E2E === "1";
const OUT = process.env.LIVE_E2E_OUT || path.join(os.tmpdir(), "kongdak-live-e2e");
const ONLY = process.env.LIVE_E2E_ONLY?.split(",").filter(Boolean);
const KINDS = process.env.LIVE_E2E_KINDS?.split(",").filter(Boolean);
const future = new Date(Date.now() + 90 * 86400000);

const me = { name: "하늘", dob: "1994-08-21", time: "14:30", gender: "F" };
const partner = { name: "바다", dob: "1992-03-05", time: "07:10", gender: "M" };

function isoDaysFromNow(d: number) {
  return new Date(Date.now() + d * 86400000 + 9 * 3600000).toISOString().slice(0, 10);
}

function inputFor(id: string): Record<string, unknown> | undefined {
  if (id === "premium_naming") {
    return {
      guardianConsent: true, surnameHangul: "김", surnameHanja: "金", gender: "F",
      dob: isoDaysFromNow(-40), time: "09:20", dollim: null, tags: ["지혜", "따뜻함"], avoidSyllables: [],
    };
  }
  if (id === "premium_date_pick") {
    return { purpose: "WEDDING", start: isoDaysFromNow(30), end: isoDaysFromNow(120), people: [me, partner], weekdays: [0, 6], excludeDates: [] };
  }
  return me;
}

// 결제 후 applyPaidOrder 가 만드는 Unlock 과 같은 모양(주문 1건 = 구매 상품 1개)
function paidOrderFor(purchasedId: string, compatId: string | null) {
  const { productType, productKey } = toStorageKey(purchasedId);
  return {
    id: `order_db_${purchasedId}`, orderId: `kd_ord_live_${purchasedId}`, status: "PAID", type: "SINGLE",
    productType, productKey, compatId, userId: "u_live",
    unlocks: [{ id: "u1", productType, productKey, compatId, expiresAt: future }],
  };
}

const req = (body: unknown) =>
  new Request("http://localhost/api/reports/generate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }) as never;

// 세트는 구성 상품을 세트 주문으로 연다. 총운(annual_*)은 별도 라우트라 여기서 제외.
// 정통 궁합(compat_basic)은 궁합 결과 화면의 deep-report 라우트를 쓴다 → 아래에서 따로 검증.
const targets = CATALOG.filter(
  (p) => p.type !== "SET" && !p.id.startsWith("annual_") && p.id !== "compat_basic" && (!ONLY || ONLY.includes(p.id)),
);
const want = (id: string) => !ONLY || ONLY.includes(id);

function save(name: string, status: number, ms: number, json: unknown) {
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ status, ms, body: json }, null, 2));
}

describe.skipIf(!LIVE)("출시 실검증: 결제 주문 → 실제 AI 생성", () => {
  beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true });
    const a = calculateFourPillars(me.dob, me.time, me.gender, "Seoul, KR");
    const b = calculateFourPillars(partner.dob, partner.time, partner.gender, "Seoul, KR");
    const c = calculateCompatibility(a, b);
    store.compat = {
      id: "compat_live", relation: "love", score: c.score, keywords: c.keywords, breakdown: c.breakdown,
      personA: { name: me.name, gender: me.gender, dayMaster: a.dayMaster, elementsScore: a.elementsScore, fourPillars: a.fourPillars },
      personB: { name: partner.name, gender: partner.gender, dayMaster: b.dayMaster, elementsScore: b.elementsScore, fourPillars: b.fourPillars },
    };
  });

  for (const p of targets) {
    const couple = p.target === "couple";
    const compatId = couple ? "compat_live" : null;
    const kinds = (p.isFree ? ["FREE"] : ["TEASER", "FULL"]).filter(
      (k) => !KINDS || KINDS.includes(k),
    ) as Array<"FREE" | "TEASER" | "FULL">;
    for (const kind of kinds) {
      it(`${p.id} ${kind}`, async () => {
        vi.mocked(prisma.order.findUnique).mockResolvedValue(paidOrderFor(p.id, compatId) as never);
        const body = {
          catalogId: p.id, kind, compatId, input: inputFor(p.id),
          orderId: kind === "FULL" ? `kd_ord_live_${p.id}` : undefined,
        };
        const t0 = Date.now();
        const res = await POST(req(body));
        const json = await res.json();
        save(`${p.id}.${kind}`, res.status, Date.now() - t0, json);
        expect(res.status, JSON.stringify(json).slice(0, 300)).toBe(200);
        expect(json.data).toBeTruthy();
        // 프리미엄 engine 은 계산 데이터(간지·인명 한자)라 화면이 쉬운 말로 바꿔 쓴다 → AI 문장만 검사
        expect(containsHanjaDeep(p.tier === "premium" ? { ...json.data, engine: undefined } : json.data)).toBe(false);
      }, 240_000);
    }
  }

  // 세트 주문으로 구성 상품 FULL 이 열리는지(권한 경로만, 저장본 재사용이라 AI 호출 없음)
  for (const set of CATALOG.filter((p) => p.type === "SET" && (!ONLY || ONLY.includes(p.id)))) {
    it(`${set.id} → 구성 상품 권한`, async () => {
      const compatId = set.target === "couple" ? "compat_live" : null;
      if (set.items?.includes("compat_basic")) {
        // 정통 궁합은 궁합 결과 화면이 세트 주문 토큰으로 연다(저장본 재사용)
        vi.mocked(prisma.order.findUnique).mockResolvedValue(paidOrderFor(set.id, compatId) as never);
        vi.mocked(prisma.deepReport.findUnique).mockResolvedValueOnce({ content: { ok: true } } as never);
        const res = await DEEP_POST(new Request("http://localhost/api/compat/deep-report", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ compatId, orderId: `kd_ord_live_${set.id}` }),
        }) as never);
        expect(res.status, `${set.id}→compat_basic`).toBe(200);
      }
      for (const item of (set.items ?? []).filter((i) => !i.startsWith("annual_") && i !== "compat_basic")) {
        const order = paidOrderFor(set.id, compatId);
        vi.mocked(prisma.order.findUnique).mockResolvedValue(order as never);
        store.reports.set(`FULL:${order.id}:${item}`, {
          id: `set_${set.id}_${item}`, status: "READY", attempts: 1, updatedAt: new Date(),
          content: { version: 1, score: 80, data: { headline: "x" } },
        });
        const res = await POST(req({ catalogId: item, kind: "FULL", compatId, input: me, orderId: order.orderId }));
        expect(res.status, `${set.id}→${item}`).toBe(200);
      }
    });
  }

  if (want("compat_basic")) {
    it("compat_basic FULL (궁합 결과 화면 deep-report)", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(paidOrderFor("compat_basic", "compat_live") as never);
      const t0 = Date.now();
      const res = await DEEP_POST(new Request("http://localhost/api/compat/deep-report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compatId: "compat_live", orderId: "kd_ord_live_compat_basic", locale: "ko" }),
      }) as never);
      const json = await res.json();
      save("compat_basic.FULL", res.status, Date.now() - t0, json);
      expect(res.status, JSON.stringify(json).slice(0, 300)).toBe(200);
      expect(containsHanjaDeep(json)).toBe(false);
    }, 240_000);
  }

  for (const year of [2026, 2027]) {
    if (!want(`annual_${year}`)) continue;
    it(`annual_${year} FULL (회원 총운)`, async () => {
      const saju = calculateFourPillars(me.dob, me.time, me.gender, "Seoul, KR");
      vi.mocked(prisma.userSajuProfile.findUnique).mockResolvedValue({
        userId: "u_live", name: me.name, gender: me.gender, birthYear: "1994", birthMonth: "08", birthDay: "21",
        birthTime: me.time, unknownTime: false, fourPillars: saju.fourPillars, dayMaster: saju.dayMasterSignKey,
        elementsScore: saju.elementsScore,
      } as never);
      const { productType, productKey } = toStorageKey(`annual_${year}`);
      vi.mocked(prisma.unlock.findMany).mockResolvedValue([{ productType, productKey, compatId: null, expiresAt: future }] as never);
      const t0 = Date.now();
      const res = await ANNUAL_POST(new Request("http://localhost/api/fortune/annual", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: "ko", productId: `annual_${year}` }),
      }) as never);
      const json = await res.json();
      save(`annual_${year}.FULL`, res.status, Date.now() - t0, json);
      expect(res.status, JSON.stringify(json).slice(0, 300)).toBe(200);
      expect(json.locked).toBe(false);
      expect(containsHanjaDeep(json.data)).toBe(false);
    }, 240_000);
  }
});
