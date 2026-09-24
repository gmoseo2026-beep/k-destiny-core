import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * .isHidden 직접 접근 허용 파일 목록 (A11-3 지시문 기준)
 * - lib/catalog.ts: 기본 카탈로그 데이터 정의 및 순수 헬퍼
 * - lib/catalogVisibility.ts: 오버라이드 resolver
 * - 서버 페이지(effectiveCatalog/effectiveProduct 를 사용하는 곳)
 * - 클라이언트 컴포넌트(서버가 prop으로 넘겨준 effective 목록을 사용하는 곳)
 */
const ALLOWED_FILES = new Set([
  // Core catalog & resolver
  path.normalize("lib/catalog.ts"),
  path.normalize("lib/catalogVisibility.ts"),

  // Server Pages using effectiveCatalog / effectiveProduct
  path.normalize("app/[locale]/products/[id]/page.tsx"),
  path.normalize("app/[locale]/premium/[id]/new/page.tsx"),
  path.normalize("app/[locale]/page.tsx"),
  path.normalize("app/[locale]/fortune/new/page.tsx"),
  path.normalize("app/[locale]/compat/new/page.tsx"),

  // Client components receiving effective products as props
  path.normalize("components/product/StandardProductDetail.tsx"),
  path.normalize("components/home/ProductGrid.tsx"),
  path.normalize("components/home/PremiumBanner.tsx"),
  path.normalize("components/home/MoreContentCards.tsx"),
  path.normalize("components/home/HomeSearch.tsx"),
]);

const TARGET_DIRS = ["app", "components", "lib"];

function scanDirectory(dirPath: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return fileList;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== ".git") {
        scanDirectory(fullPath, fileList);
      }
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") || entry.name.endsWith(".js") || entry.name.endsWith(".jsx"))
    ) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

describe("A11-3: isHidden usage regression test", () => {
  it("only allowed files should directly access .isHidden property", () => {
    const rootDir = process.cwd();
    const allFiles: string[] = [];

    for (const dir of TARGET_DIRS) {
      scanDirectory(path.join(rootDir, dir), allFiles);
    }

    const isHiddenRegex = /\.isHidden\b/;
    const violations: { file: string; line: number; content: string }[] = [];

    for (const filePath of allFiles) {
      const relPath = path.normalize(path.relative(rootDir, filePath));
      if (ALLOWED_FILES.has(relPath)) {
        continue;
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        // 주석 줄 제외
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
          return;
        }

        if (isHiddenRegex.test(line)) {
          violations.push({
            file: relPath,
            line: idx + 1,
            content: trimmed,
          });
        }
      });
    }

    if (violations.length > 0) {
      console.error("Found unauthorized .isHidden usages:", violations);
    }

    expect(violations).toEqual([]);
  });
});
