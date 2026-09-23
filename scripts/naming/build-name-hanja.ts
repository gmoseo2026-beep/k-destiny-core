import fs from "fs";
import path from "path";
import { radicalFullStrokes, NUMERAL_STROKES, RADICAL_ELEMENT } from "../../lib/premium/naming/strokes";
import type { Element } from "../../lib/premium/ganzhi";
import type { NamingTag } from "../../lib/validation/inputs";

const DATA_DIR = path.resolve(process.cwd(), "data/naming");

interface SourceEntry {
  char: string;
  eum: string;
  hun: string;
  genders: ("M" | "F")[];
  tags: NamingTag[];
  element?: Element | null; // null = 부수로 자원오행을 정하지 못한 글자(오행 미상)
}

interface UnihanEntry {
  rs: string;
  total: number;
}

interface NameHanjaEntry {
  char: string;
  eum: string;
  hun: string;
  strokes: number;
  element: Element | null;
  genders: ("M" | "F")[];
  tags: NamingTag[];
}

function computeCharStrokes(ch: string, unihan: Record<string, UnihanEntry>): number {
  if (NUMERAL_STROKES[ch]) {
    return NUMERAL_STROKES[ch];
  }
  const u = unihan[ch];
  if (!u || !u.rs) {
    throw new Error(`Missing Unihan rs for character: ${ch}`);
  }
  const [radStr, restStr] = u.rs.split(" ")[0].replace(/'/g, "").split(".");
  const rad = Number(radStr);
  const rest = Number(restStr);
  return radicalFullStrokes(rad) + rest;
}

function computeCharElement(ch: string, sourceElem: Element | null | undefined, unihan: Record<string, UnihanEntry>): Element | null {
  const u = unihan[ch];
  if (!u || !u.rs) {
    throw new Error(`Missing Unihan rs for character: ${ch}`);
  }
  const [radStr] = u.rs.split(" ")[0].replace(/'/g, "").split(".");
  const rad = Number(radStr);
  if (RADICAL_ELEMENT[rad]) {
    return RADICAL_ELEMENT[rad];
  }
  if (sourceElem !== undefined) {
    return sourceElem;
  }
  throw new Error(`Missing resource element for character: ${ch} (radical ${rad})`);
}

function main() {
  console.log("=== Building name-hanja.json and updating surnames.json ===");

  // 1. Read inmyong-hanja.txt
  const inmyongRaw = fs.readFileSync(path.join(DATA_DIR, "inmyong-hanja.txt"), "utf8");
  const inmyong = new Set(
    inmyongRaw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#")),
  );
  console.log(`Loaded ${inmyong.size} inmyong hanja.`);

  // 2. Read unihan-subset.json
  const unihan: Record<string, UnihanEntry> = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "unihan-subset.json"), "utf8"),
  );

  // 3. Read name-hanja.source.json
  const source: SourceEntry[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "name-hanja.source.json"), "utf8"),
  );
  console.log(`Loaded ${source.length} source entries.`);

  // Validate all characters in source are in inmyong-hanja.txt
  const invalidChars: string[] = [];
  for (const s of source) {
    if (!inmyong.has(s.char)) {
      invalidChars.push(s.char);
    }
  }
  if (invalidChars.length > 0) {
    console.error(`FATAL: Found ${invalidChars.length} characters NOT in inmyong-hanja.txt:`, invalidChars);
    process.exit(1);
  }
  console.log("Validation passed: All source characters exist in inmyong-hanja.txt.");

  // Build name-hanja.json
  const output: NameHanjaEntry[] = [];
  for (const s of source) {
    const strokes = computeCharStrokes(s.char, unihan);
    const element = computeCharElement(s.char, s.element, unihan);
    output.push({
      char: s.char,
      eum: s.eum,
      hun: s.hun,
      strokes,
      element,
      genders: s.genders,
      tags: s.tags,
    });
  }

  fs.writeFileSync(path.join(DATA_DIR, "name-hanja.json"), JSON.stringify(output, null, 2), "utf8");
  console.log(`Wrote ${output.length} entries to data/naming/name-hanja.json.`);

  // Update surnames.json with strokes
  const surnamesPath = path.join(DATA_DIR, "surnames.json");
  const surnames: Record<string, Array<{ hanja: string; strokes?: number }>> = JSON.parse(
    fs.readFileSync(surnamesPath, "utf8"),
  );

  for (const list of Object.values(surnames)) {
    for (const item of list) {
      // For compound surnames (복성) like "南宮", calculate sum of strokes
      let totalStrokes = 0;
      for (const ch of item.hanja) {
        totalStrokes += computeCharStrokes(ch, unihan);
      }
      item.strokes = totalStrokes;
    }
  }

  fs.writeFileSync(surnamesPath, JSON.stringify(surnames, null, 2), "utf8");
  console.log("Updated data/naming/surnames.json with computed strokes.");

  console.log("=== Build complete successfully ===");
}

main();
