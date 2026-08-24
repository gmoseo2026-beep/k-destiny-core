/**
 * 콩닥 Phase A 궁합 엔진 — 적대적(adversarial) 검증
 * 기존 scripts/test_compatibility.ts 가 다루지 않는 3가지를 전수/무작위 없이 결정론적으로 확인한다.
 *  A. A/B 순서 무관성 (전수: 10천간 x 12지지 x 결핍패턴 조합)
 *  B. rawTotal -> 60~99 매핑 경계값 및 단조성
 *  C. 지지 5개 표의 대칭성·표 간 중복·도달 가능한 점수 범위
 */
import { calculateFourPillars, SajuResult } from '../lib/saju';
import {
  calculateCompatibility,
  BRANCH_SIX_COMBO,
  BRANCH_THREE_COMBO,
  BRANCH_CLASH,
  BRANCH_PUNISH,
  BRANCH_HARM_ENMITY,
} from '../lib/compatibility';
import assert from 'node:assert';

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ELS = ['wood', 'fire', 'earth', 'metal', 'water'] as const;

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) { failures++; console.log('  ❌ ' + msg); }
}

function mock(dayMaster: string, dayBranch: string, lacks: string[], timePillar: string | null): SajuResult {
  const elementsScore = Object.fromEntries(
    ELS.map((e) => [e, lacks.includes(e) ? 0 : 2])
  ) as SajuResult['elementsScore'];
  return {
    fourPillars: { year: '甲子', month: '丙寅', day: dayMaster + dayBranch, time: timePillar },
    dayMaster,
    dayMasterSignKey: 'MOCK',
    elementLacks: lacks.map((l) => `LACK_${l.toUpperCase()}`),
    elementsScore,
  };
}

// ── A. A/B 순서 무관성 (전수) ─────────────────────────────
console.log('\n[A] calculateCompatibility(A,B) === (B,A) 전수 검증');
const LACK_PATTERNS: string[][] = [[], ['wood'], ['fire', 'metal'], ['wood', 'fire', 'earth']];
let permCount = 0;
for (const s1 of STEMS) for (const b1 of BRANCHES) {
  for (const s2 of STEMS) for (const b2 of BRANCHES) {
    const la = LACK_PATTERNS[(STEMS.indexOf(s1) + BRANCHES.indexOf(b2)) % LACK_PATTERNS.length];
    const lb = LACK_PATTERNS[(STEMS.indexOf(s2) + BRANCHES.indexOf(b1)) % LACK_PATTERNS.length];
    const A = mock(s1, b1, la, null);
    const B = mock(s2, b2, lb, '庚午');
    const ab = calculateCompatibility(A, B);
    const ba = calculateCompatibility(B, A);
    permCount++;
    if (ab.score !== ba.score || JSON.stringify(ab.breakdown) !== JSON.stringify(ba.breakdown)
        || JSON.stringify(ab.keywords) !== JSON.stringify(ba.keywords)) {
      failures++;
      if (failures < 6) console.log(`  ❌ 비대칭: ${s1}${b1}(${la}) vs ${s2}${b2}(${lb}) => ${ab.score}/${ba.score}`,
        JSON.stringify(ab.breakdown), JSON.stringify(ba.breakdown));
    }
  }
}
console.log(`  검사한 쌍: ${permCount}`);

// ── B. 매핑 경계값 ────────────────────────────────────────
console.log('\n[B] rawTotal -> score 매핑 경계값');
const mapRef = (raw: number) => 60 + Math.round((raw - 33) * (39 / 67));
// 실제 코드가 낼 수 있는 rawTotal 전 범위를 breakdown 으로 역검증
const seen = new Map<number, number>();
for (const s1 of STEMS) for (const b1 of BRANCHES) for (const s2 of STEMS) for (const b2 of BRANCHES) {
  for (const la of LACK_PATTERNS) for (const lb of LACK_PATTERNS) {
    const r = calculateCompatibility(mock(s1, b1, la, null), mock(s2, b2, lb, null));
    const prev = seen.get(r.breakdown.rawTotal);
    if (prev !== undefined) check(prev === r.score, `rawTotal ${r.breakdown.rawTotal} 이 두 점수(${prev}, ${r.score})로 매핑됨`);
    seen.set(r.breakdown.rawTotal, r.score);
    check(r.score === mapRef(r.breakdown.rawTotal), `매핑 불일치 raw=${r.breakdown.rawTotal} got=${r.score} want=${mapRef(r.breakdown.rawTotal)}`);
    check(r.score >= 60 && r.score <= 99, `점수 범위 이탈 ${r.score}`);
    check(r.keywords.length === 3, `키워드 개수 ${r.keywords.length}`);
    check(new Set(r.keywords).size === 3, `키워드 중복 ${JSON.stringify(r.keywords)}`);
  }
}
const raws = [...seen.keys()].sort((a, b) => a - b);
console.log(`  도달 가능한 rawTotal: ${raws[0]} ~ ${raws[raws.length - 1]}`);
console.log(`  대응 score: ${seen.get(raws[0])} ~ ${seen.get(raws[raws.length - 1])}`);
console.log(`  경계 기대값: raw 33 -> 60, raw 100 -> 99 (참조식: ${mapRef(33)}, ${mapRef(100)})`);
check(mapRef(33) === 60, 'raw 33 이 60 으로 매핑되지 않음');
check(mapRef(100) === 99, 'raw 100 이 99 로 매핑되지 않음');
if (raws[0] !== 33) console.log(`  ⚠️  설계상 최소 rawTotal 은 33 이지만 실제 도달 최소값은 ${raws[0]} (score ${seen.get(raws[0])}) — 60점은 실제로 나올 수 없음`);
if (raws[raws.length - 1] !== 100) console.log(`  ⚠️  실제 도달 최대 rawTotal 은 ${raws[raws.length - 1]}`);

// ── C. 지지 표 정합성 ─────────────────────────────────────
console.log('\n[C] 지지 5개 표 대칭성 / 표 간 중복');
const tables: [string, Set<string>][] = [
  ['SIX_COMBO', BRANCH_SIX_COMBO], ['THREE_COMBO', BRANCH_THREE_COMBO],
  ['CLASH', BRANCH_CLASH], ['PUNISH', BRANCH_PUNISH], ['HARM_ENMITY', BRANCH_HARM_ENMITY],
];
for (const [name, set] of tables) {
  for (const p of set) {
    const rev = p[1] + p[0];
    check(set.has(rev), `${name}: '${p}' 의 역순 '${rev}' 누락 (A/B 순서에 따라 점수가 달라짐)`);
  }
}
const SCORE_OF: Record<string, number> = { SIX_COMBO: 20, THREE_COMBO: 20, CLASH: 5, PUNISH: 5, HARM_ENMITY: 10 };
for (let i = 0; i < tables.length; i++) for (let j = i + 1; j < tables.length; j++) {
  const [n1, s1] = tables[i], [n2, s2] = tables[j];
  for (const p of s1) if (s2.has(p)) {
    const note = SCORE_OF[n1] === SCORE_OF[n2] ? 'ℹ️  동점 중복' : '⚠️  점수 다른 표에 중복(앞선 표 우선 적용)';
    console.log(`  ${note}: '${p}' in ${n1}(${SCORE_OF[n1]}) & ${n2}(${SCORE_OF[n2]})`);
  }
}

// ── D. 실제 만세력 커플 샘플 ──────────────────────────────
console.log('\n[D] 실제 만세력 샘플 (동일입력 반복 / 순서교환)');
const couples: [string, string | null, string, string, string | null, string][] = [
  ['1990-05-15', '12:00', 'M', '1992-10-06', '12:00', 'F'],
  ['1988-01-01', null, 'F', '1995-12-31', null, 'M'],
  ['2000-02-29', '03:30', 'M', '1999-08-17', null, 'F'],
  ['1970-11-07', '23:45', 'F', '1970-11-07', '23:45', 'M'],
];
for (const [d1, t1, g1, d2, t2, g2] of couples) {
  const A = calculateFourPillars(d1, t1, g1, 'Seoul, KR');
  const B = calculateFourPillars(d2, t2, g2, 'Seoul, KR');
  const r1 = calculateCompatibility(A, B);
  const r2 = calculateCompatibility(A, B);
  const r3 = calculateCompatibility(B, A);
  console.log(`  ${d1}/${t1 ?? '시간모름'} x ${d2}/${t2 ?? '시간모름'} => ${r1.score}점 raw=${r1.breakdown.rawTotal} [${r1.keywords.join(' / ')}]`);
  check(r1.score === r2.score, '반복 호출 결과 불일치');
  check(r1.score === r3.score, `순서 교환 결과 불일치 ${r1.score} vs ${r3.score}`);
  assert.ok(!/[\u4E00-\u9FFF]/.test(r1.keywords.join('')), '키워드에 한자 포함');
}

console.log(`\n${failures === 0 ? '✅ 적대적 검증 통과 (실패 0)' : `❌ 실패 ${failures}건`}`);
process.exit(failures === 0 ? 0 : 1);
