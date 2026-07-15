/**
 * User State Manager — localStorage-based persistence for K-Destiny.
 * Manages profile (saju info), selected master, and last analysis result.
 * Can be migrated to Supabase DB later.
 */

// ─── Types ───
export interface UserProfile {
  name: string;
  year: string;
  month: string;
  day: string;
  time: string;
  unknownTime: boolean;
  country: string;
  city: string;
  gender: string;
  savedAt: string; // ISO timestamp
}

export interface SavedResult {
  core_essence: string;
  imminent_karma_teaser: string;
  locked_secrets: string;
  lucky_elements: string[];
  element_analysis: Record<string, number>;
  savedAt: string; // ISO timestamp
}

// ─── Keys ───
const KEYS = {
  PROFILE: "kdestiny_profile",
  MASTER: "kdestiny_master",
  LAST_RESULT: "kdestiny_last_result",
  PREMIUM: "kdestiny_premium",
  PREMIUM_EXPIRY: "kdestiny_premium_expiry",
  KARMA_CURRENT: "kdestiny_karma_current",
  KARMA_MAX: "kdestiny_karma_max",
} as const;

// ─── Helpers ───
function safeGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ─── Profile (Saju Info) ───
export function getProfile(): UserProfile | null {
  return safeGet<UserProfile>(KEYS.PROFILE);
}

export function saveProfile(profile: Omit<UserProfile, "savedAt">): void {
  safeSet(KEYS.PROFILE, {
    ...profile,
    savedAt: new Date().toISOString(),
  });
}

export function clearProfile(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEYS.PROFILE);
  }
}

// ─── Master ───
export function getMaster(): number | null {
  return safeGet<number>(KEYS.MASTER);
}

export function saveMaster(masterId: number): void {
  safeSet(KEYS.MASTER, masterId);
}

export function clearMaster(): void {
  safeRemove(KEYS.MASTER);
}

// ─── Last Analysis Result ───
export function getLastResult(): SavedResult | null {
  return safeGet<SavedResult>(KEYS.LAST_RESULT);
}

export function saveLastResult(data: Omit<SavedResult, "savedAt">): void {
  safeSet(KEYS.LAST_RESULT, { ...data, savedAt: new Date().toISOString() });
}

export function clearLastResult(): void {
  safeRemove(KEYS.LAST_RESULT);
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("destiny_result_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// ─── Premium & Karma ───
export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEYS.PREMIUM) === "true";
}

export function getKarma(): { current: number; max: number } {
  const max = safeGet<number>(KEYS.KARMA_MAX) ?? 5; // Default max is 5
  const current = safeGet<number>(KEYS.KARMA_CURRENT) ?? max;
  return { current, max };
}

export function saveKarma(current: number, max: number): void {
  safeSet(KEYS.KARMA_CURRENT, current);
  safeSet(KEYS.KARMA_MAX, max);
}

export function updateKarmaForPlan(planId: string): void {
  const karmaMap: Record<string, number> = {
    "1month": 5,
    "3months": 10,
    "6months": 15,
    "1year": 20,
    "single": 5,
  };
  const max = karmaMap[planId] || 5;
  saveKarma(max, max); // Refill current to max
}

export function saveExpiryDate(planId: string): void {
  const daysMap: Record<string, number> = {
    "1month": 30,
    "3months": 90,
    "6months": 180,
    "1year": 365,
    "single": 0, // No duration
  };
  const days = daysMap[planId] || 0;
  if (days > 0) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    safeSet(KEYS.PREMIUM_EXPIRY, expiryDate.toISOString());
  }
}

export function getExpiryStatus(): { isExpired: boolean; expiryDate: string | null; remainingDays: number } {
  let expiryStr = safeGet<string>(KEYS.PREMIUM_EXPIRY);
  
  // Auto-migrate existing premium users who don't have an expiry date
  if (!expiryStr && isPremium()) {
    saveExpiryDate("1year"); // Default existing users to 1 year
    expiryStr = safeGet<string>(KEYS.PREMIUM_EXPIRY);
  }

  if (!expiryStr) {
    return { isExpired: false, expiryDate: null, remainingDays: 0 };
  }
  
  const expiry = new Date(expiryStr);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // If diffDays is less than or equal to 0, it's expired
  return {
    isExpired: diffDays <= 0,
    expiryDate: expiryStr,
    remainingDays: diffDays,
  };
}

// ─── Nuclear Logout: Clear ALL User Data ───
/**
 * Wipes ALL user-specific client state from localStorage and sessionStorage.
 * Must be called from every logout point (LoginButton, Dashboard sidebar, etc.)
 */
export function clearAllUserData(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("kdestiny_") ||
          key.startsWith("destiny_result_") ||
          key === "mock_supabase_user" ||
          key === "app_version")
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    sessionStorage.clear();
  } catch {
    // Ignore storage errors in SSR or restricted environments
  }
}

// ─── Onboarding Check ───
export function hasCompletedOnboarding(): boolean {
  return getProfile() !== null && getMaster() !== null;
}

export function hasExistingResult(): boolean {
  return getLastResult() !== null;
}

