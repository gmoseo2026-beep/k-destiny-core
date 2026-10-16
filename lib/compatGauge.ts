// lib/compatGauge.ts
// 궁합 5대 세부 지표(Compatibility.breakdown)의 화면 표시용 매핑.
// 계산 자체는 lib/compatibility.ts 에서 수행하며, 이 모듈은 저장된 숫자를 쉬운 말과 단계로 바꾼다.

export interface CompatBreakdown {
  stem: number;
  complement: number;
  branch: number;
  balance: number;
  yinYang: number;
}

export interface CompatPublicBreakdown {
  stem: number;
  balance: number;
  yinYang: number;
}

export type CompatGaugeKey = keyof CompatBreakdown;

export interface CompatGaugeStep {
  stepLabel: string;
  filledCells: number;
  percent: number;
}

export interface CompatGaugeAxisSpec {
  key: CompatGaugeKey;
  label: string;
  max: number;
  totalCells: number;
  isPublic: boolean;
  /** 한 줄 설명은 공개 3축에만 둔다 */
  description?: string;
}

export interface CompatGaugeItem extends CompatGaugeAxisSpec {
  score: number | null;
  step: CompatGaugeStep | null;
}

export const COMPAT_GAUGE_SPECS: readonly CompatGaugeAxisSpec[] = [
  {
    key: "stem",
    label: "타고난 성향 합",
    max: 30,
    totalCells: 4,
    isPublic: true,
    description: "두 사람의 기본 성향이 자연스럽게 어우러지는 정도",
  },
  {
    key: "balance",
    label: "두 사람 기운의 균형",
    max: 10,
    totalCells: 3,
    isPublic: true,
    description: "둘이 함께일 때 치우침 없이 고르게 굴러가는 힘",
  },
  {
    key: "yinYang",
    label: "에너지 온도 조화",
    max: 10,
    totalCells: 3,
    isPublic: true,
    description: "적극적으로 이끄는 힘과 차분히 받아 주는 힘의 조화",
  },
  {
    key: "complement",
    label: "서로 채워 주는 정도",
    max: 30,
    totalCells: 3,
    isPublic: false,
  },
  {
    key: "branch",
    label: "일상·감정 리듬",
    max: 20,
    totalCells: 4,
    isPublic: false,
  },
] as const;

const STEP_TABLE: Record<CompatGaugeKey, Record<number, CompatGaugeStep>> = {
  stem: {
    30: { stepLabel: "찰떡 호흡", filledCells: 4, percent: 100 },
    25: { stepLabel: "서로 북돋는 흐름", filledCells: 3, percent: 83 },
    20: { stepLabel: "비슷해 편안한 결", filledCells: 2, percent: 67 },
    10: { stepLabel: "다름을 맞춰 가는 사이", filledCells: 1, percent: 33 },
  },
  complement: {
    30: { stepLabel: "빈틈없이 채워 줌", filledCells: 3, percent: 100 },
    20: { stepLabel: "부분적으로 채워 줌", filledCells: 2, percent: 67 },
    10: { stepLabel: "각자 장점이 뚜렷함", filledCells: 1, percent: 33 },
  },
  branch: {
    20: { stepLabel: "가까울수록 편안함", filledCells: 4, percent: 100 },
    15: { stepLabel: "무난하고 안정적", filledCells: 3, percent: 75 },
    10: { stepLabel: "섬세한 배려가 필요", filledCells: 2, percent: 50 },
    5: { stepLabel: "속도 조절이 꼭 필요", filledCells: 1, percent: 25 },
  },
  balance: {
    10: { stepLabel: "고르고 단단한 균형", filledCells: 3, percent: 100 },
    7: { stepLabel: "대체로 고른 편", filledCells: 2, percent: 70 },
    4: { stepLabel: "특정 색깔이 뚜렷함", filledCells: 1, percent: 40 },
  },
  yinYang: {
    10: { stepLabel: "온도가 딱 맞음", filledCells: 3, percent: 100 },
    7: { stepLabel: "자연스러운 온도 차", filledCells: 2, percent: 70 },
    4: { stepLabel: "한쪽 템포가 뚜렷함", filledCells: 1, percent: 40 },
  },
};

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function mapGaugeStep(key: CompatGaugeKey, score: number): CompatGaugeStep | null {
  if (!isFiniteNumber(score)) return null;
  const table = STEP_TABLE[key];
  return table ? (table[score] ?? null) : null;
}

/**
 * 5축 전체 breakdown 검증. 없거나 숫자가 아니거나 정의된 단계 밖이면 null을 돌려준다(옛 행 방어).
 */
export function parseCompatBreakdown(raw: unknown): CompatBreakdown | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const keys: CompatGaugeKey[] = ["stem", "complement", "branch", "balance", "yinYang"];
  for (const k of keys) {
    const val = r[k];
    if (!isFiniteNumber(val) || !mapGaugeStep(k, val)) return null;
  }
  return {
    stem: r.stem as number,
    complement: r.complement as number,
    branch: r.branch as number,
    balance: r.balance as number,
    yinYang: r.yinYang as number,
  };
}

/**
 * 미결제 화면 전달용: 공개 3축(stem, balance, yinYang)만 골라 돌려준다.
 * 잠긴 2축(complement, branch) 값은 포함하지 않는다.
 */
export function pickPublicBreakdown(raw: unknown): CompatPublicBreakdown | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const publicKeys: (keyof CompatPublicBreakdown)[] = ["stem", "balance", "yinYang"];
  for (const k of publicKeys) {
    const val = r[k];
    if (!isFiniteNumber(val) || !mapGaugeStep(k, val)) return null;
  }
  return {
    stem: r.stem as number,
    balance: r.balance as number,
    yinYang: r.yinYang as number,
  };
}

/**
 * 화면 렌더링용 5축 배열 생성.
 * - fullBreakdown이 유효하면 5축 모두 점수와 단계를 채운다(유료 심층 리포트 화면).
 * - 그렇지 않고 publicBreakdown이 유효하면 공개 3축만 채우고 잠긴 2축은 score/step을 null로 둔다.
 * - 둘 다 유효하지 않으면 null을 돌려주어 카드를 그리지 않는다.
 */
export function buildCompatGaugeItems(
  publicBreakdown: unknown,
  fullBreakdown?: unknown
): CompatGaugeItem[] | null {
  const full = parseCompatBreakdown(fullBreakdown);
  if (full) {
    return COMPAT_GAUGE_SPECS.map((spec) => ({
      ...spec,
      score: full[spec.key],
      step: mapGaugeStep(spec.key, full[spec.key]),
    }));
  }

  const pub = pickPublicBreakdown(publicBreakdown);
  if (!pub) return null;

  return COMPAT_GAUGE_SPECS.map((spec) => {
    if (spec.isPublic) {
      const val = pub[spec.key as keyof CompatPublicBreakdown];
      return {
        ...spec,
        score: val,
        step: mapGaugeStep(spec.key, val),
      };
    }
    return {
      ...spec,
      score: null,
      step: null,
    };
  });
}
