# 콩닥 오픈 준비(D2.1·D3) + 프리미엄 3종 — Gemini 실행 지시문

> **실행자(Gemini/Antigravity) 필독:** 이 문서는 Phase 단위로 실행한다. 각 Phase 끝의 **🛑 체크포인트**에서 반드시 멈추고 `REVIEW_HANDOFF.md`를 작성해 보고한다. 사장님이 Claude(Opus) 검수 결과를 전달하기 전에는 다음 Phase로 넘어가지 않는다. 단계는 체크박스(`- [ ]`)로 추적한다.

**목표:** Opus 5.5 감사에서 나온 결함을 모두 고쳐 표준 카탈로그를 결제→열람까지 안전하게 연다. 그다음 프리미엄 3종(2027 대운, 우리 아이 이름 짓기, 길일 택일)을 추가한다.

**구조 요약:**
- 열람 권한은 **"주문 1건 = 리포트 1건"(order-scoped)**으로 바꾼다. 결제된 주문이 곧 열람권이고, 그 주문으로 처음 생성된 리포트가 고정 저장된다.
- 점수·날짜·이름 후보는 전부 **결정론 엔진**이 계산한다. AI는 엔진이 준 사실을 **문장으로만** 풀어 쓴다.
- 프리미엄 생성은 **멱등 + 폴링** 방식이다. 오래 걸리는 생성도 중복 없이 한 번만 돈다.

**기술 스택:** Next.js **16.2.9**(App Router, Turbopack). AGENTS.md에는 15라고 되어 있지만 실제 버전은 16이니 코드 작성 전 `node_modules/next/dist/docs/`를 읽을 것. 그 외: TypeScript strict, Prisma 7 + Supabase Postgres, NextAuth v4, PortOne v2(KG이니시스), Tailwind v4, `lunar-javascript`(만세력), Google Gemini(`@google/generative-ai`), 테스트는 신규 도입하는 `vitest`.

**근거 문서:**
- `AGENTS.md`
- `콩닥_커밋D_서버확장_지시문_Gemini.md`
- `콩닥_Opus55_최종감사_요청서.md`
- 이 문서의 "감사 결함 목록"

---

## 0. 전역 제약 (모든 Task에 적용)

1. `lib/saju.ts`, `lib/trueSolarTime.ts`는 **수정 금지**. 필요한 계산은 새 모듈에서 `lunar-javascript`를 직접 쓴다.
2. DB 스키마는 **추가(additive)만** 한다. 기존 테이블·컬럼 삭제와 이름 변경은 금지한다. 커밋되지 않은 `ReportCache` 모델도 이미 운영 DB에 생성됐을 수 있으므로 **스키마에 그대로 남겨 둔다**(사용만 중단).
3. 🚨 **`.env`의 `DATABASE_URL`은 운영 Supabase를 가리킨다.**
   - 로컬에서 `npx prisma db push`, `migrate`, 테스트 주문 생성 등 **DB 쓰기를 절대 하지 않는다.**
   - DB가 필요한 작업은 `.env.development.local`의 개발 DB에서만 하고, 반드시 `node scripts/prisma-dev.mjs ...`(Task 0.2)를 거친다.
   - 개발 DB가 없으면 DB 쓰기 단계는 **건너뛰고 보고**한다.
4. 금액은 **서버가 `lib/catalog.ts`에서만** 결정한다. 클라이언트 금액은 무시한다. 화면 가격 표시도 `priceLabel()` 하나에서만 만든다.
5. **서버 redaction**: 권한이 없으면 응답 JSON에 유료 본문 키(`sections`, `advice`, `closing`, `domains`, `months`, `names`, `dates` 등)가 **존재하지 않아야** 한다. 클라이언트 블러 처리는 금지한다.
6. 기존 하드닝 주석(H-2/H-4/H-6/M-5/M-8/M-9/M-10/L-4)과 그 로직을 보존한다.
7. 말투: `STYLE_GUIDE` 준수. **AI 출력에는 한자와 사주 전문용어(오행·일간·천간·지지·대운·세운·상생·상극 등)를 금지**하고, 서버에서 자동 검증한다(Task 1.8). 단 한 가지 예외: 작명 리포트는 **엔진 데이터에 있는 한자만** 화면에 표시할 수 있다(Task 3.4). AI 문장에는 이 경우에도 한자를 쓸 수 없다.
8. 단정적 예언은 금지하고 "오락·자기이해 목적" 고지를 유지한다. 건강 상품은 의료 진단·치료 권유를 금지한다.
9. 시크릿 하드코딩은 금지한다. 새 환경변수 `SUBJECT_HASH_SECRET`, `GEMINI_PREMIUM_MODEL`은 코드에서 읽기만 하고 값은 사장님이 설정한다. 값을 출력하거나 로그에 남기지 않는다.
10. **배포하지 않는다. `git push`도 하지 않는다.** 작업 브랜치 `feat/open-premium`에 로컬 커밋만 한다. 배포는 사장님이 Claude 최종 검수 후 `python scripts/safe_deploy.py`로 한다.
11. 새 코드에 `any`를 쓰지 않는다. 변경한 파일은 eslint 에러 0건이어야 한다.
12. 모든 버튼은 기존 전역 active `scale(0.96)` 규칙을 따른다. 모바일 우선이다.
13. 커밋은 작은 단위로 하고 명령형 한 줄로 쓴다. 예: `fix(entitlement): compatId 폴스루 차단`. 마지막 줄에 `Co-Authored-By: Gemini <noreply@google.com>`를 넣는다.

## 0-1. 사장님 결정사항 (기본값으로 구현하고, 변경 지시가 오면 해당 상수만 바꾼다)

| # | 항목 | 기본값 |
|---|---|---|
| D1 | 프리미엄 가격 | 2027 대운 **19,900원** / 아이 이름 짓기 **39,000원** / 길일 택일 **19,900원** |
| D2 | 프리미엄 정책 | 결제 시 **로그인 필수**, 보관 **365일**, PDF 저장(인쇄) 제공 |
| D3 | 첫 결제 할인 | **회원 첫 결제 1회만 4,900원**. 게스트는 정가. 이메일만 바꾸면 무한 할인되는 문제를 막을 수단이 로그인뿐이기 때문 |
| D4 | 기간권(9,900/24,900) | **신규 판매 중단**. 기존 보유자는 `passCovered` 상품(compat_basic, annual_*)만 계속 열람 |
| D5 | set_2027(16,900) | **폐기**(숨김 유지). 프리미엄 2027과 겹친다 |
| D6 | 취소선 정가(15,000원 등) | **제거**. 실제 판매 이력이 없는 정가 표시는 표시광고법 위험이 있다. 대신 "회원 첫 결제 4,900원" 혜택만 표시 |
| D7 | 작명 대상 | **이미 태어난 아이만**(생년월일 필수, 시간 선택). 출생 전(예정일) 작명은 v2로 미룬다 |

---

## 감사 결함 목록 (이 문서가 모두 해결한다)

| ID | 결함 | 해결 Task |
|---|---|---|
| B1 | compat Unlock 하나로 모든 상품 열람 (entitlement compatId 폴스루 + generate가 compatId 전달) | 1.3, 1.9 |
| B2 | 화면 1,900/2,900원 표시 ↔ 서버 4,900/6,900원 청구 | 1.5, 2.2 |
| H1 | 세트 구매자가 총운을 못 엶 ("2026" ↔ "annual_2026" 불일치) | 1.1, 1.3 |
| H2 | 개인 상품 1회 결제로 다른 생년월일 무제한 생성 | 1.9 (주문=리포트 1건) |
| H3 | 총운 경로 이원화, 2027 하드코딩, 점수함수 불일치 | 1.11 |
| H4 | 상품별 프롬프트 부재, 본문이 얇음 | 1.10 |
| H5 | maxOutputTokens 1536, 재시도·진단로그 없음 | 1.8 |
| H6 | free_personality 막다른 길, 빈 "인기 세트" 섹션 | 1.9, 2.3, 2.7 |
| M1 | 게스트 입력 역산 가능 해시 저장 | 1.2 (HMAC) |
| M2 | 캐시 인덱스·유니크 없음 | 1.4 (`cacheKey @unique`) |
| M3 | generate 입력 검증 없음 | 1.6 |
| M4 | 게스트 첫구매 할인 무한 | 1.5 (D3) |
| M5 | 전역 AI 상한 미사용 | 1.12 |
| M6 | 점수를 생성 후 덮어써서 문장과 불일치 | 1.10 (점수 선계산 후 프롬프트 주입) |
| M7 | 결제한 게스트가 개인 상품 열람 증명 불가 | 2.1 |
| M8 | 숨김 상품 API·URL 우회 | 1.5, 1.9, 2.7 |
| M9 | 기간권 잠식·무제한 비용 | 1.3, 1.5, 2.2 (D4) |
| L* | 전문용어 카피, 구 색상 토큰, 무료상품 4,900원 과금, lint 에러, 테스트 부재 | 0.1, 1.5, 2.7 |

---

# Phase 0 — 안전 준비

### Task 0.1: 브랜치 + vitest 도입

**Files:**
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)
- Create: `vitest.config.mts`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1:** `git switch -c feat/open-premium`로 브랜치를 만든다. 커밋되지 않은 D2 파일(`app/api/fortune/generate/route.ts`, `lib/destinyGen.ts` 변경분, `prisma/schema.prisma`의 ReportCache)도 이 브랜치로 함께 가져온다.
- [ ] **Step 2:** `npm i -D vitest`
- [ ] **Step 3:** `vitest.config.mts` 작성

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
```

- [ ] **Step 4:** `tests/smoke.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { getProduct } from "@/lib/catalog";

describe("smoke", () => {
  it("catalog 로드", () => {
    expect(getProduct("compat_basic")?.type).toBe("COMPAT");
  });
});
```

- [ ] **Step 5:** `npm test` → PASS를 확인하고 커밋한다: `chore(test): vitest 도입`

### Task 0.2: 개발 DB 전용 prisma 실행기

**Files:** Create `scripts/prisma-dev.mjs`

- [ ] **Step 1:** 작성한다. 운영 DB와 같은 프로젝트(username@host)를 가리키면 거부해야 한다.

```js
// scripts/prisma-dev.mjs — 개발 DB 전용 prisma 실행기. 운영 DB를 가리키면 거부한다.
// 사용: node scripts/prisma-dev.mjs db push
import { config } from "dotenv";
import { spawnSync } from "node:child_process";

const read = (path) => config({ path, processEnv: {}, quiet: true }).parsed?.DATABASE_URL ?? "";
const ident = (u) => {
  try {
    const x = new URL(u);
    return `${x.username}@${x.host}`;
  } catch {
    return "";
  }
};

const prod = read(".env");
const dev = read(".env.development.local");
if (!dev) {
  console.error("✖ .env.development.local 에 DATABASE_URL 이 없습니다. 개발 DB를 먼저 준비하세요.");
  process.exit(1);
}
if (ident(dev) === ident(prod)) {
  console.error("✖ 개발 DB가 운영 DB와 같은 프로젝트입니다. 중단합니다.");
  process.exit(1);
}
const r = spawnSync("npx", ["prisma", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: dev },
});
process.exit(r.status ?? 1);
```

- [ ] **Step 2:** `.env.development.local`이 `.gitignore`에 포함돼 있는지 확인한다. 없으면 추가한다.
- [ ] **Step 3:** 커밋: `chore(db): 개발 DB 전용 prisma 실행기 추가`

> 개발 DB 준비는 사장님 액션이다(Supabase 무료 프로젝트 1개 또는 로컬 Postgres). 준비 전이라면 이 스크립트만 만들어 두고 DB 쓰기 테스트는 체크포인트 보고서에 "미실행"으로 적는다.

---

# Phase 1 — 서버 보안·정합성 (D2.1)

### Task 1.1: 상품 식별 정규화 (`lib/productIdentity.ts`)

DB에 저장된 `(productType, productKey)`와 카탈로그 id 사이의 **유일한** 변환 지점이다. H1(세트↔총운) 버그의 근본 수정이다.

**Files:** Create `lib/productIdentity.ts`, Test `tests/productIdentity.test.ts`

**Interfaces (Produces):**
- `toCatalogId(productType: string | null, productKey: string | null, compatId: string | null): string | null`
- `toStorageKey(catalogId: string): { productType: string; productKey: string }`
- `grantingCatalogIds(catalogId: string): string[]` — 자기 자신과 그 상품을 포함하는 세트들
- `normalizeProductKey(key: string): string` — `"ANNUAL:2026"`을 `"annual_2026"`으로 바꾸고, 나머지는 그대로 둔다

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, it, expect } from "vitest";
import { toCatalogId, toStorageKey, grantingCatalogIds, normalizeProductKey } from "@/lib/productIdentity";

describe("productIdentity", () => {
  it("레거시 ANNUAL 저장키 → 카탈로그 id", () => {
    expect(toCatalogId("ANNUAL", "2026", null)).toBe("annual_2026");
    expect(toCatalogId("ANNUAL", "2027", null)).toBe("annual_2027");
  });
  it("초기 궁합 주문(productType null) → compat_basic", () => {
    expect(toCatalogId(null, null, "cmp1")).toBe("compat_basic");
    expect(toCatalogId("COMPAT", null, "cmp1")).toBe("compat_basic");
  });
  it("일반 키는 그대로", () => {
    expect(toCatalogId("FORTUNE", "wealth", null)).toBe("wealth");
    expect(toCatalogId("SET", "set_me", null)).toBe("set_me");
  });
  it("저장키 변환은 annual 레거시 형식 유지", () => {
    expect(toStorageKey("annual_2026")).toEqual({ productType: "ANNUAL", productKey: "2026" });
    expect(toStorageKey("wealth")).toEqual({ productType: "FORTUNE", productKey: "wealth" });
    expect(toStorageKey("set_me")).toEqual({ productType: "SET", productKey: "set_me" });
  });
  it("총운은 자신 + 총운 포함 세트가 연다 (H1)", () => {
    expect(grantingCatalogIds("annual_2026").sort()).toEqual(["annual_2026", "set_career", "set_me"].sort());
  });
  it("정규화", () => {
    expect(normalizeProductKey("ANNUAL:2027")).toBe("annual_2027");
    expect(normalizeProductKey("wealth")).toBe("wealth");
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL(모듈 없음)을 확인한다.
- [ ] **Step 3: 구현**

```ts
import { CATALOG, getProduct } from "@/lib/catalog";

const ANNUAL_ID = /^annual_(\d{4})$/;

/** DB의 (productType, productKey) → 카탈로그 id. 레거시 행 호환의 유일한 지점. */
export function toCatalogId(productType: string | null, productKey: string | null, compatId: string | null): string | null {
  if (productType === "ANNUAL" && productKey && /^\d{4}$/.test(productKey)) return `annual_${productKey}`;
  if (!productType && compatId) return "compat_basic"; // 초기 궁합 주문
  if (productType === "COMPAT" && !productKey) return "compat_basic";
  return productKey ?? null;
}

/** 카탈로그 id → 주문/Unlock 저장 형식. annual 은 기존 운영 데이터 호환을 위해 ("ANNUAL","2026") 유지. */
export function toStorageKey(catalogId: string): { productType: string; productKey: string } {
  const m = ANNUAL_ID.exec(catalogId);
  if (m) return { productType: "ANNUAL", productKey: m[1] };
  const p = getProduct(catalogId);
  if (!p) throw new Error(`unknown catalogId: ${catalogId}`);
  return { productType: p.type, productKey: p.id };
}

/** catalogId 를 열람하게 해 주는 카탈로그 id 목록: 자기 자신 + 이를 포함한 세트 */
export function grantingCatalogIds(catalogId: string): string[] {
  const sets = CATALOG.filter((c) => c.type === "SET" && c.items?.includes(catalogId)).map((c) => c.id);
  return [catalogId, ...sets];
}

export function normalizeProductKey(key: string): string {
  const m = /^ANNUAL:(\d{4})$/.exec(key);
  return m ? `annual_${m[1]}` : key;
}
```

- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** 커밋: `feat(identity): 상품 식별 정규화 모듈 추가`

### Task 1.2: 입력 해시 (HMAC) — `lib/subject.ts`

**Files:** Create `lib/subject.ts`, Test `tests/subject.test.ts`

**Interfaces (Produces):** `subjectHash(parts: string[]): string` (64자 hex). `SUBJECT_HASH_SECRET`이 없거나 32자 미만이면 throw(fail-closed).

- [ ] **Step 1: 테스트**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { subjectHash } from "@/lib/subject";

describe("subjectHash", () => {
  beforeEach(() => { process.env.SUBJECT_HASH_SECRET = "x".repeat(32); });
  it("결정론", () => {
    expect(subjectHash(["person", "1995-03-15"])).toBe(subjectHash(["person", "1995-03-15"]));
  });
  it("입력이 다르면 다름", () => {
    expect(subjectHash(["person", "1995-03-15"])).not.toBe(subjectHash(["person", "1995-03-16"]));
  });
  it("비밀키 없으면 거부", () => {
    delete process.env.SUBJECT_HASH_SECRET;
    expect(() => subjectHash(["a"])).toThrow();
  });
});
```

- [ ] **Step 2: 구현**

```ts
import crypto from "crypto";

/**
 * [PII] 입력(생년월일 등)의 원문 대신 저장하는 키. HMAC 이라 비밀키 없이 역산할 수 없다.
 * (sha256 앞 16자리는 생년월일 공간이 작아 전수조사로 역산 가능했다 — 감사 M1)
 */
export function subjectHash(parts: string[]): string {
  const secret = process.env.SUBJECT_HASH_SECRET;
  if (!secret || secret.length < 32) throw new Error("SUBJECT_HASH_SECRET is not configured");
  return crypto.createHmac("sha256", secret).update(parts.join("||")).digest("hex");
}
```

- [ ] **Step 3:** PASS 확인 후 커밋: `feat(pii): HMAC 기반 입력 해시 추가`

### Task 1.3: 열람 규칙 순수 함수 + `isEntitled` 재작성 (B1·H1·M9)

**Files:**
- Create `lib/entitlementRules.ts`
- Modify `lib/entitlement.ts` (전면 재작성, 기존 시그니처 유지)
- Test `tests/entitlementRules.test.ts`

**Interfaces (Produces):**
- `unlockGrants(u: UnlockRow, req: GrantRequest): boolean`
- `orderGrants(order: OrderSnapshot, req: GrantRequest & { sessionUserId: string | null; presentedOrderId: string | null }): OrderGrantResult`
- `isEntitled(params)`: 기존 호출부(annual, deep-report, weekly 등)와 호환되는 시그니처

- [ ] **Step 1: 공격 시나리오를 포함한 실패 테스트**

```ts
import { describe, it, expect } from "vitest";
import { unlockGrants, orderGrants, type UnlockRow } from "@/lib/entitlementRules";

const now = new Date("2026-10-01T00:00:00Z");
const future = new Date("2026-12-31T00:00:00Z");
const past = new Date("2026-09-01T00:00:00Z");
const u = (productType: string | null, productKey: string | null, compatId: string | null, expiresAt: Date | null = future): UnlockRow =>
  ({ productType, productKey, compatId, expiresAt });

describe("unlockGrants — B1 회귀(궁합 1건으로 전체 열람 금지)", () => {
  const compatX = u("COMPAT", "compat_basic", "X");
  it("정통궁합 X 로 재물운을 열 수 없다", () => {
    expect(unlockGrants(compatX, { catalogId: "wealth", compatId: "X", now })).toBe(false);
  });
  it("정통궁합 X 로 속마음 X 를 열 수 없다", () => {
    expect(unlockGrants(compatX, { catalogId: "inner_mind", compatId: "X", now })).toBe(false);
  });
  it("속마음 X 로 정통궁합 X 를 열 수 없다", () => {
    expect(unlockGrants(u("COMPAT", "inner_mind", "X"), { catalogId: "compat_basic", compatId: "X", now })).toBe(false);
  });
  it("정통궁합 X 는 정통궁합 X 만 연다", () => {
    expect(unlockGrants(compatX, { catalogId: "compat_basic", compatId: "X", now })).toBe(true);
    expect(unlockGrants(compatX, { catalogId: "compat_basic", compatId: "Y", now })).toBe(false);
    expect(unlockGrants(compatX, { catalogId: "compat_basic", compatId: null, now })).toBe(false);
  });
  it("초기 레거시 궁합 행(productType null)은 compat_basic 만", () => {
    const legacy = u(null, null, "X");
    expect(unlockGrants(legacy, { catalogId: "compat_basic", compatId: "X", now })).toBe(true);
    expect(unlockGrants(legacy, { catalogId: "reunion", compatId: "X", now })).toBe(false);
  });
});

describe("unlockGrants — 세트", () => {
  it("이 사람 세트 X 는 구성품만, 같은 X 에서만", () => {
    const set = u("SET", "set_this_person", "X");
    expect(unlockGrants(set, { catalogId: "inner_mind", compatId: "X", now })).toBe(true);
    expect(unlockGrants(set, { catalogId: "marriage", compatId: "X", now })).toBe(true);
    expect(unlockGrants(set, { catalogId: "compat_basic", compatId: "X", now })).toBe(true);
    expect(unlockGrants(set, { catalogId: "reunion", compatId: "X", now })).toBe(false);
    expect(unlockGrants(set, { catalogId: "inner_mind", compatId: "Y", now })).toBe(false);
  });
  it("나 종합 세트는 2026 총운을 연다 (H1)", () => {
    expect(unlockGrants(u("SET", "set_me", null), { catalogId: "annual_2026", compatId: null, now })).toBe(true);
  });
  it("2026 총운 단품은 2027 을 못 연다", () => {
    expect(unlockGrants(u("ANNUAL", "2026", null), { catalogId: "annual_2027", compatId: null, now })).toBe(false);
  });
});

describe("unlockGrants — 만료", () => {
  it("만료된 행은 거부", () => {
    expect(unlockGrants(u("FORTUNE", "wealth", null, past), { catalogId: "wealth", compatId: null, now })).toBe(false);
  });
  it("expiresAt null(레거시)은 허용", () => {
    expect(unlockGrants(u("FORTUNE", "wealth", null, null), { catalogId: "wealth", compatId: null, now })).toBe(true);
  });
});

describe("orderGrants — 소유 증명(H-2 베어러 모델)", () => {
  const base = { orderId: "kd_ord_a", userId: null as string | null, status: "PAID", unlocks: [u("FORTUNE", "wealth", null)] };
  const req = { catalogId: "wealth", compatId: null, now, sessionUserId: null as string | null, presentedOrderId: "kd_ord_a" as string | null };
  it("게스트 주문 + orderId 제시 → 허용", () => {
    expect(orderGrants(base, req).ok).toBe(true);
  });
  it("orderId 미제시 → FORBIDDEN", () => {
    expect(orderGrants(base, { ...req, presentedOrderId: null })).toEqual({ ok: false, reason: "FORBIDDEN" });
  });
  it("회원 주문은 세션 일치로도 허용", () => {
    expect(orderGrants({ ...base, userId: "u1" }, { ...req, presentedOrderId: null, sessionUserId: "u1" }).ok).toBe(true);
  });
  it("타인 세션 + orderId 미제시 → FORBIDDEN", () => {
    expect(orderGrants({ ...base, userId: "u1" }, { ...req, presentedOrderId: null, sessionUserId: "u2" }).ok).toBe(false);
  });
  it("미결제 → NOT_PAID", () => {
    expect(orderGrants({ ...base, status: "PENDING" }, req)).toEqual({ ok: false, reason: "NOT_PAID" });
  });
  it("다른 상품 요청 → NO_GRANT", () => {
    expect(orderGrants(base, { ...req, catalogId: "career" })).toEqual({ ok: false, reason: "NO_GRANT" });
  });
});
```

- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3: `lib/entitlementRules.ts` 구현**

```ts
// 순수 함수 — DB 접근 금지. 모든 열람 판정의 단일 규칙(감사 B1·H1 근본 수정).
import { getProduct } from "@/lib/catalog";
import { toCatalogId, grantingCatalogIds } from "@/lib/productIdentity";

export interface UnlockRow {
  productType: string | null;
  productKey: string | null;
  compatId: string | null;
  expiresAt: Date | null;
}

export interface GrantRequest {
  catalogId: string;
  compatId: string | null;
  now: Date;
}

export function unlockGrants(u: UnlockRow, req: GrantRequest): boolean {
  const product = getProduct(req.catalogId);
  if (!product) return false;
  const unlockCatalogId = toCatalogId(u.productType, u.productKey, u.compatId);
  if (!unlockCatalogId || !grantingCatalogIds(req.catalogId).includes(unlockCatalogId)) return false;
  // 관계 상품은 같은 궁합(compatId)에서만 — 상대 무제한 열람 차단(D1.1)
  if (product.target === "couple" && (!req.compatId || u.compatId !== req.compatId)) return false;
  // [M-5] 만료 판단의 유일한 출처는 Unlock.expiresAt. null 은 과거 수동 부여 행 호환.
  if (u.expiresAt && u.expiresAt.getTime() <= req.now.getTime()) return false;
  return true;
}

export interface OrderSnapshot {
  orderId: string;
  userId: string | null;
  status: string;
  unlocks: UnlockRow[];
}

export type OrderGrantResult =
  | { ok: true; unlock: UnlockRow }
  | { ok: false; reason: "FORBIDDEN" | "NOT_PAID" | "NO_GRANT" };

export function orderGrants(
  order: OrderSnapshot,
  req: GrantRequest & { sessionUserId: string | null; presentedOrderId: string | null }
): OrderGrantResult {
  // [H-2] 소유 증명: 세션이 주문 주인과 같거나, 추측 불가한 orderId 를 제시한 경우만
  const bySession = !!order.userId && order.userId === req.sessionUserId;
  const byBearer = req.presentedOrderId === order.orderId;
  if (!bySession && !byBearer) return { ok: false, reason: "FORBIDDEN" };
  if (order.status !== "PAID") return { ok: false, reason: "NOT_PAID" };
  const unlock = order.unlocks.find((x) => unlockGrants(x, req));
  return unlock ? { ok: true, unlock } : { ok: false, reason: "NO_GRANT" };
}
```

- [ ] **Step 4: `lib/entitlement.ts` 재작성** (시그니처와 `EntitlementResult` 유지)

```ts
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getProduct } from "@/lib/catalog";
import { grantingCatalogIds, normalizeProductKey, toStorageKey } from "@/lib/productIdentity";
import { unlockGrants } from "@/lib/entitlementRules";

export interface EntitlementResult {
  entitled: boolean;
  reason: "ADMIN" | "SUBSCRIPTION" | "UNLOCK" | "NONE";
}

const NONE: EntitlementResult = { entitled: false, reason: "NONE" };

export async function isEntitled(params: {
  userId?: string | null;
  role?: string | null;
  tier?: string | null;
  compatId?: string | null;
  email?: string | null;
  orderId?: string | null;
  productKey?: string | null; // "ANNUAL:2026" 또는 카탈로그 id
}): Promise<EntitlementResult> {
  const { userId, role, compatId, orderId, productKey } = params;
  if (role === "ADMIN") return { entitled: true, reason: "ADMIN" };

  // productKey 없이 compatId 만 오면 레거시 궁합 심층(deep-report) 요청 → compat_basic 으로만 해석
  const catalogId = productKey ? normalizeProductKey(productKey) : compatId ? "compat_basic" : null;
  const product = catalogId ? getProduct(catalogId) : undefined;

  // 레거시 기간권: passCovered 상품만(사장님 결정 D4). 상품 지정이 없는 호출(주간/데일리)은 기존대로 전체.
  if (userId && (!catalogId || product?.passCovered)) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true, premiumEndDate: true } });
    if (user?.tier === "PREMIUM" && (!user.premiumEndDate || user.premiumEndDate > new Date())) {
      return { entitled: true, reason: "SUBSCRIPTION" };
    }
    const activeSub = await prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE", currentPeriodEnd: { gte: new Date() } },
      select: { id: true },
    });
    if (activeSub) return { entitled: true, reason: "SUBSCRIPTION" };
  }

  if (!catalogId || !product) return NONE; // 알 수 없는 상품 → fail-closed

  const req = { catalogId, compatId: compatId ?? null, now: new Date() };

  // [H-2] 게스트: orderId 제시(베어러)
  if (orderId) {
    const order = await prisma.order.findUnique({ where: { orderId }, include: { unlocks: true } });
    if (order?.status === "PAID" && order.unlocks.some((x) => unlockGrants(x, req))) {
      return { entitled: true, reason: "UNLOCK" };
    }
  }

  // 회원: 본인 Unlock 중 규칙을 통과하는 행
  if (userId) {
    const keys: Prisma.UnlockWhereInput[] = grantingCatalogIds(catalogId).map((id) => toStorageKey(id));
    if (catalogId === "compat_basic") {
      keys.push({ productType: null }, { productType: "COMPAT", productKey: null }); // 레거시 궁합 행
    }
    const unlocks = await prisma.unlock.findMany({
      where: { userId, OR: keys },
      select: { productType: true, productKey: true, compatId: true, expiresAt: true },
    });
    if (unlocks.some((x) => unlockGrants(x, req))) return { entitled: true, reason: "UNLOCK" };
  }

  // ⛔ 여기서 끝. 과거처럼 compatId 전용 분기로 폴스루하지 않는다(감사 B1).
  return NONE;
}
```

- [ ] **Step 5:** `npm test`와 `npx tsc --noEmit` PASS 확인. `grep -rn "isEntitled(" app lib`로 모든 호출부를 나열해 보고서에 적고, 각 호출이 의도대로 해석되는지 표로 정리한다(annual → `annual_<year>`, deep-report → `compat_basic`, weekly/daily → 상품 미지정).
- [ ] **Step 6:** 커밋: `fix(entitlement): compatId 폴스루 차단 및 세트·총운 매핑 수정`

### Task 1.4: 카탈로그 확장 + 스키마 추가

**Files:**
- Modify `lib/catalog.ts`
- Modify `prisma/schema.prisma` (추가만)
- Modify `types/lunar-javascript.d.ts` (Phase 3에서 쓰는 메서드 선언 추가)
- Test `tests/catalog.test.ts`

- [ ] **Step 1: 카탈로그 타입 확장**

```ts
export type ProductCategory = "cat-fortune" | "cat-compat" | "cat-wealth" | "cat-reunion" | "cat-career" | "cat-premium";
export type ProductTier = "standard" | "premium";
export type InputKind = "person" | "couple" | "child_naming" | "date_selection";

export interface CatalogItem {
  // ...기존 필드 유지...
  tier: ProductTier;
  inputKind: InputKind;
  accessDays: number;       // Unlock 유효기간(일). 표준 90, 프리미엄 365
  requiresLogin?: boolean;  // 결제에 로그인 필수 (annual_*, 총운 포함 세트, 프리미엄)
  passCovered?: boolean;    // 레거시 기간권 보유자 열람 허용 (compat_basic, annual_*)
}
```

- [ ] **Step 2: 기존 항목 값 채우기**
  - 전 항목: `tier: "standard"`, `accessDays: 90`. target이 couple이면 `inputKind: "couple"`, 아니면 `"person"`.
  - `requiresLogin: true`: annual_2026, annual_2027, set_me, set_career, set_2027
  - `passCovered: true`: compat_basic, annual_2026, annual_2027
  - D6: 모든 항목의 `originalPrice`를 `price`와 같게 맞춘다. 화면 취소선은 `originalPrice > price`일 때만 나오므로 자동으로 사라진다.
  - `compat_basic.description`: "오행으로 풀어내는…" → "두 사람의 타고난 기운으로 보는 우리 궁합 점수" (전문용어 제거)
- [ ] **Step 3: 프리미엄 3종 추가** (전부 `isHidden: true`로 시작하고, Phase 4 통과 후 공개)

```ts
{
  id: "premium_2027_daeun", type: "FORTUNE", tier: "premium", inputKind: "person",
  name: "2027 대운 프리미엄 리포트",
  description: "앞으로 10년의 큰 흐름 속 2027년의 자리와 12개월 상세 달력",
  category: "cat-premium", target: "individual", price: 19900, originalPrice: 19900,
  icon: "Crown", promptKey: "premium_2027_daeun", accessDays: 365, requiresLogin: true, isHidden: true,
},
{
  id: "premium_naming", type: "FORTUNE", tier: "premium", inputKind: "child_naming",
  name: "우리 아이 이름 짓기",
  description: "아이의 사주에 맞춘 좋은 이름 5개와 한 글자씩 담긴 이야기",
  category: "cat-premium", target: "individual", price: 39000, originalPrice: 39000,
  icon: "Baby", promptKey: "premium_naming", accessDays: 365, requiresLogin: true, isHidden: true,
},
{
  id: "premium_date_pick", type: "FORTUNE", tier: "premium", inputKind: "date_selection",
  name: "길일 택일",
  description: "결혼·이사·개업·계약, 원하는 기간 안에서 가장 좋은 날 5곳",
  category: "cat-premium", target: "individual", price: 19900, originalPrice: 19900,
  icon: "CalendarHeart", promptKey: "premium_date_pick", accessDays: 365, requiresLogin: true, isHidden: true,
},
```

- [ ] **Step 4: 헬퍼 추가**

```ts
export const FIRST_PURCHASE_PRICE = 4900; // 사장님 결정 D3: 회원 첫 결제 1회

export function isViewable(p: CatalogItem | undefined): p is CatalogItem {
  return !!p && !p.isHidden;
}
export function isSellable(p: CatalogItem | undefined): p is CatalogItem {
  return isViewable(p) && !p.isFree && p.price > 0;
}
export function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}
/** 화면 가격 표기의 유일한 출처(감사 B2). 서버 order route 의 계산 규칙과 반드시 같아야 한다. */
export function priceLabel(p: CatalogItem): string {
  if (p.isFree) return "무료";
  if (p.tier === "standard" && p.type !== "SET") {
    return `${formatWon(p.price)} · 회원 첫 결제 ${formatWon(FIRST_PURCHASE_PRICE)}`;
  }
  return formatWon(p.price);
}
export function getPremiumProducts(): CatalogItem[] {
  return CATALOG.filter((p) => p.tier === "premium" && !p.isHidden);
}
```

기존 `getProductsByTarget`, `getSetsByTarget`, `getAllProducts`는 **standard만** 반환하도록 `p.tier === "standard"` 조건을 추가한다. 프리미엄은 별도 섹션에 노출한다.

- [ ] **Step 5: 카탈로그 불변식 테스트** (`tests/catalog.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { CATALOG, getProduct, priceLabel, isSellable } from "@/lib/catalog";

describe("catalog 불변식", () => {
  it("id 유일", () => {
    expect(new Set(CATALOG.map((c) => c.id)).size).toBe(CATALOG.length);
  });
  it("세트 구성품은 모두 존재", () => {
    for (const s of CATALOG.filter((c) => c.type === "SET")) {
      for (const id of s.items ?? []) expect(getProduct(id), `${s.id}→${id}`).toBeDefined();
    }
  });
  it("couple 상품은 couple 입력, 프리미엄은 365일·로그인", () => {
    for (const c of CATALOG) {
      if (c.target === "couple") expect(c.inputKind).toBe("couple");
      if (c.tier === "premium") {
        expect(c.accessDays).toBe(365);
        expect(c.requiresLogin).toBe(true);
      }
    }
  });
  it("취소선 가격 없음(D6)", () => {
    for (const c of CATALOG) expect(c.originalPrice).toBe(c.price);
  });
  it("가격 라벨", () => {
    expect(priceLabel(getProduct("wealth")!)).toBe("6,900원 · 회원 첫 결제 4,900원");
    expect(priceLabel(getProduct("set_love")!)).toBe("12,900원");
    expect(priceLabel(getProduct("free_personality")!)).toBe("무료");
  });
  it("무료 상품은 판매 불가", () => {
    expect(isSellable(getProduct("free_personality"))).toBe(false);
  });
});
```

- [ ] **Step 6: 스키마 추가** (`prisma/schema.prisma`, 기존 `ReportCache`는 그대로 두고 "deprecated, 미사용" 주석만 단다)

```prisma
// 18. 생성 리포트 저장소 — "주문 1건 = 리포트 1건" 고정(감사 H2), 티저/무료 캐시 겸용
model GeneratedReport {
  id            String    @id @default(cuid())
  cacheKey      String    @unique // FULL:<Order.id>:<catalogId> | TEASER:<catalogId>:<subjectHash>:<compatId|-> | FREE:<catalogId>:<subjectHash>
  kind          String    // "TEASER" | "FULL" | "FREE"
  catalogId     String
  orderId       String?   // Order.id (FULL 전용)
  userId        String?
  compatId      String?
  subjectHash   String    // HMAC(SUBJECT_HASH_SECRET, 정규화 입력) — 생년월일 원문 저장 금지
  status        String    @default("GENERATING") // GENERATING | READY | FAILED
  attempts      Int       @default(0)
  content       Json?
  model         String?
  firstViewedAt DateTime? // 최초 열람 시각 — 청약철회 판단용
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId])
  @@index([orderId])
}
```

- [ ] **Step 7:** `npx prisma generate`(DB 접근 없음), `npx tsc --noEmit`, `npm test`를 통과시킨다. 개발 DB가 있으면 `node scripts/prisma-dev.mjs db push`까지 실행한다. **운영 DB 대상으로는 절대 실행하지 않는다.**
- [ ] **Step 8:** 커밋: `feat(catalog): 티어·입력유형·보관기간 도입 및 프리미엄 3종 등록`

### Task 1.5: 주문 라우트 재작성 (B2·M4·M8·M9·L)

**Files:** Modify `app/api/payments/order/route.ts`

**요구사항:**
- 입력은 `{ productId, compatId?, email? }`. 레거시 호환: `product === "ANNUAL_2026"`이면 annual_2026으로, `productId`가 없고 `compatId`만 있으면 compat_basic으로 해석한다.
- `type === "PERIOD_PASS"`는 **410**을 반환한다(D4). 이 분기의 기존 코드는 지우지 말고 주석 처리해 동면시킨다.
- `isSellable(product)`가 아니면 400을 반환한다. 숨김·무료·가격 0원이 여기에 해당하며, 무료 상품 4,900원 과금 버그도 이걸로 막힌다.
- `requiresLogin`인데 세션이 없으면 `401 { code: "LOGIN_REQUIRED" }`를 반환한다.
- couple 상품이면 compatId가 필수이고, **실제로 존재하는지** `prisma.compatibility.findUnique`로 확인한다. 없으면 404.
- 게스트 이메일은 trim과 소문자 변환 후 형식을 검증한다.
- 금액은 `product.price`로 정한다. **회원이고 standard이고 SET이 아니며, 과거 PAID 주문이 0건**(`provider != admin_manual`, `amount > 0`, 상품 무관)일 때만 `Math.min(price, FIRST_PURCHASE_PRICE)`를 적용한다.
- 저장키는 `toStorageKey(product.id)`로 만든다.
- 응답: `{ orderId, amount, type, orderName: product.name }`.

- [ ] **Step 1:** 위 요구대로 구현한다. 할인 조건 조회 코드는 아래를 그대로 쓴다.

```ts
let amount = product.price;
if (sessionUserId && product.tier === "standard" && product.type !== "SET") {
  const anyPaid = await prisma.order.findFirst({
    where: { userId: sessionUserId, status: "PAID", provider: { not: "admin_manual" }, amount: { gt: 0 } },
    select: { id: true },
  });
  if (!anyPaid) amount = Math.min(amount, FIRST_PURCHASE_PRICE);
}
```

- [ ] **Step 2:** `tsc`, eslint(이 파일) 통과 후 커밋: `fix(order): 카탈로그 기반 판매 가드·회원 첫결제 할인·기간권 판매 중단`

### Task 1.6: 입력 검증 모듈 (M3)

**Files:**
- Create `lib/validation/inputs.ts`
- Modify `app/api/fortune/annual/route.ts` (로컬 `isValidDateString`/`isValidTimeString`을 이 모듈 import로 교체, 동작 동일)
- Test `tests/inputs.test.ts`

**Interfaces (Produces):**

```ts
export type Gender = "M" | "F";
export interface PersonInput { name: string; dob: string; time: string | null; gender: Gender }
export const NAMING_TAGS = ["지혜", "밝음", "따뜻함", "강인함", "자연", "귀함"] as const;
export type NamingTag = (typeof NAMING_TAGS)[number];
export interface ChildNamingInput {
  surnameHangul: string;   // data/naming/surnames.json 에 있는 성
  surnameHanja: string;    // 해당 성의 한자 옵션 중 하나
  gender: Gender;
  dob: string;             // 과거 날짜(D7)
  time: string | null;
  dollim: { syllable: string; position: 1 | 2; hanja: string | null } | null;
  tags: NamingTag[];       // 최대 3
  avoidSyllables: string[]; // 최대 5, 각 1음절 한글
}
export const PURPOSES = ["WEDDING", "MOVING", "OPENING", "CONTRACT"] as const;
export type SelectablePurpose = (typeof PURPOSES)[number];
export interface DateSelectionInput {
  purpose: SelectablePurpose;
  start: string; end: string;   // YYYY-MM-DD
  people: PersonInput[];        // WEDDING 은 정확히 2명, 나머지 1~2명
  weekdays: number[];           // 0=일..6=토, 빈 배열 = 제한 없음
  excludeDates: string[];       // 최대 20, 범위 안
}
export function isValidDateString(v: unknown, now?: Date): v is string;
export function isValidTimeString(v: unknown): v is string | null | undefined;
export function parsePersonInput(raw: unknown): PersonInput | null;
export function parseChildNamingInput(raw: unknown, surnames: SurnameTable): ChildNamingInput | null;
export function parseDateSelectionInput(raw: unknown, today: string): DateSelectionInput | null;
export function todayKST(now?: Date): string; // YYYY-MM-DD (UTC+9)
```

**규칙:**
- dob: `^\d{4}-\d{2}-\d{2}$` 형식, 1900년 이후, 실제 존재하는 날짜, 미래 불가(annual 라우트의 기존 로직을 그대로 이전).
- time: `HH:mm`, 빈 값이면 null.
- name: trim하고 20자로 자른다. 비어 있으면 `"나"`. 제어문자는 제거한다.
- 택일 범위: `start ≥ 내일(KST)`, `end ≤ 오늘 + 730일`, `start ≤ end`, 기간 7~180일.
- 모든 parse 함수는 실패하면 `null`을 반환하고 throw하지 않는다.

`parsePersonInput` 구현:

```ts
export function parsePersonInput(raw: unknown): PersonInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const dob = r.dob;
  const time = r.time === "" || r.time === undefined ? null : r.time;
  if (!isValidDateString(dob) || !isValidTimeString(time)) return null;
  if (r.gender !== "M" && r.gender !== "F") return null;
  const name = typeof r.name === "string" ? r.name.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 20) : "";
  return { name: name || "나", dob, time: (time as string | null) ?? null, gender: r.gender };
}
```

- [ ] **Step 1:** 경계값 테스트부터 작성한다. 2월 30일 거부, 미래 거부, "24:00" 거부, 택일 6일/181일 거부, WEDDING 1명 거부, 범위 밖 excludeDates 거부, 모든 parse 함수가 잘못된 타입에 null 반환.
- [ ] **Step 2:** 구현 → PASS → 커밋: `feat(validation): 공용 입력 검증 모듈`

### Task 1.7: 생성 잠금 (멱등 생성 상태머신)

**Files:** Create `lib/reports/generationLock.ts`

```ts
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const STALE_MS = 3 * 60 * 1000;
const MAX_ATTEMPTS = 3;

export type ReportKind = "TEASER" | "FULL" | "FREE";
export interface ReportKey {
  cacheKey: string;
  kind: ReportKind;
  catalogId: string;
  orderId: string | null;
  userId: string | null;
  compatId: string | null;
  subjectHash: string;
}
export type ClaimResult =
  | { state: "READY"; reportId: string; content: Prisma.JsonValue }
  | { state: "OWNED"; reportId: string }
  | { state: "BUSY"; reportId: string }
  | { state: "GAVE_UP"; reportId: string };

/** 같은 cacheKey 의 생성은 동시에 정확히 한 요청만 수행한다. 나머지는 READY/BUSY 를 받는다. */
export async function claimGeneration(key: ReportKey): Promise<ClaimResult> {
  try {
    const created = await prisma.generatedReport.create({ data: { ...key, status: "GENERATING", attempts: 1 } });
    return { state: "OWNED", reportId: created.id };
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }
  const row = await prisma.generatedReport.findUnique({ where: { cacheKey: key.cacheKey } });
  if (!row) throw new Error("claimGeneration: row vanished");
  if (row.status === "READY" && row.content !== null) return { state: "READY", reportId: row.id, content: row.content };
  const stale = row.updatedAt.getTime() < Date.now() - STALE_MS;
  if (row.status === "GENERATING" && !stale) return { state: "BUSY", reportId: row.id };
  if (row.attempts >= MAX_ATTEMPTS) return { state: "GAVE_UP", reportId: row.id };
  // FAILED 이거나 멈춘 GENERATING → updatedAt 낙관적 잠금으로 정확히 한 요청만 재시도
  const res = await prisma.generatedReport.updateMany({
    where: { id: row.id, updatedAt: row.updatedAt },
    data: { status: "GENERATING", attempts: { increment: 1 } },
  });
  return res.count === 1 ? { state: "OWNED", reportId: row.id } : { state: "BUSY", reportId: row.id };
}

export async function completeGeneration(reportId: string, content: Prisma.InputJsonValue, model: string): Promise<void> {
  await prisma.generatedReport.update({ where: { id: reportId }, data: { status: "READY", content, model } });
}

export async function failGeneration(reportId: string): Promise<void> {
  await prisma.generatedReport.update({ where: { id: reportId }, data: { status: "FAILED" } });
}
```

- [ ] **Step 1:** 구현하고 `tsc`를 통과시킨다. 개발 DB가 있으면 동시 요청 2건을 보내 한 건만 OWNED가 되는지 확인하는 스크립트(`scripts/dev/lock-race.ts`)로 검증한다.
- [ ] **Step 2:** 커밋: `feat(reports): 멱등 생성 잠금`

### Task 1.8: Gemini JSON 생성 헬퍼 (H5 + 한자 자동 검증)

**Files:**
- Create `lib/gen/generateJson.ts`, `lib/gen/hanjaGuard.ts`
- Modify `lib/destinyGen.ts` (`STRICT_NO_HANJA_RULE`을 `export`로 변경, 그 외 기존 코드 무변경)
- Test `tests/hanjaGuard.test.ts`

```ts
// lib/gen/hanjaGuard.ts
const HANJA = /[㐀-䶿一-鿿豈-﫿]/;

export function containsHanja(s: string): boolean {
  return HANJA.test(s);
}

/** AI 출력 객체의 모든 문자열 필드를 재귀 검사. 한자가 하나라도 있으면 true. */
export function containsHanjaDeep(v: unknown): boolean {
  if (typeof v === "string") return containsHanja(v);
  if (Array.isArray(v)) return v.some(containsHanjaDeep);
  if (v && typeof v === "object") return Object.values(v).some(containsHanjaDeep);
  return false;
}
```

```ts
// lib/gen/generateJson.ts
import type { GenerationConfig } from "@google/generative-ai";
import { genAI, repairJSON } from "@/lib/destinyGen";
import { containsHanjaDeep } from "@/lib/gen/hanjaGuard";

type GenConfig = GenerationConfig & { thinkingConfig?: { thinkingBudget: number } };

export interface GenerateJsonOptions<T> {
  label: string;
  prompt: string;
  models: string[];            // 순서대로 시도
  maxOutputTokens: number;
  thinkingBudget: number;      // flash: 0, pro: 1024 이상
  validate: (v: unknown) => v is T;
  temperature?: number;
}

/** 모델별 최대 2회 시도. JSON 파싱 실패·스키마 불일치·한자 포함이면 재시도. finishReason 을 항상 로그로 남긴다. */
export async function generateJson<T>(o: GenerateJsonOptions<T>): Promise<{ data: T; model: string }> {
  for (const modelName of o.models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const t0 = Date.now();
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const config: GenConfig = {
          temperature: o.temperature ?? 0.7,
          topP: 0.9,
          maxOutputTokens: o.maxOutputTokens,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: o.thinkingBudget },
        };
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: o.prompt }] }],
          generationConfig: config,
        });
        const text = result.response.text();
        const fr = result.response.candidates?.[0]?.finishReason;
        const parsed: unknown = repairJSON(text);
        if (parsed && o.validate(parsed) && !containsHanjaDeep(parsed)) {
          console.log(`[gen:${o.label}] ok model=${modelName} attempt=${attempt} ms=${Date.now() - t0} fr=${fr}`);
          return { data: parsed, model: modelName };
        }
        console.error(`[gen:${o.label}] invalid model=${modelName} attempt=${attempt} fr=${fr} len=${text.length} hanja=${parsed ? containsHanjaDeep(parsed) : "n/a"}`);
      } catch (e) {
        console.warn(`[gen:${o.label}] error model=${modelName} attempt=${attempt}`, e);
      }
    }
  }
  throw new Error(`[gen:${o.label}] all attempts failed`);
}
```

- [ ] **Step 1:** hanjaGuard 테스트: `containsHanjaDeep({a:["좋아요"]})` → false, `{a:{b:"甲木"}}` → true.
- [ ] **Step 2:** 구현 → PASS → 커밋: `feat(gen): 재시도·진단로그·한자검증 포함 JSON 생성 헬퍼`

### Task 1.9: 통합 리포트 API (B1·H2·H6·M8)

**Files:**
- Delete `app/api/fortune/generate/route.ts` (미커밋·미배포 D2 산출물을 대체한다. **운영에 없던 파일**이라 삭제해도 파괴가 아니다.)
- Create `app/api/reports/generate/route.ts`, `app/api/reports/view/route.ts`, `app/api/reports/mine/route.ts`
- Create `lib/reports/standard.ts` (Task 1.10에서 채움), `lib/reports/teaser.ts`
- Test `tests/teaser.test.ts`

**`POST /api/reports/generate`**

요청:
```ts
{
  catalogId: string;
  kind: "TEASER" | "FULL";
  input?: unknown;      // inputKind 별 parse
  compatId?: string;
  orderId?: string;     // FULL 필수(게스트 베어러; 회원도 전송)
  locale?: string;
}
```

처리 순서:
1. `product = getProduct(catalogId)`. `isViewable`이 아니면 404를 반환한다. **이 라우트는 annual_*를 받지 않는다** → 400 `"총운은 /api/fortune/annual 을 사용하세요"` (H3). SET도 400이다(세트는 구성품 catalogId로 호출).
2. input을 parse한다. `person`은 `parsePersonInput`, `couple`은 compatId로 compatibility 행을 조회한다(없으면 404). 프리미엄 inputKind는 Phase 3 파서를 쓴다. 실패하면 400.
3. `subjectHash`를 계산한다. person은 `["person", name, dob, time ?? "-", gender]`, couple은 `["couple", compatId]`, 프리미엄은 Task 3.x에 정의된 대로.
4. **분기**:
   - `product.isFree`: kind는 무시하고 `FREE:<catalogId>:<subjectHash>` 키로 전체 생성한다. `checkRateLimit(ip)` + `checkGlobalAiCap()` 적용.
   - `kind === "TEASER"`: `checkRateLimit(ip)` + `checkGlobalAiCap()` 적용. 키는 `TEASER:<catalogId>:<subjectHash>:<compatId ?? "-">`. 프리미엄은 **AI 없이 엔진 티저**(Task 3.5)를 쓰고 캐시하지 않는다.
   - `kind === "FULL"`:
     - `orderId` 문자열이 필수다. `prisma.order.findUnique({ where: { orderId }, include: { unlocks: true } })`로 조회한다.
     - `orderGrants(order, { catalogId, compatId, now, sessionUserId, presentedOrderId: orderId })`를 호출한다. FORBIDDEN/NO_GRANT는 403, NOT_PAID는 402를 반환한다.
     - 키는 **`FULL:<order.id>:<catalogId>`**다. 입력과 무관하게 주문당 상품당 1건이다(H2). 두 번째 요청부터는 저장된 리포트를 반환한다.
5. `claimGeneration` 결과에 따라:
   - READY: 저장본을 반환한다.
   - BUSY: `202 { status: "GENERATING", reportId }`를 반환한다.
   - GAVE_UP: `409 { error: "리포트 생성에 반복 실패했어요. 고객센터로 문의해 주세요." }`를 반환한다.
   - OWNED: 생성하고 `completeGeneration`을 호출한다. 예외가 나면 `failGeneration` 후 500을 반환한다.
6. 응답 봉투:
   - TEASER: `{ kind, reportId, score, data: StandardTeaser }`
   - FULL/FREE: `{ kind, reportId, score, data }`
   - 공통 헤더: `Cache-Control: no-store`
7. FULL 응답 시 `firstViewedAt`이 null이면 현재 시각으로 기록한다.

**티저 화이트리스트** (`lib/reports/teaser.ts`). 불변식 5를 보장하는 코드다.

```ts
import type { StandardTeaser } from "@/lib/reports/standard";

/** AI 원본에서 티저 허용 필드만 복사한다. 유료 키는 존재 자체가 불가능하다. */
export function pickTeaser(raw: unknown): StandardTeaser | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const fs = r.freeSection as Record<string, unknown> | undefined;
  if (typeof r.headline !== "string" || typeof r.summary !== "string" || !fs || !Array.isArray(r.hooks)) return null;
  if (typeof fs.key !== "string" || typeof fs.title !== "string" || typeof fs.body !== "string") return null;
  return {
    headline: r.headline,
    summary: r.summary,
    freeSection: { key: fs.key, title: fs.title, body: fs.body },
    hooks: r.hooks.filter((h): h is string => typeof h === "string").slice(0, 4),
  };
}
```

`tests/teaser.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pickTeaser } from "@/lib/reports/teaser";

describe("pickTeaser — 유료 본문 0바이트", () => {
  it("sections/advice/closing 은 결과에 존재하지 않는다", () => {
    const t = pickTeaser({
      headline: "h", summary: "s",
      freeSection: { key: "k", title: "t", body: "b" },
      hooks: ["a", "b"],
      sections: [{ key: "x", title: "y", body: "유료" }],
      advice: { do: ["유료"], dont: [] },
      closing: "유료",
    });
    expect(t).not.toBeNull();
    expect(Object.keys(t!).sort()).toEqual(["freeSection", "headline", "hooks", "summary"]);
    expect(JSON.stringify(t)).not.toContain("유료");
  });
});
```

**`POST /api/reports/view`** `{ reportId, orderId? }`
- report를 조회한다. kind가 FULL이 아니면 404다.
- report.orderId로 Order와 unlocks를 조회해 `orderGrants`를 호출한다(presentedOrderId = body.orderId). 권한 없음은 403, 만료는 403 `"열람 기간이 끝났어요"`를 반환한다.
- `firstViewedAt`을 기록하고 `{ reportId, catalogId, score, data }`를 반환한다.

**`GET /api/reports/mine`** (회원 전용)
- 본인 PAID 주문 목록을 반환한다: `{ orderId, catalogId, compatId, expiresAt, reports: [{ reportId, catalogId, status, createdAt }] }`.
- 세트는 구성품별 행으로 풀어서 보여 준다.

- [ ] **Step 1:** 티저 테스트 작성 → FAIL → 구현 → PASS
- [ ] **Step 2:** 세 라우트 구현. `tsc`와 eslint를 통과시킨다.
- [ ] **Step 3:** 커밋: `feat(reports): 주문 단위 리포트 생성·열람 API (B1·H2 근본 수정)`

### Task 1.10: 상품별 프롬프트 사양 + 표준 생성 (H4·M6)

**Files:**
- Create `lib/prompts/productSpecs.ts`
- Fill `lib/reports/standard.ts`
- Test `tests/productSpecs.test.ts`

**스키마:**

```ts
export interface ProductPromptSpec {
  promptKey: string;
  title: string;
  angle: string;                                          // 이 상품만의 관점 1~2문장
  sections: Array<{ key: string; title: string; guide: string }>; // 정확히 4개
  guardrails: string[];                                   // 금지·주의
}
export interface StandardReport {
  headline: string;
  summary: string;
  sections: Array<{ key: string; title: string; body: string }>; // spec 순서 그대로 4개
  advice: { do: string[]; dont: string[] };                      // 각 3개
  closing: string;
}
export interface StandardTeaser {
  headline: string;
  summary: string;
  freeSection: { key: string; title: string; body: string };     // spec.sections[0]
  hooks: string[];                                               // 나머지 3개 섹션별 1문장, 결론 직전에서 "—"로 끊기
}
```

**13개 사양 (그대로 옮겨 적는다):**

| promptKey | angle | sections (title — guide) | guardrails |
|---|---|---|---|
| personality_basic | 타고난 기질을 장점 중심으로, 자기이해용 | 첫인상과 진짜 나 — 남이 보는 나 vs 실제 나 / 나를 움직이는 힘 — 동기·에너지원 / 관계에서의 나 — 친구·연인·동료 앞에서 / 나를 지치게 하는 것과 회복법 — 구체 루틴 | 무료 상품. 결제 유도 문구는 closing 한 줄로만 |
| wealth_analysis | 돈을 "버는 방식·지키는 방식"의 결 | 타고난 재물 그릇 / 돈이 들어오는 길 — 월급·부업·투자 성향 / 새는 돈 막기 — 반복 지출 패턴 / 앞으로 1년 돈 흐름 — 분기별 | 특정 종목·투자상품 추천 금지. 수익 보장 표현 금지 |
| career_analysis | 맞는 일의 "방식과 환경" | 나에게 맞는 일의 방식 / 잘 맞는 직무·환경 3가지 / 이동·이직 타이밍 — 앞으로 1년 / 면접·협상에서 내 무기 | 특정 회사 언급 금지 |
| love_single_analysis | 솔로의 연애 패턴과 인연의 결 | 나의 연애 스타일 / 끌리는 사람 vs 잘 맞는 사람 / 인연이 들어오는 시기와 장소 / 반복되는 패턴 끊기 | "곧 만난다" 단정 금지 |
| charm_analysis | 남들이 느끼는 매력의 정체 | 사람들이 느끼는 나의 매력 / 숨은 매력 포인트 / 매력이 가장 빛나는 상황 / 매력을 깎는 습관 | 외모 평가 금지 |
| health_analysis | 체력의 결과 생활 리듬 | 타고난 체력의 결 / 신경 써야 할 몸의 신호 / 나에게 맞는 회복 루틴 / 계절별 컨디션 관리 | 질병 진단·치료·약 권유 금지. 마지막에 "불편한 증상이 있으면 전문의 상담" 문장 필수 |
| spicy_annual | 앞으로 12개월, 돌려 말하지 않는 현실 조언 | 돌려 말하지 않는 총평 / 스스로 발목 잡는 지점 / 지금 당장 버려야 할 것 / 그래도 믿어도 되는 무기 | 직설은 허용, 모욕·비하·외모 지적 금지 |
| inner_mind | 상대의 마음을 "가능성"으로 읽기 | 그 사람이 나를 보는 시선 / 말하지 않는 속마음 / 그 사람이 불안해하는 것 / 마음을 여는 대화법 | 상대 마음 단정 금지("~일 가능성이 커요") |
| reunion | 멀어진 이유와 현실적 가능성 | 우리가 멀어진 진짜 이유 / 다시 이어질 여지 / 연락 타이밍과 방법 / 재회보다 중요한 것 | 집착·반복연락·스토킹 조장 금지. 상대 의사 존중 문장 필수 |
| cheating_tendency | 흔들리기 쉬운 "상황"과 관계를 단단히 하는 법 | 그 사람의 연애 성향 / 마음이 흔들리기 쉬운 상황 / 관계를 단단하게 하는 방법 / 내가 지켜야 할 기준 | 외도 단정·의심 조장·감시 권유 금지 |
| marriage_compat | 연애 궁합이 아닌 "생활" 궁합 | 결혼 생활의 기본 궁합 / 돈·집안일·가족 관계 / 위기가 오기 쉬운 지점 / 함께 오래 가는 약속 | 결혼 여부 단정 금지 |
| conflict_resolution | 싸움의 구조와 멈추는 법 | 우리가 자주 부딪히는 진짜 이유 / 각자의 싸움 방식 / 싸움을 멈추는 한마디 / 화해 후 다시 가까워지는 법 | 폭력·위협 상황이면 전문기관 도움 안내 문장 |
| secret_love | 정서적·신체적 친밀감의 온도 | 두 사람의 친밀감 온도 / 스킨십과 표현 방식 / 서로 채워주는 부분 / 설렘을 오래 지키는 법 | 노골적 성 묘사 금지. 은유·정서 중심 |

**점수 선계산 (M6):**
- person 상품은 `calculateGenericScore`, couple 상품은 `calculateGenericCompatScore`(D2에서 destinyGen에 추가된 함수, 유지)로 **먼저** 점수를 계산한다.
- 계산한 점수를 프롬프트에 사실로 주입한다. AI 응답에 score 필드는 없다.
- 점수 구간 문구 `scoreBand(score)`:
  - 85 이상: "아주 좋은 흐름"
  - 75~84: "좋은 흐름, 한두 가지만 조심"
  - 65~74: "무난하지만 신경 쓸 부분이 분명"
  - 65 미만: "조심할 부분이 큰 시기, 그래도 방법은 있음"

**프롬프트 템플릿** (`buildStandardPrompt(spec, contextBlock, score, mode: "TEASER" | "FULL", toneGuide)`):

```
${STYLE_GUIDE}

${STRICT_NO_HANJA_RULE}

TONE: ${toneGuide}

${contextBlock}

PRODUCT: ${spec.title}
ANGLE: ${spec.angle}
DETERMINISTIC SCORE (사실로 사용하고, 숫자를 본문에 쓰지 마세요): ${score}/100 → ${scoreBand(score)}
SECTIONS (이 순서와 이 제목 그대로):
${spec.sections.map((s, i) => `${i + 1}. [${s.key}] ${s.title} — ${s.guide}`).join("\n")}
GUARDRAILS:
${spec.guardrails.map((g) => `- ${g}`).join("\n")}
LENGTH: 섹션 body 는 각 350~550자, 2문단. 섹션마다 구체적인 장면이나 행동을 최소 1개 포함. "~할 수 있어요"류의 흐릿한 문장 반복 금지. 상투적 멘토 말투 금지.
${mode === "TEASER"
  ? "OUTPUT(JSON): { headline, summary(2문장, 결론 금지), freeSection: { key, title, body } — 1번 섹션 전체, hooks: string[3] — 2~4번 섹션 각 1문장, 핵심 직전에서 '—'로 끊기 }"
  : "OUTPUT(JSON): { headline, summary(2~3문장), sections: [{ key, title, body }] ×4, advice: { do: string[3], dont: string[3] }, closing(2문장, 두근이 말투) }"}
Output ONLY the JSON object.
```

**생성 파라미터:**
- 모델: `PREMIUM_MODELS`(flash)
- TEASER: `maxOutputTokens: 3072`, FULL/FREE: `6144`
- `thinkingBudget: 0`
- validate 함수는 섹션 4개와 key 순서 일치까지 검사한다.

- [ ] **Step 1:** `tests/productSpecs.test.ts`: 카탈로그의 표준 person/couple 상품(annual_*, compat_basic, SET 제외) 모두에 사양이 있는지, 사양마다 섹션이 정확히 4개인지, key가 유일한지 검사한다.
- [ ] **Step 2:** 구현 → PASS → 커밋: `feat(prompts): 상품별 프롬프트 사양과 점수 선계산`

### Task 1.11: 총운 라우트 연도 파라미터화 (H3)

**Files:** Modify `app/api/fortune/annual/route.ts`

- `body.productId`가 `annual_2026` 또는 `annual_2027`이면 해당 연도, 없으면 2026(기존 클라이언트 호환). 두 값 외의 productId는 400이다. 해당 상품이 `isViewable`이 아니면 404다.
- `year = 2026` 하드코딩과 두 군데의 `"2026년 병오년 - 붉은 말의 해"`를 `YEAR_CONTEXT`로 교체한다.

```ts
const YEAR_CONTEXT: Record<number, string> = {
  2026: "2026년 병오년 - 붉은 말의 해",
  2027: "2027년 정미년 - 붉은 양의 해",
};
```

- 티저 기본 문구의 "2026년은…"을 `${year}년은…`으로 바꾼다.
- `isEntitled`의 productKey를 `` `ANNUAL:${year}` ``로 바꾼다.
- 점수는 기존 `calculateAnnualYearScore({ ..., year })`를 그대로 쓴다. 총운의 미리보기와 결제 후 점수는 이 함수 하나로만 계산된다.
- 회원 캐시 `annualFortune(userId_year)`는 이미 연도별이라 변경하지 않는다.

- [ ] **Step 1:** 구현하고 `tsc`를 통과시킨다. 개발 DB가 있으면 2027 티저 응답에 "2027"이 들어 있는지 수동으로 확인한다.
- [ ] **Step 2:** 커밋: `fix(annual): 연도 파라미터화(2027 버그 수정)`

### Task 1.12: 결제 완료·부여·레이트리밋 정리 (M5)

**Files:**
- Modify `lib/payments/grant.ts`
- Modify `app/api/payments/complete/route.ts`
- Modify `app/api/reports/generate/route.ts`

- **grant**: Unlock `expiresAt`을 `Date.now() + (getProduct(toCatalogId(pType, pKey, cId) ?? "")?.accessDays ?? 90)일`로 계산한다. `let cId`는 `const`로 바꾼다(lint).
- **complete**: 응답에 `catalogId: toCatalogId(order.productType, order.productKey, order.compatId)`를 추가한다. 기존 필드와 주석은 보존한다.
- **generate의 TEASER/FREE**: `checkRateLimit`(분당 3, 일 10) + `checkGlobalAiCap()`. 상한을 넘으면 `429 { error: "오늘 준비된 무료 분석이 모두 소진됐어요. 내일 다시 찾아 주세요." }`를 반환한다.
- **generate의 FULL**: IP 제한은 두지 않는다. 결제한 사용자를 막지 않기 위해서이고, 주문당 1건 + attempts 3회로 이미 제한된다.

- [ ] 커밋: `fix(payments): 상품별 보관기간·catalogId 응답·무료 생성 상한`

### 🛑 체크포인트 1 — 여기서 멈추고 보고

`REVIEW_HANDOFF.md`를 새로 작성한다. 커밋 C 내용은 덮어써도 된다. 포함할 내용:
1. 커밋 목록: `git log --oneline main..HEAD`
2. 변경 파일과 목적
3. `npm test` 전체 출력(테스트 개수, PASS 수)
4. `npx tsc --noEmit` 결과
5. `npx eslint <변경 파일들>` 결과(에러 0)
6. `npx next build` 결과 — **`| tail` 금지**, exit code 명시
7. `isEntitled` 호출부 해석표(Task 1.3 Step 5)
8. 불변식 8개 자가 체크표(각 항목의 근거 파일:라인)
9. 개발 DB 실행 여부
10. 스스로 의심 지점

---

# Phase 2 — 프런트 배선 (D3): 표준 카탈로그 오픈

### Task 2.1: 결제 클라이언트 일반화 (B2·M7)

**Files:**
- Modify `lib/payments/client.ts`
- Create `lib/reportHandoff.ts`

**`PayOptions` 교체:**

```ts
export interface PayOptions {
  productId: string;
  compatId?: string;
  buyer: BuyerInfo;
  locale?: string;
}
export type PayResult =
  | { ok: true; orderId: string; catalogId: string; compatId: string | null }
  | { ok: false; reason: "LOGIN_REQUIRED" | "CANCELLED" | "FAILED" };
```

- `requestPortOnePayment(opts): Promise<PayResult>`
  - order 요청 body는 `{ productId, compatId, email }`이다.
  - `orderName`은 서버 응답의 `orderName`을 쓴다.
  - 401 LOGIN_REQUIRED면 `{ ok: false, reason: "LOGIN_REQUIRED" }`를 반환한다.
  - **`window.location.reload()`를 제거**한다. 이후 이동은 호출한 쪽이 결정한다.
- `verifyAndCompletePayment(paymentId): Promise<PayResult>` — 성공하면 `rememberOrderToken`을 호출한다.
- 주문 토큰 보관: 기존 `rememberUnlockToken`(궁합)은 유지하고 아래 함수를 추가한다.

```ts
const ORDER_TOKEN_PREFIX = "kongdak_order_";
const orderTokenKey = (catalogId: string, compatId?: string | null) =>
  ORDER_TOKEN_PREFIX + catalogId + (compatId ? `_${compatId}` : "");

export function rememberOrderToken(catalogId: string, orderId: string, compatId?: string | null): void;
export function recallOrderToken(catalogId: string, compatId?: string | null): string | null;
export function forgetOrderToken(catalogId: string, compatId?: string | null): void;
```

  - compat_basic 결제면 기존 `rememberUnlockToken(compatId, orderId)`도 함께 호출한다(기존 궁합 화면 호환).
  - 세트는 세트 catalogId로 저장한다. 구성품을 열람할 때는 세트 토큰을 찾는다.
- `lib/reportHandoff.ts`: 결제 전에 입력값을 sessionStorage에 보관한다. 모바일 리다이렉트 결제 대응이고, 서버에는 저장하지 않는다(PII).

```ts
const KEY = (catalogId: string) => `kongdak_pending_input_${catalogId}`;

export function savePendingInput(catalogId: string, input: unknown): void {
  try { sessionStorage.setItem(KEY(catalogId), JSON.stringify(input)); } catch {}
}
export function loadPendingInput(catalogId: string): unknown | null {
  try { const v = sessionStorage.getItem(KEY(catalogId)); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function clearPendingInput(catalogId: string): void {
  try { sessionStorage.removeItem(KEY(catalogId)); } catch {}
}
```

- [ ] 커밋: `feat(pay-client): productId 기반 결제와 주문 토큰 일반화`

### Task 2.2: 하드코딩 가격 전면 제거 (B2) + 기간권 UI 동면 (D4)

- [ ] `grep -rn "1,900\|2,900\|1900\|2900\|9,900\|24,900" app components lib`의 **결과 전체**를 보고서에 싣는다. 고객 노출 문자열은 모두 `priceLabel(getProduct(id)!)` 또는 order 응답 amount로 바꾼다.
- [ ] `GuestCheckoutModal`
  - `priceLabel`과 `orderName` props는 카탈로그에서 받는다.
  - **청약철회 제한 동의 체크박스(필수)**를 추가한다. 기존 162행 안내문을 체크박스 라벨로 쓰고, 체크하지 않으면 결제 버튼을 비활성화한다.
- [ ] `CompatResultClient`
  - 가격 문구를 `priceLabel(compat_basic)`으로 바꾼다.
  - 기간권 구매 UI(9,900원 카드, 30일 패스 버튼, `checkoutType === "PERIOD_PASS"` 분기)는 **렌더에서 제거**한다. 코드는 주석 처리로 동면시킨다.
- [ ] `/pricing` 링크 5곳(Navbar, Footer, AnnualFortuneClient:921, WeeklyFortuneClient:427, PricingClient)을 홈의 상품 목록(`/${locale}#products`)으로 바꾼다. `app/[locale]/pricing/page.tsx`는 홈으로 `redirect` 처리하고 파일은 남겨 둔다.
- [ ] 커밋: `fix(ui): 가격 표기를 카탈로그로 통일하고 기간권 판매 UI 동면`

### Task 2.3: 공용 입력 필드 + 표준 리포트 화면

**Files:**
- Create `components/forms/BirthFields.tsx`: FortuneNewClient의 생년월일·시간·성별 입력을 추출한다. 동작과 디자인은 동일하게 유지한다.
- Create `components/report/StandardReportView.tsx`: `mode: "teaser" | "full"`.
  - teaser: 점수 게이지(`ScoreGauge`), headline, summary, 1번 섹션 전문, 잠긴 섹션 3개. 잠긴 섹션은 제목 + hook 한 문장 + 자물쇠 아이콘만 보여 주고 본문 DOM은 없다.
  - full: 4섹션(`ReportSection`), 해야 할 것/피할 것, closing, "오락·자기이해 목적" 고지.
- Create `app/[locale]/report/new/page.tsx` + `components/report/ReportNewClient.tsx`
  - 쿼리 `c`(catalogId), 선택 `compat`(compatId)를 받는다.
  - `recallOrderToken`으로 orderId를 찾는다. 없으면 "결제 정보가 없어요" 화면과 상품 페이지 링크를 보여 준다.
  - `loadPendingInput`으로 입력을 읽는다. 없으면 BirthFields 재입력 폼을 띄우고, 회원이면 프로필로 미리 채운다.
  - FULL 생성을 요청한다. 202를 받으면 3초 간격으로 최대 40회 재요청한다(`FortuneLoading` 재사용).
  - 완료되면 `clearPendingInput`을 호출하고 `router.replace(\`/${locale}/report/${reportId}\`)`로 이동한다.
- Create `app/[locale]/report/[reportId]/page.tsx` + `ReportViewClient.tsx`
  - `/api/reports/view`를 호출한다. 게스트는 catalogId별 토큰을 찾아 orderId로 제출한다. catalogId를 모르므로 서버가 404/403을 주면 보유한 모든 `kongdak_order_*` 토큰을 차례로 시도한다.
  - URL에는 **orderId를 절대 넣지 않는다(M-10)**. reportId만 쓴다.
- Modify `components/FortuneNewClient.tsx`
  - annual_*은 기존 `/api/fortune/annual` 경로를 유지하되 **productId를 전달**하고, 결제 전 로그인 흐름은 카탈로그 `requiresLogin`으로 판정한다.
  - 그 외 person 상품은 `/api/reports/generate`로 TEASER를 요청해 `StandardReportView` teaser로 보여 준다.
  - 무료 상품(`isFree`)은 FREE를 요청해 전문을 보여 주고, 끝에 추천 유료 상품 카드 2개를 둔다(H6).
  - 결제 CTA 순서: `blockPaymentIfInApp` → (requiresLogin && 비로그인이면 입력 저장 후 로그인) → `savePendingInput` → `requestPortOnePayment` → 성공 시 `/report/new?c=`로 이동.
  - "준비 중인 상품입니다" 분기, `// depending on your API` 주석, 미사용 `payload` 변수를 삭제한다.
  - `"{resultData.headline}"`의 따옴표는 `&ldquo;…&rdquo;`로 바꾼다(lint).
- Modify `components/CompatNewClient.tsx` / 관계 상품 흐름
  - productId가 compat_basic이면 기존 흐름을 유지한다.
  - 그 외 couple 상품은 궁합 생성 후 `/api/reports/generate` TEASER(compatId)를 호출하고, 결제한 뒤 `/report/new?c=<id>&compat=<compatId>`로 이동한다.
- [ ] 커밋 2~3개로 나눈다(폼 추출 / 리포트 화면 / 입력 화면 배선).

### Task 2.4: 세트 흐름

- 세트 상품 상세 → 입력(individual 세트는 BirthFields, couple 세트는 궁합 생성) → 세트 결제 → `/report/new?c=<setId>[&compat=]` 순서다.
- ReportNewClient가 세트면 구성품 목록을 카드로 보여 준다. 각 구성품의 FULL 생성은 **동시 2개까지** 호출하고, orderId는 세트 토큰을 쓴다. 완료되면 카드에서 해당 reportId로 이동한다.
- 총운이 포함된 세트(set_me, set_career)는 총운 카드를 `/[locale]/fortune/annual?year=2026`으로 연결한다. 회원 세션으로 isEntitled가 세트 Unlock을 인정한다(Task 1.3의 H1 수정).
- [ ] 커밋: `feat(set): 세트 결제 후 구성 리포트 묶음 열람`

### Task 2.5: 결제 완료 페이지 분기

**Files:** Modify `app/[locale]/pay/complete/page.tsx`

- 응답의 `catalogId`로 이동할 곳을 정한다.
  - compat_basic: 기존 궁합 결과 페이지
  - annual_*: `/[locale]/fortune/annual?year=YYYY`
  - 그 외: `/[locale]/report/new?c=<catalogId>[&compat=]`
- 이동하기 전에 `rememberOrderToken(catalogId, orderId, compatId)`를 호출한다. 기존 M-10 주소창 정리 로직은 보존한다.
- [ ] 커밋: `feat(pay-complete): 상품별 결제 후 이동`

### Task 2.6: 내 보관함

**Files:** Modify `components/MeClient.tsx` (또는 `/me` 페이지에 섹션 추가)

- `/api/reports/mine`의 결과를 목록으로 보여 준다. 각 항목은 상품명, 결제일, 만료일(D-day), [리포트 보기] 또는 [리포트 만들기] 버튼으로 구성한다.
- [리포트 만들기]는 `rememberOrderToken` 후 `/report/new?c=`로 이동한다.
- 게스트에게는 "로그인하면 여러 기기에서 다시 볼 수 있어요" 안내를 보여 준다(기존 claim 흐름 재사용).
- [ ] 커밋: `feat(me): 내 리포트 보관함`

### Task 2.7: 홈·상품 상세 정리 (H6·M8·L)

- `app/[locale]/page.tsx`
  - 섹션 배열이 비어 있으면 섹션 제목까지 렌더하지 않는다(빈 "인기 세트" 제거).
  - 하드코딩된 `#FFF6F1`, `#2B2430`, `#FF3E6C`를 `bg-background`, `text-ink`, `bg-coral` 토큰으로 바꾼다.
  - 홈 배경은 커밋 A 원칙대로 **화이트 베이스**다.
- `app/[locale]/products/[id]/page.tsx`
  - `isViewable`이 아니면 `notFound()`를 호출한다(M8).
  - "타고난 명식과 오행 분석을 바탕으로…" → "태어난 날의 기운을 바탕으로 한 심층 리포트 제공"
  - 가격은 `priceLabel`로 표시한다.
  - `/fortune/new`, `/compat/new` 페이지도 hidden productId면 `notFound()`를 호출한다.
- 고객 노출 페이지(admin 제외)의 `#FF5C77`, `#FFF6F1`, `#2B2430` 잔재를 토큰으로 치환한다. 치환 전후 `grep -c` 결과를 보고서에 싣는다.
- 모든 인터랙티브 요소에 `focus-visible:ring-2 ring-coral`을 적용한다.
- [ ] 커밋: `fix(ui): 홈·상세 막다른 길 제거와 토큰·카피 정리`

### Task 2.8: 측정 (GA4)

`lib/gtag.ts`의 `trackEvent`로 아래 이벤트를 발사한다. 파라미터에 PII는 금지한다.

| 이벤트 | 위치 | 파라미터 |
|---|---|---|
| `view_item` | 상품 상세 | `productId, tier` |
| `teaser_created` | 티저 표시 | `productId, tier` |
| `view_paywall` | 결제 모달 열림 | `productId, tier, amountLabel` |
| `purchase_confirmed` | complete 성공 | `productId, tier, amount` |
| `report_generated` | FULL 표시 | `productId, tier` |
| `inapp_block_shown` | 인앱 결제 차단 모달 | `productId` |

- [ ] 개발 서버에서 GA DebugView 또는 콘솔로 발사를 확인하고 보고서에 기록한다.

### Task 2.9: 표준 카탈로그 E2E와 공개

PortOne **테스트 채널 키**와 개발 DB가 필요하다(사장님 준비). 없으면 이 Task는 "미실행"으로 보고한다.

- [ ] **상품별 수동 매트릭스**(게스트/회원 × 상품): 입력 → 티저 → 결제 → 리포트 → 새로고침 → 보관함. 결과표를 작성한다.
- [ ] **공격 확인**(curl 또는 스크립트, 개발 서버 대상):
  1. compat_basic만 결제한 orderId로 `{catalogId:"wealth", kind:"FULL", orderId, compatId}` 요청 → **403**
  2. wealth 주문으로 career FULL 요청 → **403**
  3. PENDING 주문으로 FULL 요청 → **402**
  4. reportId만 가지고(토큰 없이) view 요청 → **403**
  5. TEASER 응답 JSON에 `sections`/`advice`/`closing` 문자열이 없음
  6. 숨김 상품 order 요청 → 400, 상세 페이지 → 404
  7. 회원 첫 결제 amount 4,900, 두 번째 6,900, 게스트는 항상 6,900
  8. 같은 주문으로 입력만 바꿔 FULL 재요청 → **첫 리포트 그대로 반환**(H2)
- [ ] 통과한 상품만 `isHidden: false`로 바꾼다. 실패한 상품은 숨김을 유지하고 사유를 보고한다.

### 🛑 체크포인트 2 — 여기서 멈추고 보고

체크포인트 1의 항목에 더해 다음을 보고한다:
- 가격 grep 결과
- 색상 토큰 grep 전후 수치
- E2E 매트릭스와 공격 확인 결과
- 공개한 상품 목록
- 모바일(375px) 주요 화면 스크린샷 5장: 홈, 상품 상세, 티저, 결제 모달, 리포트

> 이 체크포인트를 Claude가 통과시키면, 사장님 판단으로 **표준 카탈로그만 먼저 배포**할 수 있다. 프리미엄은 숨김 상태라 영향이 없다.

---

# Phase 3 — 프리미엄 결정론 엔진

### Task 3.1: 간지 공용 모듈 (`lib/premium/ganzhi.ts`)

**Files:** Create `lib/premium/ganzhi.ts`, Test `tests/ganzhi.test.ts`

```ts
import { BRANCH_CLASH, BRANCH_SIX_COMBO, BRANCH_THREE_COMBO, BRANCH_PUNISH, BRANCH_HARM_ENMITY } from "@/lib/compatibility";

export type Element = "wood" | "fire" | "earth" | "metal" | "water";
export type Relation = "peer" | "support" | "output" | "wealth" | "pressure";

export const STEM_ELEMENT: Record<string, Element> = {
  甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water",
};
export const BRANCH_ELEMENT: Record<string, Element> = {
  寅: "wood", 卯: "wood", 巳: "fire", 午: "fire", 辰: "earth", 戌: "earth", 丑: "earth", 未: "earth", 申: "metal", 酉: "metal", 亥: "water", 子: "water",
};
export const GENERATES: Record<Element, Element> = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
export const CONTROLS: Record<Element, Element> = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };

export function elementOf(ch: string): Element | null {
  return STEM_ELEMENT[ch] ?? BRANCH_ELEMENT[ch] ?? null;
}

/** 일간(dm) 기준, 대상 기운과의 관계 */
export function relation(dm: Element, target: Element): Relation {
  if (dm === target) return "peer";
  if (GENERATES[target] === dm) return "support";
  if (GENERATES[dm] === target) return "output";
  if (CONTROLS[dm] === target) return "wealth";
  return "pressure";
}

/** 억부: 일간 + 일간을 돕는 기운 비율 합이 45% 이상이면 강한 편 */
export function isStrong(dm: Element, pct: Record<Element, number>): boolean {
  const resource = (Object.keys(GENERATES) as Element[]).find((k) => GENERATES[k] === dm) as Element;
  return (pct[dm] ?? 0) + (pct[resource] ?? 0) >= 45;
}

const POINTS: Record<"strong" | "weak", Record<Relation, number>> = {
  strong: { support: -2, peer: -1, output: 5, wealth: 6, pressure: 2 },
  weak: { support: 6, peer: 5, output: -2, wealth: -3, pressure: -5 },
};

export function charPoints(dm: Element, ch: string, strong: boolean): number {
  const e = elementOf(ch);
  return e ? POINTS[strong ? "strong" : "weak"][relation(dm, e)] : 0;
}

/** 지지 a 가 사람의 지지 b 와 맺는 관계 가중치(대운·연·월 점수용) */
export function branchAdj(a: string, b: string): number {
  const k = a + b;
  if (BRANCH_CLASH.has(k)) return -6;
  if (BRANCH_SIX_COMBO.has(k)) return 4;
  if (BRANCH_THREE_COMBO.has(k)) return 3;
  if (BRANCH_PUNISH.has(k)) return -3;
  if (BRANCH_HARM_ENMITY.has(k)) return -2;
  return 0;
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** 화면 표시용 쉬운 말(한자·전문용어 노출 금지) */
export const STEM_IMAGE: Record<string, string> = {
  甲: "큰 나무", 乙: "들꽃", 丙: "한낮의 태양", 丁: "따뜻한 촛불", 戊: "넓은 산", 己: "기름진 들판", 庚: "단단한 바위", 辛: "빛나는 보석", 壬: "넓은 바다", 癸: "촉촉한 단비",
};
export const BRANCH_ANIMAL: Record<string, string> = {
  子: "쥐", 丑: "소", 寅: "호랑이", 卯: "토끼", 辰: "용", 巳: "뱀", 午: "말", 未: "양", 申: "원숭이", 酉: "닭", 戌: "개", 亥: "돼지",
};
export const ELEMENT_WORD: Record<Element, string> = { wood: "나무", fire: "불", earth: "흙", metal: "쇠", water: "물" };

/** 예: "庚辰" → "단단한 바위와 용의 10년" */
export function cycleLabel(ganZhi: string): string {
  return `${STEM_IMAGE[ganZhi[0]] ?? "새로운 기운"}와 ${BRANCH_ANIMAL[ganZhi[1]] ?? "시간"}의 10년`;
}
```

테스트:

```ts
import { describe, it, expect } from "vitest";
import { relation, isStrong, branchAdj, cycleLabel, charPoints } from "@/lib/premium/ganzhi";

describe("ganzhi", () => {
  it("관계", () => {
    expect(relation("wood", "fire")).toBe("output");
    expect(relation("metal", "fire")).toBe("pressure");
    expect(relation("water", "fire")).toBe("wealth");
    expect(relation("earth", "fire")).toBe("support");
    expect(relation("fire", "fire")).toBe("peer");
  });
  it("강약", () => {
    expect(isStrong("wood", { wood: 30, water: 20, fire: 20, earth: 15, metal: 15 })).toBe(true);
    expect(isStrong("wood", { wood: 10, water: 10, fire: 30, earth: 30, metal: 20 })).toBe(false);
  });
  it("지지 가중치", () => {
    expect(branchAdj("子", "午")).toBe(-6);
    expect(branchAdj("子", "丑")).toBe(4);
    expect(branchAdj("申", "子")).toBe(3);
  });
  it("라벨에 한자 없음", () => {
    expect(cycleLabel("庚辰")).toBe("단단한 바위와 용의 10년");
  });
  it("알 수 없는 글자는 0점", () => {
    expect(charPoints("wood", "?", true)).toBe(0);
  });
});
```

- [ ] FAIL → 구현 → PASS → 커밋: `feat(premium): 간지 공용 모듈`

### Task 3.2: 2027 대운 엔진 (`lib/premium/daeun.ts`)

**Files:** Create `lib/premium/daeun.ts`, Test `tests/daeun.test.ts`

**Interfaces (Produces):**

```ts
export interface DaeunCycle { index: number; startYear: number; endYear: number; startAge: number; ganZhi: string; label: string }
export interface Premium2027Engine {
  strong: boolean;
  cycles: DaeunCycle[];          // 최대 8개(빈 간지인 0번 제외)
  current: DaeunCycle | null;    // 2027 이 속한 10년
  yearScore: number;             // 55~97
  domains: Record<"love" | "money" | "career" | "health" | "relationships" | "family", number>; // 50~99
  months: Array<{ month: number; ganZhi: string; score: number }>; // 양력 1~12월, 50~99
}
export function calculateDaeun(p: { dob: string; time: string | null; gender: "M" | "F" }, targetYear: number): { cycles: DaeunCycle[]; current: DaeunCycle | null };
export function buildPremium2027Engine(p: PersonInput): Premium2027Engine;
```

**산식** (그대로 구현):

1. 명식: `calculateFourPillars(dob, time, gender, "Seoul, KR")`를 재사용한다. `dayStem = fourPillars.day[0]`, `dayBranch = fourPillars.day[1]`, `dm = STEM_ELEMENT[dayStem]`, `strong = isStrong(dm, elementsScore)`.
2. 대운 계산:

```ts
const [y, m, d] = p.dob.split("-").map(Number);
const [hh, mm] = (p.time ?? "12:00").split(":").map(Number); // saju.ts 와 동일한 시간 미상 처리
const yun = Solar.fromYmdHms(y, m, d, hh, mm, 0).getLunar().getEightChar().getYun(p.gender === "M" ? 1 : 0);
const cycles = yun.getDaYun()
  .filter((dy) => dy.getGanZhi())
  .slice(0, 8)
  .map((dy) => ({
    index: dy.getIndex(), startYear: dy.getStartYear(), endYear: dy.getEndYear(),
    startAge: dy.getStartAge(), ganZhi: dy.getGanZhi(), label: cycleLabel(dy.getGanZhi()),
  }));
const current = cycles.find((c) => c.startYear <= targetYear && targetYear <= c.endYear) ?? null;
```

3. 연 점수:

```
s = 70 + 1.5 × (charPoints(dm,"丁") + charPoints(dm,"未")) + branchAdj("未", dayBranch)
  + (current ? charPoints(dm, current.ganZhi[0]) + charPoints(dm, current.ganZhi[1]) : 0)
yearScore = clamp(round(s), 55, 97)
```

4. 분야 점수:
   - `active = ["丁","未", current?.ganZhi[0], current?.ganZhi[1]]`에서 빈 값을 제거한다.
   - 분야별 관계: love는 남성이면 `["wealth"]`, 여성이면 `["pressure"]`. money `["wealth"]`, career `["pressure","output"]`, relationships `["peer"]`, family `["support"]`.
   - `hits` = active 중 관계가 해당 목록에 드는 글자 수.
   - health를 제외한 분야: `clamp(yearScore - 4 + hits × 5, 50, 99)`
   - health: `clamp(yearScore - round((20 - minPct) / 2), 50, 99)` (minPct = elementsScore 최솟값)
5. 월 점수: m = 1..12에 대해
   - `gz = Solar.fromYmd(2027, m, 20).getLunar().getMonthInGanZhiExact()`
   - `clamp(round(yearScore + 1.2 × (charPoints(dm, gz[0]) + charPoints(dm, gz[1])) + branchAdj(gz[1], dayBranch)), 50, 99)`

**테스트** (값은 Claude가 lunar-javascript로 실측 확인함):

```ts
import { describe, it, expect } from "vitest";
import { calculateDaeun, buildPremium2027Engine } from "@/lib/premium/daeun";

describe("daeun", () => {
  it("1995-03-15 10:30 여성 — 대운 실측값", () => {
    const r = calculateDaeun({ dob: "1995-03-15", time: "10:30", gender: "F" }, 2027);
    expect(r.cycles[0]).toMatchObject({ startYear: 2002, endYear: 2011, startAge: 8, ganZhi: "庚辰" });
    expect(r.current).toMatchObject({ startYear: 2022, endYear: 2031, startAge: 28, ganZhi: "壬午" });
  });
  it("2027 월 간지 실측", () => {
    const e = buildPremium2027Engine({ name: "나", dob: "1995-03-15", time: "10:30", gender: "F" });
    expect(e.months.map((m) => m.ganZhi)).toEqual(
      ["辛丑", "壬寅", "癸卯", "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子"],
    );
  });
  it("결정론·범위", () => {
    const p = { name: "나", dob: "1990-07-01", time: null, gender: "M" as const };
    const a = buildPremium2027Engine(p);
    const b = buildPremium2027Engine(p);
    expect(a).toEqual(b);
    expect(a.yearScore).toBeGreaterThanOrEqual(55);
    expect(a.yearScore).toBeLessThanOrEqual(97);
    for (const m of a.months) {
      expect(m.score).toBeGreaterThanOrEqual(50);
      expect(m.score).toBeLessThanOrEqual(99);
    }
  });
  it("스냅샷(보고서에 값 기재 → Claude 수기 검산)", () => {
    expect(buildPremium2027Engine({ name: "나", dob: "1995-03-15", time: "10:30", gender: "F" })).toMatchSnapshot();
  });
});
```

- [ ] `types/lunar-javascript.d.ts`에 사용하는 메서드 선언을 추가한다: `getYun`, `getDaYun`, `getStartYear`, `getEndYear`, `getStartAge`, `getIndex`, `getGanZhi`, `getMonthInGanZhiExact`.
- [ ] FAIL → 구현 → PASS → 커밋: `feat(premium): 2027 대운 결정론 엔진`

### Task 3.3: 길일 택일 엔진 (`lib/premium/dateSelection.ts`)

**Files:** Create `lib/premium/dateSelection.ts`, `lib/premium/dateLabels.ts`, Test `tests/dateSelection.test.ts`

```ts
import { Solar } from "lunar-javascript";
import { BRANCH_CLASH, BRANCH_SIX_COMBO, BRANCH_THREE_COMBO, BRANCH_PUNISH, BRANCH_HARM_ENMITY } from "@/lib/compatibility";

export type Purpose = "WEDDING" | "MOVING" | "OPENING" | "CONTRACT" | "GENERAL";
export const PURPOSE_YI_KEYS: Record<Purpose, string[]> = {
  WEDDING: ["嫁娶"], MOVING: ["入宅", "移徙", "搬家"], OPENING: ["开市"], CONTRACT: ["立券", "交易"], GENERAL: [],
};
const GOOD_OFFICERS = new Set(["除", "危", "定", "执", "成", "开"]); // 건제12신 중 길한 날
// 한국 관례: 표준시 대비 30분 늦은 시진
const HOUR_RANGE: Record<string, string> = {
  辰: "07:30~09:30", 巳: "09:30~11:30", 午: "11:30~13:30", 未: "13:30~15:30", 申: "15:30~17:30", 酉: "17:30~19:30",
};

export interface PersonBranches { dayBranch: string; yearBranch: string }
export interface DateScore {
  date: string; score: number; lunarMonth: number; lunarDay: number; isLeapMonth: boolean;
  dayGanZhi: string; officer: string; yellowPath: boolean; yiHit: boolean; sonEomneun: boolean; goodHours: string[];
}

export function scoreDate(date: string, purpose: Purpose, people: PersonBranches[]): DateScore | null {
  const [y, m, d] = date.split("-").map(Number);
  const lunar = Solar.fromYmd(y, m, d).getLunar();
  const keys = PURPOSE_YI_KEYS[purpose];
  const ji: string[] = lunar.getDayJi();
  const yi: string[] = lunar.getDayYi();
  if (keys.some((k) => ji.includes(k))) return null;              // 그 일을 꺼리는 날
  const dayBranch: string = lunar.getDayZhi();
  for (const p of people) {                                        // 본인 일지·띠와 충돌하는 날
    if (BRANCH_CLASH.has(dayBranch + p.dayBranch) || BRANCH_CLASH.has(dayBranch + p.yearBranch)) return null;
  }
  const yiHit = keys.some((k) => yi.includes(k));
  const yellowPath = lunar.getDayTianShenLuck() === "吉";
  const officer: string = lunar.getZhiXing();
  const lunarDay: number = lunar.getDay();
  const sonEomneun = lunarDay % 10 === 9 || lunarDay % 10 === 0;  // 손 없는 날(음력 9·10·19·20·29·30)
  let score = 50 + (yiHit ? 20 : 0) + (yellowPath ? 10 : -10) + (GOOD_OFFICERS.has(officer) ? 8 : -4);
  for (const p of people) {
    const k = dayBranch + p.dayBranch;
    if (BRANCH_SIX_COMBO.has(k)) score += 6;
    else if (BRANCH_THREE_COMBO.has(k)) score += 4;
    else if (BRANCH_PUNISH.has(k)) score -= 4;
    else if (BRANCH_HARM_ENMITY.has(k)) score -= 3;
  }
  if (purpose === "MOVING" && sonEomneun) score += 15;
  const seen = new Set<string>();
  const goodHours: string[] = [];
  for (const t of lunar.getTimes()) {
    const z: string = t.getZhi();
    if (seen.has(z)) continue;
    seen.add(z);
    if (HOUR_RANGE[z] && t.getTianShenLuck() === "吉" && goodHours.length < 2) goodHours.push(HOUR_RANGE[z]);
  }
  const lm: number = lunar.getMonth();
  return {
    date, score, lunarMonth: Math.abs(lm), lunarDay, isLeapMonth: lm < 0,
    dayGanZhi: lunar.getDayInGanZhi(), officer, yellowPath, yiHit, sonEomneun, goodHours,
  };
}

export interface SelectionResult { picks: DateScore[]; insufficient: boolean; scanned: number }

/** 범위 전체를 채점해 60점 이상 중 상위 5개. 동점이면 이른 날짜 우선(결정론). */
export function selectTopDates(
  o: { purpose: Purpose; start: string; end: string; weekdays: number[]; excludeDates: string[] },
  people: PersonBranches[],
): SelectionResult {
  const out: DateScore[] = [];
  let scanned = 0;
  for (let t = Date.parse(o.start + "T00:00:00Z"); t <= Date.parse(o.end + "T00:00:00Z"); t += 86400000) {
    const dt = new Date(t);
    const date = dt.toISOString().slice(0, 10);
    scanned++;
    if (o.weekdays.length && !o.weekdays.includes(dt.getUTCDay())) continue;
    if (o.excludeDates.includes(date)) continue;
    const s = scoreDate(date, o.purpose, people);
    if (s && s.score >= 60) out.push(s);
  }
  out.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  const picks = out.slice(0, 5);
  return { picks, insufficient: picks.length < 3, scanned };
}
```

`lib/premium/dateLabels.ts` — 화면용 쉬운 말(한자 노출 금지):
- `OFFICER_WORD`: 除 "묵은 것을 덜어내는 날", 危 "조심히 쌓아 올리는 날", 定 "자리를 정하는 날", 执 "붙잡아 지키는 날", 成 "이루는 날", 开 "새로 여는 날", 그 외는 "평범한 날"
- `PURPOSE_WORD`: WEDDING "결혼", MOVING "이사", OPENING "개업", CONTRACT "계약"
- 음력 표기: `음력 ${lunarMonth}월 ${lunarDay}일`, 윤달이면 "윤" 접두

**테스트** (Claude가 2027-04-17 실측 확인: 일진 丙寅, 开, 황도 吉, 宜에 嫁娶 포함·入宅 미포함, 음력 3/11, 吉시 子丑辰巳未戌):

```ts
import { describe, it, expect } from "vitest";
import { scoreDate, selectTopDates } from "@/lib/premium/dateSelection";

const me = { dayBranch: "巳", yearBranch: "亥" }; // 1995-03-15 생 실측

describe("scoreDate — 2027-04-17 실측", () => {
  it("결혼: 50+20(宜)+10(황도)+8(开)-4(寅巳 형) = 84", () => {
    expect(scoreDate("2027-04-17", "WEDDING", [me])?.score).toBe(84);
  });
  it("이사: 宜 미포함, 손 없는 날 아님 → 64", () => {
    const s = scoreDate("2027-04-17", "MOVING", [me]);
    expect(s?.score).toBe(64);
    expect(s?.sonEomneun).toBe(false);
  });
  it("일지 申 과 충돌하면 제외", () => {
    expect(scoreDate("2027-04-17", "WEDDING", [{ dayBranch: "申", yearBranch: "亥" }])).toBeNull();
  });
  it("좋은 시간 2개(07:30~19:30 사이 吉)", () => {
    expect(scoreDate("2027-04-17", "WEDDING", [me])?.goodHours).toEqual(["07:30~09:30", "09:30~11:30"]);
  });
});

describe("selectTopDates", () => {
  const base = { purpose: "WEDDING" as const, start: "2027-04-01", end: "2027-06-30", weekdays: [], excludeDates: [] };
  it("결정론", () => {
    expect(selectTopDates(base, [me])).toEqual(selectTopDates(base, [me]));
  });
  it("최대 5개, 점수 내림차순", () => {
    const r = selectTopDates(base, [me]);
    expect(r.picks.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < r.picks.length; i++) expect(r.picks[i - 1].score).toBeGreaterThanOrEqual(r.picks[i].score);
  });
  it("주말 필터 준수", () => {
    const r = selectTopDates({ ...base, weekdays: [0, 6] }, [me]);
    for (const p of r.picks) expect([0, 6]).toContain(new Date(p.date + "T00:00:00Z").getUTCDay());
  });
});
```

- [ ] d.ts에 추가: `getDayYi`, `getDayJi`, `getDayZhi`, `getDayTianShenLuck`, `getZhiXing`, `getTimes`, `getTianShenLuck`, `getZhi`, `getDayInGanZhi`, `getMonth`, `getDay`
- [ ] FAIL → 구현 → PASS → 커밋: `feat(premium): 길일 택일 결정론 엔진`

### Task 3.4: 작명 데이터 + 엔진 (`lib/premium/naming/*`)

**규칙 예외(사장님 승인 사항):** 작명 리포트는 **엔진 데이터의 한자·훈음·획수**를 화면에 표시한다. AI 문장에는 여전히 한자를 금지한다(Task 1.8 검증기가 그대로 적용된다). `AGENTS.md` §1-4에 다음 한 줄을 추가한다: "예외: 작명 상품은 엔진 데이터(인명용 한자)에 한해 한자 표시 허용, AI 문장엔 금지."

**데이터 파일 (`data/naming/`):**

| 파일 | 내용 | 출처·규칙 |
|---|---|---|
| `inmyong-hanja.txt` | 대법원 인명용 한자 전체(한 줄에 한 글자), 첫 줄 주석에 출처 URL·조회일 | 대법원 전자가족관계등록시스템의 공식 인명용 한자표. **공식 목록을 확보하지 못하면 멈추고 보고한다. 목록을 지어내지 않는다.** |
| `unihan-subset.json` | `{ [char]: { rs: "85.5", total: 8 } }` | unicode.org의 최신 `Unihan.zip`에서 `kRSUnicode`, `kTotalStrokes`를 추출한다. 우리가 쓰는 글자만 저장하고 zip은 커밋하지 않는다. |
| `name-hanja.source.json` | `[{ char, eum, hun, genders: ["M","F"], tags: NamingTag[], element?: Element }]` 최소 600자 | 이름에 흔히 쓰는 긍정적 뜻의 글자를 선별한다. `element`는 부수로 결정되지 않는 글자에만 적는다. |
| `surnames.json` | `{ "김": [{ hanja: "金" }], "이": [{ hanja: "李" }], ... }` 상위 100성 + 복성(남궁·제갈·선우·황보·독고·사공) | 한자 획수는 저장하지 않는다. 빌드 스크립트가 계산한다. |
| `given-names.json` | `{ "M": [{ name: "서준", rank: 1 }], "F": [...] }` 성별당 300개 이상, 모두 2음절 | 대법원 출생신고 이름 통계를 우선하고, 불가하면 큐레이션한 뒤 출처를 명기한다. |
| `blocklist.json` | 성+이름 조합이 어색하거나 부정적인 한글 3음절 목록 | 큐레이션 |

**빌드 스크립트** `scripts/naming/build-name-hanja.ts`는 `data/naming/name-hanja.json`을 생성하고 커밋한다.
- source의 모든 글자가 `inmyong-hanja.txt`에 **있어야 한다**. 없으면 빌드를 실패시키고 목록을 출력한다.
- **원획** = `radicalFullStrokes(부수번호) + 나머지획`. 나머지획은 `kRSUnicode` 첫 값의 소수부이고, `'`는 제거한다. 숫자 한자(一二三四五六七八九十)는 `NUMERAL_STROKES`(1~10)로 덮어쓴다.
- **자원오행**: `RADICAL_ELEMENT[부수번호]`가 있으면 그 값을 쓰고, 없으면 source의 `element`를 쓴다. 둘 다 없으면 빌드를 실패시킨다.
- 성씨 한자의 원획도 같은 규칙으로 계산해 `surnames.json` 출력에 포함한다.

```ts
// lib/premium/naming/strokes.ts
/** 강희자전 부수 번호 → 부수 원래 획수(부수는 획수 순으로 번호가 매겨져 있다) */
export function radicalFullStrokes(n: number): number {
  const bounds: Array<[number, number]> = [
    [6, 1], [29, 2], [60, 3], [94, 4], [117, 5], [146, 6], [166, 7], [175, 8],
    [186, 9], [194, 10], [200, 11], [204, 12], [208, 13], [210, 14], [211, 15], [213, 16], [214, 17],
  ];
  for (const [max, strokes] of bounds) if (n <= max) return strokes;
  throw new Error(`invalid radical ${n}`);
}

export function originalStrokes(rsUnicode: string): number {
  const [rad, rest] = rsUnicode.split(" ")[0].replace(/'/g, "").split(".").map(Number);
  return radicalFullStrokes(rad) + rest;
}

export const NUMERAL_STROKES: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

export const RADICAL_ELEMENT: Record<number, "wood" | "fire" | "earth" | "metal" | "water"> = {
  75: "wood", 118: "wood", 140: "wood", 115: "wood",   // 木 竹 艸 禾
  86: "fire", 72: "fire", 61: "fire",                   // 火 日 心
  32: "earth", 46: "earth", 102: "earth", 170: "earth", // 土 山 田 阜
  167: "metal", 96: "metal", 112: "metal",              // 金 玉 石
  85: "water", 173: "water", 15: "water",               // 水 雨 冫
};
```

```ts
// lib/premium/naming/rules.ts
import type { Element } from "@/lib/premium/ganzhi";
import { GENERATES, CONTROLS } from "@/lib/premium/ganzhi";

export const LUCKY_81 = new Set([1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 29, 31, 32, 33, 35, 37, 38, 39, 41, 45, 47, 48, 52, 57, 61, 63, 65, 67, 68, 81]);

export function reduce81(n: number): number {
  return n > 81 ? ((n - 1) % 80) + 1 : n;
}

/** 수리 4격(성 획수 합 s, 이름 두 글자 g1·g2) */
export function fourGrids(s: number, g1: number, g2: number) {
  return { won: reduce81(g1 + g2), hyeong: reduce81(s + g1), i: reduce81(s + g2), jeong: reduce81(s + g1 + g2) };
}

export function allLucky(g: ReturnType<typeof fourGrids>): boolean {
  return [g.won, g.hyeong, g.i, g.jeong].every((n) => LUCKY_81.has(n));
}

/** 획수 홀짝이 전부 같으면 불균형 */
export function parityBalanced(strokes: number[]): boolean {
  return new Set(strokes.map((n) => n % 2)).size > 1;
}

const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const CHO_ELEMENT: Record<string, Element> = {
  ㄱ: "wood", ㄲ: "wood", ㅋ: "wood",
  ㄴ: "fire", ㄷ: "fire", ㄸ: "fire", ㄹ: "fire", ㅌ: "fire",
  ㅇ: "earth", ㅎ: "earth",
  ㅅ: "metal", ㅆ: "metal", ㅈ: "metal", ㅉ: "metal", ㅊ: "metal",
  ㅁ: "water", ㅂ: "water", ㅃ: "water", ㅍ: "water",
};

export function soundElement(syllable: string): Element {
  const code = syllable.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) throw new Error(`not hangul: ${syllable}`);
  return CHO_ELEMENT[CHO[Math.floor(code / 588)]];
}

/** 인접 음절 발음오행 흐름: 상생 +10, 같음 +4, 상극 -10 */
export function soundFlowScore(seq: Element[]): number {
  let s = 0;
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1];
    const b = seq[i];
    if (GENERATES[a] === b || GENERATES[b] === a) s += 10;
    else if (a === b) s += 4;
    else if (CONTROLS[a] === b || CONTROLS[b] === a) s -= 10;
  }
  return s;
}
```

**후보 생성·채점** (`lib/premium/naming/engine.ts`, `buildNamingEngine(input: ChildNamingInput): NamingEngineResult`):

1. 아이 명식은 `calculateFourPillars(dob, time, gender, "Seoul, KR")`로 구한다. `weakest` = 비율이 최소인 기운(동률이면 모두), `second` = 그다음, `strongest` = 최대(40% 이상일 때만 사용).
2. 성: 해당 성씨 옵션 중 선택한 한자의 원획 `s`. 복성은 두 글자 획수의 합이다.
3. 이름 풀: `given-names.json[gender]`에서 아래 조건으로 거른다.
   - avoidSyllables가 포함된 이름 제외
   - 돌림자가 있으면 그 위치 음절이 일치하는 이름만
   - 이름 음절이 성과 같은 이름 제외
   - `blocklist`에 있는 (성+이름) 제외
4. 음절별 한자 후보: `name-hanja.json`에서 `eum === 음절` && 성별 호환인 글자. 태그 일치 수가 많은 순, 동률이면 원획이 적은 순, 다음은 문자 코드 순으로 상위 6개를 뽑는다. 돌림자 한자가 지정되면 그 위치는 그 한자로 고정한다.
5. 조합마다 다음이면 제외한다: `allLucky(fourGrids(s, g1, g2)) === false`, `parityBalanced([s, g1, g2]) === false`, g1과 g2가 같은 한자, 이름 한자가 성 한자와 같음.
6. 점수 = `50 + soundFlowScore([성 첫음절, 이름1, 이름2]) + 보완점수 + 자연스러움 + 태그점수`
   - 보완점수: 이름 한자 각 글자의 자원오행이 weakest면 +12, second면 +5, strongest(40% 이상)면 -6
   - 자연스러움: `max(0, 10 - floor((rank - 1) / 30))`
   - 태그점수: 글자별로 선택 태그와 일치하는 수 × 4
7. 정렬: 점수 내림차순 → rank 오름차순 → 한글 이름 오름차순 → 한자 문자열 오름차순. **한글 이름이 서로 다른 상위 5개**를 고른다. 5개 미만이면 `insufficient: true`.
8. 반환값:

```ts
{
  child: { weakest, second, strongest },
  names: Array<{
    hangul, hanja: [g1, g2], hun: [...], eum: [...], strokes: { s, g1, g2 },
    grids, soundSeq, elements: [...], score,
  }>,
  insufficient,
}
```

**테스트** (`tests/naming.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { radicalFullStrokes, originalStrokes } from "@/lib/premium/naming/strokes";
import { reduce81, fourGrids, allLucky, parityBalanced, soundElement, soundFlowScore } from "@/lib/premium/naming/rules";

describe("원획", () => {
  it("부수 획수 경계", () => {
    expect([1, 7, 30, 61, 85, 96, 130, 162, 167, 170, 178, 187, 195, 201, 214].map(radicalFullStrokes))
      .toEqual([1, 2, 3, 4, 4, 5, 6, 7, 8, 8, 9, 10, 11, 12, 17]);
  });
  it("표준 성씨 원획", () => {
    expect(originalStrokes("167.0")).toBe(8);   // 金
    expect(originalStrokes("75.3")).toBe(7);    // 李
    expect(originalStrokes("75.2")).toBe(6);    // 朴
    expect(originalStrokes("46.8")).toBe(11);   // 崔
    expect(originalStrokes("163.12")).toBe(19); // 鄭 (阝=邑 7획)
    expect(originalStrokes("156.7")).toBe(14);  // 趙
    expect(originalStrokes("85.6")).toBe(10);   // 洪 (氵=水 4획)
  });
});

describe("수리·음양·발음", () => {
  it("81 환원", () => {
    expect(reduce81(81)).toBe(81);
    expect(reduce81(82)).toBe(2);
    expect(reduce81(161)).toBe(1);
  });
  it("4격", () => {
    expect(fourGrids(8, 7, 10)).toEqual({ won: 17, hyeong: 15, i: 18, jeong: 25 });
    expect(allLucky(fourGrids(8, 7, 10))).toBe(true);
    expect(allLucky(fourGrids(8, 13, 4))).toBe(false); // 이격 12
  });
  it("음양", () => {
    expect(parityBalanced([8, 7, 10])).toBe(true);
    expect(parityBalanced([8, 10, 6])).toBe(false);
  });
  it("발음오행", () => {
    expect(soundElement("김")).toBe("wood");
    expect(soundElement("서")).toBe("metal");
    expect(soundElement("윤")).toBe("earth");
    expect(soundFlowScore(["wood", "metal", "earth"])).toBe(0); // 쇠가 나무를 이김(-10), 흙이 쇠를 낳음(+10)
  });
});
```

추가로 `buildNamingEngine`을 소형 픽스처(이름 5개, 한자 20자)로 테스트한다. 두 번 호출한 결과가 같은지, 한글 이름이 중복되지 않는지, 모든 후보가 allLucky·parityBalanced인지, 돌림자가 고정되는지 확인한다.

- [ ] 데이터 확보 → 빌드 스크립트 → 테스트 FAIL → 구현 → PASS
- [ ] 보고서에 `name-hanja.json`에서 **무작위 50자 샘플(글자·훈음·원획·자원오행)**을 싣는다. Claude가 수기로 검수한다.
- [ ] 커밋 2개: `feat(naming): 인명용 한자 데이터와 빌드 스크립트`, `feat(naming): 작명 결정론 엔진`

### Task 3.5: 프리미엄 엔진 티저 (AI 없음)

**Files:** Create `lib/premium/teasers.ts` — generate 라우트의 TEASER 분기에서 프리미엄이면 이것을 호출한다.

| 상품 | 티저에 **포함** | 티저에서 **제외(서버에서 제거)** |
|---|---|---|
| 2027 대운 | yearScore, 현재 10년 라벨(`cycleLabel`), 분야 6개 이름(점수 제외), "가장 좋은 달: ●월" 형태의 가림 문구 | 월별 점수, 분야 점수, 대운 전체 목록 |
| 작명 | 조건을 통과한 후보 수, 아이에게 필요한 기운을 쉬운 말로("물의 기운을 채워주는 이름이 잘 어울려요") | 이름·한자·획수 전부 |
| 택일 | 찾은 길일 개수, 월별 분포(예: `{ "2027-05": 2, "2027-06": 3 }`), insufficient 여부 | 날짜·점수·시간 |

- [ ] 각 티저 함수의 반환 객체 키를 화이트리스트 테스트로 고정하고 커밋한다.

### 🛑 체크포인트 3 — 여기서 멈추고 보고

보고할 것:
- 엔진 테스트 전체 출력
- 대운 스냅샷 값
- 택일 샘플(2027-04~06 결혼, 1995-03-15 여성 기준 상위 5개와 점수 구성)
- 작명 샘플 50자와 데이터 출처 URL·조회일
- 모든 엔진 함수가 DB·AI에 의존하지 않는다는 확인

---

# Phase 4 — 프리미엄 생성 + UI

### Task 4.1: 프리미엄 AI 생성 (병렬 섹션)

**Files:**
- Create `lib/premium/generate2027.ts`, `lib/premium/generateNaming.ts`, `lib/premium/generateDates.ts`
- Modify `app/api/reports/generate/route.ts` (inputKind 분기)

**공통 설정:**
- 모델: `[process.env.GEMINI_PREMIUM_MODEL || "gemini-2.5-pro", ...PREMIUM_MODELS]`
- `thinkingBudget: 1024`, 섹션별 `maxOutputTokens: 8192`
- 섹션 호출은 `Promise.all`로 **병렬** 실행한다.
- 저장 content는 `{ version: 1, engine, sections }`다. 엔진 결과를 함께 저장해 화면이 숫자를 그대로 쓴다.
- 프롬프트마다 STYLE_GUIDE, STRICT_NO_HANJA_RULE, "엔진 수치는 사실로만 쓰고 새로 계산하지 말 것", "단정 금지·오락 목적"을 포함한다.
- subjectHash:
  - 2027: `["premium_2027", name, dob, time ?? "-", gender]`
  - 작명: `["naming", surnameHangul, surnameHanja, gender, dob, time ?? "-", dollim?.syllable ?? "-", String(dollim?.position ?? "-"), dollim?.hanja ?? "-"]`
  - 택일: `["dates", purpose, start, end, ...people.flatMap((p) => [p.dob, p.time ?? "-", p.gender]), weekdays.join(","), excludeDates.join(",")]`

**2027 대운 — 4개 병렬 호출 (JSON 스키마):**
- A overview: `{ headline, keywords: string[3], cycleStory: string (현재 10년의 의미, 3문단 600~900자), position: string (10년 중 2027의 자리, 1문단), yearSummary: string (2문단) }`
- B domains: `{ domains: Array<{ key: "love"|"money"|"career"|"health"|"relationships"|"family"; body: string (2문단 400~600자); do: string[2]; dont: string[2] }> }` — 정확히 6개, key 순서 고정
- C months: `{ months: Array<{ month: 1..12; theme: string (8자 이내); body: string (250~350자); do: string; dont: string }> }` — 정확히 12개
- D closing: `{ quarterPlan: Array<{ quarter: 1|2|3|4; focus: string; actions: string[3] }>; letter: string (두근이의 편지, 2문단) }`
- 엔진 추가 데이터: 달마다 `selectTopDates({ purpose: "GENERAL", start: 월초, end: 월말, weekdays: [], excludeDates: [] }, [본인])`의 상위 2일을 "이달의 좋은 날"로 저장한다.

**작명 — 2개 병렬 호출:**
- A names: `{ names: Array<{ hangul: string; oneLine: string; meaning: string (2문단, 글자 뜻을 훈으로 풀어 쓴 이야기, 한자 금지); harmony: string (아이의 기운과 어울림, 1문단); sound: string (불렀을 때 느낌, 1문단) }> }` — 엔진 순서와 hangul이 일치해야 하고, 불일치하면 validate가 실패한다.
- B letter: `{ intro: string (작명 원칙 설명: 수리·음양·발음·보완을 쉬운 말로), letter: string (부모에게 쓰는 편지), notice: string }`
  - notice 필수 문장: "출생신고 전 대법원 전자가족관계등록시스템에서 인명용 한자 여부를 한 번 더 확인해 주세요."

**택일 — 2개 병렬 호출:**
- A dates: `{ dates: Array<{ date: string; title: string; why: string (1문단, 쉬운 말로); tips: string[3] }> }` — 엔진 picks와 date 순서가 일치해야 한다.
- B guide: `{ summary: string; checklist: string[5] (목적별 준비 체크리스트); notice: string ("전통 달력 기반 참고용") }`

- [ ] 각 validate는 개수·순서·key 일치까지 검사한다. 개발 DB와 실제 Gemini 키로 3종을 1회씩 생성해 소요시간과 finishReason을 보고한다.
- [ ] 커밋: `feat(premium): 프리미엄 병렬 생성`

### Task 4.2: 프리미엄 디자인 시스템

**Files:**
- Modify `app/globals.css`
- Modify `app/[locale]/layout.tsx` (폰트)
- Create `components/premium/*`

**토큰** (`:root`와 `@theme inline`에 추가):

```css
--premium-bg: #14101A;
--premium-surface: #1E1726;
--premium-line: #3A2E45;
--premium-gold: #D9B26A;
--premium-gold-soft: #F3E3BF;
--premium-text: #F6F1EA;
--premium-muted: #B9AEC4;
--cat-premium: #D9B26A;
```

- 금박 그라디언트: `linear-gradient(135deg, #F3E3BF 0%, #D9B26A 45%, #A8823C 100%)` (`.premium-gold-text`는 `background-clip: text`)
- 명조 제목: `next/font/google`의 `Noto_Serif_KR`(weight 500, 700)를 `--font-serif-kr`로 등록해 **프리미엄 제목에만** 쓴다.
- 대비 기준: 본문 `--premium-text` / `--premium-bg` ≥ 12:1, 보조 `--premium-muted` ≥ 7:1(AA 충족)
- 인쇄 스타일: `@media print`에서 `.no-print`를 숨기고, `.premium-shell`은 흰 배경·검정 글자·금색 구분선으로 바꾸고, 챕터마다 `break-before: page`를 준다.

**컴포넌트:**
- `PremiumShell`: 어두운 배경, 금색 1px 테두리, 최대폭 `max-w-2xl`
- `PremiumCover`: "KONGDAK PREMIUM" 레터링, 상품명(명조), 대상 이름, 발행일, 리포트 번호(reportId 앞 8자 대문자)
- `PremiumToc`: 챕터 목록(앵커 링크)
- `PremiumChapter`: `01` 같은 번호, 명조 제목, 금색 구분선
- `PremiumBadge`: 금박 배지
- `PremiumGenerating`: 단계형 진행 표시(① 기운 계산 → ② 큰 흐름 → ③ 세부 풀이 → ④ 마무리). 폴링 중에만 보여 주고, 최대 대기 3분.
- `PrintButton`: "PDF로 저장"(`window.print()`, 안내 문구 "인쇄 창에서 'PDF로 저장'을 선택하세요")

- [ ] 커밋: `feat(premium-ui): 프리미엄 디자인 토큰과 공용 컴포넌트`

### Task 4.3: 프리미엄 상품 상세 + 입력 폼

**상품 상세:** `products/[id]`에서 `tier === "premium"`이면 `PremiumProductDetail`을 렌더한다.

구성:
1. 히어로(명조 상품명, 금박 배지, 한 줄 약속)
2. "이 리포트에 담기는 것": 챕터 목차 미리보기와 분량(예: "6개 분야 · 12개월 · 약 1만 자")
3. **샘플 미리보기**: 가상 인물의 실제 엔진·생성 결과 일부. "예시 · 가상 인물" 워터마크를 필수로 표시한다. 샘플은 `data/samples/*.json`에 정적으로 커밋한다.
4. 일반 리포트 vs 프리미엄 비교표
5. FAQ: 보관 1년, PDF 저장, 로그인 필요, 청약철회
6. 가격(`priceLabel`)과 CTA

**입력 라우트:** `/[locale]/premium/[id]/new` → `PremiumNewClient`. inputKind에 따라:
- person: `BirthFields` 재사용
- child_naming: 성(자동완성) → 성 한자 선택 → 성별 → 생년월일(필수)·시간(선택) → 돌림자(선택: 음절·위치·한자) → 원하는 느낌 태그(최대 3) → 피하고 싶은 음절(최대 5)
- date_selection: 목적 선택 → 기간(날짜 2개, 7~180일) → 사람 1~2명(결혼은 2명 필수, BirthFields) → 요일 선호(칩) → 제외 날짜(최대 20)

**흐름:** 입력 → 엔진 티저(Task 3.5, 즉시 표시) → [결제하기]
- 결제 순서: `blockPaymentIfInApp` → 비로그인이면 `savePendingInput` 후 로그인 → `savePendingInput` → `requestPortOnePayment` → `/report/new?c=<premiumId>`
- ReportNewClient는 프리미엄이면 `PremiumGenerating`을 쓴다.

- [ ] 커밋: `feat(premium-ui): 프리미엄 상세·입력·티저`

### Task 4.4: 프리미엄 리포트 뷰어

`ReportViewClient`가 catalogId의 tier/inputKind로 아래 컴포넌트 중 하나를 고른다.

**`Daeun2027Report`:**
1. 표지
2. 목차
3. 01 나의 10년 지도: cycles 8개를 가로 타임라인으로 보여 주고 current를 금색으로 강조한다. 라벨은 `cycleLabel`, 나이 구간을 표시한다. 이어서 cycleStory.
4. 02 2027 총평: 점수 게이지, keywords, yearSummary, position
5. 03 분야별 6: `RadarChart`로 6개 점수를 보여 주고, 분야 카드에 body와 do/dont
6. 04 12개월: `LineChart`로 월 점수를 그리고, 월 카드에 theme, body, do/dont, "이달의 좋은 날" 2개
7. 05 분기 실행 계획
8. 06 두근이의 편지
9. 고지

**`NamingReport`:**
1. 표지
2. 작명 원칙
3. 이름 카드 5장. 한글 이름은 크게 명조로 쓰고, 그 아래에 엔진 한자·훈음(예: 瑞 상서로울 서)을 둔다. 이어서 oneLine, meaning, harmony, sound.
4. 접이식 "이름의 숫자" 표: 원획, 4격과 각 격의 길흉 표시
5. 5개 비교표
6. 부모에게 쓰는 편지
7. 출생신고 안내 notice

**`DateSelectionReport`:**
1. 표지
2. 요약
3. 범위 달력(월 그리드, 추천일은 금색 점, 1~3위는 금색 원)
4. 날짜 카드 5장: 날짜, 요일, 음력, 쉬운 말 라벨(`OFFICER_WORD`), 좋은 시간 2개, why, tips
5. 준비 체크리스트
6. **캘린더에 추가(.ics)**: `lib/ics.ts`로 클라이언트에서 VCALENDAR를 만든다(종일 VEVENT, 제목 "콩닥 추천 길일 · 결혼 후보 1"). `Blob` 다운로드이고 서버는 호출하지 않는다.
7. 고지

- 모든 뷰어: `PrintButton`, "내 보관함에서 1년간 다시 볼 수 있어요" 안내, GA4 `report_generated`.
- 택일에서 insufficient면 "범위를 넓혀 보세요" 안내를 보여 준다. 이 경우에도 결제는 완료된 상태이므로, 결과가 3개 미만이면 **결제 전 티저 단계에서** 명확히 경고하고 결제 버튼을 비활성화한다(Task 3.5의 insufficient 사용).

- [ ] 커밋: `feat(premium-ui): 프리미엄 리포트 뷰어 3종`

### Task 4.5: 홈 프리미엄 섹션 + E2E

- **홈**: 히어로 아래에 어두운 풀폭 밴드 "콩닥 프리미엄"을 두고 `getPremiumProducts()` 카드 3개를 보여 준다. 금박 배지, 명조 제목, 가격을 표시한다. 상품이 0개면 밴드 자체를 렌더하지 않는다.
- **E2E**: 체크포인트 2의 매트릭스와 공격 확인을 프리미엄 3종에도 똑같이 수행한다. 추가 확인 항목:
  - 게스트 결제 시도 → 401 LOGIN_REQUIRED 처리 → 로그인 후 입력 복원 → 결제
  - 생성 중 새로고침 → 폴링으로 복구
  - 같은 주문 재요청 → 동일 리포트
  - 인쇄 미리보기 확인
  - .ics를 구글·애플 캘린더에 가져오기
  - 375px 레이아웃
- 통과하면 프리미엄 3종을 `isHidden: false`로 바꾼다.

### 🛑 체크포인트 4 (최종) — 여기서 멈추고 보고

보고할 것:
- 전체 테스트, tsc, 변경 파일 eslint, build(exit code) 결과
- 프리미엄 3종 생성 소요시간(엔진 ms, AI ms, 전체)과 finishReason
- 각 상품 모바일 스크린샷(표지, 본문, 결제 모달)
- 새 환경변수 목록(값 제외)
- 사장님 배포 전 액션 목록

> 배포는 Claude 최종 검수 → 사장님 승인 → `python scripts/safe_deploy.py`(`Deploy VERIFIED` 확인) 순서다.

---

## 부록 A. 사장님 액션 (Gemini가 대신할 수 없음)

1. **개발 DB**: Supabase 새 프로젝트를 만들고 `.env.development.local`에 `DATABASE_URL`을 넣는다(Phase 1 전, 권장).
2. **PortOne 테스트 채널 키**: 로컬 E2E용으로 `.env.development.local`에 넣는다(Phase 2 전).
3. **서버 환경변수**: `SUBJECT_HASH_SECRET`(`openssl rand -hex 32`), `GEMINI_PREMIUM_MODEL`(선택). **배포 전 필수**이고, 없으면 리포트 API가 500으로 fail-closed된다.
4. **nginx `proxy_read_timeout 120s` 이상**: 프리미엄 생성은 폴링으로 복구되지만 첫 요청 타임아웃을 줄여 준다.
5. **약관·개인정보처리방침 개정**: 프리미엄 보관 1년, 작명·택일 입력 항목(아이 생년월일 등), 청약철회 동의.
6. **(권장) 인앱 결제 개선**: PortOne에 카카오페이·토스페이 간편결제 채널 추가가 가능한지 문의한다. 가능하면 인앱 브라우저 이탈을 줄이는 별도 작업을 진행한다.

## 부록 B. 체크포인트 보고서 템플릿 (`REVIEW_HANDOFF.md`)

```
# REVIEW_HANDOFF — 체크포인트 N
## ① 커밋 목록 (git log --oneline main..HEAD)
## ② 변경 파일·목적
## ③ 결정론 로직 요약(이번 Phase 산식)
## ④ 테스트: npm test / tsc / eslint(변경 파일) / next build — 원문 출력과 exit code
## ⑤ 보안·PII·결제 변경점 + 불변식 8개 체크표(근거 파일:라인)
## ⑥ 미실행 항목과 사유 (개발 DB·테스트 채널 부재 등)
## ⑦ 스스로 의심 지점
```
