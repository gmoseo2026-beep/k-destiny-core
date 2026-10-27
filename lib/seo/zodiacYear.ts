/**
 * 띠별 2027년 운세(검색용) — "2027년 말띠 운세" 같은 검색을 받는 12개 화면의 결정론 문장.
 * 출생연도별 본문(data/seo/fortune-2027.json)은 해마다 따로 있고, 이 파일은 띠 단위의 큰 틀만 만든다(AI 호출 없음).
 * 단정하지 않고 "~흐름", "~수도"로 쓴다. 한자·전문용어는 쓰지 않는다(삼재는 흔히 쓰는 말이라 그대로 둔다).
 */
import {
  FORTUNE_TARGET_YEAR,
  YEAR_FLOW_LABEL,
  ZODIAC,
  birthYears,
  colorOfYear,
  pairRelation,
  samjaeStage,
  zodiacOfYear,
  type PairRelation,
  type ZodiacAnimal,
} from "@/lib/seo/zodiac";

const YEAR = FORTUNE_TARGET_YEAR;

/** 그 해와의 관계별 큰 흐름 두 문단. {a} = 띠 이름, {y} = 그 해 동물 */
const INTRO: Record<PairRelation, [string, string]> = {
  six: [
    "{a}띠에게 {Y}년 {c} {y}의 해는 손발이 잘 맞는 해예요. 예로부터 {y}와 {a}는 서로를 끌어당기는 단짝으로 봐서, 혼자 애쓰던 일에 도움의 손길이 닿기 쉬운 흐름이에요.",
    "미뤄 둔 계획이 있다면 상반기에 작게 먼저 시작해 보기 좋아요. 사람 사이 일이 많아지는 해라, 새로 만나는 인연을 너무 빨리 판단하지 않는 게 좋아요.",
  ],
  three: [
    "{a}띠에게 {Y}년 {c} {y}의 해는 같은 방향으로 밀어 주는 해예요. 예로부터 {y}와 {a}는 한 팀으로 보는 사이라, 꾸준히 해 온 일이 조금씩 눈에 띄기 쉬운 흐름이에요.",
    "혼자 결정하기보다 믿을 만한 사람과 함께 움직일 때 결과가 좋아지기 쉬워요. 한 해의 마무리를 서두르기보다 차곡차곡 쌓는 쪽이 잘 맞아요.",
  ],
  same: [
    "{a}띠에게 {Y}년은 바로 내 띠의 해예요. 주목받는 일이 늘어나는 만큼, 나를 돌아보고 방향을 다시 잡기 좋은 흐름이에요.",
    "무리하게 많은 걸 벌이기보다 꼭 하고 싶은 한두 가지에 힘을 모으는 게 좋아요. 몸과 마음의 쉼을 일정에 먼저 넣어 두면 한 해가 훨씬 가벼워져요.",
  ],
  neutral: [
    "{a}띠에게 {Y}년 {c} {y}의 해는 큰 굴곡 없이 흘러가는 해예요. 갑작스러운 변화보다는 내가 정한 속도대로 움직이기 좋은 흐름이에요.",
    "눈에 띄는 큰 사건이 없더라도, 작은 습관과 관계를 다듬은 사람이 연말에 웃는 경우가 많아요. 새로운 배움 하나를 시작해 보기에도 괜찮은 해예요.",
  ],
  harm: [
    "{a}띠에게 {Y}년 {c} {y}의 해는 사소한 일에 마음 쓰이기 쉬운 해예요. 가까운 사이에서 말 한마디가 오래 남을 수 있는 흐름이에요.",
    "서운한 일은 쌓아 두기보다 그때그때 부드럽게 꺼내는 게 좋아요. 중요한 약속이나 계약은 한 번 더 확인하면 마음이 편해져요.",
  ],
  punish: [
    "{a}띠에게 {Y}년 {c} {y}의 해는 서두르면 날이 서기 쉬운 해예요. 급하게 정한 일보다 한 템포 쉬어 간 일이 결과가 좋기 쉬운 흐름이에요.",
    "감정이 올라올 때는 바로 답하기보다 하룻밤 두고 말하면 관계가 지켜져요. 돈과 건강은 무리하지 않는 선을 미리 정해 두면 좋아요.",
  ],
  clash: [
    "{a}띠에게 {Y}년 {c} {y}의 해는 변화가 많아 움직이게 되는 해예요. 예로부터 {y}와 {a}는 정반대 자리로 봐서, 이사·이직·관계 정리처럼 자리를 옮기는 일이 생기기 쉬운 흐름이에요.",
    "변화를 피하기보다 미리 계획해 두면 오히려 기회가 될 수 있어요. 큰 결정은 한 번에 하기보다 단계를 나눠 움직이는 게 좋아요.",
  ],
};

const SAMJAE_ANSWER: Record<1 | 2 | 3, string> = {
  1: "흔히 말하는 삼재의 첫 해예요. 다만 삼재는 태어난 해만 본 옛 풀이라, 겁먹기보다는 무리한 확장을 줄이고 건강과 관계를 챙기는 해로 보면 충분해요.",
  2: "흔히 말하는 삼재의 가운데 해예요. 다만 삼재는 태어난 해만 본 옛 풀이라, 겁먹기보다는 큰 결정을 서두르지 않는 해로 보면 충분해요.",
  3: "흔히 말하는 삼재의 마지막 해예요. 예로부터 끝나는 삼재는 정리하고 새로 준비하는 해로 봐서, 오래 미뤄 둔 일을 마무리하기 좋은 흐름이에요.",
};

export interface AnimalYearPage {
  animal: ZodiacAnimal;
  /** 2027년 동물 */
  yearAnimal: ZodiacAnimal;
  /** "붉은 양" */
  yearNickname: string;
  flowLabel: string;
  intro: [string, string];
  samjae: 1 | 2 | 3 | null;
  /** 페이지가 있는 출생연도(최근 순) */
  years: number[];
  /** 이 띠와 예로부터 잘 맞는다고 보는 띠(단짝 → 한 팀 순) */
  goodMatches: ZodiacAnimal[];
  faq: Array<{ q: string; a: string }>;
}

export function animalYearPage(slug: string): AnimalYearPage | null {
  const animal = ZODIAC.find((z) => z.slug === slug);
  if (!animal) return null;
  const yearAnimal = zodiacOfYear(YEAR);
  const relation = pairRelation(animal, yearAnimal).relation;
  const fill = (s: string) =>
    s.replaceAll("{a}", animal.name).replaceAll("{y}", yearAnimal.name).replaceAll("{c}", colorOfYear(YEAR)).replaceAll("{Y}", String(YEAR));
  const intro = INTRO[relation].map(fill) as [string, string];
  const samjae = samjaeStage(animal, YEAR);
  const years = birthYears().filter((y) => zodiacOfYear(y).slug === animal.slug);
  const goodMatches = [
    ...ZODIAC.filter((z) => z.slug !== animal.slug && pairRelation(animal, z).relation === "six"),
    ...ZODIAC.filter((z) => z.slug !== animal.slug && pairRelation(animal, z).relation === "three"),
  ];
  const short = (y: number) => `${String(y).slice(2)}년생`;
  const faq = [
    {
      q: `${animal.name}띠는 몇 년생인가요?`,
      a: `${years.map((y) => `${y}년(${short(y)})`).join(", ")}에 태어난 사람이 ${animal.name}띠예요. 띠는 입춘(2월 4일 무렵)에 바뀌어서, 1월~2월 초에 태어났다면 앞 해의 띠로 보기도 해요.`,
    },
    {
      q: `${YEAR}년 ${animal.name}띠는 삼재인가요?`,
      a: samjae ? SAMJAE_ANSWER[samjae] : `아니에요. ${YEAR}년은 ${animal.name}띠에게 흔히 말하는 삼재에 해당하지 않는 해예요.`,
    },
    {
      q: `${animal.name}띠와 잘 맞는 띠는 무엇인가요?`,
      a: goodMatches.length
        ? `예로부터 ${goodMatches.map((z) => `${z.name}띠`).join(", ")}와 잘 맞는다고 봐요. 다만 띠는 태어난 해만 본 큰 틀이라, 두 사람의 실제 궁합은 생년월일까지 넣어 보는 게 정확해요.`
        : `띠는 태어난 해만 본 큰 틀이라, 두 사람의 실제 궁합은 생년월일까지 넣어 보는 게 정확해요.`,
    },
    {
      q: `같은 ${animal.name}띠라도 ${YEAR}년 운세가 다른가요?`,
      a: `네, 달라요. 띠는 태어난 해 하나만 본 것이라, 같은 ${animal.name}띠라도 생년월일과 태어난 시간에 따라 ${YEAR}년 흐름이 꽤 달라요. 생년월일을 넣으면 나에게 맞춘 ${YEAR}년 운세를 무료로 먼저 볼 수 있어요.`,
    },
  ];
  return {
    animal,
    yearAnimal,
    yearNickname: `${colorOfYear(YEAR)} ${yearAnimal.name}`,
    flowLabel: YEAR_FLOW_LABEL[relation],
    intro,
    samjae,
    years,
    goodMatches,
    faq,
  };
}
