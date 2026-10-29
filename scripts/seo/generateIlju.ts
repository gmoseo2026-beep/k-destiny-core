/**
 * 60갑자 일주 검색용 페이지 정적 본문 생성기 (11번 재작업).
 *
 *   npx tsx --env-file=.env scripts/seo/generateIlju.ts           # 빠진 항목만 이어서 생성
 *   npx tsx --env-file=.env scripts/seo/generateIlju.ts --force   # 60장 전체 새로 생성
 *
 * 원칙:
 * - 60장을 한 번에 같은 틀로 찍지 않고, 각 일주의 고유 근거(위 글자·아래 글자·띠 동물·계절과 시간·위아래 기운 관계·고유 장면·짝 3개 각각의 관계)를
 *   개별 프롬프트에 넣어 1장씩 생성한다.
 * - 생성 즉시 분량(3,650자 이상)·소제목별 2문단 및 260자 이상·좋은 말/피할 말 예시·짝 3개에 두 일주 이름 포함·
 *   페이지 내 반복 문장 0개·한자/전문용어/단정어 0개를 모두 통과한 것만 data/seo/ilju-60.json 에 저장한다.
 */
import fs from "fs";
import path from "path";
import { FREE_MODELS } from "@/lib/destinyGen";
import { generateJson } from "@/lib/gen/generateJson";
import { isCleanText, type SeoFaq } from "@/lib/seo/content";
import { ILJU_FACTS, type IljuDeterministicFact } from "@/lib/seo/iljuMeta";

const OUT_DIR = path.join(process.cwd(), "data", "seo");
const OUT_FILE = path.join(OUT_DIR, "ilju-60.json");
const FORCE = process.argv.includes("--force");

export interface GeneratedIljuProse {
  headline: string;
  summary: string;
  loveStyle: {
    styleAndAttraction: string;
    tempoAndLongevity: string;
    threeSituations: string;
  };
  innerMind: {
    femaleInner: string;
    maleInner: string;
    goodAndAvoidWords: string;
  };
  breakupReunion: {
    breakupSignals: string;
    reunionTiming: string;
  };
  bestMatches: {
    intro: string;
    reasons: [string, string, string];
  };
  faq: [SeoFaq, SeoFaq, SeoFaq];
}

// lib/seo/content.ts 의 JARGON 에 더해 사주 전문용어가 절대 새어 나오지 않도록 추가 차단
const EXTRA_JARGON =
  /일간|오행|천간|지장간|삼합|육합|원진|상생|상극|월주|연주|년주|시주|대운|세운|용신|기신|십성|십신|비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인|도화살|홍염살|역마살|공망|육해|형살|충살|천합지합|목기운|화기운|토기운|금기운|수기운|삼재/;

const BOILERPLATE_BAN = /여덟 글자|사주팔자|원국/;

/** tests/iljuUniqueness.test.ts 와 완전히 동일한 문장 분리기 */
const splitSentences = (t: string): string[] =>
  t
    .split(/(?<=[.!?요다])\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 15);

function normalizeParagraphs(raw: string): string {
  if (typeof raw !== "string") return "";
  const paras = raw
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paras.join("\n\n");
}

function normalizeProse(raw: GeneratedIljuProse): GeneratedIljuProse {
  return {
    headline: (raw.headline ?? "").trim(),
    summary: (raw.summary ?? "").trim().replace(/\s+/g, " "),
    loveStyle: {
      styleAndAttraction: normalizeParagraphs(raw.loveStyle?.styleAndAttraction),
      tempoAndLongevity: normalizeParagraphs(raw.loveStyle?.tempoAndLongevity),
      threeSituations: normalizeParagraphs(raw.loveStyle?.threeSituations),
    },
    innerMind: {
      femaleInner: normalizeParagraphs(raw.innerMind?.femaleInner),
      maleInner: normalizeParagraphs(raw.innerMind?.maleInner),
      goodAndAvoidWords: normalizeParagraphs(raw.innerMind?.goodAndAvoidWords),
    },
    breakupReunion: {
      breakupSignals: normalizeParagraphs(raw.breakupReunion?.breakupSignals),
      reunionTiming: normalizeParagraphs(raw.breakupReunion?.reunionTiming),
    },
    bestMatches: {
      intro: (raw.bestMatches?.intro ?? "").trim().replace(/\s+/g, " "),
      reasons: [
        (raw.bestMatches?.reasons?.[0] ?? "").trim().replace(/\s+/g, " "),
        (raw.bestMatches?.reasons?.[1] ?? "").trim().replace(/\s+/g, " "),
        (raw.bestMatches?.reasons?.[2] ?? "").trim().replace(/\s+/g, " "),
      ],
    },
    faq: [
      {
        q: (raw.faq?.[0]?.q ?? "").trim().replace(/\s+/g, " "),
        a: (raw.faq?.[0]?.a ?? "").trim().replace(/\s+/g, " "),
      },
      {
        q: (raw.faq?.[1]?.q ?? "").trim().replace(/\s+/g, " "),
        a: (raw.faq?.[1]?.a ?? "").trim().replace(/\s+/g, " "),
      },
      {
        q: (raw.faq?.[2]?.q ?? "").trim().replace(/\s+/g, " "),
        a: (raw.faq?.[2]?.a ?? "").trim().replace(/\s+/g, " "),
      },
    ],
  };
}

function checkCleanIljuText(text: string): string | null {
  if (!text) return "empty";
  const stripped = text.replace(/[가-힣]{2}일주/g, "이 기질").replace(/일주(?!일)/g, "기질");
  if (!isCleanText(stripped)) return `isCleanText failed: ${text.slice(0, 60)}`;
  if (EXTRA_JARGON.test(stripped)) return `EXTRA_JARGON matched: ${text.slice(0, 60)}`;
  if (BOILERPLATE_BAN.test(stripped)) return `BOILERPLATE_BAN matched: ${text.slice(0, 60)}`;
  return null;
}

function validateGenerated(
  fact: IljuDeterministicFact,
  candidate: unknown
): { ok: true; data: GeneratedIljuProse } | { ok: false; reason: string } {
  if (!candidate || typeof candidate !== "object") {
    return { ok: false, reason: "not an object" };
  }
  const raw = candidate as GeneratedIljuProse;
  if (
    !raw.loveStyle ||
    !raw.innerMind ||
    !raw.breakupReunion ||
    !raw.bestMatches ||
    !Array.isArray(raw.bestMatches.reasons) ||
    raw.bestMatches.reasons.length !== 3 ||
    !Array.isArray(raw.faq) ||
    raw.faq.length !== 3
  ) {
    return { ok: false, reason: "missing required structure" };
  }

  const d = normalizeProse(raw);

  if (d.headline.length < 22 || d.headline.length > 90) {
    return { ok: false, reason: `headline len=${d.headline.length}` };
  }
  if (d.summary.length < 90 || d.summary.length > 360) {
    return { ok: false, reason: `summary len=${d.summary.length}` };
  }

  const subBodies: Array<[string, string]> = [
    ["loveStyle.styleAndAttraction", d.loveStyle.styleAndAttraction],
    ["loveStyle.tempoAndLongevity", d.loveStyle.tempoAndLongevity],
    ["loveStyle.threeSituations", d.loveStyle.threeSituations],
    ["innerMind.femaleInner", d.innerMind.femaleInner],
    ["innerMind.maleInner", d.innerMind.maleInner],
    ["innerMind.goodAndAvoidWords", d.innerMind.goodAndAvoidWords],
    ["breakupReunion.breakupSignals", d.breakupReunion.breakupSignals],
    ["breakupReunion.reunionTiming", d.breakupReunion.reunionTiming],
  ];

  for (const [label, body] of subBodies) {
    if (body.startsWith("[") || body.includes("소제목:")) {
      return { ok: false, reason: `${label} contains bracket prefix` };
    }
    if (body.length < 260) {
      return { ok: false, reason: `${label} too short (${body.length} < 260)` };
    }
    const paras = body.split(/\n\n+/).filter((p) => p.trim().length >= 40);
    if (paras.length < 2) {
      return { ok: false, reason: `${label} needs >=2 paragraphs (got ${paras.length})` };
    }
  }

  // 좋은 말 / 피할 말 실제 대화 예시(낫표 또는 따옴표 문장) 최소 4개 확인
  const quoteMatches =
    d.innerMind.goodAndAvoidWords.match(
      /(?:「[^」]{3,160}」|『[^』]{3,160}』|“[^”]{3,160}”|‘[^’]{3,160}’|'[^']{3,160}'|"[^"]{3,160}")/g
    ) ?? [];
  if (quoteMatches.length < 4) {
    return {
      ok: false,
      reason: `goodAndAvoidWords needs >=4 quoted example phrases (got ${quoteMatches.length})`,
    };
  }

  if (d.bestMatches.intro.length < 70 || d.bestMatches.intro.length > 320) {
    return { ok: false, reason: `bestMatches.intro len=${d.bestMatches.intro.length}` };
  }

  for (let k = 0; k < 3; k++) {
    const partner = ILJU_FACTS[fact.matchSpecs[k].index];
    const reason = d.bestMatches.reasons[k];
    if (reason.length < 100 || reason.length > 360) {
      return { ok: false, reason: `match[${k}] reason len=${reason.length}` };
    }
    if (!reason.includes(fact.name) || !reason.includes(partner.name)) {
      return {
        ok: false,
        reason: `match[${k}] must include both ${fact.name} and ${partner.name}`,
      };
    }
  }

  for (let k = 0; k < 3; k++) {
    const f = d.faq[k];
    if (f.q.length < 10 || f.q.length > 100 || f.a.length < 95 || f.a.length > 360) {
      return { ok: false, reason: `faq[${k}] len q=${f.q.length} a=${f.a.length}` };
    }
  }

  // 모든 노출 문자열 클린 검사
  const allStrings = [
    d.headline,
    d.summary,
    ...subBodies.map(([, b]) => b),
    d.bestMatches.intro,
    ...d.bestMatches.reasons,
    ...d.faq.flatMap((f) => [f.q, f.a]),
  ];
  for (const s of allStrings) {
    const cleanErr = checkCleanIljuText(s);
    if (cleanErr) return { ok: false, reason: cleanErr };
  }

  // tests/iljuUniqueness.test.ts 의 pageTexts 와 동일한 글자 수 및 페이지 내 문장 중복 검사
  const pageTexts = [
    d.headline,
    d.summary,
    ...subBodies.map(([, b]) => b),
    d.bestMatches.intro,
    ...d.bestMatches.reasons,
    ...d.faq.map((f) => f.a),
  ];
  const totalChars = pageTexts.join("").length;
  if (totalChars < 3650) {
    return { ok: false, reason: `totalChars=${totalChars} (< 3650)` };
  }

  const sents = pageTexts.flatMap(splitSentences);
  const seen = new Set<string>();
  for (const s of sents) {
    if (seen.has(s)) {
      return { ok: false, reason: `duplicate sentence in page: "${s.slice(0, 45)}"` };
    }
    seen.add(s);
  }

  return { ok: true, data: d };
}

function buildIljuPrompt(fact: IljuDeterministicFact): string {
  const m0 = ILJU_FACTS[fact.matchSpecs[0].index];
  const m1 = ILJU_FACTS[fact.matchSpecs[1].index];
  const m2 = ILJU_FACTS[fact.matchSpecs[2].index];

  return `당신은 한국 2030 독자들이 깊이 공감하는 연애 성향 에세이 작가입니다.
"${fact.name}"(${fact.title}) 검색 페이지를 읽으러 온 사람을 위해, 오직 **${fact.name}** 한 사람만의 고유한 연애 풍경과 심리를 깊고 생생하게 써 주세요.

[이 일주만의 고유 근거 — 반드시 글 전체에 녹여 쓸 것]
- 이름: ${fact.name} (상징 이미지: "${fact.metaphor}", 상징 동물: ${fact.animal})
- 핵심 키워드: ${fact.keywords.join(" · ")}
- 위 글자(${fact.stem.ko})의 결: ${fact.stem.natureImage} → ${fact.stem.loveTemperament}
- 아래 글자(${fact.branch.ko})의 계절·시간·공기: ${fact.branch.seasonTime} (${fact.animal}) → ${fact.branch.atmosphere}
- 위·아래 두 기운이 만날 때 생기는 고유 역학: ${fact.relationNote}
- 이 일주만의 일상 연애 소재 힌트(변주해서 자연스럽게 활용): ${fact.sceneSeed}

[잘 맞는 일주 3개 — 각각 다른 이유와 구체적 장면을 쓸 것]
1) ${fact.name} × ${m0.name}(${m0.metaphor}, ${m0.animal}): ${fact.matchSpecs[0].pairDynamics}
2) ${fact.name} × ${m1.name}(${m1.metaphor}, ${m1.animal}): ${fact.matchSpecs[1].pairDynamics}
3) ${fact.name} × ${m2.name}(${m2.metaphor}, ${m2.animal}): ${fact.matchSpecs[2].pairDynamics}

[절대 지켜야 할 글쓰기 규칙]
1. 다정하고 자연스러운 해요체("~하는 편이에요", "~하기 쉬워요", "~하곤 해요")로 쓴다.
2. **한자 절대 금지.** **사주 전문용어 절대 금지**(오행, 일간, 천간, 지장간, 삼합, 육합, 원진, 상생, 상극, 월주, 시주, 대운, 세운, 용신, 십성, 비견, 겁재, 식신, 상관, 편재, 정재, 편관, 정관, 편인, 정인, 도화살, 홍염살, 역마살, 공망, 형살, 삼재, 사주팔자, 원국, 여덟 글자 등 일절 금지). 단, "${fact.name}", "${m0.name}" 같은 '○○일주' 이름 표기만 허용한다.
3. **단정적 예언 절대 금지**("반드시", "틀림없이", "무조건", "확실히 ~합니다", "~하게 됩니다" 금지).
4. **일반론·상투어 금지**("서로 배려하고 대화하는 것이 중요해요" 같은 어디에나 붙일 수 있는 문장 금지). 모든 문단에 ${fact.metaphor}의 계절감·시간대·생활 장면을 구체적으로 넣는다.
5. **한 페이지 안에서 같은 문장이나 비슷한 표현을 절대 두 번 반복하지 않는다.**
6. "실제 궁합은 태어난 해·달·시간까지 봐야 한다" 같은 공통 안내는 화면 하단 컴포넌트가 따로 출력하므로 본문·bestMatches.intro·FAQ 어디에도 절대 쓰지 않는다.
7. **JSON 깨짐 방지(매우 중요)**: JSON 문자열 값 안에서는 큰따옴표(")를 절대 쓰지 말고, 강조나 대화 예시는 반드시 낫표(「...」)만 사용한다.
8. **분량 규칙(매우 중요)**:
   - 모든 본문 필드(8개 소제목 본문)는 반드시 **줄바꿈 두 번("\\n\\n")으로 나뉜 2문단(또는 3문단)**으로 쓰고, **각 필드마다 공백 포함 360~480자**로 충분히 두껍게 쓴다.
   - 페이지 전체 글자 수 합계가 **반드시 4,000자 이상**(최소 3,800자 이상)이 되도록 각 문단을 풍성하고 밀도 있게 쓴다.

[출력 JSON 각 필드의 역할과 분량 — 값 안에 소제목 이름을 다시 적지 말고 바로 본문 문장으로 시작할 것]
- headline: ${fact.metaphor}의 결을 살린 매력적인 한 줄 요약 (32~58자)
- summary: ${fact.name}의 연애 온도와 매력을 한눈에 보여 주는 도입 요약 3문장 (150~230자)
- loveStyle.styleAndAttraction (소제목 "${fact.name} 연애 스타일과 끌리는 순간"의 본문): 2문단(\\n\\n 구분), 360~470자. 호감이 시작되는 순간과 데이트에서 드러나는 고유한 매력 장면.
- loveStyle.tempoAndLongevity (소제목 "${fact.name} 연애 온도와 오래가는 비결"의 본문): 2문단(\\n\\n 구분), 360~470자. 초반과 장기 연애의 온도 변화, 관계가 편안하게 깊어지는 일상 리듬.
- loveStyle.threeSituations (소제목 "${fact.name} 연애에서 자주 생기는 상황 3가지"의 본문): 3문단(\\n\\n 구분), 430~560자. 첫째·둘째·셋째 문단으로 나누어 카톡 답장 템포, 약속 변경·취소, 기념일·여행·사소한 오해 등 이 일주에게 실제로 자주 벌어지는 구체적 연애 장면 3가지를 생생하게 묘사.
- innerMind.femaleInner (소제목 "${fact.name} 여자 속마음과 호감 신호"의 본문): 2문단(\\n\\n 구분), 360~470자. 겉으로 보이는 태도와 실제 속마음의 차이, 진짜 좋아할 때 나오는 은근한 행동 신호.
- innerMind.maleInner (소제목 "${fact.name} 남자 속마음과 서운할 때 반응"의 본문): 2문단(\\n\\n 구분), 360~470자. 호감을 행동으로 표현하는 방식과 서운함이 쌓였을 때 나타나는 특유의 반응.
- innerMind.goodAndAvoidWords (소제목 "${fact.name}에게 하면 좋은 말 / 피할 말"의 본문): 2문단(\\n\\n 구분), 400~530자. 1문단에는 마음을 사르르 녹이는 하면 좋은 말 실제 대화 문장 예시 2개를 반드시 낫표(「...」)로 감싸 넣고 왜 좋아하는지 설명, 2문단에는 마음을 닫게 만드는 피할 말 실제 대화 문장 예시 2개를 반드시 낫표(「...」)로 감싸 넣고 왜 상처받는지 설명 (총 4개 이상의 「...」 문장 필수).
- breakupReunion.breakupSignals (소제목 "${fact.name} 이별 결심 이유와 멀어지는 신호"의 본문): 2문단(\\n\\n 구분), 360~470자. 무엇이 반복될 때 마음이 식는지, 이별 직전에 나타나는 말투와 행동 변화.
- breakupReunion.reunionTiming (소제목 "${fact.name} 재회 연락 타이밍과 대화법"의 본문): 2문단(\\n\\n 구분), 360~470자. 헤어진 뒤 시간 흐름에 따른 심리 변화와 다시 연락할 때 마음을 여는 구체적 접근법.
- bestMatches.intro: ${fact.name}의 연애 호흡을 가장 편안하게 살려 주는 파트너의 특징 소개 2문장 (110~180자, 공통 면책 문구 금지)
- bestMatches.reasons: 길이 3 배열. 0번에는 '${fact.name}'와 '${m0.name}', 1번에는 '${fact.name}'와 '${m1.name}', 2번에는 '${fact.name}'와 '${m2.name}' 두 일주 이름을 반드시 모두 넣고, 왜 잘 맞는지 구체적 데이트·일상 장면 하나로 각각 145~220자로 설명.
- faq: 길이 3 배열. ${fact.name}와 썸·연락·갈등·오래가는 비결에 대해 독자가 실제로 궁금해할 고유한 질문(q, 각 18~55자, '${fact.name}' 포함) 3개와 구체적인 답변(a, 각 135~215자) 3개.

출력 형식(마크다운 코드펜스 없이 순수 JSON만 출력):
{
  "headline": "",
  "summary": "",
  "loveStyle": {
    "styleAndAttraction": "",
    "tempoAndLongevity": "",
    "threeSituations": ""
  },
  "innerMind": {
    "femaleInner": "",
    "maleInner": "",
    "goodAndAvoidWords": ""
  },
  "breakupReunion": {
    "breakupSignals": "",
    "reunionTiming": ""
  },
  "bestMatches": {
    "intro": "",
    "reasons": ["", "", ""]
  },
  "faq": [
    { "q": "", "a": "" },
    { "q": "", "a": "" },
    { "q": "", "a": "" }
  ]
}`;
}

function loadExisting(): Record<string, GeneratedIljuProse> {
  if (FORCE || !fs.existsSync(OUT_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(OUT_FILE, "utf-8")) as Record<string, GeneratedIljuProse>;
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, GeneratedIljuProse>): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ordered: Record<string, GeneratedIljuProse> = {};
  for (const f of ILJU_FACTS) {
    if (store[f.slug]) ordered[f.slug] = store[f.slug];
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(ordered, null, 2) + "\n", "utf-8");
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < items.length) {
        const current = items[cursor++];
        await worker(current);
      }
    })
  );
}

async function generateOne(
  fact: IljuDeterministicFact,
  store: Record<string, GeneratedIljuProse>
): Promise<void> {
  let lastFailReason = "";
  for (let outerAttempt = 1; outerAttempt <= 3; outerAttempt++) {
    let validatedData: GeneratedIljuProse | null = null;
    const extraHint = lastFailReason
      ? `\n\n[이전 시도 보완 요청: 직전 출력이 "${lastFailReason}" 이유로 반려되었습니다. 모든 소제목 본문을 반드시 2문단(\\n\\n) 370자 이상으로 길게 쓰고, 금지 용어 없이 총 4,100자 이상으로 작성해 주세요.]`
      : "";

    try {
      await generateJson<GeneratedIljuProse>({
        label: `seo-ilju:${fact.slug}#${outerAttempt}`,
        prompt: buildIljuPrompt(fact) + extraHint,
        models: FREE_MODELS,
        maxOutputTokens: 8192,
        thinkingBudget: 0,
        temperature: 0.85,
        validate: (v: unknown): v is GeneratedIljuProse => {
          const check = validateGenerated(fact, v);
          if (!check.ok) {
            lastFailReason = check.reason;
            console.warn(`[seo-ilju:${fact.slug}] reject: ${check.reason}`);
            return false;
          }
          validatedData = check.data;
          return true;
        },
      });

      if (validatedData) {
        store[fact.slug] = validatedData;
        saveStore(store);
        console.log(
          `[seo-ilju] saved ${Object.keys(store).length}/60 (${fact.slug} ${fact.name})`
        );
        return;
      }
    } catch (e) {
      console.warn(
        `[seo-ilju:${fact.slug}] outerAttempt=${outerAttempt} failed (${lastFailReason}):`,
        e instanceof Error ? e.message : e
      );
    }
  }
  throw new Error(`[seo-ilju:${fact.slug}] failed after 3 outer attempts (${lastFailReason})`);
}

async function main() {
  const store = loadExisting();
  // 기존 저장본 중에서도 현재 검증 기준에 미달하는 항목은 다시 생성
  const todo = ILJU_FACTS.filter((f) => {
    const existing = store[f.slug];
    if (!existing) return true;
    return !validateGenerated(f, existing).ok;
  });

  console.log(`60갑자 일주 생성 시작: 대상 ${todo.length}개 (전체 ${ILJU_FACTS.length}개)`);
  await runPool(todo, 10, async (fact) => {
    await generateOne(fact, store);
  });

  console.log(`완료: ${Object.keys(store).length}/${ILJU_FACTS.length}장 저장됨 -> ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
