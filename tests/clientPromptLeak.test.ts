import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * 2026-10-03: FortuneNewClient·CompatNewClient·StandardProductDetail 이 PRODUCT_SPECS 를 직접 import 해서
 * 상품별 AI 지시문(angle·voice·brief·guardrails)이 브라우저 JS 에 실려 나갔다.
 * 클라이언트 컴포넌트("use client")는 프롬프트·생성 모듈을 값으로 import 하지 않는다(타입 import 만 허용).
 * 섹션 제목이 필요하면 서버 페이지가 lib/prompts/sectionOutline 으로 만들어 props 로 넘긴다.
 */
const SERVER_ONLY = [
  "@/lib/prompts/",
  "@/lib/destinyGen",
  "@/lib/premium/generate",
  "@/lib/gen/",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

describe("클라이언트 번들에 프롬프트 원문이 실리지 않는다", () => {
  it("'use client' 파일은 프롬프트·생성 모듈을 타입으로만 import 한다", () => {
    const offenders: string[] = [];
    for (const dir of ["app", "components", "lib"]) {
      for (const file of walk(path.join(process.cwd(), dir))) {
        const src = fs.readFileSync(file, "utf-8");
        if (!/^\s*["']use client["']/.test(src)) continue;
        const imports = src.match(/^import\s[^;]*?from\s+["'][^"']+["'];?/gm) ?? [];
        for (const line of imports) {
          if (/^import\s+type\s/.test(line)) continue;
          if (SERVER_ONLY.some((m) => line.includes(`"${m}`) || line.includes(`'${m}`))) {
            offenders.push(`${path.relative(process.cwd(), file)}: ${line.replace(/\s+/g, " ")}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
