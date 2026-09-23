// KS X 1001(한국 표준 완성형, EUC-KR) 한자 4,888자 목록을 만든다.
// 이 목록에 있는 글자는 국내에서 흔히 쓰이고 입력·표시가 쉬운 글자라, 작명 후보 정렬에서 우선한다.
// 외부 다운로드 없이 Node 내장 EUC-KR 디코더로 한자 영역(0xCAA1~0xFDFE)을 풀어 만든다.
// 사용: node scripts/naming/build-ksx1001.mjs
import { writeFileSync } from "node:fs";

const decoder = new TextDecoder("euc-kr");
const chars = [];
for (let hi = 0xca; hi <= 0xfd; hi++) {
  for (let lo = 0xa1; lo <= 0xfe; lo++) {
    const ch = decoder.decode(new Uint8Array([hi, lo]));
    const cp = ch.codePointAt(0) ?? 0;
    if (ch.length === 1 && ((cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0xf900 && cp <= 0xfaff))) chars.push(ch);
  }
}
const unique = [...new Set(chars)];
if (unique.length !== 4888) throw new Error(`KS X 1001 한자는 4,888자여야 합니다 (현재 ${unique.length})`);

writeFileSync(
  "data/naming/ksx1001-hanja.json",
  JSON.stringify({ _comment: "KS X 1001 한자 4,888자 — scripts/naming/build-ksx1001.mjs 로 생성", chars: unique.join("") }) + "\n",
  "utf8",
);
console.log(`wrote ${unique.length} chars`);
