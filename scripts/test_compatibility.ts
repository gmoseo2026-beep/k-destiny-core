import { calculateFourPillars, SajuResult } from '../lib/saju';
import {
  calculateCompatibility,
  BRANCH_SIX_COMBO,
  BRANCH_THREE_COMBO,
  BRANCH_CLASH,
  BRANCH_PUNISH,
  BRANCH_HARM_ENMITY
} from '../lib/compatibility';
import assert from 'node:assert';

console.log("==========================================");
console.log("🔮 콩닥 Phase A 궁합 엔진 정합성 검증 시작");
console.log("==========================================");

// ─────────────────────────────────────────
// 1. 지지 테이블 순수성 검증 (12지지 외 문자 차단)
// ─────────────────────────────────────────
console.log("\n[검증 1] 12지지 문자 순수성 및 오타('自由','由自') 제거 검증...");
const VALID_BRANCHES = new Set(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
const allBranchSets = [
  { name: 'BRANCH_SIX_COMBO', set: BRANCH_SIX_COMBO },
  { name: 'BRANCH_THREE_COMBO', set: BRANCH_THREE_COMBO },
  { name: 'BRANCH_CLASH', set: BRANCH_CLASH },
  { name: 'BRANCH_PUNISH', set: BRANCH_PUNISH },
  { name: 'BRANCH_HARM_ENMITY', set: BRANCH_HARM_ENMITY },
];

for (const { name, set } of allBranchSets) {
  for (const pair of set) {
    assert.strictEqual(pair.length, 2, `${name}의 항목 '${pair}'의 길이가 2가 아닙니다.`);
    const [c1, c2] = pair.split('');
    assert.ok(
      VALID_BRANCHES.has(c1),
      `❌ ${name}에 12지지가 아닌 잘못된 글자 '${c1}' 발견 (항목: ${pair})`
    );
    assert.ok(
      VALID_BRANCHES.has(c2),
      `❌ ${name}에 12지지가 아닌 잘못된 글자 '${c2}' 발견 (항목: ${pair})`
    );
  }
}
console.log("✅ 5개 지지 테이블 모두 12지지(子丑寅卯辰巳午未申酉戌亥)로만 완벽히 구성됨.");

// ─────────────────────────────────────────
// 2. 충(沖)과 형(刑)의 중복 제거 검증
// ─────────────────────────────────────────
console.log("\n[검증 2] 육충(六沖)과 형(刑) 간 중복 여부 검증...");
for (const clashPair of BRANCH_CLASH) {
  assert.ok(
    !BRANCH_PUNISH.has(clashPair),
    `❌ 충(BRANCH_CLASH) 항목 '${clashPair}'가 형(BRANCH_PUNISH)에 중복 존재합니다.`
  );
}
console.log("✅ 丑未, 寅申 등 육충 항목이 형에서 정상적으로 중복 배제됨.");

// ─────────────────────────────────────────
// 3. 각 지지 관계 대표 케이스 단위 테스트
// ─────────────────────────────────────────
console.log("\n[검증 3] 대표 케이스별 지지 점수(branch breakdown) 고정 검증...");

// 헬퍼: 임의의 일지(branch)와 일간(stem)을 갖는 mock SajuResult 생성
function makeMockSaju(dayMaster: string, dayBranch: string, lacks: string[] = []): SajuResult {
  const elementsScore = {
    wood: lacks.includes('wood') ? 0 : 2,
    fire: lacks.includes('fire') ? 0 : 2,
    earth: lacks.includes('earth') ? 0 : 2,
    metal: lacks.includes('metal') ? 0 : 2,
    water: lacks.includes('water') ? 0 : 2,
  };
  return {
    fourPillars: {
      year: '甲子',
      month: '丙寅',
      day: dayMaster + dayBranch,
      time: null,
    },
    dayMaster,
    dayMasterSignKey: 'MOCK_KEY',
    elementLacks: lacks.map(l => `LACK_${l.toUpperCase()}`),
    elementsScore,
  };
}

// 3-1. 육합 (六合) 케이스 -> branch: 20점
const sajuSixComboA = makeMockSaju('甲', '子');
const sajuSixComboB = makeMockSaju('甲', '丑'); // 子丑 육합
const resSixCombo = calculateCompatibility(sajuSixComboA, sajuSixComboB);
console.log("  - 육합(子丑) branch 점수:", resSixCombo.breakdown.branch);
assert.strictEqual(resSixCombo.breakdown.branch, 20, "육합(子丑)의 branch 점수는 20점이어야 합니다.");

// 3-2. 삼합 (三合) 케이스 -> branch: 20점
const sajuThreeComboA = makeMockSaju('甲', '寅');
const sajuThreeComboB = makeMockSaju('甲', '午'); // 寅午 삼합(반합)
const resThreeCombo = calculateCompatibility(sajuThreeComboA, sajuThreeComboB);
console.log("  - 삼합(寅午) branch 점수:", resThreeCombo.breakdown.branch);
assert.strictEqual(resThreeCombo.breakdown.branch, 20, "삼합(寅午)의 branch 점수는 20점이어야 합니다.");

// 3-3. 육충 (六沖) 케이스 -> branch: 5점
const sajuClashA = makeMockSaju('甲', '子');
const sajuClashB = makeMockSaju('甲', '午'); // 子午 충
const resClash = calculateCompatibility(sajuClashA, sajuClashB);
console.log("  - 육충(子午) branch 점수:", resClash.breakdown.branch);
assert.strictEqual(resClash.breakdown.branch, 5, "육충(子午)의 branch 점수는 5점이어야 합니다.");

// 3-4. 형 (刑) 케이스 -> branch: 5점
const sajuPunishA = makeMockSaju('甲', '寅');
const sajuPunishB = makeMockSaju('甲', '巳'); // 寅巳 형
const resPunish = calculateCompatibility(sajuPunishA, sajuPunishB);
console.log("  - 형(寅巳) branch 점수:", resPunish.breakdown.branch);
assert.strictEqual(resPunish.breakdown.branch, 5, "형(寅巳)의 branch 점수는 5점이어야 합니다.");

// 3-5. 원진/해/파 (怨嗔/害/破) 케이스 -> branch: 10점
const sajuHarmA = makeMockSaju('甲', '子');
const sajuHarmB = makeMockSaju('甲', '未'); // 子未 원진
const resHarm = calculateCompatibility(sajuHarmA, sajuHarmB);
console.log("  - 원진(子未) branch 점수:", resHarm.breakdown.branch);
assert.strictEqual(resHarm.breakdown.branch, 10, "원진(子未)의 branch 점수는 10점이어야 합니다.");

// 파(破) 케이스 (교정된 子酉 파) -> branch: 10점
const sajuBreakA = makeMockSaju('甲', '子');
const sajuBreakB = makeMockSaju('甲', '酉'); // 子酉 파 (과거 自由 오타였던 항목)
const resBreak = calculateCompatibility(sajuBreakA, sajuBreakB);
console.log("  - 파(子酉) branch 점수:", resBreak.breakdown.branch);
assert.strictEqual(resBreak.breakdown.branch, 10, "파(子酉)의 branch 점수는 10점이어야 합니다.");

// 3-6. 일반(무난한) 지지 관계 -> branch: 15점
const sajuNormalA = makeMockSaju('甲', '子');
const sajuNormalB = makeMockSaju('甲', '寅'); // 무난
const resNormal = calculateCompatibility(sajuNormalA, sajuNormalB);
console.log("  - 무난(子寅) branch 점수:", resNormal.breakdown.branch);
assert.strictEqual(resNormal.breakdown.branch, 15, "무난한 관계(子寅)의 branch 점수는 15점이어야 합니다.");

console.log("✅ 육합(20), 삼합(20), 충(5), 형(5), 원진/해/파(10), 무난(15) 지지 관계 점수 고정 검증 통과.");

// ─────────────────────────────────────────
// 4. 천간 관계(일간 관계) 단위 테스트
// ─────────────────────────────────────────
console.log("\n[검증 4] 일간 관계(stem breakdown) 검증...");
// 천간합: 甲己 -> 30점
const sajuStemCombo = calculateCompatibility(makeMockSaju('甲', '子'), makeMockSaju('己', '子'));
assert.strictEqual(sajuStemCombo.breakdown.stem, 30, "천간합(甲己)은 30점이어야 합니다.");

// 상생: 丙(화) -> 戊(토) -> 25점
const sajuStemGen = calculateCompatibility(makeMockSaju('丙', '子'), makeMockSaju('戊', '子'));
assert.strictEqual(sajuStemGen.breakdown.stem, 25, "상생(丙戊)은 25점이어야 합니다.");

// 비화: 丙(화) == 丙(화) -> 20점
const sajuStemSame = calculateCompatibility(makeMockSaju('丙', '子'), makeMockSaju('丙', '子'));
assert.strictEqual(sajuStemSame.breakdown.stem, 20, "비화(丙丙)는 20점이어야 합니다.");

// 상극: 甲(목) vs 戊(토) -> 10점
const sajuStemClash = calculateCompatibility(makeMockSaju('甲', '子'), makeMockSaju('戊', '子'));
assert.strictEqual(sajuStemClash.breakdown.stem, 10, "상극(甲戊)은 10점이어야 합니다.");
console.log("✅ 천간합(30), 상생(25), 비화(20), 상극(10) 일간 점수 검증 통과.");

// ─────────────────────────────────────────
// 5. 실제 calculateFourPillars 연동 결정론성 및 경계값 검증
// ─────────────────────────────────────────
console.log("\n[검증 5] 실제 만세력 연동 및 결정론성(반복 재현성) 검증...");
const realA = calculateFourPillars('1990-05-15', '12:00', 'M', 'Seoul, KR');
const realB = calculateFourPillars('1992-10-06', '12:00', 'F', 'Seoul, KR');

const initialResult = calculateCompatibility(realA, realB);
console.log("  - 샘플 커플 계산 결과:", {
  score: initialResult.score,
  keywords: initialResult.keywords,
  breakdown: initialResult.breakdown,
});

for (let i = 0; i < 50; i++) {
  const repeatResult = calculateCompatibility(realA, realB);
  assert.strictEqual(repeatResult.score, initialResult.score, "결정론성 위반: 점수가 매번 다릅니다.");
  assert.deepStrictEqual(repeatResult.keywords, initialResult.keywords, "결정론성 위반: 키워드가 매번 다릅니다.");
  assert.deepStrictEqual(repeatResult.breakdown, initialResult.breakdown, "결정론성 위반: breakdown이 매번 다릅니다.");
}

// 점수 범위 및 키워드 개수
assert.ok(initialResult.score >= 60 && initialResult.score <= 99, `점수 ${initialResult.score}가 60~99 범위를 벗어남`);
assert.strictEqual(initialResult.keywords.length, 3, "키워드는 반드시 정확히 3개여야 합니다.");
console.log("✅ 결정론성(50회 동일) 및 점수(60~99) / 키워드(3개) 검증 통과.");

console.log("\n==========================================");
console.log("🎉 모든 단위 테스트 및 검증이 완벽히 통과했습니다!");
console.log("==========================================");
