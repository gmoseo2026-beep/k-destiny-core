import { describe, it, expect, beforeEach } from "vitest";
import { personSubject, coupleSubject } from "@/lib/reports/subjectKey";
import type { PersonInput } from "@/lib/validation/inputs";

describe("subjectKey HMAC hashing", () => {
  beforeEach(() => {
    process.env.SUBJECT_HASH_SECRET = "x".repeat(32);
  });

  const p1: PersonInput = {
    name: "홍길동",
    dob: "1990-01-01",
    time: "12:00",
    gender: "M",
  };

  const p2: PersonInput = {
    name: "성춘향",
    dob: "1990-01-01",
    time: "12:00",
    gender: "M",
  };

  it("personSubject produces 64-character hex hash", () => {
    const hash = personSubject(p1);
    expect(hash).toMatch(/^[a-f0-9]{64}$/i);
  });

  it("personSubject does not contain raw PII like name or dob", () => {
    const hash = personSubject(p1);
    expect(hash.includes("홍길동")).toBe(false);
    expect(hash.includes("1990-01-01")).toBe(false);
  });

  it("same input yields same hash, different name yields different hash", () => {
    const hash1 = personSubject(p1);
    const hash1Copy = personSubject({ ...p1 });
    const hash2 = personSubject(p2);

    expect(hash1).toBe(hash1Copy);
    expect(hash1).not.toBe(hash2);
  });

  it("coupleSubject produces 64-character hex hash without exposing raw ID directly", () => {
    const compatId = "compat_123456789";
    const hash = coupleSubject(compatId);
    expect(hash).toMatch(/^[a-f0-9]{64}$/i);
    expect(hash.includes(compatId)).toBe(false);
    expect(coupleSubject(compatId)).toBe(hash);
  });
});
