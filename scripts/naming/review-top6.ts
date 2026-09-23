// 작명 후보 검수용: given-names.json 의 모든 음절에 대해 엔진(getHanjaCandidates)과 같은 규칙으로
// 성별별 상위 6자를 뽑아 data/naming/review-top6.csv(음절,성별,순위,글자,음,훈)로 저장한다.
// 정렬: isNameWorthy 통과 → KS X 1001 우선 → (태그 선택 없음 기준) → 데이터 순서. 두음 원음 포함.
// 실행: vitest 임시 설정으로 이 파일을 include 해서 실행(직전 지시문 T2 방식).
import fs from "fs";
import path from "path";
import { isNameWorthy, dueumSourceSyllables, type NameHanjaItem } from "../../lib/premium/naming/engine";
import nameHanjaRaw from "../../data/naming/name-hanja.json";
import givenNamesRaw from "../../data/naming/given-names.json";
import ksx1001Raw from "../../data/naming/ksx1001-hanja.json";

const hanjaList = nameHanjaRaw as NameHanjaItem[];
const order = new Map(hanjaList.map((h, i) => [h.char, i]));
const KSX = new Set<string>([...ksx1001Raw.chars]);
const given = givenNamesRaw as Record<"M" | "F", { name: string; rank: number }[]>;

const rows: string[] = ["음절,성별,순위,글자,음,훈"];
let total = 0;
for (const gender of ["F", "M"] as const) {
  const syllables = [...new Set(given[gender].flatMap((g) => [...g.name]))].sort();
  for (const syl of syllables) {
    const readings = new Set([syl, ...dueumSourceSyllables(syl)]);
    const top = hanjaList
      .filter((h) => readings.has(h.eum) && h.genders.includes(gender) && isNameWorthy(h))
      .sort((a, b) => {
        const ac = KSX.has(a.char) ? 0 : 1;
        const bc = KSX.has(b.char) ? 0 : 1;
        if (ac !== bc) return ac - bc;
        return order.get(a.char)! - order.get(b.char)!;
      })
      .slice(0, 6);
    top.forEach((h, i) => {
      rows.push([syl, gender, i + 1, h.char, h.eum, `"${h.hun.replace(/"/g, '""')}"`].join(","));
      total++;
    });
  }
}
fs.writeFileSync(path.resolve(process.cwd(), "data/naming/review-top6.csv"), rows.join("\n") + "\n", "utf8");
console.log(`review-top6.csv: ${total} rows`);
