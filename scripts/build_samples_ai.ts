// 프리미엄 샘플 리포트(data/samples/*.json)의 AI 본문을 채운다.
// build_samples.ts 가 만든 샘플(가상 인물)과 같은 입력으로 생성 함수를 1회씩 호출해 sections 를 교체한다.
// meta(예시 · 가상 인물 표시)는 그대로 둔다. 로컬 .env 의 GEMINI_API_KEY 를 쓰며 DB 에는 접근하지 않는다.
// 실행: vitest 임시 설정으로 이 파일을 include 해서 실행(콩닥_최종마감 지시문 T2 참고).
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import type { PersonInput, ChildNamingInput } from "../lib/validation/inputs";

config({ path: ".env", quiet: true });

const SAMPLES_DIR = path.resolve(process.cwd(), "data/samples");

// PREMIUM_MODELS·genAI 는 import 시점에 환경변수를 읽으므로 dotenv 로드 뒤에 불러온다.
const { generate2027Report } = await import("../lib/premium/generate2027");
const { generateNamingReport } = await import("../lib/premium/generateNaming");
const { generateDatesReport } = await import("../lib/premium/generateDates");
const { containsHanjaDeep } = await import("../lib/gen/hanjaGuard");

interface SampleFile {
  version: number;
  meta: { targetName: string; isSample: boolean };
  engine: unknown;
  sections: unknown;
}

function writeSample(file: string, content: { engine: unknown; sections: unknown }) {
  const p = path.join(SAMPLES_DIR, file);
  const prev = JSON.parse(fs.readFileSync(p, "utf8")) as SampleFile;
  if (containsHanjaDeep(content.sections)) throw new Error(`${file}: AI 본문에 한자가 있습니다`);
  if (!prev.meta.isSample || !prev.meta.targetName.includes("예시 · 가상 인물")) {
    throw new Error(`${file}: 샘플 표시(예시 · 가상 인물)가 없습니다`);
  }
  const next: SampleFile = { version: prev.version, meta: prev.meta, engine: content.engine, sections: content.sections };
  fs.writeFileSync(p, JSON.stringify(next, null, 2), "utf8");
  console.log(`Wrote ${file} (sections 한자 없음, meta 유지)`);
}

const timed = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  const t0 = Date.now();
  const r = await fn();
  console.log(`[samples-ai] ${label} ${Date.now() - t0}ms`);
  return r;
};

// 1. 2027 대운 (build_samples.ts 와 같은 가상 인물)
const p2027: PersonInput = { name: "김서연", dob: "1995-03-15", time: "10:30", gender: "F" };
const r2027 = await timed("premium_2027_daeun", () =>
  generate2027Report({ name: p2027.name, dob: p2027.dob, time: p2027.time, gender: p2027.gender }),
);
writeSample("premium_2027_daeun.json", r2027);

// 2. 작명
const namingInput: ChildNamingInput = {
  surnameHangul: "김",
  surnameHanja: "金",
  gender: "M",
  dob: "2024-05-15",
  time: "14:30",
  dollim: null,
  tags: ["지혜", "밝음"],
  avoidSyllables: [], guardianConsent: true,
};
const rNaming = await timed("premium_naming", () => generateNamingReport(namingInput));
writeSample("premium_naming.json", rNaming);

// 3. 결혼 택일
const couplePeople: PersonInput[] = [
  { name: "신랑", dob: "1993-08-20", time: "11:00", gender: "M" },
  { name: "신부", dob: "1995-03-15", time: "10:30", gender: "F" },
];
const rDates = await timed("premium_date_selection", () =>
  generateDatesReport({
    purpose: "WEDDING",
    start: "2027-04-01",
    end: "2027-06-30",
    people: couplePeople,
    weekdays: [0, 6],
    excludeDates: [],
  }),
);
writeSample("premium_date_selection.json", rDates);

console.log("All sample AI sections generated.");
