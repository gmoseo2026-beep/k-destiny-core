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
