import { calculateFourPillars } from "@/lib/saju";
import type { ChildNamingInput } from "@/lib/validation/inputs";
import type { Element } from "@/lib/premium/ganzhi";
import { fourGrids, allLucky, parityBalanced, soundElement, soundFlowScore } from "./rules";
import { originalStrokes } from "./strokes";

import nameHanjaDataRaw from "@/data/naming/name-hanja.json";
import surnamesDataRaw from "@/data/naming/surnames.json";
import givenNamesDataRaw from "@/data/naming/given-names.json";
import blocklistDataRaw from "@/data/naming/blocklist.json";

export interface NameHanjaItem {
  char: string;
  eum: string;
  hun: string;
  strokes: number;
  element: Element;
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
  elements: [Element, Element];
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

  function getHanjaCandidates(
    syllable: string,
    position: 1 | 2,
  ): NameHanjaItem[] {
    if (input.dollim && input.dollim.position === position && input.dollim.hanja) {
      const fixed = hanjaList.filter((h) => h.char === input.dollim?.hanja);
      if (fixed.length > 0) return fixed;
    }

    const matches = hanjaList.filter((h) => h.eum === syllable && h.genders.includes(input.gender));
    matches.sort((a, b) => {
      const aTagMatch = a.tags.filter((t) => input.tags.includes(t as typeof input.tags[number])).length;
      const bTagMatch = b.tags.filter((t) => input.tags.includes(t as typeof input.tags[number])).length;
      if (bTagMatch !== aTagMatch) return bTagMatch - aTagMatch;
      if (a.strokes !== b.strokes) return a.strokes - b.strokes;
      return a.char.localeCompare(b.char);
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
      score: cand.score,
    });
    if (selected.length === 5) break;
  }

  return {
    child: { weakest, second, strongest },
    names: selected,
    insufficient: selected.length < 5,
  };
}
