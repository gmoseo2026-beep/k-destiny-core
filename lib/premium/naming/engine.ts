import { calculateFourPillars } from "@/lib/saju";
import type { ChildNamingInput } from "@/lib/validation/inputs";
import type { Element } from "@/lib/premium/ganzhi";
import { fourGrids, allLucky, parityBalanced, soundElement, soundFlowScore } from "./rules";
import { originalStrokes } from "./strokes";

import nameHanjaDataRaw from "@/data/naming/name-hanja.json";
import surnamesDataRaw from "@/data/naming/surnames.json";
import givenNamesDataRaw from "@/data/naming/given-names.json";
import blocklistDataRaw from "@/data/naming/blocklist.json";
import nameExcludeRaw from "@/data/naming/name-exclude.json";
import ksx1001Raw from "@/data/naming/ksx1001-hanja.json";

// KS X 1001(한국 표준 완성형) 한자 = 국내에서 흔히 쓰고 입력·표시가 쉬운 글자.
// 이 밖의 글자(예: 奲)는 벽자라 출생신고·일상 입력이 어렵다 → 후보에서 뺀다(돌림자로 직접 지정한 글자만 예외).
const KSX1001 = new Set<string>([...ksx1001Raw.chars]);

const NAME_EXCLUDE_CHARS = new Set<string>(nameExcludeRaw.chars);
const NAME_EXCLUDE_HUN = nameExcludeRaw.hunPatterns;

/**
 * 두음법칙 대응 음. 사전 음이 ㄹ·ㄴ으로 시작하는 한자도 이름에서는 ㅇ·ㄴ 소리로 적을 수 있다
 * (예: 律 률 → 서율, 蓮 련 → 하연). 데이터는 사전 음(률)으로만 들어 있으므로, 이름 음절(율)로 찾을 때
 * 사전 음 쪽도 함께 찾아야 律 같은 대표 글자가 후보에 오른다.
 */
export function dueumSourceSyllables(syllable: string): string[] {
  const code = syllable.charCodeAt(0) - 0xac00;
  if (syllable.length !== 1 || code < 0 || code > 11171) return [];
  const cho = Math.floor(code / 588);
  const jung = Math.floor((code % 588) / 28);
  const jong = code % 28;
  const make = (c: number) => String.fromCharCode(0xac00 + c * 588 + jung * 28 + jong);
  const IOTIZED = new Set([2, 6, 7, 12, 17, 20]); // ㅑ ㅕ ㅖ ㅛ ㅠ ㅣ
  const CHO_N = 2, CHO_R = 5, CHO_O = 11;
  if (cho === CHO_O && IOTIZED.has(jung)) return [make(CHO_R), make(CHO_N)]; // 율←률, 여←려·녀
  if (cho === CHO_N && !IOTIZED.has(jung)) return [make(CHO_R)]; // 나←라, 노←로
  return [];
}

/**
 * 이름 후보로 쓸 수 있는 글자인가.
 * 인명용 한자라도 뜻이 부정적이거나(도태·기생·근심 등) 친족 호칭·임신처럼 이름에 부적합한 글자,
 * 그리고 확장 영역 한자(글꼴·전산 입력 문제로 출생신고·일상 사용이 어려움)는 후보에서 뺀다.
 */
export function isNameWorthy(h: Pick<NameHanjaItem, "char" | "hun">): boolean {
  const cp = h.char.codePointAt(0) ?? 0;
  if (h.char.length !== 1 || cp < 0x4e00 || cp > 0x9fff) return false;
  if (NAME_EXCLUDE_CHARS.has(h.char)) return false;
  return !NAME_EXCLUDE_HUN.some((p) => h.hun.includes(p));
}

export interface NameHanjaItem {
  char: string;
  eum: string;
  hun: string;
  strokes: number;
  /** 자원오행. null = 부수로 오행을 정하지 못한 글자(오행 보완 점수 가감 없음) */
  element: Element | null;
  genders: ("M" | "F")[];
  tags: string[];
}

export interface SurnameItem {
  hanja: string;
  strokes?: number;
}

export interface GivenNameItem {
  name: string;
  rank: number;
}

export interface NamingEngineCandidate {
  hangul: string;
  hanja: [string, string];
  hun: [string, string];
  eum: [string, string];
  strokes: { s: number; g1: number; g2: number };
  grids: ReturnType<typeof fourGrids>;
  soundSeq: Element[];
  elements: [Element | null, Element | null];
  score: number;
}

export interface NamingEngineResult {
  child: {
    weakest: Element[];
    second: Element[];
    strongest: Element | null;
  };
  names: NamingEngineCandidate[];
  insufficient: boolean;
}

export function buildNamingEngine(
  input: ChildNamingInput,
  fixtures?: {
    givenNames?: Record<"M" | "F", GivenNameItem[]>;
    nameHanja?: NameHanjaItem[];
    surnames?: Record<string, SurnameItem[]>;
    blocklist?: string[];
  },
): NamingEngineResult {
  // 1. Child Saju & Elements
  const fourPillarsResult = calculateFourPillars(
    input.dob,
    input.time,
    input.gender === "M" ? "male" : "female",
    "Seoul, KR",
  );
  const elementsScore = fourPillarsResult.elementsScore;
  const entries = (Object.entries(elementsScore) as [Element, number][]).sort((a, b) => a[1] - b[1]);
  const minVal = entries[0][1];
  const weakest = entries.filter((e) => e[1] === minVal).map((e) => e[0]);
  const restAfterMin = entries.filter((e) => e[1] > minVal);
  const secondVal = restAfterMin.length > 0 ? restAfterMin[0][1] : minVal;
  const second = restAfterMin.length > 0 ? restAfterMin.filter((e) => e[1] === secondVal).map((e) => e[0]) : [];
  const maxVal = entries[entries.length - 1][1];
  const strongest = maxVal >= 40 ? entries.find((e) => e[1] === maxVal)?.[0] ?? null : null;

  // 2. Surname strokes s
  const surnamesTable = fixtures?.surnames ?? (surnamesDataRaw as Record<string, SurnameItem[]>);
  const surnameList = surnamesTable[input.surnameHangul] ?? [];
  const matchedSurname = surnameList.find((s) => s.hanja === input.surnameHanja);
  let s = matchedSurname?.strokes ?? 0;
  if (!s) {
    let sum = 0;
    for (const ch of input.surnameHanja) {
      sum += originalStrokes(ch);
    }
    s = sum;
  }

  // 3. Given names pool
  const givenNamesTable = fixtures?.givenNames ?? (givenNamesDataRaw as Record<"M" | "F", GivenNameItem[]>);
  const namePool = givenNamesTable[input.gender] ?? [];
  const blocklist = fixtures?.blocklist ?? (blocklistDataRaw as string[]);

  const filteredNames = namePool.filter((item) => {
    // Avoid syllables
    if (input.avoidSyllables.some((av) => item.name.includes(av))) return false;
    // Dollim position
    if (input.dollim) {
      if (input.dollim.position === 1 && item.name[0] !== input.dollim.syllable) return false;
      if (input.dollim.position === 2 && item.name[1] !== input.dollim.syllable) return false;
    }
    // Name contains surname syllable
    if (item.name.split("").some((c) => input.surnameHangul.includes(c))) return false;
    // Blocklist
    if (blocklist.includes(input.surnameHangul + item.name)) return false;
    return true;
  });

  // 4. Hanja dataset
  const hanjaList = (fixtures?.nameHanja ?? (nameHanjaDataRaw as NameHanjaItem[])) as NameHanjaItem[];
  const hanjaOrder = new Map(hanjaList.map((h, i) => [h.char, i]));

  function getHanjaCandidates(
    syllable: string,
    position: 1 | 2,
  ): NameHanjaItem[] {
    if (input.dollim && input.dollim.position === position && input.dollim.hanja) {
      const fixed = hanjaList.filter((h) => h.char === input.dollim?.hanja);
      if (fixed.length > 0) return fixed;
    }

    const readings = new Set([syllable, ...dueumSourceSyllables(syllable)]);
    const matches = hanjaList
      .filter((h) => readings.has(h.eum) && h.genders.includes(input.gender) && isNameWorthy(h) && KSX1001.has(h.char))
      .map((h) => ({ ...h, eum: syllable })); // 이름에는 실제로 부르는 음(율)으로 표기
    // 획수가 적은 순으로 고르면 드물고 뜻이 좋지 않은 글자가 앞에 온다(예: 태 → 汰).
    // 표준 완성형(흔한 글자) → 태그 일치 → 데이터 파일 순서(음절별 사용 빈도순) 로 고른다.
    // (태그는 대부분 기본값 "귀함"이라 흔한 글자 여부보다 앞세우면 드문 글자가 끼어든다)
    matches.sort((a, b) => {
      const aCommon = KSX1001.has(a.char) ? 0 : 1;
      const bCommon = KSX1001.has(b.char) ? 0 : 1;
      if (aCommon !== bCommon) return aCommon - bCommon;
      const aTagMatch = a.tags.filter((t) => input.tags.includes(t as typeof input.tags[number])).length;
      const bTagMatch = b.tags.filter((t) => input.tags.includes(t as typeof input.tags[number])).length;
      if (bTagMatch !== aTagMatch) return bTagMatch - aTagMatch;
      return hanjaOrder.get(a.char)! - hanjaOrder.get(b.char)!;
    });

    return matches.slice(0, 6);
  }

  // 5. Generate combinations & score
  interface ScoredCandidate extends NamingEngineCandidate {
    rank: number;
  }

  const allCandidates: ScoredCandidate[] = [];

  for (const nameItem of filteredNames) {
    const g1List = getHanjaCandidates(nameItem.name[0], 1);
    const g2List = getHanjaCandidates(nameItem.name[1], 2);

    for (const g1 of g1List) {
      for (const g2 of g2List) {
        if (g1.char === g2.char) continue;
        if (input.surnameHanja.includes(g1.char) || input.surnameHanja.includes(g2.char)) continue;

        const grids = fourGrids(s, g1.strokes, g2.strokes);
        if (!allLucky(grids)) continue;
        if (!parityBalanced([s, g1.strokes, g2.strokes])) continue;

        const soundSeq: Element[] = [
          soundElement(input.surnameHangul[0]),
          soundElement(nameItem.name[0]),
          soundElement(nameItem.name[1]),
        ];
        const soundFlow = soundFlowScore(soundSeq);

        let compScore = 0;
        for (const elem of [g1.element, g2.element]) {
          if (elem === null) continue; // 오행 미상 → 보완 점수 0
          if (weakest.includes(elem)) compScore += 12;
          else if (second.includes(elem)) compScore += 5;
          else if (strongest && elem === strongest) compScore -= 6;
        }

        const naturalness = Math.max(0, 10 - Math.floor((nameItem.rank - 1) / 30));

        const g1Tags = g1.tags.filter((t) => input.tags.includes(t as typeof input.tags[number])).length;
        const g2Tags = g2.tags.filter((t) => input.tags.includes(t as typeof input.tags[number])).length;
        const tagScore = (g1Tags + g2Tags) * 4;

        const totalScore = 50 + soundFlow + compScore + naturalness + tagScore;

        allCandidates.push({
          hangul: nameItem.name,
          hanja: [g1.char, g2.char],
          hun: [g1.hun, g2.hun],
          eum: [g1.eum, g2.eum],
          strokes: { s, g1: g1.strokes, g2: g2.strokes },
          grids,
          soundSeq,
          elements: [g1.element, g2.element],
          score: totalScore,
          rank: nameItem.rank,
        });
      }
    }
  }

  // 6. Sort candidates
  allCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.hangul !== b.hangul) return a.hangul.localeCompare(b.hangul);
    return (a.hanja[0] + a.hanja[1]).localeCompare(b.hanja[0] + b.hanja[1]);
  });

  // 7. Pick top 5 with different hangul names
  const selected: NamingEngineCandidate[] = [];
  const seenHangul = new Set<string>();
  for (const cand of allCandidates) {
    if (seenHangul.has(cand.hangul)) continue;
    seenHangul.add(cand.hangul);
    selected.push({
      hangul: cand.hangul,
      hanja: cand.hanja,
      hun: cand.hun,
      eum: cand.eum,
      strokes: cand.strokes,
      grids: cand.grids,
      soundSeq: cand.soundSeq,
      elements: cand.elements,
      // 순위용 내부 점수(기본 50 + 가점, 100 초과 가능)를 고객용 70~99점으로 환산한다(순서는 그대로)
      score: Math.min(99, Math.round(70 + (cand.score - 50) * 0.43)),
    });
    if (selected.length === 5) break;
  }

  return {
    child: { weakest, second, strongest },
    names: selected,
    insufficient: selected.length < 5,
  };
}
