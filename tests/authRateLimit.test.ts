import { describe, it, expect, vi, beforeEach } from "vitest";

// 로그인·가입 시도 제한(비밀번호 무차별 대입 방지). Redis 없이 메모리 저장소로 동작을 확인한다.
beforeEach(() => {
  vi.resetModules();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

describe("checkAuthRateLimit", () => {
  it("같은 키는 1분에 5번까지만 허용한다", async () => {
    const { checkAuthRateLimit } = await import("@/lib/rateLimiter");
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await checkAuthRateLimit("login:a@example.com")).allowed);
    expect(results).toEqual([true, true, true, true, true, false]);
  });

  it("키가 다르면 따로 센다", async () => {
    const { checkAuthRateLimit } = await import("@/lib/rateLimiter");
    for (let i = 0; i < 5; i++) await checkAuthRateLimit("login:a@example.com");
    expect((await checkAuthRateLimit("login:a@example.com")).allowed).toBe(false);
    expect((await checkAuthRateLimit("login:b@example.com")).allowed).toBe(true);
  });

  it("하루 30번을 넘으면 분이 바뀌어도 막는다", async () => {
    vi.useFakeTimers();
    try {
      const { checkAuthRateLimit } = await import("@/lib/rateLimiter");
      let allowed = 0;
      for (let i = 0; i < 40; i++) {
        if ((await checkAuthRateLimit("register:1.2.3.4")).allowed) allowed++;
        vi.advanceTimersByTime(61 * 1000);
      }
      expect(allowed).toBe(30);
    } finally {
      vi.useRealTimers();
    }
  });
});
