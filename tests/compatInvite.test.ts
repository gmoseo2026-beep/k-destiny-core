import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCheckRateLimit = vi.fn();
const mockCheckChatRateLimit = vi.fn();
const mockGetClientIp = vi.fn(() => "203.0.113.10");

vi.mock("@/lib/rateLimiter", () => ({
  getClientIp: () => mockGetClientIp(),
  checkRateLimit: (ip: string) => mockCheckRateLimit(ip),
  checkChatRateLimit: (ip: string) => mockCheckChatRateLimit(ip),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => null),
}));

vi.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: {},
}));

vi.mock("@/lib/reports/genLog", () => ({
  logGeneration: vi.fn(),
}));

const mockInviteCreate = vi.fn();
const mockInviteFindUnique = vi.fn();
const mockInviteUpdate = vi.fn();
const mockInviteDeleteMany = vi.fn();
const mockCompatCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    compatInvite: {
      create: (...args: unknown[]) => mockInviteCreate(...args),
      findUnique: (...args: unknown[]) => mockInviteFindUnique(...args),
      update: (...args: unknown[]) => mockInviteUpdate(...args),
      deleteMany: (...args: unknown[]) => mockInviteDeleteMany(...args),
    },
    compatibility: {
      create: (...args: unknown[]) => mockCompatCreate(...args),
    },
  },
}));

import { POST as createInvitePOST } from "@/app/api/compat/invite/route";
import {
  GET as getInviteGET,
  POST as completeInvitePOST,
} from "@/app/api/compat/invite/[token]/route";
import {
  buildSafeInvitePerson,
  INVITE_TTL_MS,
  SENT_INVITES_STORAGE_KEY,
  saveSentInvite,
  loadSentInvites,
} from "@/lib/compatInvite";

const VALID_TOKEN = "a1b2c3d4e5f60123456789ab";

describe("P-008 반쪽 궁합 초대장 단위 테스트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: { minute: 2, day: 9 },
    });
    mockCheckChatRateLimit.mockResolvedValue({
      allowed: true,
    });
    mockInviteDeleteMany.mockResolvedValue({ count: 0 });
  });

  it("1) 원문 미저장: 초대장 생성 시 personA에 dob·time 원문이 들어가지 않는다", async () => {
    let savedData: Record<string, unknown> | null = null;
    mockInviteCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      savedData = data;
      return {
        id: "inv_test_1",
        token: VALID_TOKEN,
        expiresAt: data.expiresAt as Date,
      };
    });

    const req = new Request("http://localhost:3000/api/compat/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personA: {
          name: "김콩닥",
          dob: "1995-05-15",
          time: "14:30",
          gender: "F",
        },
        relation: "love",
      }),
    });

    const res = await createInvitePOST(req);
    expect(res.status).toBe(200);
    expect(savedData).not.toBeNull();

    const personA = savedData!.personA as Record<string, unknown>;
    expect(personA.name).toBe("김콩닥");
    expect(personA.gender).toBe("F");
    expect(typeof personA.birthHash).toBe("string");
    expect(personA.dayMaster).toBeDefined();
    expect(personA.elementsScore).toBeDefined();
    expect(personA.fourPillars).toBeDefined();

    // 원문 dob·time은 절대 저장되지 않아야 한다
    expect(personA).not.toHaveProperty("dob");
    expect(personA).not.toHaveProperty("time");
    expect(JSON.stringify(personA)).not.toContain("1995-05-15");
    expect(JSON.stringify(personA)).not.toContain("14:30");
  });

  it("2) 완성 시 personA 삭제: 완성되는 순간 CompatInvite.personA가 비워지고 sourceCompatId에 invite 문자열을 넣지 않는다", async () => {
    const safePersonA = buildSafeInvitePerson(
      { name: "김콩닥", dob: "1995-05-15", time: "14:30", gender: "F" },
      "나"
    );

    mockInviteFindUnique.mockResolvedValue({
      id: "inv_test_2",
      token: VALID_TOKEN,
      creatorId: "user_creator_1",
      personA: safePersonA,
      relation: "crush",
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      completedAt: null,
      completedCompatId: null,
      completedShareToken: null,
    });

    let createdCompatData: Record<string, unknown> | null = null;
    mockCompatCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      createdCompatData = data;
      return {
        id: "compat_done_1",
        shareToken: "b1b2c3d4e5f60123456789ab",
        score: 88,
        keywords: ["다정한 호흡", "설레는 케미"],
        relation: "crush",
      };
    });

    let updatedInviteData: Record<string, unknown> | null = null;
    mockInviteUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      updatedInviteData = data;
      return { id: "inv_test_2" };
    });

    const req = new Request(`http://localhost:3000/api/compat/invite/${VALID_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personB: {
          name: "이설렘",
          dob: "1993-10-20",
          time: "09:15",
          gender: "M",
        },
        consentSharedResult: true,
      }),
    });

    const res = await completeInvitePOST(req, {
      params: Promise.resolve({ token: VALID_TOKEN }),
    });
    expect(res.status).toBe(200);

    // 완성되는 순간 CompatInvite.personA가 {}로 비워져야 한다
    expect(updatedInviteData).not.toBeNull();
    expect(updatedInviteData!.personA).toEqual({});
    expect(updatedInviteData!.completedCompatId).toBe("compat_done_1");
    expect(updatedInviteData!.completedShareToken).toBe("b1b2c3d4e5f60123456789ab");
    expect(updatedInviteData!.completedAt).toBeInstanceOf(Date);

    // Compatibility.sourceCompatId에는 "invite:..." 문자열을 넣지 않는다 (null)
    expect(createdCompatData).not.toBeNull();
    expect(createdCompatData!.sourceCompatId).toBeNull();
  });

  it("3) 72시간 만료: 72시간 지난 초대장은 GET과 POST 모두 410을 돌려주고 안내(status: expired)로 이어진다", async () => {
    const safePersonA = buildSafeInvitePerson(
      { name: "김콩닥", dob: "1995-05-15", time: null, gender: "F" },
      "나"
    );
    const expiredInvite = {
      id: "inv_expired",
      token: VALID_TOKEN,
      creatorId: null,
      personA: safePersonA,
      relation: "love",
      expiresAt: new Date(Date.now() - 1000), // 이미 72시간 경과
      completedAt: null,
      completedCompatId: null,
      completedShareToken: null,
    };

    mockInviteFindUnique.mockResolvedValue(expiredInvite);

    const getRes = await getInviteGET(
      new Request(`http://localhost:3000/api/compat/invite/${VALID_TOKEN}`),
      { params: Promise.resolve({ token: VALID_TOKEN }) }
    );
    expect(getRes.status).toBe(410);
    const getJson = await getRes.json();
    expect(getJson.status).toBe("expired");
    expect(mockInviteDeleteMany).toHaveBeenCalled();

    const postRes = await completeInvitePOST(
      new Request(`http://localhost:3000/api/compat/invite/${VALID_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personB: { name: "이설렘", dob: "1993-10-20", time: null, gender: "M" },
          consentSharedResult: true,
        }),
      }),
      { params: Promise.resolve({ token: VALID_TOKEN }) }
    );
    expect(postRes.status).toBe(410);
    const postJson = await postRes.json();
    expect(postJson.status).toBe("expired");
    expect(mockCompatCreate).not.toHaveBeenCalled();
  });

  it("4) 동의 없으면 400: consentSharedResult: true가 없으면 400으로 거절한다", async () => {
    const reqWithoutConsent = new Request(
      `http://localhost:3000/api/compat/invite/${VALID_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personB: { name: "이설렘", dob: "1993-10-20", time: null, gender: "M" },
        }),
      }
    );

    const res1 = await completeInvitePOST(reqWithoutConsent, {
      params: Promise.resolve({ token: VALID_TOKEN }),
    });
    expect(res1.status).toBe(400);

    const reqFalseConsent = new Request(
      `http://localhost:3000/api/compat/invite/${VALID_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personB: { name: "이설렘", dob: "1993-10-20", time: null, gender: "M" },
          consentSharedResult: false,
        }),
      }
    );

    const res2 = await completeInvitePOST(reqFalseConsent, {
      params: Promise.resolve({ token: VALID_TOKEN }),
    });
    expect(res2.status).toBe(400);
    expect(mockCompatCreate).not.toHaveBeenCalled();
  });

  it("5) 두 번째 완성 거절: 이미 완성된 초대장은 두 번째 완성을 409로 거절하고 완성된 결과(shareToken)로 안내한다", async () => {
    const completedInvite = {
      id: "inv_completed",
      token: VALID_TOKEN,
      creatorId: null,
      personA: {},
      relation: "love",
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      completedAt: new Date(),
      completedCompatId: "compat_done_1",
      completedShareToken: "b1b2c3d4e5f60123456789ab",
    };

    mockInviteFindUnique.mockResolvedValue(completedInvite);

    // GET 조회 시 완성 상태와 shareToken 반환
    const getRes = await getInviteGET(
      new Request(`http://localhost:3000/api/compat/invite/${VALID_TOKEN}`),
      { params: Promise.resolve({ token: VALID_TOKEN }) }
    );
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson).toEqual({
      status: "completed",
      shareToken: "b1b2c3d4e5f60123456789ab",
      relation: "love",
    });

    // 두 번째 POST 완성 요청 시 409 거절 + shareToken 안내, 새 Compatibility 생성 안 함
    const postRes = await completeInvitePOST(
      new Request(`http://localhost:3000/api/compat/invite/${VALID_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personB: { name: "박하늘", dob: "1996-03-11", time: null, gender: "M" },
          consentSharedResult: true,
        }),
      }),
      { params: Promise.resolve({ token: VALID_TOKEN }) }
    );
    expect(postRes.status).toBe(409);
    const postJson = await postRes.json();
    expect(postJson.status).toBe("completed");
    expect(postJson.shareToken).toBe("b1b2c3d4e5f60123456789ab");
    expect(mockCompatCreate).not.toHaveBeenCalled();
  });

  it("6) 응답에 사주 값 없음: 조회·완성·생성 응답과 localStorage 어디에도 fourPillars·dayMaster·elementsScore·birthHash가 포함되지 않는다", async () => {
    const safePersonA = buildSafeInvitePerson(
      { name: "김콩닥", dob: "1995-05-15", time: "14:30", gender: "F" },
      "나"
    );

    mockInviteFindUnique.mockResolvedValue({
      id: "inv_test_6",
      token: VALID_TOKEN,
      creatorId: null,
      personA: safePersonA,
      relation: "love",
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      completedAt: null,
      completedCompatId: null,
      completedShareToken: null,
    });

    // 6-1. GET 응답 검사
    const getRes = await getInviteGET(
      new Request(`http://localhost:3000/api/compat/invite/${VALID_TOKEN}`),
      { params: Promise.resolve({ token: VALID_TOKEN }) }
    );
    const getJson = await getRes.json();
    const getRaw = JSON.stringify(getJson);
    expect(getJson).toEqual({
      status: "pending",
      nameA: "김콩닥",
      relation: "love",
    });
    expect(getRaw).not.toContain("fourPillars");
    expect(getRaw).not.toContain("dayMaster");
    expect(getRaw).not.toContain("elementsScore");
    expect(getRaw).not.toContain("birthHash");
    expect(getRaw).not.toContain("gender");

    // 6-2. POST 완성 응답 검사
    mockCompatCreate.mockResolvedValue({
      id: "compat_done_6",
      shareToken: "c1b2c3d4e5f60123456789ab",
      score: 91,
      keywords: ["천생연분"],
      relation: "love",
    });
    mockInviteUpdate.mockResolvedValue({ id: "inv_test_6" });

    const postRes = await completeInvitePOST(
      new Request(`http://localhost:3000/api/compat/invite/${VALID_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personB: { name: "이설렘", dob: "1993-10-20", time: "09:15", gender: "M" },
          consentSharedResult: true,
        }),
      }),
      { params: Promise.resolve({ token: VALID_TOKEN }) }
    );
    const postJson = await postRes.json();
    const postRaw = JSON.stringify(postJson);
    expect(postRaw).not.toContain("fourPillars");
    expect(postRaw).not.toContain("dayMaster");
    expect(postRaw).not.toContain("elementsScore");
    expect(postRaw).not.toContain("birthHash");

    // 6-3. localStorage 헬퍼 검사 ({ token, createdAt }만 보관)
    const storageMap = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => storageMap.get(k) ?? null,
        setItem: (k: string, v: string) => storageMap.set(k, v),
        removeItem: (k: string) => storageMap.delete(k),
      },
    });
    const now = Date.now();
    saveSentInvite(VALID_TOKEN, now);
    const storedRaw = storageMap.get(SENT_INVITES_STORAGE_KEY) || "";
    expect(storedRaw).not.toContain("nameA");
    expect(storedRaw).not.toContain("dob");
    expect(loadSentInvites(now)).toEqual([{ token: VALID_TOKEN, createdAt: now }]);
    vi.unstubAllGlobals();
  });

  it("7) 한도 초과 429: 생성 및 완성 한도 초과 시 429를 돌려준다", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      retryAfterMs: 60000,
      remaining: { minute: 0, day: 0 },
    });

    const createRes = await createInvitePOST(
      new Request("http://localhost:3000/api/compat/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personA: { name: "김콩닥", dob: "1995-05-15", time: null, gender: "F" },
          relation: "love",
        }),
      })
    );
    expect(createRes.status).toBe(429);
    expect(mockInviteCreate).not.toHaveBeenCalled();

    mockCheckChatRateLimit.mockResolvedValueOnce({
      allowed: false,
      retryAfterMs: 60000,
    });

    const completeRes = await completeInvitePOST(
      new Request(`http://localhost:3000/api/compat/invite/${VALID_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personB: { name: "이설렘", dob: "1993-10-20", time: null, gender: "M" },
          consentSharedResult: true,
        }),
      }),
      { params: Promise.resolve({ token: VALID_TOKEN }) }
    );
    expect(completeRes.status).toBe(429);
    expect(mockCompatCreate).not.toHaveBeenCalled();
  });
});
