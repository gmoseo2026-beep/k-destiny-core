/**
 * IP-based Rate Limiter — v2
 *
 * - Free tier (destiny generation): 3 requests/minute, 10 requests/day per IP
 * - Chat/Sync: 20 requests/minute, 100 requests/day per IP
 * - Guest chat (no session): additional hard cap of 3 requests/day per IP
 *
 * v2 changes:
 *   1. DURABLE BACKEND — if UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 *      are set, counting happens in Upstash Redis via its REST API (no npm
 *      dependency needed). This matters on serverless: the old in-memory Map
 *      resets on every cold start / lives per-instance, so the limits were
 *      effectively decorative in production. Without the env vars we fall
 *      back to the previous in-memory behavior (fine for local dev).
 *   2. check* functions are now async and COUNT on check (fixed window).
 *      recordRequest / recordChatRequest are kept as deprecated no-ops so
 *      existing call sites keep compiling; counting happens inside check*.
 */

interface RateLimitEntry {
  minuteTimestamps: number[];
  dayTimestamps: number[];
}

const MINUTE_LIMIT = 3;
const DAY_LIMIT = 10;
const CHAT_MINUTE_LIMIT = 20;
const CHAT_DAY_LIMIT = 100;
const GUEST_CHAT_DAY_LIMIT = 3;

const MINUTE_WINDOW = 60 * 1000;        // 1 minute
const DAY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

// ─────────────────────────────────────────────
// Upstash Redis (REST) backend — dependency-free
// ─────────────────────────────────────────────
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

function redisEnabled(): boolean {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN);
}

/**
 * Fixed-window counter: INCR the key, set the TTL on first hit.
 * Returns the current count in the window, or null on any failure
 * (caller falls back to in-memory so an Upstash outage never blocks users).
 */
async function redisIncr(key: string, windowSec: number): Promise<number | null> {
  try {
    const headers = { Authorization: `Bearer ${UPSTASH_TOKEN}` };
    const res = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(key)}`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const { result } = (await res.json()) as { result?: number };
    if (typeof result !== "number") return null;
    if (result === 1) {
      // First hit of this window → arm the expiry (fire-and-forget on failure)
      await fetch(`${UPSTASH_URL}/expire/${encodeURIComponent(key)}/${windowSec}`, {
        headers,
        cache: "no-store",
      }).catch(() => {});
    }
    return result;
  } catch {
    return null;
  }
}

/** Bucketed window keys (stable even if EXPIRE fails). */
function minuteBucket(): number { return Math.floor(Date.now() / MINUTE_WINDOW); }
function dayBucket(): string { return new Date().toISOString().slice(0, 10); }

/**
 * Generic dual-window (minute + day) check against Redis.
 * Returns null if Redis is unavailable → caller uses in-memory fallback.
 */
async function redisDualCheck(
  prefix: string,
  ip: string,
  minuteLimit: number,
  dayLimit: number
): Promise<{ allowed: boolean; retryAfterMs?: number; remaining: { minute: number; day: number } } | null> {
  if (!redisEnabled()) return null;

  const dayKey = `rl:${prefix}:d:${dayBucket()}:${ip}`;
  const dayCount = await redisIncr(dayKey, 26 * 60 * 60);
  if (dayCount === null) return null;
  if (dayCount > dayLimit) {
    return { allowed: false, retryAfterMs: DAY_WINDOW, remaining: { minute: 0, day: 0 } };
  }

  const minKey = `rl:${prefix}:m:${minuteBucket()}:${ip}`;
  const minCount = await redisIncr(minKey, 120);
  if (minCount === null) return null;
  if (minCount > minuteLimit) {
    return {
      allowed: false,
      retryAfterMs: MINUTE_WINDOW,
      remaining: { minute: 0, day: Math.max(0, dayLimit - dayCount) },
    };
  }

  return {
    allowed: true,
    remaining: {
      minute: Math.max(0, minuteLimit - minCount),
      day: Math.max(0, dayLimit - dayCount),
    },
  };
}

// ─────────────────────────────────────────────
// In-memory fallback (dev / Redis unavailable)
// ─────────────────────────────────────────────
const ipStore = new Map<string, RateLimitEntry>();
const chatIpStore = new Map<string, RateLimitEntry>();
const guestChatIpStore = new Map<string, RateLimitEntry>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 10 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const store of [ipStore, chatIpStore, guestChatIpStore]) {
    for (const [ip, entry] of store) {
      const recentDay = entry.dayTimestamps.filter((t) => now - t < DAY_WINDOW);
      if (recentDay.length === 0) store.delete(ip);
    }
  }
}

/**
 * In-memory sliding-window check. COUNTS on success (v2: counting moved
 * here from the old record* functions).
 */
function memoryCheck(
  store: Map<string, RateLimitEntry>,
  ip: string,
  minuteLimit: number,
  dayLimit: number
): { allowed: boolean; retryAfterMs?: number; remaining: { minute: number; day: number } } {
  cleanup();
  const now = Date.now();

  if (!store.has(ip)) {
    store.set(ip, { minuteTimestamps: [], dayTimestamps: [] });
  }
  const entry = store.get(ip)!;

  entry.minuteTimestamps = entry.minuteTimestamps.filter((t) => now - t < MINUTE_WINDOW);
  entry.dayTimestamps = entry.dayTimestamps.filter((t) => now - t < DAY_WINDOW);

  if (entry.dayTimestamps.length >= dayLimit) {
    const oldestDay = entry.dayTimestamps[0];
    return {
      allowed: false,
      retryAfterMs: DAY_WINDOW - (now - oldestDay),
      remaining: { minute: 0, day: 0 },
    };
  }

  if (entry.minuteTimestamps.length >= minuteLimit) {
    const oldestMinute = entry.minuteTimestamps[0];
    return {
      allowed: false,
      retryAfterMs: MINUTE_WINDOW - (now - oldestMinute),
      remaining: { minute: 0, day: dayLimit - entry.dayTimestamps.length },
    };
  }

  // Allowed → count it now
  entry.minuteTimestamps.push(now);
  entry.dayTimestamps.push(now);

  return {
    allowed: true,
    remaining: {
      minute: minuteLimit - entry.minuteTimestamps.length,
      day: dayLimit - entry.dayTimestamps.length,
    },
  };
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Extract client IP from request headers.
 * Works with Vercel, Cloudflare, nginx, and direct connections.
 */
export function getClientIp(req: Request): string {
  const headers = new Headers(req.headers);
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Destiny-generation limit: 3/min, 10/day per IP. Counts on check.
 */
export async function checkRateLimit(ip: string): Promise<{
  allowed: boolean;
  retryAfterMs?: number;
  remaining: { minute: number; day: number };
}> {
  const viaRedis = await redisDualCheck("destiny", ip, MINUTE_LIMIT, DAY_LIMIT);
  if (viaRedis) return viaRedis;
  return memoryCheck(ipStore, ip, MINUTE_LIMIT, DAY_LIMIT);
}

/**
 * Chat/Sync limit: 20/min, 100/day per IP. Counts on check.
 */
export async function checkChatRateLimit(ip: string): Promise<{
  allowed: boolean;
  retryAfterMs?: number;
}> {
  const viaRedis = await redisDualCheck("chat", ip, CHAT_MINUTE_LIMIT, CHAT_DAY_LIMIT);
  if (viaRedis) return { allowed: viaRedis.allowed, retryAfterMs: viaRedis.retryAfterMs };
  const mem = memoryCheck(chatIpStore, ip, CHAT_MINUTE_LIMIT, CHAT_DAY_LIMIT);
  return { allowed: mem.allowed, retryAfterMs: mem.retryAfterMs };
}

/**
 * Guest (no session) chat backstop: 3/day per IP, on top of the general
 * chat limit. Prevents unlimited anonymous Gemini usage — logged-in users
 * are governed by karma tokens instead.
 */
export async function checkGuestChatLimit(ip: string): Promise<{ allowed: boolean }> {
  const viaRedis = await redisDualCheck("gchat", ip, GUEST_CHAT_DAY_LIMIT, GUEST_CHAT_DAY_LIMIT);
  if (viaRedis) return { allowed: viaRedis.allowed };
  const mem = memoryCheck(guestChatIpStore, ip, GUEST_CHAT_DAY_LIMIT, GUEST_CHAT_DAY_LIMIT);
  return { allowed: mem.allowed };
}

/** @deprecated counting now happens inside checkRateLimit(). Kept as a no-op. */
export function recordRequest(_ip: string): void { /* no-op */ }

/** @deprecated counting now happens inside checkChatRateLimit(). Kept as a no-op. */
export function recordChatRequest(_ip: string): void { /* no-op */ }
