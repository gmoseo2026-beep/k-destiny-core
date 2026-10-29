import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSendNotification = vi.fn();
const mockSetVapidDetails = vi.fn();

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: (...args: unknown[]) => mockSetVapidDetails(...args),
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
  },
}));

const mockPushFindMany = vi.fn();
const mockPushDelete = vi.fn();
const mockInviteFindUnique = vi.fn();
const mockInviteUpdate = vi.fn();
const mockInviteUpdateMany = vi.fn();
const mockInviteDeleteMany = vi.fn();
const mockCompatCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    pushSubscription: {
      findMany: (...args: unknown[]) => mockPushFindMany(...args),
      delete: (...args: unknown[]) => mockPushDelete(...args),
    },
    compatInvite: {
      findUnique: (...args: unknown[]) => mockInviteFindUnique(...args),
      update: (...args: unknown[]) => mockInviteUpdate(...args),
      updateMany: (...args: unknown[]) => mockInviteUpdateMany(...args),
      deleteMany: (...args: unknown[]) => mockInviteDeleteMany(...args),
    },
    compatibility: {
      create: (...args: unknown[]) => mockCompatCreate(...args),
    },
  },
}));

vi.mock("@/lib/rateLimiter", () => ({
  getClientIp: () => "203.0.113.20",
  checkChatRateLimit: async () => ({ allowed: true }),
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

import {
  buildInviteCompletedPushPayload,
  sendInviteCompletedPush,
} from "@/lib/invitePush";
import {
  buildSafeInvitePerson,
  INVITE_TTL_MS,
  markReceivedInviteCompleted,
  isReceivedInviteResult,
} from "@/lib/compatInvite";
import { POST as completeInvitePOST } from "@/app/api/compat/invite/[token]/route";

const VALID_TOKEN = "a1b2c3d4e5f60123456789ab";

describe("09 반쪽 초대장 완성 웹 푸시 알림 단위 테스트", () => {
  const prevPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const prevPrivate = process.env.VAPID_PRIVATE_KEY;
  const prevSubject = process.env.VAPID_SUBJECT;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BIRTH_HASH_PEPPER = "test-only-pepper";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-vapid-public-key";
    process.env.VAPID_PRIVATE_KEY = "test-vapid-private-key";
    process.env.VAPID_SUBJECT = "mailto:help@kongdak.kr";
    mockInviteDeleteMany.mockResolvedValue({ count: 0 });
    mockInviteUpdateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = prevPublic;
    if (prevPrivate === undefined) delete process.env.VAPID_PRIVATE_KEY;
    else process.env.VAPID_PRIVATE_KEY = prevPrivate;
    if (prevSubject === undefined) delete process.env.VAPID_SUBJECT;
    else process.env.VAPID_SUBJECT = prevSubject;
    vi.unstubAllGlobals();
  });

  it("1) 알림 문구 규격: 정직한 완성 문구와 결과 링크만 담고 과장 표현을 넣지 않는다", () => {
    const payload = buildInviteCompletedPushPayload({
      receiverName: "이설렘",
      shareToken: "share_tok_123",
      baseUrl: "https://kongdak.kr",
    });

    expect(payload.body).toBe("이설렘님이 반쪽을 채워서 두 분의 궁합이 완성됐어요 💌");
    expect(payload.url).toBe("https://kongdak.kr/ko/compat/share_tok_123");
    expect(payload.body).not.toContain("속마음");
    expect(payload.body).not.toContain("열렸");

    const fallbackPayload = buildInviteCompletedPushPayload({
      receiverName: "   ",
      shareToken: "share_tok_456",
      baseUrl: "https://kongdak.kr/",
    });
    expect(fallbackPayload.body).toBe("상대방님이 반쪽을 채워서 두 분의 궁합이 완성됐어요 💌");
    expect(fallbackPayload.url).toBe("https://kongdak.kr/ko/compat/share_tok_456");
  });

  it("2) 비회원 초대장(creatorId 없음)은 구독 조회 및 푸시 전송을 건너뛴다", async () => {
    const res = await sendInviteCompletedPush({
      creatorId: null,
      receiverName: "이설렘",
      shareToken: "share_tok_guest",
    });

    expect(res).toEqual({ sentCount: 0, removedCount: 0 });
    expect(mockPushFindMany).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("3) 회원 구독자에게 웹 푸시를 보내고 만료된(410/404) 구독은 정리한다", async () => {
    mockPushFindMany.mockResolvedValue([
      {
        id: "sub_active",
        endpoint: "https://push.example.com/active",
        p256dh: "key_p256dh_1",
        auth: "key_auth_1",
      },
      {
        id: "sub_expired",
        endpoint: "https://push.example.com/expired",
        p256dh: "key_p256dh_2",
        auth: "key_auth_2",
      },
    ]);

    mockSendNotification.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint.endsWith("/expired")) {
        const err = Object.assign(new Error("Gone"), { statusCode: 410 });
        throw err;
      }
      return {};
    });
    mockPushDelete.mockResolvedValue({ id: "sub_expired" });

    const res = await sendInviteCompletedPush({
      creatorId: "user_member_1",
      receiverName: "이설렘",
      shareToken: "share_tok_member",
    });

    expect(res).toEqual({ sentCount: 1, removedCount: 1 });
    expect(mockSetVapidDetails).toHaveBeenCalledWith(
      "mailto:help@kongdak.kr",
      "test-vapid-public-key",
      "test-vapid-private-key"
    );
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    expect(mockPushDelete).toHaveBeenCalledWith({ where: { id: "sub_expired" } });
  });

  it("4) 초대장 완성 API 연결: 회원 생성자에게 푸시 발송 성공 시 pushSent=true를 반환하고, 푸시 실패 시에도 완성(200)을 막지 않는다", async () => {
    const safePersonA = buildSafeInvitePerson(
      { name: "김콩닥", dob: "1995-05-15", time: "14:30", gender: "F" },
      "나"
    );

    mockInviteFindUnique.mockResolvedValue({
      id: "inv_push_1",
      token: VALID_TOKEN,
      creatorId: "user_creator_push",
      personA: safePersonA,
      relation: "love",
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      completedAt: null,
      completedCompatId: null,
      completedShareToken: null,
    });

    mockCompatCreate.mockResolvedValue({
      id: "compat_push_1",
      shareToken: "share_push_done_1",
      score: 92,
      keywords: ["다정한 케미"],
      relation: "love",
    });
    mockInviteUpdate.mockResolvedValue({ id: "inv_push_1" });
    mockPushFindMany.mockResolvedValue([
      {
        id: "sub_1",
        endpoint: "https://push.example.com/1",
        p256dh: "p1",
        auth: "a1",
      },
    ]);
    mockSendNotification.mockResolvedValueOnce({});

    const req1 = new Request(`http://localhost:3000/api/compat/invite/${VALID_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personB: { name: "이설렘", dob: "1993-10-20", time: null, gender: "M" },
        consentSharedResult: true,
      }),
    });

    const res1 = await completeInvitePOST(req1, {
      params: Promise.resolve({ token: VALID_TOKEN }),
    });
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.pushSent).toBe(true);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const sentPayload = JSON.parse(mockSendNotification.mock.calls[0][1] as string);
    expect(sentPayload.body).toBe("이설렘님이 반쪽을 채워서 두 분의 궁합이 완성됐어요 💌");
    expect(sentPayload.url).toContain("/ko/compat/share_push_done_1");

    // 푸시 전송이 예외를 던져도 초대장 완성 응답은 200으로 정상 완료된다
    mockSendNotification.mockRejectedValueOnce(new Error("push network down"));
    const req2 = new Request(`http://localhost:3000/api/compat/invite/${VALID_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personB: { name: "이설렘", dob: "1993-10-20", time: null, gender: "M" },
        consentSharedResult: true,
      }),
    });
    const res2 = await completeInvitePOST(req2, {
      params: Promise.resolve({ token: VALID_TOKEN }),
    });
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.pushSent).toBe(false);
  });

  it("5) 받는 사람 세션 표시 헬퍼는 개인정보 없이 shareToken 기준 플래그만 기록한다", () => {
    const sessionMap = new Map<string, string>();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (k: string) => sessionMap.get(k) ?? null,
        setItem: (k: string, v: string) => sessionMap.set(k, v),
      },
    });

    expect(isReceivedInviteResult("tok_abc")).toBe(false);
    markReceivedInviteCompleted("tok_abc");
    expect(isReceivedInviteResult("tok_abc")).toBe(true);
    expect(isReceivedInviteResult("tok_other")).toBe(false);
    expect([...sessionMap.values()]).toEqual(["1"]);
  });
});
