/**
 * IP-based Rate Limiter (Sliding Window)
 * - Free tier: 3 requests/minute, 10 requests/day per IP
 * - Returns remaining quota info for client-side display
 */

interface RateLimitEntry {
  minuteTimestamps: number[];
  dayTimestamps: number[];
}

const MINUTE_LIMIT = 3;
const DAY_LIMIT = 10;
const MINUTE_WINDOW = 60 * 1000;       // 1 minute
const DAY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

const ipStore = new Map<string, RateLimitEntry>();

// Periodic cleanup of stale IP entries (every 10 minutes)
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 10 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [ip, entry] of ipStore) {
    // Remove entries where all timestamps are older than 24h
    const recentDay = entry.dayTimestamps.filter((t) => now - t < DAY_WINDOW);
    if (recentDay.length === 0) {
      ipStore.delete(ip);
    }
  }
}

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
 * Check rate limit for a given IP.
 * Returns { allowed: boolean, retryAfterMs?: number, remaining: { minute, day } }
 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  retryAfterMs?: number;
  remaining: { minute: number; day: number };
} {
  cleanup();

  const now = Date.now();

  if (!ipStore.has(ip)) {
    ipStore.set(ip, { minuteTimestamps: [], dayTimestamps: [] });
  }

  const entry = ipStore.get(ip)!;

  // Prune expired timestamps
  entry.minuteTimestamps = entry.minuteTimestamps.filter((t) => now - t < MINUTE_WINDOW);
  entry.dayTimestamps = entry.dayTimestamps.filter((t) => now - t < DAY_WINDOW);

  const minuteRemaining = MINUTE_LIMIT - entry.minuteTimestamps.length;
  const dayRemaining = DAY_LIMIT - entry.dayTimestamps.length;

  // Check daily limit first (stricter)
  if (dayRemaining <= 0) {
    const oldestDay = entry.dayTimestamps[0];
    const retryAfterMs = DAY_WINDOW - (now - oldestDay);
    return {
      allowed: false,
      retryAfterMs,
      remaining: { minute: 0, day: 0 },
    };
  }

  // Check per-minute limit
  if (minuteRemaining <= 0) {
    const oldestMinute = entry.minuteTimestamps[0];
    const retryAfterMs = MINUTE_WINDOW - (now - oldestMinute);
    return {
      allowed: false,
      retryAfterMs,
      remaining: { minute: 0, day: dayRemaining },
    };
  }

  return {
    allowed: true,
    remaining: { minute: minuteRemaining, day: dayRemaining },
  };
}

/**
 * Record a successful API call for the given IP.
 */
export function recordRequest(ip: string): void {
  const now = Date.now();
  if (!ipStore.has(ip)) {
    ipStore.set(ip, { minuteTimestamps: [], dayTimestamps: [] });
  }
  const entry = ipStore.get(ip)!;
  entry.minuteTimestamps.push(now);
  entry.dayTimestamps.push(now);
}

// Chat Specific Rate Limiter (20/min, 100/day for fluid experience)
const chatIpStore = new Map<string, RateLimitEntry>();
const CHAT_MINUTE_LIMIT = 20;
const CHAT_DAY_LIMIT = 100;

export function checkChatRateLimit(ip: string): {
  allowed: boolean;
  retryAfterMs?: number;
} {
  const now = Date.now();
  if (!chatIpStore.has(ip)) {
    chatIpStore.set(ip, { minuteTimestamps: [], dayTimestamps: [] });
  }
  const entry = chatIpStore.get(ip)!;

  entry.minuteTimestamps = entry.minuteTimestamps.filter((t) => now - t < MINUTE_WINDOW);
  entry.dayTimestamps = entry.dayTimestamps.filter((t) => now - t < DAY_WINDOW);

  if (entry.dayTimestamps.length >= CHAT_DAY_LIMIT) {
    const oldestDay = entry.dayTimestamps[0];
    return { allowed: false, retryAfterMs: DAY_WINDOW - (now - oldestDay) };
  }

  if (entry.minuteTimestamps.length >= CHAT_MINUTE_LIMIT) {
    const oldestMinute = entry.minuteTimestamps[0];
    return { allowed: false, retryAfterMs: MINUTE_WINDOW - (now - oldestMinute) };
  }

  return { allowed: true };
}

export function recordChatRequest(ip: string): void {
  const now = Date.now();
  if (!chatIpStore.has(ip)) {
    chatIpStore.set(ip, { minuteTimestamps: [], dayTimestamps: [] });
  }
  const entry = chatIpStore.get(ip)!;
  entry.minuteTimestamps.push(now);
  entry.dayTimestamps.push(now);
}

