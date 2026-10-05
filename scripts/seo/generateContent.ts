/**
 * 검색용 페이지 본문 생성(한 번 만들어 data/seo/*.json 에 저장 — 페이지는 이 파일만 읽는다).
 *
 *   npx tsx --env-file=.env scripts/seo/generateContent.ts           # 빠진 것만 생성(이어 하기)
 *   npx tsx --env-file=.env scripts/seo/generateContent.ts --force   # 전부 다시 생성
 *
 * 점수·관계·나이·띠는 lib/seo/zodiac.ts 가 계산한다(결정론). AI 는 그 사실을 받아 문장만 쓴다.
 * 한자·전문용어·단정적 예언이 섞이면 버리고 다시 만든다.
 */
import fs from "fs";
import path from "path";
import { FREE_MODELS } from "@/lib/destinyGen";
import { generateJson } from "@/lib/gen/generateJson";
import { allPairs, pairRelation, birthYears, birthYearFacts, type PairRelation } from "@/lib/seo/zodiac";
import { isPairContent, isYearContent, type PairContent, type YearContent } from "@/lib/seo/content";

const DIR = path.join(process.cwd(), "data", "seo");
const PAIRS_FILE = path.join(DIR, "zodiac-pairs.json");
const YEARS_FILE = path.join(DIR, "fortune-2027.json");
const FORCE = process.argv.includes("--force");

const COMMON_RULES = `글쓰기 규칙(반드시 지킨다):
- 다정한 해요체. 친구에게 말하듯 쉬운 말. 문장은 짧게.
- 한자를 쓰지 않는다. 사주 전문용어(오행, 일간, 천간, 지지, 삼합, 육합, 원진, 상생, 상극, 일주, 대운, 용신 등)를 쓰지 않는다.
- 미래를 단정하지 않는다. "~하기 쉬워요", "~에 유리한 흐름이에요"처럼 쓴다. "반드시", "틀림없이", "무조건", "~하게 됩니다" 금지.
- 겁주지 않는다. 낮은 점수도 숨기지 않되, 어떻게 하면 되는지를 함께 쓴다.
- 일반론("서로 배려하세요", "대화가 중요해요")으로 채우지 않는다. 누가 어떤 상황에서 무엇을 하는지, 구체적인 장면을 쓴다.
- 같은 비유를 두 번 쓰지 않는다. 동물의 생김새 비유는 전체에서 한 번까지만.
- 띠만으로 보는 큰 틀이라는 점을 본문에서 굳이 반복하지 않는다(화면이 따로 알린다).
- JSON 만 출력한다. 마크다운·코드펜스 금지.`;

const RELATION_NOTE: Record<PairRelation, string> = {
  six: "전통적으로 가장 잘 맞는다고 보는 단짝 조합. 서로에게 없는 것을 채워 주고 자연스럽게 끌린다. 다만 편하다고 당연하게 여기기 쉽다.",
  three: "같은 목표를 향할 때 힘이 커지는 한 팀 조합. 방향이 맞으면 호흡이 빠르다. 다만 함께 달리다 둘 다 지치기 쉽다.",
  same: "기질이 닮아 말이 잘 통하고 편하다. 다만 같은 약점이 겹쳐서, 둘 다 물러서지 않거나 둘 다 미루는 순간이 생긴다.",
  neutral: "특별히 끌어당기지도 밀어내지도 않는 무난한 조합. 큰 충돌은 적지만 저절로 깊어지지도 않아서, 둘이 만들어 가는 만큼 달라진다.",
  harm: "크게 싸우기보다 사소한 일로 서운함이 쌓이기 쉬운 조합. 말하지 않은 기대가 문제의 시작이 된다.",
  punish: "가까워질수록 서로의 날 선 부분이 드러나기 쉬운 조합. 적당한 거리와 선이 있을 때 오히려 편하다.",
  clash: "기질이 정반대라 가장 부딪히기 쉽다고 보는 조합. 대신 서로에게 없는 것을 가져서 끌림도 강하다. 속도와 방식의 차이를 인정하느냐가 갈림길이다.",
};

function pairPrompt(aName: string, bName: string, rel: ReturnType<typeof pairRelation>, same: boolean): string {
  return `당신은 한국의 궁합 콘텐츠 작가입니다. "${aName}띠 ${bName}띠 궁합"을 검색한 사람이 읽을 글을 씁니다.

사실(바꾸지 말고 그대로 따른다):
- 두 띠: ${aName}띠 × ${bName}띠${same ? " (같은 띠끼리)" : ""}
- 띠 기준 궁합: ${rel.score}점, ${rel.grade} — ${rel.label}
- 이 조합의 성격: ${RELATION_NOTE[rel.relation]}

${COMMON_RULES}
- 점수 숫자를 본문에 쓰지 않는다(화면이 따로 보여 준다).
- "${aName}띠는 ~, ${bName}띠는 ~"처럼 누구 이야기인지 분명히 쓴다.

출력(JSON):
{
  "headline": "한 줄 요약. 25~45자. 판정이 아니라 이 둘의 결을 그린 문장",
  "summary": "2~3문장. 이 조합을 한눈에. 좋은 점 하나와 조심할 점 하나를 같이",
  "attraction": "서로 끌리는 이유. 2문단, 280~420자. 구체적인 장면 1개 이상",
  "friction": "부딪히기 쉬운 지점. 2문단, 250~400자. 누가 어떤 상황에서 서운해지는지",
  "love": "연애할 때. 150~260자",
  "marriage": "함께 살거나 오래 볼 때. 150~260자",
  "tips": ["잘 지내는 법 3가지. 각 30~70자. 바로 해 볼 수 있는 행동으로", "", ""],
  "faq": [
    { "q": "${aName}띠와 ${bName}띠는 결혼 궁합도 괜찮은가요?", "a": "80~160자" },
    { "q": "이 조합이 자주 싸운다면 무엇부터 바꾸면 좋을까요?", "a": "80~160자" }
  ]
}`;
}

function lifeStage(age: number): string {
  if (age <= 23) return "막 성인이 된 시기 — 진로, 첫 일, 첫 연애, 독립";
  if (age <= 29) return "20대 중후반 — 첫 직장과 이직, 연애와 결혼 고민, 돈 모으기 시작";
  if (age <= 34) return "30대 초반 — 커리어의 방향, 결혼·동거, 목돈과 집";
  if (age <= 39) return "30대 후반 — 일에서의 책임, 가정과 일의 균형, 체력 관리";
  if (age <= 49) return "40대 — 조직·사업에서의 책임, 자녀와 부모, 건강 신호";
  if (age <= 59) return "50대 — 일의 전환과 정리, 건강, 노후 준비, 자녀의 독립";
  return "60대 — 은퇴 전후, 건강, 관계 정리와 새로운 일상";
}

function yearPrompt(f: ReturnType<typeof birthYearFacts>): string {
  const samjae =
    f.samjae === 3
      ? "- 이 띠는 흔히 '삼재'라고 부르는 3년의 마지막 해다. 겁주지 말고, 지난 일을 마무리하고 정리하기 좋은 해로 풀어 쓴다. caution 에서 한 번만 '삼재의 마지막 해'라고 부른다."
      : f.samjae
      ? `- 이 띠는 흔히 '삼재'라고 부르는 3년 중 ${f.samjae}번째 해다. 겁주지 말고 무리한 확장보다 점검이 좋은 해로 풀어 쓴다. caution 에서 한 번만 언급한다.`
      : "- 이 띠는 올해 삼재에 해당하지 않는다. 삼재라는 말을 쓰지 않는다.";
  return `당신은 한국의 신년운세 콘텐츠 작가입니다. "${f.birthYear}년생 ${f.targetYear}년 운세"를 검색한 사람이 읽을 글을 씁니다.

사실(바꾸지 말고 그대로 따른다):
- ${f.birthYear}년생, ${f.nickname}
- ${f.targetYear}년에 만 ${f.ageFrom}~${f.ageTo}세 → ${lifeStage(f.ageTo)}
- ${f.targetYear}년은 ${f.targetNickname}의 해
- 이 띠와 ${f.targetYear}년의 궁합: ${f.yearRelation.grade} — ${f.yearRelation.label}. ${RELATION_NOTE[f.yearRelation.relation]}
${samjae}

${COMMON_RULES}
- 이 나이대의 실제 고민에 맞춰 쓴다(위 생애 시기). 다른 나이의 같은 띠와 내용이 달라야 한다.
- 점수·한자·"궁합"이라는 단어 대신 "올해와 결이 잘 맞는/엇갈리는"처럼 풀어 쓴다.
- 특정 달을 단정하지 않는다("상반기", "하반기", "봄" 정도로만).

출력(JSON):
{
  "headline": "한 줄 요약. 25~45자. ${f.targetYear}년 이 사람들의 한 해를 그린 문장",
  "summary": "총평 2~3문장. 올해의 흐름과 가장 신경 쓸 것 하나",
  "love": "연애·관계. 180~300자",
  "work": "일·진로. 180~300자",
  "money": "돈. 150~260자",
  "caution": "조심할 때. 150~260자",
  "tips": ["올해 해 볼 일 3가지. 각 30~70자. 구체적인 행동으로", "", ""],
  "faq": [
    { "q": "${f.birthYear}년생은 ${f.targetYear}년에 이직·이동을 해도 괜찮을까요?", "a": "80~160자" },
    { "q": "${f.birthYear}년생 ${f.animal.name}띠는 ${f.targetYear}년에 무엇을 조심하면 좋을까요?", "a": "80~160자" }
  ]
}`;
}

function load<T>(file: string): Record<string, T> {
  if (FORCE || !fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, T>;
}

function save(file: string, data: Record<string, unknown>): void {
  fs.mkdirSync(DIR, { recursive: true });
  const sorted = Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
}

async function runPool<T>(items: T[], size: number, worker: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const item = items[i++];
        await worker(item);
      }
    })
  );
}

async function main() {
  const pairs = load<PairContent>(PAIRS_FILE);
  const todoPairs = allPairs().filter((p) => !pairs[p.slug]);
  console.log(`띠 궁합: ${todoPairs.length}개 생성(전체 ${allPairs().length})`);
  await runPool(todoPairs, 4, async (p) => {
    const rel = pairRelation(p.a, p.b);
    try {
      const r = await generateJson<PairContent>({
        label: `seo-pair:${p.slug}`,
        prompt: pairPrompt(p.a.name, p.b.name, rel, p.a.slug === p.b.slug),
        models: FREE_MODELS,
        maxOutputTokens: 3072,
        thinkingBudget: 0,
        temperature: 0.8,
        validate: isPairContent,
      });
      pairs[p.slug] = r.data;
      save(PAIRS_FILE, pairs);
    } catch (e) {
      console.error(`FAILED pair ${p.slug}`, e instanceof Error ? e.message : e);
    }
  });

  const years = load<YearContent>(YEARS_FILE);
  const todoYears = birthYears().filter((y) => !years[String(y)]);
  console.log(`출생연도 운세: ${todoYears.length}개 생성(전체 ${birthYears().length})`);
  await runPool(todoYears, 4, async (y) => {
    const facts = birthYearFacts(y);
    try {
      const r = await generateJson<YearContent>({
        label: `seo-year:${y}`,
        prompt: yearPrompt(facts),
        models: FREE_MODELS,
        maxOutputTokens: 3072,
        thinkingBudget: 0,
        temperature: 0.8,
        validate: (v: unknown): v is YearContent => isYearContent(v, !!facts.samjae),
      });
      years[String(y)] = r.data;
      save(YEARS_FILE, years);
    } catch (e) {
      console.error(`FAILED year ${y}`, e instanceof Error ? e.message : e);
    }
  });

  console.log(`완료: 띠 궁합 ${Object.keys(pairs).length}/${allPairs().length}, 출생연도 ${Object.keys(years).length}/${birthYears().length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
